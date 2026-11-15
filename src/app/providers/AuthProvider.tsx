// Who is logged in? This "context" makes the answer available to every
// component via the useAuth() hook, without passing props down manually.
//
// Login flow (no passwords, doc §3):
//   1. requestOtp(phone)   → server creates a 6-digit code
//   2. verifyOtp({...})    → server checks it, returns { user, token }
//   3. We keep the token in localStorage; apiClient.ts attaches it to every request.
//
// PHASE 1 additions:
//   • On app start we ask the server "/auth/me" so a landlord approved while
//     away sees their new status immediately (and a suspended user is logged out).
//   • refreshUser() lets any page re-check the status on demand.

import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { apiRequest, TOKEN_KEY, USER_KEY } from '@/services/apiClient';
import type { User, UserRole } from '@/types';

export interface VerifyParams {
  phone: string;
  code: string;
  // Only needed when registering a NEW account:
  fullName?: string;
  role?: Extract<UserRole, 'student' | 'landlord'>;
  email?: string;
  hostel?: { name: string; district: string; area: string; address?: string };
}

interface AuthContextValue {
  user: User | null;
  isLoading: boolean; // true while we double-check a saved login with the server
  requestOtp: (phone: string) => Promise<{ ok: boolean; error?: string; devCode?: string }>;
  verifyOtp: (params: VerifyParams) => Promise<{ ok: boolean; error?: string; user?: User }>;
  refreshUser: () => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function readSavedUser(): User | null {
  try {
    const saved = localStorage.getItem(USER_KEY);
    return saved && localStorage.getItem(TOKEN_KEY) ? (JSON.parse(saved) as User) : null;
  } catch {
    return null;
  }
}

function saveUser(user: User) {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function AuthProvider({ children }: { children: ReactNode }) {
  // Start with the saved user so the page doesn't flash "logged out" on refresh...
  const [user, setUser] = useState<User | null>(readSavedUser);
  // ...but stay in "loading" until the server confirms the saved login is still valid.
  const [isLoading, setIsLoading] = useState<boolean>(() => localStorage.getItem(TOKEN_KEY) !== null);

  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setUser(null);
  }

  async function refreshUser() {
    const result = await apiRequest<User>('/auth/me');
    if (result.ok && result.data) {
      saveUser(result.data);
      setUser(result.data);
    } else if (result.status === 401 || result.status === 403) {
      logout(); // token rejected or account suspended
    }
    // Any other failure (e.g. server unreachable): keep the cached user so
    // the app still works on patchy campus Wi-Fi.
  }

  // Runs once when the app opens.
  useEffect(() => {
    if (localStorage.getItem(TOKEN_KEY) === null) return;
    let cancelled = false; // protects against React StrictMode running effects twice in dev

    apiRequest<User>('/auth/me').then((result) => {
      if (cancelled) return;
      if (result.ok && result.data) {
        saveUser(result.data);
        setUser(result.data);
      } else if (result.status === 401 || result.status === 403) {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        setUser(null);
      }
      setIsLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, []);

  async function requestOtp(phone: string) {
    const result = await apiRequest<{ sent: boolean; devCode?: string }>('/auth/request-otp', {
      method: 'POST',
      body: { phone },
    });
    return { ok: result.ok, error: result.error, devCode: result.data?.devCode };
  }

  async function verifyOtp(params: VerifyParams) {
    const result = await apiRequest<{ user: User; token: string }>('/auth/verify-otp', {
      method: 'POST',
      body: params,
    });

    if (result.ok && result.data) {
      localStorage.setItem(TOKEN_KEY, result.data.token);
      saveUser(result.data.user);
      setUser(result.data.user);
      return { ok: true, user: result.data.user };
    }
    return { ok: false, error: result.error };
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, requestOtp, verifyOtp, refreshUser, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}