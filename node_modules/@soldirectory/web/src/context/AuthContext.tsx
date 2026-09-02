import { createContext, useContext, useState, type ReactNode } from 'react';
import type { Role } from '@soldirectory/shared-types';
import * as api from '../api/resources';

interface AuthUser {
  id: string;
  name: string;
  role: Role;
}

interface AuthContextValue {
  user: AuthUser | null;
  login: (email: string, password: string) => Promise<AuthUser>;
  signup: (input: { name: string; email: string; mobile: string; password: string; role: Role }) => Promise<AuthUser>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);

  async function login(email: string, password: string) {
    const res = await api.login(email, password);
    setUser(res.user);
    return res.user;
  }

  async function signup(input: { name: string; email: string; mobile: string; password: string; role: Role }) {
    const res = await api.signup(input);
    setUser(res.user);
    return res.user;
  }

  function logout() {
    api.logout();
    setUser(null);
  }

  return <AuthContext.Provider value={{ user, login, signup, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
