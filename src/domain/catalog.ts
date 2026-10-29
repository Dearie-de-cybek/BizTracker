import type { AdjustmentReason, Ctx, Customer, DbState, Money, Product, ProductCategory, StockMovement } from './types';
import { cleanOptional, FieldErrors, hasErrors, isValidEmail, isValidPhone, ValidationError } from './validation';

// ---------- Categories ----------

export function createCategory(state: DbState, name: string, ctx: Ctx): { state: DbState; category: ProductCategory } {
  const clean = name.trim();
  if (!clean) throw new ValidationError('Enter a category name.', { name: 'Enter a category name.' });
  const existing = state.categories.find((c) => c.name.toLowerCase() === clean.toLowerCase());
  if (existing) return { state, category: existing };
  const category: ProductCategory = { id: ctx.id(), name: clean, createdAt: ctx.now().toISOString() };
  return { state: { ...state, categories: [...state.categories, category] }, category };
}

// ---------- Products ----------

export interface ProductInput {
  name: string;
  categoryId: string | null;
  sellingPrice: Money | null;
  costPrice: Money | null;
  sku?: string;
  barcode?: string;
  /** Only used when creating */
  openingStock?: number | null;
  lowStockThreshold: number | null;
  imageUri?: string;
  unit?: string;
}

export type ProductField = 'name' | 'sellingPrice' | 'costPrice' | 'sku' | 'barcode' | 'openingStock' | 'lowStockThreshold' | 'categoryId';

export function validateProduct(state: DbState, input: ProductInput, editingId?: string): FieldErrors<ProductField> {
  const e: FieldErrors<ProductField> = {};
  if (!input.name.trim()) e.name = 'Enter a product name.';
  if (input.sellingPrice == null) e.sellingPrice = 'Enter a valid selling price.';
  else if (!Number.isSafeInteger(input.sellingPrice) || input.sellingPrice < 0) e.sellingPrice = 'Price cannot be negative.';
  if (input.costPrice != null && (!Number.isSafeInteger(input.costPrice) || input.costPrice < 0))
    e.costPrice = 'Cost cannot be negative.';
  if (input.openingStock != null && (!Number.isSafeInteger(input.openingStock) || input.openingStock < 0))
    e.openingStock = 'Enter a whole number of units.';
  if (input.lowStockThreshold != null && (!Number.isSafeInteger(input.lowStockThreshold) || input.lowStockThreshold < 0))
    e.lowStockThreshold = 'Enter a whole number.';
  if (input.categoryId && !state.categories.some((c) => c.id === input.categoryId)) e.categoryId = 'Category not found.';
  const others = state.products.filter((p) => p.id !== editingId);
  const sku = input.sku?.trim().toLowerCase();
  if (sku && others.some((p) => p.sku?.toLowerCase() === sku)) e.sku = 'Another product already uses this SKU.';
  const barcode = input.barcode?.trim();
  if (barcode && others.some((p) => p.barcode === barcode)) e.barcode = 'Another product already uses this barcode.';
  return e;
}

export function createProduct(state: DbState, input: ProductInput, ctx: Ctx): { state: DbState; product: Product } {
  const errors = validateProduct(state, input);
  if (hasErrors(errors)) throw new ValidationError('Check the highlighted fields.', errors);
  const now = ctx.now().toISOString();
  const opening = input.openingStock ?? 0;
  const product: Product = {
    id: ctx.id(),
    name: input.name.trim(),
    categoryId: input.categoryId,
    sellingPrice: input.sellingPrice!,
    costPrice: input.costPrice,
    sku: cleanOptional(input.sku),
    barcode: cleanOptional(input.barcode),
    stockQuantity: opening,
    lowStockThreshold: input.lowStockThreshold,
    imageUri: input.imageUri,
    unit: cleanOptional(input.unit),
    createdAt: now,
    updatedAt: now,
  };
  const movements: StockMovement[] =
    opening > 0
      ? [
          {
            id: ctx.id(),
            productId: product.id,
            type: 'opening',
            change: opening,
            quantityBefore: 0,
            quantityAfter: opening,
            createdAt: now,
          },
        ]
      : [];
  return {
    state: {
      ...state,
      products: [...state.products, product],
      stockMovements: [...state.stockMovements, ...movements],
    },
    product,
  };
}

/** Edits product details. Stock is never changed here — use adjustStock so a movement is recorded. */
export function updateProduct(state: DbState, id: string, input: ProductInput, ctx: Ctx): DbState {
  const current = state.products.find((p) => p.id === id);
  if (!current) throw new ValidationError('This product no longer exists.');
  const errors = validateProduct(state, { ...input, openingStock: null }, id);
  if (hasErrors(errors)) throw new ValidationError('Check the highlighted fields.', errors);
  const updated: Product = {
    ...current,
    name: input.name.trim(),
    categoryId: input.categoryId,
    sellingPrice: input.sellingPrice!,
    costPrice: input.costPrice,
    sku: cleanOptional(input.sku),
    barcode: cleanOptional(input.barcode),
    lowStockThreshold: input.lowStockThreshold,
    imageUri: input.imageUri,
    unit: cleanOptional(input.unit),
    updatedAt: ctx.now().toISOString(),
  };
  return { ...state, products: state.products.map((p) => (p.id === id ? updated : p)) };
}

export interface StockAdjustmentInput {
  productId: string;
  mode: 'add' | 'remove' | 'set';
  quantity: number;
  reason: AdjustmentReason;
  note?: string;
}

export function adjustStock(
  state: DbState,
  input: StockAdjustmentInput,
  ctx: Ctx,
): { state: DbState; movement: StockMovement } {
  const product = state.products.find((p) => p.id === input.productId);
  if (!product) throw new ValidationError('This product no longer exists.');
  if (!Number.isSafeInteger(input.quantity) || input.quantity < 0)
    throw new ValidationError('Enter a whole number of units.', { quantity: 'Enter a whole number of units.' });
  const before = product.stockQuantity;
  const after =
    input.mode === 'add' ? before + input.quantity : input.mode === 'remove' ? before - input.quantity : input.quantity;
  if (after < 0)
    throw new ValidationError(`Only ${before} in stock — you can't remove ${input.quantity}.`, {
      quantity: `Only ${before} in stock.`,
    });
  if (after === before) throw new ValidationError('This adjustment does not change the stock.', { quantity: 'No change.' });
  if (input.reason === 'other' && !input.note?.trim())
    throw new ValidationError('Add a note explaining the adjustment.', { note: 'Add a short note.' });
  const now = ctx.now().toISOString();
  const movement: StockMovement = {
    id: ctx.id(),
    productId: product.id,
    type: 'adjustment',
    reason: input.reason,
    change: after - before,
    quantityBefore: before,
    quantityAfter: after,
    note: cleanOptional(input.note),
    createdAt: now,
  };
  return {
    state: {
      ...state,
      products: state.products.map((p) => (p.id === product.id ? { ...p, stockQuantity: after, updatedAt: now } : p)),
      stockMovements: [...state.stockMovements, movement],
    },
    movement,
  };
}

// ---------- Customers ----------

export interface CustomerInput {
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  note?: string;
}

export type CustomerField = keyof CustomerInput;

export function validateCustomer(state: DbState, input: CustomerInput, editingId?: string): FieldErrors<CustomerField> {
  const e: FieldErrors<CustomerField> = {};
  if (!input.name.trim()) e.name = 'Enter the customer name.';
  const phone = input.phone?.trim();
  if (phone && !isValidPhone(phone)) e.phone = 'Enter a valid phone number.';
  else if (phone) {
    const digits = phone.replace(/\D/g, '');
    const dup = state.customers.find((c) => c.id !== editingId && c.phone && c.phone.replace(/\D/g, '') === digits);
    if (dup) e.phone = `${dup.name} already uses this number.`;
  }
  if (input.email?.trim() && !isValidEmail(input.email)) e.email = 'Enter a valid email.';
  return e;
}

export function createCustomer(state: DbState, input: CustomerInput, ctx: Ctx): { state: DbState; customer: Customer } {
  const errors = validateCustomer(state, input);
  if (hasErrors(errors)) throw new ValidationError('Check the highlighted fields.', errors);
  const now = ctx.now().toISOString();
  const customer: Customer = {
    id: ctx.id(),
    name: input.name.trim(),
    phone: cleanOptional(input.phone),
    email: cleanOptional(input.email),
    address: cleanOptional(input.address),
    note: cleanOptional(input.note),
    createdAt: now,
    updatedAt: now,
  };
  return { state: { ...state, customers: [...state.customers, customer] }, customer };
}

export function updateCustomer(state: DbState, id: string, input: CustomerInput, ctx: Ctx): DbState {
  const current = state.customers.find((c) => c.id === id);
  if (!current) throw new ValidationError('This customer no longer exists.');
  const errors = validateCustomer(state, input, id);
  if (hasErrors(errors)) throw new ValidationError('Check the highlighted fields.', errors);
  const updated: Customer = {
    ...current,
    name: input.name.trim(),
    phone: cleanOptional(input.phone),
    email: cleanOptional(input.email),
    address: cleanOptional(input.address),
    note: cleanOptional(input.note),
    updatedAt: ctx.now().toISOString(),
  };
  return { ...state, customers: state.customers.map((c) => (c.id === id ? updated : c)) };
}
