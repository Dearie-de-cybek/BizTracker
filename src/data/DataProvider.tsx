import { createContext, ReactNode, useContext, useEffect, useMemo, useState, useSyncExternalStore } from 'react';

import type { DbState } from '@/domain/types';
import { Actions, createActions } from './actions';
import { Database } from './database';
import { asyncStorage, KeyValueStorage } from './storage';

interface DataContextValue {
  db: Database;
  actions: Actions;
  storage: KeyValueStorage;
}

const DataContext = createContext<DataContextValue | null>(null);

export function DataProvider({
  children,
  storage = asyncStorage,
  fallback,
  renderError,
}: {
  children: ReactNode;
  storage?: KeyValueStorage;
  fallback: ReactNode;
  renderError: (error: Error, retry: () => void) => ReactNode;
}) {
  const [db, setDb] = useState<Database | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    Database.open(storage).then(
      (d) => !cancelled && setDb(d),
      (e: Error) => !cancelled && setError(e),
    );
    return () => {
      cancelled = true;
    };
  }, [storage, attempt]);

  const value = useMemo(() => (db ? { db, actions: createActions(db), storage } : null), [db, storage]);

  if (error) return <>{renderError(error, () => {
      setError(null);
      setAttempt((a) => a + 1);
    })}</>;
  if (!value) return <>{fallback}</>;
  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
}

function useDataContext(): DataContextValue {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useDataContext must be used inside DataProvider');
  return ctx;
}

/** Subscribe to the whole database state. Re-renders after each successful commit. */
export function useDb(): DbState {
  const { db } = useDataContext();
  return useSyncExternalStore(db.subscribe, db.getState, db.getState);
}

export function useActions(): Actions {
  return useDataContext().actions;
}

export function useStorage(): KeyValueStorage {
  return useDataContext().storage;
}

/** Business + settings for screens that only run after setup. */
export function useBusiness() {
  const s = useDb();
  if (!s.business || !s.settings) throw new Error('Business has not been set up');
  return { business: s.business, settings: s.settings, currency: s.business.currencyCode };
}
