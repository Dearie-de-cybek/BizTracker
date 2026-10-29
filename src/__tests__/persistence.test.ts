import { createActions } from '@/data/actions';
import { Database, DB_KEY } from '@/data/database';
import { clearSetupDraft, loadSetupDraft, saveSetupDraft } from '@/data/setupDraftStore';
import { createMemoryStorage } from '@/data/storage';
import { stockFromMovements } from '@/domain/analytics';
import { adjustStock } from '@/domain/catalog';
import { emptySetupDraft, firstInvalidStep, validateSetupStep } from '@/domain/setup';
import { ids, shopState, testCtx } from './fixtures';

describe('Database persistence', () => {
  it('survives closing and reopening the app', async () => {
    const ctx = testCtx();
    const storage = createMemoryStorage();
    const db = await Database.open(storage, ctx);
    const seeded = shopState(ctx);
    await db.commit(() => ({ state: seeded, result: undefined }));
    const actions = createActions(db);
    const sale = await actions.createSale({
      requestId: 'p1',
      lines: [{ productId: ids(seeded).indomie, quantity: 2 }],
      customerId: null,
      discount: { type: 'none' },
      payment: { method: 'cash', amount: 50000 },
    });

    const reopened = await Database.open(storage, ctx);
    const s = reopened.getState();
    expect(s.business?.name).toBe('Mama Tunde Provisions');
    expect(s.sales.map((x) => x.id)).toEqual([sale.id]);
    expect(s.payments).toHaveLength(1);
    expect(s.products.find((p) => p.id === ids(seeded).indomie)!.stockQuantity).toBe(38);
  });

  it('leaves state untouched when saving fails, so nothing is half-recorded', async () => {
    const ctx = testCtx();
    const storage = createMemoryStorage();
    const db = await Database.open(storage, ctx);
    await db.commit(() => ({ state: shopState(ctx), result: undefined }));
    const before = db.getState();
    const listener = jest.fn();
    db.subscribe(listener);

    storage.failNextWrites = 1;
    const actions = createActions(db);
    const input = {
      requestId: 'fail-then-retry',
      lines: [{ productId: ids(before).peak, quantity: 1 }],
      customerId: null,
      discount: { type: 'none' as const },
      payment: { method: 'cash' as const, amount: 65000 },
    };
    await expect(actions.createSale(input)).rejects.toThrow('Simulated storage failure');
    expect(db.getState()).toBe(before);
    expect(listener).not.toHaveBeenCalled();
    expect(JSON.parse(storage.data.get(DB_KEY)!).sales).toHaveLength(0);

    // Retry with the same request id succeeds exactly once
    await actions.createSale(input);
    await expect(actions.createSale(input)).rejects.toThrow('already been recorded');
    expect(db.getState().sales).toHaveLength(1);
  });

  it('serialises rapid commits so concurrent sales cannot oversell', async () => {
    const ctx = testCtx();
    const db = await Database.open(createMemoryStorage(), ctx);
    await db.commit(() => ({ state: shopState(ctx), result: undefined }));
    const actions = createActions(db);
    const peak = ids(db.getState()).peak; // 6 in stock
    const sell = (id: string) =>
      actions.createSale({
        requestId: id,
        lines: [{ productId: peak, quantity: 4 }],
        customerId: null,
        discount: { type: 'none' },
        payment: { method: 'cash', amount: 260000 },
      });
    const results = await Promise.allSettled([sell('a'), sell('b')]);
    expect(results.map((r) => r.status)).toEqual(['fulfilled', 'rejected']);
    expect(db.getState().products.find((p) => p.id === peak)!.stockQuantity).toBe(2);
  });

  it('only marks setup complete when all steps validate', async () => {
    const ctx = testCtx();
    const db = await Database.open(createMemoryStorage(), ctx);
    const actions = createActions(db);
    await expect(actions.completeSetup(emptySetupDraft())).rejects.toThrow('Some required details are missing');
    expect(db.getState().setupCompletedAt).toBeNull();
  });

  it('persists setup progress separately', async () => {
    const storage = createMemoryStorage();
    await saveSetupDraft(storage, { ...emptySetupDraft(), name: 'Ada Fashion House', step: 2 });
    expect(await loadSetupDraft(storage)).toMatchObject({ name: 'Ada Fashion House', step: 2, currencyCode: 'NGN' });
    await clearSetupDraft(storage);
    expect((await loadSetupDraft(storage)).name).toBe('');
  });
});

describe('Setup validation', () => {
  it('validates each step', () => {
    const d = emptySetupDraft();
    expect(Object.keys(validateSetupStep(0, d)).sort()).toEqual(['address', 'name', 'type']);
    expect(validateSetupStep(1, { ...d, phone: '123' }).phone).toMatch(/valid phone/);
    expect(validateSetupStep(1, { ...d, phone: '+44 20 7946 0958' }).phone).toBeUndefined();
    expect(validateSetupStep(1, { ...d, phone: '08031234567', email: 'bad@' }).email).toBeDefined();
    expect(validateSetupStep(2, { ...d, lowStockThreshold: 'x' }).lowStockThreshold).toBeDefined();
    expect(validateSetupStep(3, { ...d, ownerName: 'Ngozi', openingInventory: 'empty', hoursEnabled: true, hoursOpens: '25:00' }).hoursOpens).toBeDefined();
    expect(firstInvalidStep(d)).toBe(0);
  });
});

describe('Stock adjustments', () => {
  it('records a traceable movement for every change', () => {
    const ctx = testCtx();
    let s = shopState(ctx);
    const { peak } = ids(s);
    s = adjustStock(s, { productId: peak, mode: 'add', quantity: 12, reason: 'restock' }, ctx).state;
    s = adjustStock(s, { productId: peak, mode: 'remove', quantity: 2, reason: 'damaged' }, ctx).state;
    const r = adjustStock(s, { productId: peak, mode: 'set', quantity: 15, reason: 'count_correction', note: 'Shelf count' }, ctx);
    expect(r.movement).toMatchObject({ change: -1, quantityBefore: 16, quantityAfter: 15, reason: 'count_correction' });
    expect(stockFromMovements(r.state, peak)).toBe(15);
    expect(r.state.stockMovements.filter((m) => m.productId === peak)).toHaveLength(4);
  });

  it('rejects negative results, no-ops and unexplained "other" adjustments', () => {
    const ctx = testCtx();
    const s = shopState(ctx);
    const { peak } = ids(s);
    expect(() => adjustStock(s, { productId: peak, mode: 'remove', quantity: 7, reason: 'lost' }, ctx)).toThrow('Only 6 in stock');
    expect(() => adjustStock(s, { productId: peak, mode: 'set', quantity: 6, reason: 'count_correction' }, ctx)).toThrow('does not change');
    expect(() => adjustStock(s, { productId: peak, mode: 'add', quantity: 1, reason: 'other' }, ctx)).toThrow('Add a note');
  });
});
