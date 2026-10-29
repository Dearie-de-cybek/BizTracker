import {
  adjustStock,
  createCategory,
  createCustomer,
  createProduct,
  CustomerInput,
  ProductInput,
  StockAdjustmentInput,
  updateCustomer,
  updateProduct,
} from '@/domain/catalog';
import { CheckoutInput, createSale, PaymentInput, recordPayment } from '@/domain/sales';
import { completeSetup, SetupDraft } from '@/domain/setup';
import type { Business, BusinessSettings } from '@/domain/types';
import type { Database } from './database';

/** Data-access API used by screens. Every write goes through Database.commit. */
export function createActions(db: Database) {
  return {
    completeOnboarding: () =>
      db.commit((s, ctx) => ({
        state: s.onboardingCompletedAt ? s : { ...s, onboardingCompletedAt: ctx.now().toISOString() },
        result: undefined,
      })),

    completeSetup: (draft: SetupDraft) =>
      db.commit((s, ctx) => {
        const state = completeSetup(s, draft, ctx);
        return { state, result: state.business! };
      }),

    updateBusiness: (patch: Partial<Omit<Business, 'id' | 'createdAt'>>) =>
      db.commit((s, ctx) => {
        if (!s.business) throw new Error('Business is not set up.');
        return {
          state: { ...s, business: { ...s.business, ...patch, updatedAt: ctx.now().toISOString() } },
          result: undefined,
        };
      }),

    updateSettings: (patch: Partial<BusinessSettings>) =>
      db.commit((s) => {
        if (!s.settings) throw new Error('Business is not set up.');
        return { state: { ...s, settings: { ...s.settings, ...patch } }, result: undefined };
      }),

    createCategory: (name: string) =>
      db.commit((s, ctx) => {
        const r = createCategory(s, name, ctx);
        return { state: r.state, result: r.category };
      }),

    createProduct: (input: ProductInput) =>
      db.commit((s, ctx) => {
        const r = createProduct(s, input, ctx);
        return { state: r.state, result: r.product };
      }),

    updateProduct: (id: string, input: ProductInput) =>
      db.commit((s, ctx) => ({ state: updateProduct(s, id, input, ctx), result: undefined })),

    adjustStock: (input: StockAdjustmentInput) =>
      db.commit((s, ctx) => {
        const r = adjustStock(s, input, ctx);
        return { state: r.state, result: r.movement };
      }),

    createCustomer: (input: CustomerInput) =>
      db.commit((s, ctx) => {
        const r = createCustomer(s, input, ctx);
        return { state: r.state, result: r.customer };
      }),

    updateCustomer: (id: string, input: CustomerInput) =>
      db.commit((s, ctx) => ({ state: updateCustomer(s, id, input, ctx), result: undefined })),

    createSale: (input: CheckoutInput) =>
      db.commit((s, ctx) => {
        const r = createSale(s, input, ctx);
        return { state: r.state, result: r.sale };
      }),

    recordPayment: (saleId: string, input: PaymentInput) =>
      db.commit((s, ctx) => {
        const r = recordPayment(s, saleId, input, ctx);
        return { state: r.state, result: r.payment };
      }),

    resetAllData: () => db.reset(),
  };
}

export type Actions = ReturnType<typeof createActions>;
