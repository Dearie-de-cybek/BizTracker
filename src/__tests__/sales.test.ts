import { customerStats, lowStockProducts, stockFromMovements, summarizeSales, todayRange } from '@/domain/analytics';
import { updateProduct } from '@/domain/catalog';
import { amountPaid, createSale, DuplicateSaleError, paymentStatus, priceCart, recordPayment } from '@/domain/sales';
import { ValidationError } from '@/domain/validation';
import { ids, shopState, testCtx } from './fixtures';

const cash = (amount: number, tendered?: number) => ({ method: 'cash' as const, amount, tendered });

describe('createSale', () => {
  it('records items, payment, stock movements and updates stock atomically', () => {
    const ctx = testCtx();
    const s0 = shopState(ctx);
    const { indomie, peak } = ids(s0);
    const { state, sale } = createSale(
      s0,
      {
        requestId: 'r1',
        lines: [
          { productId: indomie, quantity: 4 },
          { productId: peak, quantity: 2 },
        ],
        customerId: null,
        discount: { type: 'none' },
        payment: cash(230000, 250000),
      },
      ctx,
    );
    expect(sale.subtotal).toBe(4 * 25000 + 2 * 65000);
    expect(sale.total).toBe(230000);
    expect(sale.costOfGoods).toBe(4 * 19000 + 2 * 52000);
    expect(sale.receiptNumber).toBe(1);
    expect(state.products.find((p) => p.id === indomie)!.stockQuantity).toBe(36);
    expect(state.products.find((p) => p.id === peak)!.stockQuantity).toBe(4);
    expect(state.stockMovements.filter((m) => m.saleId === sale.id)).toHaveLength(2);
    expect(amountPaid(state, sale.id)).toBe(230000);
    // Ledger and cached stock agree
    for (const p of state.products) expect(stockFromMovements(state, p.id)).toBe(p.stockQuantity);
    // Input state untouched
    expect(s0.products.find((p) => p.id === indomie)!.stockQuantity).toBe(40);
  });

  it('rejects sales exceeding available stock, including duplicate lines', () => {
    const ctx = testCtx();
    const s0 = shopState(ctx);
    const { peak } = ids(s0);
    expect(() =>
      createSale(
        s0,
        {
          requestId: 'r1',
          lines: [
            { productId: peak, quantity: 4 },
            { productId: peak, quantity: 3 },
          ],
          customerId: null,
          discount: { type: 'none' },
          payment: cash(0),
        },
        ctx,
      ),
    ).toThrow('Only 6 in stock.');
  });

  it('rejects invalid quantities and empty carts', () => {
    const ctx = testCtx();
    const s0 = shopState(ctx);
    const base = { requestId: 'r', customerId: null, discount: { type: 'none' as const }, payment: cash(0) };
    expect(() => createSale(s0, { ...base, lines: [] }, ctx)).toThrow(ValidationError);
    expect(() => createSale(s0, { ...base, lines: [{ productId: ids(s0).indomie, quantity: 0 }] }, ctx)).toThrow(
      'Quantity must be at least 1.',
    );
    expect(() => createSale(s0, { ...base, lines: [{ productId: ids(s0).indomie, quantity: 1.5 }] }, ctx)).toThrow();
  });

  it('prevents the same checkout being saved twice', () => {
    const ctx = testCtx();
    const s0 = shopState(ctx);
    const input = {
      requestId: 'same',
      lines: [{ productId: ids(s0).indomie, quantity: 1 }],
      customerId: null,
      discount: { type: 'none' as const },
      payment: cash(25000),
    };
    const { state } = createSale(s0, input, ctx);
    expect(() => createSale(state, input, ctx)).toThrow(DuplicateSaleError);
  });

  it('applies percentage and fixed discounts and reduces profit accordingly', () => {
    const ctx = testCtx();
    const s0 = shopState(ctx);
    const lines = [{ productId: ids(s0).indomie, quantity: 3 }]; // 75,000 kobo
    const pct = priceCart(s0, lines, { type: 'percent', basisPoints: 1000 });
    expect(pct.discountAmount).toBe(7500);
    expect(pct.total).toBe(67500);
    const amt = priceCart(s0, lines, { type: 'amount', amount: 999999 });
    expect(amt.discountAmount).toBe(75000); // capped at subtotal
    const { state } = createSale(
      s0,
      { requestId: 'd', lines, customerId: null, discount: { type: 'percent', basisPoints: 1000 }, payment: cash(67500) },
      ctx,
    );
    const sum = summarizeSales(state, todayRange(ctx.now()));
    expect(sum.revenue).toBe(67500);
    expect(sum.discounts).toBe(7500);
    expect(sum.costOfGoods).toBe(57000);
    expect(sum.grossProfit).toBe(10500);
  });

  it('does not report profit when a sold item has no cost price', () => {
    const ctx = testCtx();
    const s0 = shopState(ctx);
    const { state } = createSale(
      s0,
      {
        requestId: 'x',
        lines: [{ productId: ids(s0).semo, quantity: 1 }],
        customerId: null,
        discount: { type: 'none' },
        payment: cash(180000),
      },
      ctx,
    );
    const sum = summarizeSales(state, todayRange(ctx.now()));
    expect(sum.revenue).toBe(180000);
    expect(sum.grossProfit).toBeNull();
    expect(sum.salesMissingCost).toBe(1);
  });

  it('requires a named customer for credit sales and tracks the balance', () => {
    const ctx = testCtx();
    const s0 = shopState(ctx);
    const { peak, chioma } = ids(s0);
    const input = {
      requestId: 'c',
      lines: [{ productId: peak, quantity: 2 }],
      customerId: null,
      discount: { type: 'none' as const },
      payment: { method: 'transfer' as const, amount: 50000 },
    };
    expect(() => createSale(s0, input, ctx)).toThrow('Select a customer');
    const { state, sale } = createSale(s0, { ...input, customerId: chioma }, ctx);
    expect(paymentStatus(sale.total, amountPaid(state, sale.id))).toBe('partial');
    expect(customerStats(state, chioma)).toMatchObject({ purchases: 1, totalSpent: 130000, paid: 50000, outstanding: 80000 });

    expect(() => recordPayment(state, sale.id, cash(90000), ctx)).toThrow('more than the amount due');
    const after = recordPayment(state, sale.id, cash(80000), ctx).state;
    expect(paymentStatus(sale.total, amountPaid(after, sale.id))).toBe('paid');
    expect(customerStats(after, chioma).outstanding).toBe(0);
  });

  it('rejects overpayment and insufficient cash tendered', () => {
    const ctx = testCtx();
    const s0 = shopState(ctx);
    const base = { requestId: 'o', lines: [{ productId: ids(s0).indomie, quantity: 1 }], customerId: null, discount: { type: 'none' as const } };
    expect(() => createSale(s0, { ...base, payment: cash(30000) }, ctx)).toThrow('more than the amount due');
    expect(() => createSale(s0, { ...base, payment: cash(25000, 20000) }, ctx)).toThrow('Cash received is less');
  });

  it('keeps historical sale details when the product is edited later', () => {
    const ctx = testCtx();
    const s0 = shopState(ctx);
    const { indomie } = ids(s0);
    const { state, sale } = createSale(
      s0,
      { requestId: 'h', lines: [{ productId: indomie, quantity: 1 }], customerId: null, discount: { type: 'none' }, payment: cash(25000) },
      ctx,
    );
    const edited = updateProduct(
      state,
      indomie,
      { name: 'Indomie Super Pack', categoryId: null, sellingPrice: 40000, costPrice: 30000, lowStockThreshold: null },
      ctx,
    );
    const stored = edited.sales.find((x) => x.id === sale.id)!;
    expect(stored.items[0]).toMatchObject({ productName: 'Indomie Noodles (70g)', unitPrice: 25000, costPrice: 19000 });
    expect(summarizeSales(edited, todayRange(ctx.now())).grossProfit).toBe(6000);
  });

  it('flags low and out-of-stock products', () => {
    const ctx = testCtx();
    const s0 = shopState(ctx);
    // Peak: 6 (threshold 5) ok → sell 1 → 5 low. Semovita: 3 (own threshold 2) ok.
    expect(lowStockProducts(s0).map((p) => p.name)).toEqual([]);
    const { state } = createSale(
      s0,
      { requestId: 'l', lines: [{ productId: ids(s0).peak, quantity: 1 }], customerId: null, discount: { type: 'none' }, payment: cash(65000) },
      ctx,
    );
    expect(lowStockProducts(state).map((p) => p.name)).toEqual(['Peak Milk Tin']);
  });

  it('skips stock checks and movements when stock tracking is off', () => {
    const ctx = testCtx();
    const s0 = shopState(ctx);
    const s1 = { ...s0, settings: { ...s0.settings!, trackStock: false } };
    const { state } = createSale(
      s1,
      { requestId: 't', lines: [{ productId: ids(s0).semo, quantity: 10 }], customerId: null, discount: { type: 'none' }, payment: cash(1800000) },
      ctx,
    );
    expect(state.stockMovements.filter((m) => m.type === 'sale')).toHaveLength(0);
    expect(state.products.find((p) => p.id === ids(s0).semo)!.stockQuantity).toBe(3);
  });
});
