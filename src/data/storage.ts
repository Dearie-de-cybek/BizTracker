import AsyncStorage from '@react-native-async-storage/async-storage';

/** Minimal key-value contract so the database can move to SQLite or a remote API later. */
export interface KeyValueStorage {
  getItem(key: string): Promise<string | null>;
  setItem(key: string, value: string): Promise<void>;
  removeItem(key: string): Promise<void>;
}

export const asyncStorage: KeyValueStorage = {
  getItem: (k) => AsyncStorage.getItem(k),
  setItem: (k, v) => AsyncStorage.setItem(k, v),
  removeItem: (k) => AsyncStorage.removeItem(k),
};

/** In-memory storage for tests. `failNextWrites` simulates a full disk or crash mid-save. */
export function createMemoryStorage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial));
  const api = {
    failNextWrites: 0,
    data,
    async getItem(k: string) {
      return data.get(k) ?? null;
    },
    async setItem(k: string, v: string) {
      if (api.failNextWrites > 0) {
        api.failNextWrites--;
        throw new Error('Simulated storage failure');
      }
      data.set(k, v);
    },
    async removeItem(k: string) {
      data.delete(k);
    },
  };
  return api;
}
