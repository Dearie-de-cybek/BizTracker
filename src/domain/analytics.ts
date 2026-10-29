import { sumMoney } from './money';
import type { BusinessSettings, DbState, Money, Product, Sale } from './types';

export interface DateRange {
  from: Date | null;
  to: Date | null;
}

export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function addDays(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}

export function inRange(iso: string, r: DateRange): boolean {
  const t = new Date(iso).getTime();
  if (r.from && t < r.from.getTime()) return false;
  if (r.to && t >= r.to.getTime()) return false;
  return true;
}

export function todayRange(now: Date): DateRange {
  const from = startOfDay(now);
  return { from, to: addDays(from, 1) };
}

export interface SalesSummary {
  transactions: number;
  /** Net revenue: sales totals after discounts */
  revenue: Money;
  discounts: Money;
  /** Payments actually received during the range (may relate to earlier sales) */
  paymentsReceived: Money;
  /** Cost of goods; null when any sale in range lacks cost data */
  costOfGoods: Money | null;
  /** revenue − cost of goods; null when cost is unknown */
  grossProfit: Money | null;
  /** Sales in range that lack cost data */
  salesMissingCost: number;
}

export function summarizeSales(state: Pick<DbState, 'sales' | 'payments'>, range: DateRange): SalesSummary {
  const sales = state.sales.filter((s) => inRange(s.createdAt, range));
  const missing = sales.filter((s) => s.costOfGoods == null).length;
  const revenue = sumMoney(sales.map((s) => s.total));
  const cogs = missing ? null : sumMoney(sales.map((s) => s.costOfGoods as number));
  return {
    transactions: sales.length,
    revenue,
    discounts: sumMoney(sales.map((s) => s.discountAmount)),
    paymentsReceived: sumMoney(state.payments.filter((p) => inRange(p.receivedAt, range)).map((p) => p.amount)),
    costOfGoods: cogs,
    grossProfit: cogs == null ? null : revenue - cogs,
    salesMissingCost: missing,
  };
}

/** Revenue per day for the last `days` days, oldest first. */
export function dailyRevenue(sales: Sale[], now: Date, days = 7): { date: Date; revenue: Money; count: number }[] {
  const start = addDays(startOfDay(now), -(days - 1));
  const out = Array.from({ length: days }, (_, i) => ({ date: addDays(start, i), revenue: 0, count: 0 }));
  for (const s of sales) {
    // Math.round guards against DST days that are 23 or 25 hours long
    const i = Math.round((startOfDay(new Date(s.createdAt)).getTime() - start.getTime()) / 86_400_000);
    if (i >= 0 && i < days) {
      out[i].revenue += s.total;
      out[i].count += 1;
    }
  }
  return out;
}

export function lowStockThresholdFor(p: Product, settings: BusinessSettings | null): number {
  return p.lowStockThreshold ?? settings?.lowStockThreshold ?? 5;
}

export type StockLevel = 'ok' | 'low' | 'out' | 'untracked';

export function stockLevel(p: Product, settings: BusinessSettings | null): StockLevel {
  if (settings && !settings.trackStock) return 'untracked';
  if (p.stockQuantity <= 0) return 'out';
  if ((settings?.lowStockAlerts ?? true) && p.stockQuantity <= lowStockThresholdFor(p, settings)) return 'low';
  return 'ok';
}

export function lowStockProducts(state: Pick<DbState, 'products' | 'settings'>): Product[] {
  return state.products.filter((p) => {
    const l = stockLevel(p, state.settings);
    return l === 'low' || l === 'out';
  });
}

export interface CustomerStats {
  purchases: number;
  totalSpent: Money;
  paid: Money;
  outstanding: Money;
  lastPurchaseAt: string | null;
}

export function customerStats(state: Pick<DbState, 'sales' | 'payments'>, customerId: string): CustomerStats {
  const sales = state.sales.filter((s) => s.customerId === customerId);
  const ids = new Set(sales.map((s) => s.id));
  const totalSpent = sumMoney(sales.map((s) => s.total));
  const paid = sumMoney(state.payments.filter((p) => ids.has(p.saleId)).map((p) => p.amount));
  return {
    purchases: sales.length,
    totalSpent,
    paid,
    outstanding: totalSpent - paid,
    lastPurchaseAt: sales.length ? sales[sales.length - 1].createdAt : null,
  };
}

/** Recomputes stock from the movement ledger — used to verify consistency. */
export function stockFromMovements(state: Pick<DbState, 'stockMovements'>, productId: string): number {
  return state.stockMovements.filter((m) => m.productId === productId).reduce((a, m) => a + m.change, 0);
}
