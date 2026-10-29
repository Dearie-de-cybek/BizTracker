import { emptySetupDraft, SetupDraft } from '@/domain/setup';
import type { KeyValueStorage } from './storage';

export const SETUP_DRAFT_KEY = 'biztracker.setupDraft.v1';

/** Setup progress lives apart from the main database so a half-filled form never looks like real business data. */
export async function loadSetupDraft(storage: KeyValueStorage): Promise<SetupDraft> {
  const raw = await storage.getItem(SETUP_DRAFT_KEY);
  if (!raw) return emptySetupDraft();
  try {
    return { ...emptySetupDraft(), ...(JSON.parse(raw) as Partial<SetupDraft>) };
  } catch {
    return emptySetupDraft();
  }
}

export function saveSetupDraft(storage: KeyValueStorage, draft: SetupDraft): Promise<void> {
  return storage.setItem(SETUP_DRAFT_KEY, JSON.stringify(draft));
}

export function clearSetupDraft(storage: KeyValueStorage): Promise<void> {
  return storage.removeItem(SETUP_DRAFT_KEY);
}
