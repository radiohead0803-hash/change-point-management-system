'use client';

import { useAuth } from '@/contexts/auth-context';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';

const loginSchema = z.object({
  email: z.string().min(1, '아이디를 입력해주세요.'),
  password: z.string().min(1, '비밀번호를 입력해주세요.'),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const { login } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    try {
      setLoading(true);
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
    <div className="flex min-h-screen items-center justify-center bg-gray-100 px-4 dark:bg-gray-900">
      <div className="w-full max-w-md space-y-6 rounded-lg bg-white p-6 shadow-lg sm:space-y-8 sm:p-8 dark:bg-gray-800">
        <div>
          <h2 className="text-center text-2xl font-bold tracking-tight text-gray-900 sm:mt-6 sm:text-3xl dark:text-white">
            (주)캠스 변동점 관리시스템
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600 dark:text-gray-400">
            로그인하여 시작하세요
          </p>
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleSubmit(onSubmit)}>
          <div className="space-y-4">
            <div>
              <label
                htmlFor="email"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                아이디
              </label>
              <Input
                id="email"
                type="text"
                autoComplete="username"
                placeholder="admin"
                {...register('email')}
                error={errors.email?.message}
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                비밀번호
              </label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                {...register('password')}
                error={errors.password?.message}
              />
            </div>
          </div>

          <Button type="submit" className="w-full" loading={loading}>
            로그인
          </Button>
        </form>
      </div>
    </div>
  );
}
