/**
 * Domain models. All money values are integers in the currency's minor unit
 * (e.g. kobo for NGN). Quantities are whole units.
 */

export type ID = string;
/** ISO-8601 timestamp */
export type Timestamp = string;
/** Integer amount in minor currency units */
export type Money = number;

export type BusinessType =
  | 'grocery'
  | 'supermarket'
  | 'fashion'
  | 'electronics'
  | 'pharmacy'
  | 'food_beverage'
  | 'beauty'
  | 'general'
  | 'other';

export type Weekday = 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat' | 'sun';

export interface OpeningHours {
  days: Weekday[];
  /** 24h "HH:MM" */
  opens: string;
  closes: string;
}

export interface Business {
  id: ID;
  name: string;
  type: BusinessType;
  /** Free text when type is "other" */
  typeOther?: string;
  address: string;
  countryCode: string;
  currencyCode: string;
  description?: string;
  phone: string;
  email?: string;
  logoUri?: string;
  ownerName: string;
  openingHours?: OpeningHours;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface ReceiptSettings {
  showLogo: boolean;
  showAddress: boolean;
  showPhone: boolean;
  footerMessage: string;
}

export interface BusinessSettings {
  trackStock: boolean;
  lowStockAlerts: boolean;
  /** Default threshold when a product has no own threshold */
  lowStockThreshold: number;
  useSkus: boolean;
  /** Informational only — BizTracker does not calculate tax yet */
  pricesIncludeTax: boolean;
  receipt: ReceiptSettings;
  openingInventory: 'add_now' | 'empty';
}

export interface ProductCategory {
  id: ID;
  name: string;
  createdAt: Timestamp;
}

export interface Product {
  id: ID;
  name: string;
  categoryId: ID | null;
  sellingPrice: Money;
  /** null when the owner has not recorded a cost; profit can't be computed */
  costPrice: Money | null;
  sku?: string;
  barcode?: string;
  stockQuantity: number;
  /** Overrides the business default when set */
  lowStockThreshold: number | null;
  imageUri?: string;
  unit?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Customer {
  id: ID;
  name: string;
  phone?: string;
  email?: string;
  address?: string;
  note?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/** Snapshot of the product at sale time — later product edits must not change it. */
export interface SaleItem {
  id: ID;
  productId: ID;
  productName: string;
  sku?: string;
  unitPrice: Money;
  costPrice: Money | null;
  quantity: number;
  lineTotal: Money;
}

export type DiscountInput =
  | { type: 'none' }
  | { type: 'amount'; amount: Money }
  /** basis points: 1000 = 10% */
  | { type: 'percent'; basisPoints: number };

export type PaymentMethod = 'cash' | 'transfer' | 'pos' | 'other';

export type PaymentStatus = 'paid' | 'partial' | 'unpaid';

export interface Sale {
  id: ID;
  receiptNumber: number;
  /** Client-generated key that prevents the same checkout being saved twice */
  requestId: string;
  customerId: ID | null;
  /** Snapshot so history survives customer edits */
  customerName: string | null;
  items: SaleItem[];
  subtotal: Money;
  discount: DiscountInput;
  discountAmount: Money;
  total: Money;
  /** Sum of item cost; null when any item lacks a cost price */
  costOfGoods: Money | null;
  note?: string;
  createdAt: Timestamp;
}

export interface Payment {
  id: ID;
  saleId: ID;
  method: PaymentMethod;
  amount: Money;
  /** Cash handed over by the customer (cash only), for change calculation */
  tendered?: Money;
  reference?: string;
  receivedAt: Timestamp;
}

export type StockMovementType = 'opening' | 'sale' | 'adjustment';

export type AdjustmentReason =
  | 'restock'
  | 'count_correction'
  | 'damaged'
  | 'expired'
  | 'lost'
  | 'returned'
  | 'other';

export interface StockMovement {
  id: ID;
  productId: ID;
  type: StockMovementType;
  reason?: AdjustmentReason;
  /** Signed change in units */
  change: number;
  quantityBefore: number;
  quantityAfter: number;
  saleId?: ID;
  note?: string;
  createdAt: Timestamp;
}

export interface DbState {
  schemaVersion: 1;
  onboardingCompletedAt: Timestamp | null;
  setupCompletedAt: Timestamp | null;
  business: Business | null;
  settings: BusinessSettings | null;
  categories: ProductCategory[];
  products: Product[];
  customers: Customer[];
  /** Newest last */
  sales: Sale[];
  payments: Payment[];
  stockMovements: StockMovement[];
  counters: { receipt: number };
}

/** Injected clock + id generator so services are deterministic under test. */
export interface Ctx {
  now: () => Date;
  id: () => string;
}
