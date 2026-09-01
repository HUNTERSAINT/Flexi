import React, { createContext, useContext, useState, useEffect } from 'react';
import { getGetMeQueryKey, useGetMe } from '@workspace/api-client-react';
import type { User } from '@workspace/api-client-react';
import { useLocation } from 'wouter';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => localStorage.getItem('flexi_token'));
  const [user, setUser] = useState<User | null>(null);
  const [, setLocation] = useLocation();

  const { data: me, isLoading: isMeLoading, error } = useGetMe({
    query: {
      queryKey: getGetMeQueryKey(),
      enabled: !!token,
      retry: false,
    }
  });

  useEffect(() => {
    if (me) {
      setUser(me);
    }
  }, [me]);

  useEffect(() => {
    if (error) {
      logout();
    }
  }, [error]);

  const login = (newToken: string, newUser: User) => {
    localStorage.setItem('flexi_token', newToken);
    setToken(newToken);
    setUser(newUser);
  };

  const logout = () => {
    localStorage.removeItem('flexi_token');
    setToken(null);
    setUser(null);
    setLocation('/login');
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading: isMeLoading && !!token && !user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
