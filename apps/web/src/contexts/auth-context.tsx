'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { User } from '@/types';
import { auth, users as usersApi } from '@/lib/api-client';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  register: (email: string, password: string, name: string, companyId: string) => Promise<void>;
  refreshUser: () => Promise<void> | void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      setLoading(false);
      return;
    }

    // localStorage에서 임시 로드 후 API에서 최신 데이터 갱신
    const stored = localStorage.getItem('user');
    if (stored) {
      setUser(JSON.parse(stored));
    }
    setLoading(false);

    // 백그라운드에서 최신 프로필 동기화
    usersApi.getMyProfile().then(({ data }) => {
      localStorage.setItem('user', JSON.stringify(data));
      setUser(data as User);
    }).catch(() => {});
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const { data } = await auth.login(email, password);
      localStorage.setItem('token', data.access_token);
      localStorage.setItem('refreshToken', data.refresh_token);
      localStorage.setItem('user', JSON.stringify(data.user));
      setUser(data.user);

      router.push('/dashboard');
    } catch (error) {
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
    setUser(null);
    router.push('/login');
  };

  const register = async (email: string, password: string, name: string, companyId: string) => {
    try {
      await auth.register(email, password, name, companyId);
      await login(email, password);
    } catch (error) {
      throw error;
    }
  };

  const refreshUser = async () => {
    try {
      const { data } = await usersApi.getMyProfile();
      const userData = data as User;
      localStorage.setItem('user', JSON.stringify(userData));
      setUser(userData);
    } catch {
      const stored = localStorage.getItem('user');
      if (stored) setUser(JSON.parse(stored));
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, register, refreshUser }}>
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
