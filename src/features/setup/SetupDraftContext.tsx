import { createContext, ReactNode, useCallback, useContext, useEffect, useRef, useState } from 'react';

import { LoadingState } from '@/components';
import { useStorage } from '@/data/DataProvider';
import { clearSetupDraft, loadSetupDraft, saveSetupDraft } from '@/data/setupDraftStore';
import type { SetupDraft } from '@/domain/setup';

interface Ctx {
  draft: SetupDraft;
  update: (patch: Partial<SetupDraft>) => void;
  /** Persist immediately (on step change, before leaving) */
  flush: () => Promise<void>;
  clear: () => Promise<void>;
  /** Set when the user jumped back from the review screen to edit one step */
  returnToReview: boolean;
  setReturnToReview: (v: boolean) => void;
}

const SetupDraftContext = createContext<Ctx | null>(null);

/** Holds the wizard state and autosaves it so closing the app doesn't lose progress. */
export function SetupDraftProvider({ children }: { children: ReactNode }) {
  const storage = useStorage();
  const [draft, setDraft] = useState<SetupDraft | null>(null);
  const [returnToReview, setReturnToReview] = useState(false);
  const latest = useRef<SetupDraft | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    loadSetupDraft(storage).then((d) => {
      latest.current = d;
      setDraft(d);
    });
  }, [storage]);

  const flush = useCallback(async () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    if (latest.current) await saveSetupDraft(storage, latest.current).catch(() => undefined);
  }, [storage]);

  const update = useCallback(
    (patch: Partial<SetupDraft>) => {
      setDraft((d) => {
        const next = { ...(d as SetupDraft), ...patch };
        latest.current = next;
        return next;
      });
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(flush, 400);
    },
    [flush],
  );

  const clear = useCallback(async () => {
    if (timer.current) clearTimeout(timer.current);
    await clearSetupDraft(storage).catch(() => undefined);
  }, [storage]);

  useEffect(() => () => void (timer.current && clearTimeout(timer.current)), []);

  if (!draft) return <LoadingState />;
  return (
    <SetupDraftContext.Provider value={{ draft, update, flush, clear, returnToReview, setReturnToReview }}>
      {children}
    </SetupDraftContext.Provider>
  );
}

export function useSetupDraft(): Ctx {
  const c = useContext(SetupDraftContext);
  if (!c) throw new Error('useSetupDraft must be used inside SetupDraftProvider');
  return c;
}
