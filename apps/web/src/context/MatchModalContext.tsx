import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react';

interface MatchModalContextValue {
  isOpen: boolean;
  /** onSuccess fires once, after the wizard's request actually posts successfully (MatchingWizard.tsx's submitRequest) — not just on open or on close. Used to gate something behind a real, completed enquiry, e.g. revealing a register listing's contact details. */
  openMatchModal: (options?: { onSuccess?: () => void }) => void;
  closeMatchModal: () => void;
  /** Called by MatchingWizard itself once a submission actually succeeds. */
  notifyMatchSuccess: () => void;
}

const MatchModalContext = createContext<MatchModalContextValue | null>(null);

export function MatchModalProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const onSuccessRef = useRef<(() => void) | undefined>(undefined);

  const openMatchModal = useCallback((options?: { onSuccess?: () => void }) => {
    onSuccessRef.current = options?.onSuccess;
    setIsOpen(true);
  }, []);
  const closeMatchModal = useCallback(() => {
    onSuccessRef.current = undefined;
    setIsOpen(false);
  }, []);
  const notifyMatchSuccess = useCallback(() => { onSuccessRef.current?.(); }, []);

  return (
    <MatchModalContext.Provider value={{ isOpen, openMatchModal, closeMatchModal, notifyMatchSuccess }}>
      {children}
    </MatchModalContext.Provider>
  );
}

export function useMatchModal(): MatchModalContextValue {
  const ctx = useContext(MatchModalContext);
  if (!ctx) throw new Error('useMatchModal must be used within MatchModalProvider');
  return ctx;
}
