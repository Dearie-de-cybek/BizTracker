import { customersCsv, productsCsv, salesCsv } from '@/domain/exportCsv';
import { createCustomer } from '@/domain/catalog';
import { createSale } from '@/domain/sales';
import { ids, shopState, testCtx } from './fixtures';

describe('CSV export', () => {
  it('exports one row per sale item with historical prices', () => {
    const ctx = testCtx();
    const s0 = shopState(ctx);
    const { indomie, peak, chioma } = ids(s0);
    const { state } = createSale(
      s0,
      {
        requestId: 'e',
        lines: [
          { productId: indomie, quantity: 2 },
          { productId: peak, quantity: 1 },
        ],
        customerId: chioma,
        discount: { type: 'amount', amount: 5000 },
        payment: { method: 'transfer', amount: 100000 },
      },
      ctx,
    );
    const rows = salesCsv(state).split('\n');
    expect(rows[0]).toBe(
      'receipt,date,customer,product,sku,quantity,unit_price,unit_cost,line_total,sale_discount,sale_total,paid,status,payment_methods',
    );
    expect(rows).toHaveLength(3);
    expect(rows[1]).toContain('#0001');
    expect(rows[1]).toContain('Chioma Okafor,Indomie Noodles (70g),,2,250.00,190.00,500.00,50.00,1100.00,1000.00,partial,Bank transfer');
  });

  it('quotes values containing commas or quotes', () => {
    const ctx = testCtx();
    const s = createCustomer(shopState(ctx), { name: 'Bola "Mama Put", Yaba', phone: '0809 000 1111' }, ctx).state;
    expect(customersCsv(s)).toContain('"Bola ""Mama Put"", Yaba"');
    expect(productsCsv(s).split('\n')[1]).toBe('Indomie Noodles (70g),,,,250.00,190.00,40,');
  });
});
