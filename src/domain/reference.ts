import type { AdjustmentReason, BusinessType, PaymentMethod, Weekday } from './types';

export const BUSINESS_TYPES: { value: BusinessType; label: string }[] = [
  { value: 'grocery', label: 'Grocery store' },
  { value: 'supermarket', label: 'Supermarket' },
  { value: 'fashion', label: 'Fashion & clothing' },
  { value: 'electronics', label: 'Electronics' },
  { value: 'pharmacy', label: 'Pharmacy' },
  { value: 'food_beverage', label: 'Food & beverages' },
  { value: 'beauty', label: 'Beauty & cosmetics' },
  { value: 'general', label: 'General merchandise' },
  { value: 'other', label: 'Other' },
];

export interface Country {
  code: string;
  name: string;
  dialCode: string;
  currencyCode: string;
}

export const COUNTRIES: Country[] = [
  { code: 'NG', name: 'Nigeria', dialCode: '+234', currencyCode: 'NGN' },
  { code: 'GH', name: 'Ghana', dialCode: '+233', currencyCode: 'GHS' },
  { code: 'KE', name: 'Kenya', dialCode: '+254', currencyCode: 'KES' },
  { code: 'ZA', name: 'South Africa', dialCode: '+27', currencyCode: 'ZAR' },
  { code: 'BJ', name: 'Benin', dialCode: '+229', currencyCode: 'XOF' },
  { code: 'CI', name: "Côte d'Ivoire", dialCode: '+225', currencyCode: 'XOF' },
  { code: 'SN', name: 'Senegal', dialCode: '+221', currencyCode: 'XOF' },
  { code: 'CM', name: 'Cameroon', dialCode: '+237', currencyCode: 'XAF' },
  { code: 'EG', name: 'Egypt', dialCode: '+20', currencyCode: 'EGP' },
  { code: 'GB', name: 'United Kingdom', dialCode: '+44', currencyCode: 'GBP' },
  { code: 'US', name: 'United States', dialCode: '+1', currencyCode: 'USD' },
  { code: 'CA', name: 'Canada', dialCode: '+1', currencyCode: 'CAD' },
  { code: 'IE', name: 'Ireland', dialCode: '+353', currencyCode: 'EUR' },
  { code: 'IN', name: 'India', dialCode: '+91', currencyCode: 'INR' },
  { code: 'AE', name: 'United Arab Emirates', dialCode: '+971', currencyCode: 'AED' },
];

export function getCountry(code: string): Country | undefined {
  return COUNTRIES.find((c) => c.code === code);
}

export const WEEKDAYS: { value: Weekday; short: string }[] = [
  { value: 'mon', short: 'Mon' },
  { value: 'tue', short: 'Tue' },
  { value: 'wed', short: 'Wed' },
  { value: 'thu', short: 'Thu' },
  { value: 'fri', short: 'Fri' },
  { value: 'sat', short: 'Sat' },
  { value: 'sun', short: 'Sun' },
];

export const PAYMENT_METHODS: { value: PaymentMethod; label: string; hint: string }[] = [
  { value: 'cash', label: 'Cash', hint: 'Cash received at the counter' },
  { value: 'transfer', label: 'Bank transfer', hint: 'Confirm the transfer in your bank app first' },
  { value: 'pos', label: 'POS / card', hint: 'Paid on a separate POS terminal' },
  { value: 'other', label: 'Other', hint: 'Any other payment you record yourself' },
];

export function paymentMethodLabel(m: PaymentMethod): string {
  return PAYMENT_METHODS.find((p) => p.value === m)?.label ?? m;
}

export const ADJUSTMENT_REASONS: { value: AdjustmentReason; label: string; direction: 'in' | 'out' | 'any' }[] = [
  { value: 'restock', label: 'New stock received', direction: 'in' },
  { value: 'returned', label: 'Returned by customer', direction: 'in' },
  { value: 'count_correction', label: 'Stock count correction', direction: 'any' },
  { value: 'damaged', label: 'Damaged', direction: 'out' },
  { value: 'expired', label: 'Expired', direction: 'out' },
  { value: 'lost', label: 'Lost or stolen', direction: 'out' },
  { value: 'other', label: 'Other', direction: 'any' },
];

export function adjustmentReasonLabel(r: AdjustmentReason | undefined): string {
  return ADJUSTMENT_REASONS.find((a) => a.value === r)?.label ?? 'Adjustment';
}

export function businessTypeLabel(t: BusinessType, other?: string): string {
  if (t === 'other' && other) return other;
  return BUSINESS_TYPES.find((b) => b.value === t)?.label ?? t;
}
