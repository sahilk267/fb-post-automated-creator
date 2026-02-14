import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { User } from '../api/users';

const STORAGE_KEY = 'content_platform_user';

interface AuthState {
  user: User | null;
  userId: number | null;
  setUser: (u: User | null) => void;
  setUserId: (id: number | null) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [userId, setUserIdState] = useState<number | null>(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    try {
      const data = JSON.parse(raw);
      return typeof data?.id === 'number' ? data.id : null;
    } catch {
      return null;
    }
  });
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    if (userId !== null) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ id: userId }));
    } else {
      localStorage.removeItem(STORAGE_KEY);
      setUser(null);
    }
  }, [userId]);

  const setUserId = (id: number | null) => {
    setUserIdState(id);
    setUser(null);
  };

  const logout = () => {
    setUserIdState(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, userId, setUser, setUserId, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
