'use client';

import { useAuth } from '@/contexts/auth-context';
import { usePathname } from 'next/navigation';
import Sidebar from './sidebar';
import MobileNav from './mobile-nav';

const publicPaths = ['/login', '/register'];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();

  // 로딩 중이거나 공개 페이지인 경우 레이아웃 없이 렌더링
  if (loading || publicPaths.includes(pathname)) {
    return <>{children}</>;
  }

  // 인증이 필요한 페이지에서 로그인되지 않은 경우
  if (!user && !publicPaths.includes(pathname)) {
    return <div>Redirecting...</div>;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-100 dark:bg-gray-900">
      {/* 데스크톱 사이드바 */}
      <div className="hidden lg:flex">
        <Sidebar />
      </div>

      {/* 메인 컨텐츠 */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* 모바일 네비게이션 */}
        <div className="lg:hidden">
          <MobileNav />
        </div>

        {/* 컨텐츠 영역 */}
        <main className="flex-1 overflow-y-auto p-4">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
