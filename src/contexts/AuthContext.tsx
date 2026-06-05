import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  getStoredToken,
  getCustomer,
  login as apiLogin,
  register as apiRegister,
  logout as apiLogout,
  type Customer,
  type UserError,
} from '../lib/account';

interface AuthContextValue {
  customer: Customer | null;
  loading: boolean;
  isLoggedIn: boolean;
  login: (email: string, password: string) => Promise<{ ok: boolean; errors: UserError[] }>;
  register: (input: { email: string; password: string; firstName?: string; lastName?: string; phone?: string }) => Promise<{ ok: boolean; errors: UserError[] }>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const token = getStoredToken();
    if (!token) {
      setCustomer(null);
      setLoading(false);
      return;
    }
    try {
      const c = await getCustomer(token.accessToken);
      setCustomer(c);
    } catch {
      setCustomer(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const login = useCallback(
    async (email: string, password: string) => {
      const { token, errors } = await apiLogin(email, password);
      if (token) {
        await refresh();
        return { ok: true, errors: [] };
      }
      return { ok: false, errors };
    },
    [refresh],
  );

  const register = useCallback(
    async (input: { email: string; password: string; firstName?: string; lastName?: string; phone?: string }) => {
      const { errors } = await apiRegister(input);
      if (errors.length) return { ok: false, errors };
      // Auto-login after successful registration.
      const res = await apiLogin(input.email, input.password);
      if (res.token) await refresh();
      return { ok: true, errors: [] };
    },
    [refresh],
  );

  const logout = useCallback(async () => {
    const token = getStoredToken();
    if (token) await apiLogout(token.accessToken);
    setCustomer(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ customer, loading, isLoggedIn: !!customer, login, register, logout, refresh }),
    [customer, loading, login, register, logout, refresh],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
};
