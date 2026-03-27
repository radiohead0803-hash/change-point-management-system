'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useQueryClient } from '@tanstack/react-query';
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
  const queryClient = useQueryClient();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const restoreSession = async () => {
      try {
        if (typeof window === 'undefined') return;

        const token = localStorage.getItem('token');
        if (!token) {
          setLoading(false);
          return;
        }

        // localStorage에서 안전하게 유저 정보 복원
        const stored = localStorage.getItem('user');
        if (stored) {
          try {
            const parsed = JSON.parse(stored);
            if (parsed && typeof parsed === 'object' && parsed.id) {
              setUser(parsed);
            }
          } catch {
            // 깨진 JSON - 정리
            localStorage.removeItem('user');
          }
        }
        setLoading(false);

        // 백그라운드에서 최신 프로필 동기화
        try {
          const { data } = await usersApi.getMyProfile();
          localStorage.setItem('user', JSON.stringify(data));
          setUser(data as User);
        } catch {
          // API 실패 시 토큰이 만료되었을 수 있음
        }
      } catch {
        // 세션 복원 실패 시 안전하게 초기화
        localStorage.removeItem('token');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
        setUser(null);
        setLoading(false);
      }
    };

    restoreSession();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const { data } = await auth.login(email, password);
      // 1. 토큰 저장
      localStorage.setItem('token', data.access_token);
      localStorage.setItem('refreshToken', data.refresh_token);
      // 2. 이전 세션의 캐시 완전 제거
      queryClient.clear();
      // 3. 새 JWT로 최신 프로필 가져와서 localStorage 동기화
      try {
        const { data: profile } = await usersApi.getMyProfile();
        localStorage.setItem('user', JSON.stringify(profile));
        setUser(profile as User);
      } catch {
        localStorage.setItem('user', JSON.stringify(data.user));
        setUser(data.user);
      }
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
    queryClient.clear(); // 모든 react-query 캐시 비우기
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
      try {
        const stored = localStorage.getItem('user');
        if (stored) setUser(JSON.parse(stored));
      } catch { /* 깨진 JSON 무시 */ }
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
