export type FieldErrors<K extends string = string> = Partial<Record<K, string>>;

export class ValidationError extends Error {
  constructor(message: string, public fields: FieldErrors = {}) {
    super(message);
    this.name = 'ValidationError';
  }
}

export function hasErrors(e: FieldErrors): boolean {
  return Object.values(e).some(Boolean);
}

/**
 * International-friendly phone check: optional leading +, then digits with
 * common separators. E.164 allows at most 15 digits; 7 is a practical minimum
 * for local numbers.
 */
export function isValidPhone(input: string): boolean {
  const v = input.trim();
  if (!/^\+?[\d\s\-().]+$/.test(v)) return false;
  const digits = v.replace(/\D/g, '');
  return digits.length >= 7 && digits.length <= 15;
}

export function isValidEmail(input: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(input.trim());
}

/** 24-hour "HH:MM" */
export function isValidTime(input: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(input.trim());
}

/** Whole, non-negative quantity from text. Returns null when invalid. */
export function parseQuantity(input: string, { allowZero = true } = {}): number | null {
  const v = input.trim();
  if (!/^\d+$/.test(v)) return null;
  const n = Number(v);
  if (!Number.isSafeInteger(n)) return null;
  if (!allowZero && n === 0) return null;
  return n;
}

export function cleanOptional(v: string | undefined): string | undefined {
  const t = v?.trim();
  return t ? t : undefined;
}
