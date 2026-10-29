import { stockLevel } from '@/domain/analytics';
import type { BusinessSettings, Product } from '@/domain/types';

/** 'all' | 'low' | 'none' (uncategorised) | categoryId */
export type ProductFilter = string;

export function filterProducts(
  products: Product[],
  settings: BusinessSettings,
  query: string,
  filter: ProductFilter,
): Product[] {
  const q = query.trim().toLowerCase();
  return products
    .filter((p) => {
      if (filter === 'low') {
        const l = stockLevel(p, settings);
        if (l !== 'low' && l !== 'out') return false;
      } else if (filter === 'none') {
        if (p.categoryId) return false;
      } else if (filter !== 'all' && p.categoryId !== filter) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        (!!p.sku && p.sku.toLowerCase().includes(q)) ||
        (!!p.barcode && p.barcode.includes(q))
      );
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}
