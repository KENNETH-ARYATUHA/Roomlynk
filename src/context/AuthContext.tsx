
// No passwords — phone + 6-digit SMS code, then a JWT.
// Flow:
//   1. requestOtp(phone)            -> backend sends the SMS code
//   2. verifyOtp(phone, code, ...)  -> backend returns { user, token }
//   3. token goes to localStorage; apiClient.ts attaches it automatically

import { createContext, useContext, useState, type ReactNode } from 'react';
import { apiRequest } from '@/lib/apiClient';
import type { User, UserRole } from '@/types';

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  requestOtp: (phone: string) => Promise<{ ok: boolean; error?: string }>;
  verifyOtp: (params: {
    phone: string;
    code: string;
    fullName?: string;
    role?: UserRole;
    email?: string;
  }) => Promise<{ ok: boolean; error?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

interface AuthProviderType extends React.FC<{ children: ReactNode }> {
  useAuth?: () => AuthContextValue;
}

export const AuthProvider: AuthProviderType = function AuthProvider({ children }) {
  const [user, setUser] = useState<User | null>(() => {
    try {
      const savedUser = localStorage.getItem('roomlynk_user');
      const savedToken = localStorage.getItem('roomlynk_token');
      return savedUser && savedToken ? (JSON.parse(savedUser) as User) : null;
    } catch {
      return null;
    }
  });

  const [isLoading] = useState(() => false);

  async function requestOtp(phone: string) {
    const result = await apiRequest<{ sent: boolean }>('/auth/request-otp', {
      method: 'POST',
      body: { phone },
    });
    return { ok: result.ok, error: result.error };
  }

  async function verifyOtp(params: {
    phone: string;
    code: string;
    fullName?: string;
    role?: UserRole;
    email?: string;
  }) {
    const result = await apiRequest<{ user: User; token: string }>('/auth/verify-otp', {
      method: 'POST',
      body: params,
    });

    if (result.ok && result.data) {
      localStorage.setItem('roomlynk_token', result.data.token);
      localStorage.setItem('roomlynk_user', JSON.stringify(result.data.user));
      setUser(result.data.user);
    }

    return { ok: result.ok, error: result.error };
  }

  function logout() {
    localStorage.removeItem('roomlynk_token');
    localStorage.removeItem('roomlynk_user');
    setUser(null);
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, requestOtp, verifyOtp, logout }}>
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