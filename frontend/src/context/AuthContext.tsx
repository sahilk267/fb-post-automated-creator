import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';
import { getMe, type User } from '../api/users';

const TOKEN_KEY = 'content_platform_token';
const USER_KEY = 'content_platform_user';

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  updateUser: (u: User) => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [user, setUserState] = useState<User | null>(() => {
    const raw = localStorage.getItem(USER_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  });
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    async function validateToken() {
      if (token && !user) {
        setIsLoading(true);
        try {
          const freshUser = await getMe();
          setUserState(freshUser);
          localStorage.setItem(USER_KEY, JSON.stringify(freshUser));
        } catch {
          setToken(null);
          setUserState(null);
          localStorage.removeItem(TOKEN_KEY);
          localStorage.removeItem(USER_KEY);
        } finally {
          setIsLoading(false);
        }
      }
    }
    validateToken();
  }, [token, user]);

  const login = useCallback((newToken: string, newUser: User) => {
    setToken(newToken);
    setUserState(newUser);
    localStorage.setItem(TOKEN_KEY, newToken);
    localStorage.setItem(USER_KEY, JSON.stringify(newUser));
  }, []);

  const logout = useCallback(() => {
    setToken(null);
    setUserState(null);
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  }, []);

  const updateUser = useCallback((u: User) => {
    setUserState(u);
    localStorage.setItem(USER_KEY, JSON.stringify(u));
  }, []);

  return (
    <AuthContext.Provider value={{ user, token, isAuthenticated: !!token, isLoading, login, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
