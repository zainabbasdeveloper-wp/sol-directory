import { useSyncExternalStore } from 'react';

/**
 * The visitor's privacy choices, kept in this browser only.
 *
 *  - essential: always on. Keeps you signed in, remembers this very choice and protects forms.
 *  - saveProgress: remembers answers in the "Get matched" form, on this device and (until sent) on our server, so a
 *    person can come back to an unfinished request. Off until the visitor says yes.
 *
 * Nothing else on the site depends on a choice yet. If more optional things are ever added (for example anonymous usage
 * statistics) they get their own switch here, and `hasConsent` is the single place code asks.
 */
export interface Consent {
  /** Bump when the wording or the categories change, so people are asked again. */
  version: 1;
  savedAt: string;
  saveProgress: boolean;
}

export type ConsentKey = 'saveProgress';

const KEY = 'sd_consent_v1';
const OPEN_EVENT = 'sd:open-consent';
const listeners = new Set<() => void>();
let cache: Consent | null | undefined;

function read(): Consent | null {
  if (cache !== undefined) return cache;
  try {
    const raw = localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as Consent) : null;
    cache = parsed && parsed.version === 1 && typeof parsed.saveProgress === 'boolean' ? parsed : null;
  } catch {
    cache = null;
  }
  return cache;
}

export function getConsent(): Consent | null {
  return read();
}

export function hasConsent(key: ConsentKey): boolean {
  return read()?.[key] === true;
}

export function setConsent(choices: { saveProgress: boolean }): void {
  const next: Consent = { version: 1, savedAt: new Date().toISOString(), saveProgress: choices.saveProgress };
  cache = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
    // Withdrawing consent also removes what was stored under it.
    if (!next.saveProgress) localStorage.removeItem('mw_draft_v2');
  } catch { /* private mode etc.: the choice still applies for this visit */ }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  const onStorage = (e: StorageEvent) => { if (e.key === KEY) { cache = undefined; listener(); } };
  window.addEventListener('storage', onStorage);
  return () => { listeners.delete(listener); window.removeEventListener('storage', onStorage); };
}

export function useConsent(): Consent | null {
  return useSyncExternalStore(subscribe, read, () => null);
}

/** Opens the privacy settings panel from anywhere (footer link, a note in the form …). */
export function openConsentSettings(): void {
  window.dispatchEvent(new Event(OPEN_EVENT));
}
export const CONSENT_OPEN_EVENT = OPEN_EVENT;
