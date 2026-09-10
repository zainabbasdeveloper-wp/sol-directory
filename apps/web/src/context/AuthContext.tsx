import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Role } from '@soldirectory/shared-types';
import * as api from '../api/resources';

interface AuthUser {
  id: string;
  name: string;
  role: Role;
  // Only meaningful for role === 'provider'. Undefined for every
  // other role. Drives the pro-plan gate on the worker directory.
  plan?: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  signup: (input: { name: string; email: string; mobile: string; password: string; role: Role; referralCode?: string }) => Promise<AuthUser>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const TOKEN_KEY = 'sd_token';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      setLoading(false);
      return;
    }
    fetch(`${(import.meta as any).env?.VITE_API_URL ?? '/api'}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => (res.ok ? res.json() : Promise.reject()))
      .then((data) => setUser(data.user))
      .catch(() => localStorage.removeItem(TOKEN_KEY))
      .finally(() => setLoading(false));
  }, []);

  async function login(email: string, password: string) {
    const res = await api.login(email, password);
    setUser(res.user);
    return res.user;
  }

  async function signup(input: { name: string; email: string; mobile: string; password: string; role: Role; referralCode?: string }) {
    const res = await api.signup(input);
    setUser(res.user);
    return res.user;
  }

  function logout() {
    api.logout();
    setUser(null);
  }

  return <AuthContext.Provider value={{ user, loading, login, signup, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
