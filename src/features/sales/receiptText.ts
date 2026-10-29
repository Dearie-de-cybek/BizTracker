import { formatMoney } from '@/domain/money';
import { paymentMethodLabel, WEEKDAYS } from '@/domain/reference';
import { formatReceiptNumber } from '@/domain/sales';
import type { Business, BusinessSettings, Payment, Sale } from '@/domain/types';

/** Plain-text receipt for sharing via WhatsApp/SMS/email. */
export function receiptText(sale: Sale, payments: Payment[], business: Business, settings: BusinessSettings): string {
  const f = (m: number) => formatMoney(m, business.currencyCode);
  const r = settings.receipt;
  const paid = payments.reduce((a, p) => a + p.amount, 0);
  const lines: string[] = [business.name];
  if (r.showAddress) lines.push(business.address);
  if (r.showPhone) lines.push(business.phone);
  if (business.openingHours) {
    const days = WEEKDAYS.filter((d) => business.openingHours!.days.includes(d.value)).map((d) => d.short).join(', ');
    lines.push(`Open ${days} ${business.openingHours.opens}–${business.openingHours.closes}`);
  }
  lines.push('', `Receipt ${formatReceiptNumber(sale.receiptNumber)}`, new Date(sale.createdAt).toLocaleString());
  if (sale.customerName) lines.push(`Customer: ${sale.customerName}`);
  lines.push('');
  for (const i of sale.items) lines.push(`${i.productName}`, `  ${i.quantity} × ${f(i.unitPrice)} = ${f(i.lineTotal)}`);
  lines.push('', `Subtotal: ${f(sale.subtotal)}`);
  if (sale.discountAmount) lines.push(`Discount: -${f(sale.discountAmount)}`);
  lines.push(`TOTAL: ${f(sale.total)}`);
  for (const p of payments) lines.push(`Paid (${paymentMethodLabel(p.method)}): ${f(p.amount)}`);
  if (sale.total - paid > 0) lines.push(`Balance due: ${f(sale.total - paid)}`);
  if (settings.pricesIncludeTax) lines.push('Prices include tax.');
  if (r.footerMessage) lines.push('', r.footerMessage);
  return lines.join('\n');
}
