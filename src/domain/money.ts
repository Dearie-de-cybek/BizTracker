import type { Money } from './types';

/**
 * Currency precision strategy: every amount is stored as an integer count of
 * minor units (kobo, cents…). Parsing works on strings so user input never
 * passes through binary floating point. Percentages use basis points and
 * round half-up to the nearest minor unit.
 */

export interface Currency {
  code: string;
  name: string;
  symbol: string;
  /** Number of minor-unit digits (2 for NGN kobo, 0 for XOF) */
  decimals: number;
}

export const CURRENCIES: Currency[] = [
  { code: 'NGN', name: 'Nigerian naira', symbol: '₦', decimals: 2 },
  { code: 'GHS', name: 'Ghanaian cedi', symbol: 'GH₵', decimals: 2 },
  { code: 'KES', name: 'Kenyan shilling', symbol: 'KSh', decimals: 2 },
  { code: 'ZAR', name: 'South African rand', symbol: 'R', decimals: 2 },
  { code: 'XOF', name: 'West African CFA franc', symbol: 'CFA', decimals: 0 },
  { code: 'XAF', name: 'Central African CFA franc', symbol: 'FCFA', decimals: 0 },
  { code: 'EGP', name: 'Egyptian pound', symbol: 'E£', decimals: 2 },
  { code: 'USD', name: 'US dollar', symbol: '$', decimals: 2 },
  { code: 'GBP', name: 'British pound', symbol: '£', decimals: 2 },
  { code: 'EUR', name: 'Euro', symbol: '€', decimals: 2 },
  { code: 'CAD', name: 'Canadian dollar', symbol: 'CA$', decimals: 2 },
  { code: 'INR', name: 'Indian rupee', symbol: '₹', decimals: 2 },
  { code: 'AED', name: 'UAE dirham', symbol: 'AED', decimals: 2 },
];

export function getCurrency(code: string): Currency {
  return CURRENCIES.find((c) => c.code === code) ?? { code, name: code, symbol: code, decimals: 2 };
}

/** Parse user-entered text ("1,250.50") into minor units. Returns null if invalid. */
export function parseMoney(input: string, decimals: number): Money | null {
  const cleaned = input.replace(/[\s,]/g, '');
  if (cleaned === '') return null;
  const re = decimals > 0 ? new RegExp(`^(\\d+)(?:\\.(\\d{0,${decimals}}))?$`) : /^(\d+)$/;
  const m = cleaned.match(re);
  if (!m) return null;
  const whole = m[1];
  const frac = (m[2] ?? '').padEnd(decimals, '0');
  const value = Number(whole + frac);
  if (!Number.isSafeInteger(value)) return null;
  return value;
}

function group(digits: string): string {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/** Plain decimal string without symbol, e.g. 125050 → "1,250.50" */
export function formatAmount(minor: Money, decimals: number, opts: { grouping?: boolean } = {}): string {
  const negative = minor < 0;
  const abs = Math.abs(Math.trunc(minor)).toString();
  let whole = abs;
  let frac = '';
  if (decimals > 0) {
    const padded = abs.padStart(decimals + 1, '0');
    whole = padded.slice(0, -decimals);
    frac = padded.slice(-decimals);
  }
  const w = opts.grouping === false ? whole : group(whole);
  return (negative ? '-' : '') + w + (frac ? '.' + frac : '');
}

/** Amount for an editable input (no grouping, trailing ".00" dropped) */
export function toInputValue(minor: Money | null | undefined, decimals: number): string {
  if (minor == null) return '';
  const s = formatAmount(minor, decimals, { grouping: false });
  return s.endsWith('.' + '0'.repeat(decimals)) ? s.slice(0, -(decimals + 1)) : s;
}

export function formatMoney(minor: Money, currencyCode: string, opts: { compact?: boolean } = {}): string {
  const c = getCurrency(currencyCode);
  const negative = minor < 0;
  const abs = Math.abs(minor);
  let body: string;
  if (opts.compact && abs >= 1_000_000 * 10 ** c.decimals) {
    body = formatScaled(abs, c.decimals, 1_000_000) + 'm';
  } else if (opts.compact && abs >= 100_000 * 10 ** c.decimals) {
    body = formatScaled(abs, c.decimals, 1_000) + 'k';
  } else {
    body = formatAmount(abs, c.decimals);
  }
  return (negative ? '-' : '') + c.symbol + body;
}

function formatScaled(abs: number, decimals: number, scale: number): string {
  // One decimal place, computed with integers
  const unit = 10 ** decimals * scale;
  const tenths = Math.round((abs * 10) / unit);
  const whole = Math.floor(tenths / 10);
  const rem = tenths % 10;
  return group(String(whole)) + (rem ? '.' + rem : '');
}

/** value × basisPoints / 10000, rounded half-up. Inputs must be non-negative integers. */
export function applyBasisPoints(value: Money, basisPoints: number): Money {
  return Math.floor((value * basisPoints + 5000) / 10000);
}

/** Parse "7.5" → 750 basis points. Returns null when outside 0–100%. */
export function parsePercent(input: string): number | null {
  const m = input.trim().match(/^(\d{1,3})(?:\.(\d{0,2}))?$/);
  if (!m) return null;
  const bp = Number(m[1]) * 100 + Number((m[2] ?? '').padEnd(2, '0'));
  return bp <= 10000 ? bp : null;
}

export function sumMoney(values: Money[]): Money {
  return values.reduce((a, b) => a + b, 0);
}
