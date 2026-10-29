import { applyBasisPoints, formatAmount, formatMoney, parseMoney, parsePercent, toInputValue } from '@/domain/money';

describe('parseMoney', () => {
  it('parses naira text into kobo without floating point', () => {
    expect(parseMoney('1,250.50', 2)).toBe(125050);
    expect(parseMoney('0.1', 2)).toBe(10);
    expect(parseMoney('0.29', 2)).toBe(29); // 0.29 * 100 = 28.999… in floats
    expect(parseMoney('250', 2)).toBe(25000);
    expect(parseMoney('19.', 2)).toBe(1900);
  });
  it('rejects invalid input', () => {
    expect(parseMoney('', 2)).toBeNull();
    expect(parseMoney('-5', 2)).toBeNull();
    expect(parseMoney('1.234', 2)).toBeNull();
    expect(parseMoney('abc', 2)).toBeNull();
    expect(parseMoney('12.5', 0)).toBeNull();
  });
  it('handles zero-decimal currencies', () => {
    expect(parseMoney('1500', 0)).toBe(1500);
  });
});

describe('formatting', () => {
  it('formats with grouping and symbol', () => {
    expect(formatMoney(125050, 'NGN')).toBe('₦1,250.50');
    expect(formatMoney(-500, 'NGN')).toBe('-₦5.00');
    expect(formatMoney(1500, 'XOF')).toBe('CFA1,500');
    expect(formatAmount(5, 2)).toBe('0.05');
  });
  it('compacts large values', () => {
    expect(formatMoney(125_000_000, 'NGN', { compact: true })).toBe('₦1.3m');
    expect(formatMoney(25_000_000, 'NGN', { compact: true })).toBe('₦250k');
    expect(formatMoney(9_000_000, 'NGN', { compact: true })).toBe('₦90,000.00');
  });
  it('round-trips input values', () => {
    expect(toInputValue(25000, 2)).toBe('250');
    expect(toInputValue(25050, 2)).toBe('250.50');
    expect(parseMoney(toInputValue(25050, 2), 2)).toBe(25050);
  });
});

describe('percentages', () => {
  it('rounds half up to the nearest minor unit', () => {
    expect(applyBasisPoints(1005, 5000)).toBe(503); // 502.5 → 503
    expect(applyBasisPoints(333, 1000)).toBe(33); // 33.3 → 33
    expect(applyBasisPoints(0, 1000)).toBe(0);
  });
  it('parses percent text to basis points', () => {
    expect(parsePercent('7.5')).toBe(750);
    expect(parsePercent('100')).toBe(10000);
    expect(parsePercent('101')).toBeNull();
    expect(parsePercent('-1')).toBeNull();
  });
});
