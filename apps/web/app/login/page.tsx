'use client';

import { useAuth } from '@/contexts/auth-context';
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { Lock } from 'lucide-react';

const loginSchema = z.object({
  email: z.string().min(1, '아이디를 입력해주세요.'),
  password: z.string().min(1, '비밀번호를 입력해주세요.'),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const { login } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  // 저장된 아이디 불러오기
  useEffect(() => {
    const savedId = localStorage.getItem('saved_login_id');
    if (savedId) {
      setValue('email', savedId);
      setRememberMe(true);
    }
  }, [setValue]);

  const onSubmit = async (data: LoginForm) => {
    try {
      setLoading(true);
      // 아이디 저장 처리
      if (rememberMe) {
        localStorage.setItem('saved_login_id', data.email);
      } else {
        localStorage.removeItem('saved_login_id');
      }
      await login(data.email, data.password);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: '로그인 실패',
        description: '아이디 또는 비밀번호를 확인해주세요.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-gray-50 via-blue-50/30 to-gray-100 px-4 dark:from-gray-950 dark:via-gray-900 dark:to-gray-950">
      <div className="w-full max-w-sm">
        {/* Logo area */}
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 shadow-sm">
            <Lock className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            변동점 관리시스템
          </h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            (주)캠스
          </p>
        </div>

        {/* Login card */}
        <div className="rounded-2xl border border-white/60 bg-white/70 p-6 shadow-xl shadow-gray-200/50 backdrop-blur-xl sm:p-8 dark:border-gray-800/60 dark:bg-gray-900/70 dark:shadow-none">
          <form className="space-y-5" onSubmit={handleSubmit(onSubmit)}>
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="email"
                  className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                >
                  아이디
                </label>
                <Input
                  id="email"
                  type="text"
                  autoComplete="username"
                  placeholder="사번 입력"
                  {...register('email')}
                  error={errors.email?.message}
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-muted-foreground"
                >
                  비밀번호
                </label>
                <Input
                  id="password"
                  type="password"
                  autoComplete="current-password"
                  placeholder="••••"
                  {...register('password')}
                  error={errors.password?.message}
                />
              </div>
            </div>

            {/* 아이디 저장 체크박스 */}
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary/30 accent-primary"
              />
              <span className="text-xs text-muted-foreground">아이디 저장</span>
            </label>

            <Button type="submit" className="w-full" size="lg" loading={loading}>
              로그인
            </Button>
          </form>
        </div>

        <p className="mt-6 text-center text-xs text-muted-foreground/60">
          (주)캠스 변동점 관리시스템 v1.0
        </p>
      </div>
    </div>
  );
}
