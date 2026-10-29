import { useMemo } from 'react';

import { useDb } from '@/data/DataProvider';
import { formatMoney, getCurrency, parseMoney, toInputValue } from '@/domain/money';
import type { Money } from '@/domain/types';

/** Money helpers bound to the business currency. */
export function useMoney() {
  const code = useDb().business?.currencyCode ?? 'NGN';
  return useMemo(() => {
    const c = getCurrency(code);
    return {
      currency: c,
      format: (m: Money, opts?: { compact?: boolean }) => formatMoney(m, code, opts),
      parse: (s: string) => parseMoney(s, c.decimals),
      toInput: (m: Money | null | undefined) => toInputValue(m, c.decimals),
    };
  }, [code]);
}
