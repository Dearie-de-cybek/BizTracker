import { formatAmount, getCurrency } from './money';
import { paymentMethodLabel } from './reference';
import { formatReceiptNumber, paidBySale, paymentStatus } from './sales';
import type { DbState } from './types';

function cell(v: string | number | null | undefined): string {
  const s = v == null ? '' : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function toCsv(rows: (string | number | null | undefined)[][]): string {
  return rows.map((r) => r.map(cell).join(',')).join('\n');
}

/** One row per sale item, so each line carries its own price and cost at time of sale. */
export function salesCsv(s: DbState): string {
  const d = getCurrency(s.business?.currencyCode ?? 'NGN').decimals;
  const amt = (m: number | null) => (m == null ? '' : formatAmount(m, d, { grouping: false }));
  const paid = paidBySale(s.payments);
  const methods = new Map<string, string>();
  for (const p of s.payments) methods.set(p.saleId, [methods.get(p.saleId), paymentMethodLabel(p.method)].filter(Boolean).join(' + '));
  const rows: (string | number | null)[][] = [
    ['receipt', 'date', 'customer', 'product', 'sku', 'quantity', 'unit_price', 'unit_cost', 'line_total', 'sale_discount', 'sale_total', 'paid', 'status', 'payment_methods'],
  ];
  for (const sale of s.sales) {
    const p = paid.get(sale.id) ?? 0;
    for (const i of sale.items) {
      rows.push([
        formatReceiptNumber(sale.receiptNumber),
        sale.createdAt,
        sale.customerName ?? 'Walk-in',
        i.productName,
        i.sku ?? '',
        i.quantity,
        amt(i.unitPrice),
        amt(i.costPrice),
        amt(i.lineTotal),
        amt(sale.discountAmount),
        amt(sale.total),
        amt(p),
        paymentStatus(sale.total, p),
        methods.get(sale.id) ?? '',
      ]);
    }
  }
  return toCsv(rows);
}

export function productsCsv(s: DbState): string {
  const d = getCurrency(s.business?.currencyCode ?? 'NGN').decimals;
  const cat = new Map(s.categories.map((c) => [c.id, c.name]));
  return toCsv([
    ['name', 'category', 'sku', 'barcode', 'selling_price', 'cost_price', 'stock', 'unit'],
    ...s.products.map((p) => [
      p.name,
      p.categoryId ? cat.get(p.categoryId) ?? '' : '',
      p.sku ?? '',
      p.barcode ?? '',
      formatAmount(p.sellingPrice, d, { grouping: false }),
      p.costPrice == null ? '' : formatAmount(p.costPrice, d, { grouping: false }),
      p.stockQuantity,
      p.unit ?? '',
    ]),
  ]);
}

export function customersCsv(s: DbState): string {
  return toCsv([
    ['name', 'phone', 'email', 'address', 'note', 'created_at'],
    ...s.customers.map((c) => [c.name, c.phone ?? '', c.email ?? '', c.address ?? '', c.note ?? '', c.createdAt]),
  ]);
}
