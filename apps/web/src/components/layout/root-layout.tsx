'use client';

import { useAuth } from '@/contexts/auth-context';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import Sidebar from './sidebar';
import MobileNav from './mobile-nav';

const publicPaths = ['/login', '/register'];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  // 로딩 중이거나 공개 페이지인 경우 레이아웃 없이 렌더링
  if (loading || publicPaths.includes(pathname)) {
    return <>{children}</>;
  }

  // 인증이 필요한 페이지에서 로그인되지 않은 경우 → 로그인 페이지로 리다이렉트
  if (!user && !publicPaths.includes(pathname)) {
    router.replace('/login');
    return null;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-100 dark:bg-gray-900 print:block print:h-auto print:overflow-visible print:bg-white">
      {/* 데스크톱 사이드바 */}
      <div className="hidden lg:flex print:!hidden">
        <Sidebar />
      </div>

      {/* 메인 컨텐츠 */}
      <div className="flex flex-1 flex-col overflow-hidden print:block print:overflow-visible">
        {/* 모바일 네비게이션 */}
        <div className="lg:hidden print:!hidden">
          <MobileNav />
        </div>

        {/* 컨텐츠 영역 */}
        <main className="flex-1 overflow-y-auto px-3 py-3 pb-24 sm:px-4 sm:py-4 lg:px-6 lg:py-5 lg:pb-5 print:!p-0 print:!m-0 print:overflow-visible">
          <div className="mx-auto max-w-7xl print:max-w-full">{children}</div>
        </main>
      </div>
    </div>
  );
}
