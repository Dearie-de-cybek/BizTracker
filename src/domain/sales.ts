import { applyBasisPoints, sumMoney } from './money';
import type { Ctx, DbState, DiscountInput, Money, Payment, PaymentMethod, PaymentStatus, Sale, SaleItem, StockMovement } from './types';
import { cleanOptional, ValidationError } from './validation';

export interface CartLine {
  productId: string;
  quantity: number;
}

export interface PricedCart {
  items: Omit<SaleItem, 'id'>[];
  subtotal: Money;
  discountAmount: Money;
  total: Money;
  costOfGoods: Money | null;
  /** Per-product problems (missing product, insufficient stock) */
  lineErrors: Record<string, string>;
}

export function discountAmountFor(subtotal: Money, discount: DiscountInput): Money {
  if (discount.type === 'amount') return Math.min(Math.max(0, discount.amount), subtotal);
  if (discount.type === 'percent') return Math.min(applyBasisPoints(subtotal, discount.basisPoints), subtotal);
  return 0;
}

/** Prices a cart against current product data. Pure — used both for display and for saving. */
export function priceCart(state: DbState, lines: CartLine[], discount: DiscountInput): PricedCart {
  const trackStock = state.settings?.trackStock ?? true;
  const lineErrors: Record<string, string> = {};
  const items: Omit<SaleItem, 'id'>[] = [];
  const requested = new Map<string, number>();
  for (const l of lines) requested.set(l.productId, (requested.get(l.productId) ?? 0) + l.quantity);

  for (const [productId, quantity] of requested) {
    const product = state.products.find((p) => p.id === productId);
    if (!product) {
      lineErrors[productId] = 'This product was removed.';
      continue;
    }
    if (!Number.isSafeInteger(quantity) || quantity <= 0) {
      lineErrors[productId] = 'Quantity must be at least 1.';
      continue;
    }
    if (trackStock && quantity > product.stockQuantity) {
      lineErrors[productId] =
        product.stockQuantity === 0 ? 'Out of stock.' : `Only ${product.stockQuantity} in stock.`;
    }
    items.push({
      productId,
      productName: product.name,
      sku: product.sku,
      unitPrice: product.sellingPrice,
      costPrice: product.costPrice,
      quantity,
      lineTotal: product.sellingPrice * quantity,
    });
  }
  const subtotal = sumMoney(items.map((i) => i.lineTotal));
  const discountAmount = discountAmountFor(subtotal, discount);
  const costKnown = items.every((i) => i.costPrice != null);
  return {
    items,
    subtotal,
    discountAmount,
    total: subtotal - discountAmount,
    costOfGoods: costKnown ? sumMoney(items.map((i) => (i.costPrice as number) * i.quantity)) : null,
    lineErrors,
  };
}

export interface PaymentInput {
  method: PaymentMethod;
  amount: Money;
  tendered?: Money;
  reference?: string;
}

export interface CheckoutInput {
  requestId: string;
  lines: CartLine[];
  customerId: string | null;
  discount: DiscountInput;
  payment: PaymentInput;
  note?: string;
}

export class DuplicateSaleError extends Error {
  constructor(public saleId: string) {
    super('This sale has already been recorded.');
    this.name = 'DuplicateSaleError';
  }
}

function validatePayment(p: PaymentInput, balance: Money) {
  if (!Number.isSafeInteger(p.amount) || p.amount < 0) throw new ValidationError('Enter a valid amount paid.');
  if (p.amount > balance) throw new ValidationError('Amount paid is more than the amount due.');
  if (p.method === 'cash' && p.tendered != null && p.tendered < p.amount)
    throw new ValidationError('Cash received is less than the amount paid.');
}

/**
 * Creates a sale, its payment, stock movements and stock updates as one state
 * transition. Either everything is applied or an error is thrown and the input
 * state is untouched.
 */
export function createSale(state: DbState, input: CheckoutInput, ctx: Ctx): { state: DbState; sale: Sale } {
  const dup = state.sales.find((s) => s.requestId === input.requestId);
  if (dup) throw new DuplicateSaleError(dup.id);
  if (input.lines.length === 0) throw new ValidationError('Add at least one product to the sale.');

  const priced = priceCart(state, input.lines, input.discount);
  const problems = Object.values(priced.lineErrors);
  if (problems.length) throw new ValidationError(problems[0], priced.lineErrors);
  if (input.discount.type === 'amount' && input.discount.amount > priced.subtotal)
    throw new ValidationError('Discount cannot be more than the subtotal.');

  const customer = input.customerId ? state.customers.find((c) => c.id === input.customerId) : null;
  if (input.customerId && !customer) throw new ValidationError('The selected customer no longer exists.');

  validatePayment(input.payment, priced.total);
  if (input.payment.amount < priced.total && !customer)
    throw new ValidationError('Select a customer to record a sale that is not fully paid.');

  const now = ctx.now().toISOString();
  const receiptNumber = state.counters.receipt + 1;
  const sale: Sale = {
    id: ctx.id(),
    receiptNumber,
    requestId: input.requestId,
    customerId: customer?.id ?? null,
    customerName: customer?.name ?? null,
    items: priced.items.map((i) => ({ ...i, id: ctx.id() })),
    subtotal: priced.subtotal,
    discount: input.discount,
    discountAmount: priced.discountAmount,
    total: priced.total,
    costOfGoods: priced.costOfGoods,
    note: cleanOptional(input.note),
    createdAt: now,
  };

  const payments: Payment[] =
    input.payment.amount > 0
      ? [
          {
            id: ctx.id(),
            saleId: sale.id,
            method: input.payment.method,
            amount: input.payment.amount,
            tendered: input.payment.method === 'cash' ? input.payment.tendered : undefined,
            reference: cleanOptional(input.payment.reference),
            receivedAt: now,
          },
        ]
      : [];

  let products = state.products;
  const movements: StockMovement[] = [];
  if (state.settings?.trackStock ?? true) {
    const byId = new Map(products.map((p) => [p.id, p]));
    for (const item of sale.items) {
      const p = byId.get(item.productId)!;
      const after = p.stockQuantity - item.quantity;
      movements.push({
        id: ctx.id(),
        productId: p.id,
        type: 'sale',
        change: -item.quantity,
        quantityBefore: p.stockQuantity,
        quantityAfter: after,
        saleId: sale.id,
        createdAt: now,
      });
      byId.set(p.id, { ...p, stockQuantity: after, updatedAt: now });
    }
    products = products.map((p) => byId.get(p.id)!);
  }

  return {
    state: {
      ...state,
      sales: [...state.sales, sale],
      payments: [...state.payments, ...payments],
      products,
      stockMovements: [...state.stockMovements, ...movements],
      counters: { ...state.counters, receipt: receiptNumber },
    },
    sale,
  };
}

export function paymentsForSale(state: Pick<DbState, 'payments'>, saleId: string): Payment[] {
  return state.payments.filter((p) => p.saleId === saleId);
}

export function amountPaid(state: Pick<DbState, 'payments'>, saleId: string): Money {
  return sumMoney(paymentsForSale(state, saleId).map((p) => p.amount));
}

/** saleId → total paid, for rendering long lists without rescanning payments per row */
export function paidBySale(payments: Payment[]): Map<string, Money> {
  const m = new Map<string, Money>();
  for (const p of payments) m.set(p.saleId, (m.get(p.saleId) ?? 0) + p.amount);
  return m;
}

export function paymentStatus(total: Money, paid: Money): PaymentStatus {
  if (paid >= total) return 'paid';
  return paid > 0 ? 'partial' : 'unpaid';
}

/** Records a later payment against an outstanding balance. */
export function recordPayment(
  state: DbState,
  saleId: string,
  input: PaymentInput,
  ctx: Ctx,
): { state: DbState; payment: Payment } {
  const sale = state.sales.find((s) => s.id === saleId);
  if (!sale) throw new ValidationError('Sale not found.');
  const balance = sale.total - amountPaid(state, saleId);
  if (balance <= 0) throw new ValidationError('This sale is already fully paid.');
  if (input.amount <= 0) throw new ValidationError('Enter an amount greater than zero.');
  validatePayment(input, balance);
  const payment: Payment = {
    id: ctx.id(),
    saleId,
    method: input.method,
    amount: input.amount,
    tendered: input.method === 'cash' ? input.tendered : undefined,
    reference: cleanOptional(input.reference),
    receivedAt: ctx.now().toISOString(),
  };
  return { state: { ...state, payments: [...state.payments, payment] }, payment };
}

export function formatReceiptNumber(n: number): string {
  return '#' + String(n).padStart(4, '0');
}
