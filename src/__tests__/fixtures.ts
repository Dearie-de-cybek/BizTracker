import { emptyState } from '@/data/database';
import { createCustomer, createProduct } from '@/domain/catalog';
import { completeSetup, emptySetupDraft } from '@/domain/setup';
import type { Ctx, DbState } from '@/domain/types';

/** Deterministic clock and ids for tests. */
export function testCtx(start = new Date(2026, 9, 20, 10, 0, 0)): Ctx & { advance(ms: number): void } {
  let t = start.getTime();
  let n = 0;
  return {
    now: () => new Date(t),
    id: () => `id${++n}`,
    advance(ms: number) {
      t += ms;
    },
  };
}

/** Test-only example shop. Not real customer data. */
export function shopState(ctx: Ctx): DbState {
  let s = completeSetup(
    emptyState(),
    {
      ...emptySetupDraft(),
      name: 'Mama Tunde Provisions',
      type: 'grocery',
      address: '14 Ojuelegba Road, Surulere, Lagos',
      phone: '+234 803 123 4567',
      ownerName: 'Tunde Adebayo',
      openingInventory: 'add_now',
      lowStockThreshold: '5',
    },
    ctx,
  );
  // ₦ amounts in kobo
  s = createProduct(s, { name: 'Indomie Noodles (70g)', categoryId: null, sellingPrice: 25000, costPrice: 19000, openingStock: 40, lowStockThreshold: null }, ctx).state;
  s = createProduct(s, { name: 'Peak Milk Tin', categoryId: null, sellingPrice: 65000, costPrice: 52000, openingStock: 6, lowStockThreshold: null }, ctx).state;
  s = createProduct(s, { name: 'Golden Penny Semovita 1kg', categoryId: null, sellingPrice: 180000, costPrice: null, openingStock: 3, lowStockThreshold: 2 }, ctx).state;
  s = createCustomer(s, { name: 'Chioma Okafor', phone: '0803 555 0101' }, ctx).state;
  return s;
}

export function ids(s: DbState) {
  const p = (prefix: string) => s.products.find((x) => x.name.startsWith(prefix))!.id;
  return {
    indomie: p('Indomie'),
    peak: p('Peak'),
    semo: p('Golden Penny'),
    chioma: s.customers.find((c) => c.name === 'Chioma Okafor')!.id,
  };
}
