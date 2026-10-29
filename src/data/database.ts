import type { Ctx, DbState } from '@/domain/types';
import type { KeyValueStorage } from './storage';

export const DB_KEY = 'biztracker.db.v1';

export function emptyState(): DbState {
  return {
    schemaVersion: 1,
    onboardingCompletedAt: null,
    setupCompletedAt: null,
    business: null,
    settings: null,
    categories: [],
    products: [],
    customers: [],
    sales: [],
    payments: [],
    stockMovements: [],
    counters: { receipt: 0 },
  };
}

let idCounter = 0;
export function generateId(): string {
  idCounter = (idCounter + 1) % 1_679_616;
  return Date.now().toString(36) + idCounter.toString(36).padStart(4, '0') + Math.random().toString(36).slice(2, 8);
}

export const defaultCtx: Ctx = { now: () => new Date(), id: generateId };

type Listener = () => void;

/**
 * Local-first database.
 *
 * Consistency strategy: the whole dataset is one serialised document written
 * with a single `setItem`, which AsyncStorage applies atomically. A commit
 * computes the next state with a pure function, persists it, and only then
 * publishes it to the UI. If the write fails, the previous state stays in
 * memory and on disk — a sale can never be saved without its stock movements.
 * Commits are queued so two quick taps cannot interleave.
 *
 * Suitable for one device and a small business catalogue (thousands of
 * records). A SQLite or remote adapter can replace this behind the same API.
 */
export class Database {
  private state: DbState;
  private listeners = new Set<Listener>();
  private queue: Promise<unknown> = Promise.resolve();

  private constructor(
    private storage: KeyValueStorage,
    initial: DbState,
    public ctx: Ctx,
  ) {
    this.state = initial;
  }

  static async open(storage: KeyValueStorage, ctx: Ctx = defaultCtx): Promise<Database> {
    const raw = await storage.getItem(DB_KEY);
    let state = emptyState();
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<DbState>;
      state = { ...emptyState(), ...parsed } as DbState;
    }
    return new Database(storage, state, ctx);
  }

  getState = (): DbState => this.state;

  subscribe = (l: Listener): (() => void) => {
    this.listeners.add(l);
    return () => this.listeners.delete(l);
  };

  /** Apply a pure transition and persist it. Resolves with the transition's result. */
  commit<R>(fn: (state: DbState, ctx: Ctx) => { state: DbState; result: R }): Promise<R> {
    const run = async () => {
      const { state: next, result } = fn(this.state, this.ctx);
      if (next !== this.state) {
        await this.storage.setItem(DB_KEY, JSON.stringify(next));
        this.state = next;
        this.listeners.forEach((l) => l());
      }
      return result;
    };
    const p = this.queue.then(run, run);
    this.queue = p.catch(() => undefined);
    return p;
  }

  /** Wipes all business data on this device. */
  async reset(): Promise<void> {
    await this.commit(() => ({ state: emptyState(), result: undefined }));
  }
}
