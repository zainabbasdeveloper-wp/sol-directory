import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from 'react';

/** A public-register provider the person wants their request sent to ("Request support from this provider"). */
export interface MatchProvider {
  type: 'ndis' | 'aged_care';
  slug: string;
  name: string;
}

interface MatchModalContextValue {
  isOpen: boolean;
  /** Set only while the form is open for one named provider; null for the usual "Get matched, free" request. */
  provider: MatchProvider | null;
  /** Call with no argument for the general request. Pass `{ provider }` to ask for one specific provider. */
  openMatchModal: (options?: { provider?: MatchProvider }) => void;
  closeMatchModal: () => void;
}

const MatchModalContext = createContext<MatchModalContextValue | null>(null);

export function MatchModalProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [provider, setProvider] = useState<MatchProvider | null>(null);

  const openMatchModal = useCallback((options?: { provider?: MatchProvider }) => {
    // Some callers hand this straight to onClick, so only trust a real provider object.
    const p = options && typeof options === 'object' && 'provider' in options ? options.provider : undefined;
    setProvider(p && p.slug && p.name ? p : null);
    setIsOpen(true);
  }, []);
  const closeMatchModal = useCallback(() => { setIsOpen(false); setProvider(null); }, []);

  const value = useMemo(() => ({ isOpen, provider, openMatchModal, closeMatchModal }), [isOpen, provider, openMatchModal, closeMatchModal]);
  return <MatchModalContext.Provider value={value}>{children}</MatchModalContext.Provider>;
}

export function useMatchModal(): MatchModalContextValue {
  const ctx = useContext(MatchModalContext);
  if (!ctx) throw new Error('useMatchModal must be used within MatchModalProvider');
  return ctx;
}
