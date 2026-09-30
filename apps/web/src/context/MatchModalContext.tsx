import { createContext, useContext, useState, type ReactNode } from 'react';

interface MatchModalContextValue {
  isOpen: boolean;
  openMatchModal: () => void;
  closeMatchModal: () => void;
}

const MatchModalContext = createContext<MatchModalContextValue | null>(null);

export function MatchModalProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  return (
    <MatchModalContext.Provider
      value={{ isOpen, openMatchModal: () => setIsOpen(true), closeMatchModal: () => setIsOpen(false) }}
    >
      {children}
    </MatchModalContext.Provider>
  );
}

export function useMatchModal(): MatchModalContextValue {
  const ctx = useContext(MatchModalContext);
  if (!ctx) throw new Error('useMatchModal must be used within MatchModalProvider');
  return ctx;
}
