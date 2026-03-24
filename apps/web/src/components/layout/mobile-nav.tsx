'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { notifications } from '@/lib/api-client';
import {
  LayoutDashboard, FileText, ClipboardList, CheckSquare, BarChart3,
  Menu, X, Database, Users, Settings, HelpCircle, LogOut, Bell,
  FolderTree, List, Car, Building2, User as UserIcon,
} from 'lucide-react';

const bottomNav = [
  { name: '대시보드', href: '/dashboard', icon: LayoutDashboard, roles: null },
  { name: '등록', href: '/change-events/new', icon: FileText, roles: ['ADMIN', 'TIER1_EDITOR', 'TIER1_REVIEWER', 'EXEC_APPROVER', 'TIER2_EDITOR'] },
  { name: '발생현황', href: '/change-events/my', icon: ClipboardList, roles: ['ADMIN', 'TIER1_EDITOR', 'TIER1_REVIEWER', 'EXEC_APPROVER', 'TIER2_EDITOR'] },
  { name: '승인함', href: '/change-events/approvals', icon: CheckSquare, roles: ['ADMIN', 'TIER1_REVIEWER', 'TIER1_EDITOR', 'EXEC_APPROVER'] },
  { name: '더보기', href: '#menu', icon: Menu, roles: null, isMenu: true },
];

const ROLE_LABELS: Record<string, string> = {
  ADMIN: '관리자', TIER1_EDITOR: '캠스 담당자', TIER1_REVIEWER: '중역',
  EXEC_APPROVER: '전담중역', TIER2_EDITOR: '협력사', CUSTOMER_VIEWER: '고객사',
};

const extraMenuItems = [
  { name: '시각화 분석', href: '/analytics', icon: BarChart3, roles: null },
  { name: '알림', href: '/notifications', icon: Bell, roles: null },
  { name: '분류 체계', href: '/admin/master-data', icon: FolderTree, roles: ['ADMIN'] },
  { name: '공통코드', href: '/admin/codes', icon: List, roles: ['ADMIN'] },
  { name: '차종 현황', href: '/admin/vehicles', icon: Car, roles: ['ADMIN'] },
  { name: '협력사 현황', href: '/admin/suppliers', icon: Building2, roles: ['ADMIN'] },
  { name: '사용자 관리', href: '/admin/users', icon: Users, roles: ['ADMIN'] },
  { name: '정책 설정', href: '/admin/settings', icon: Settings, roles: ['ADMIN'] },
  { name: '내 프로필', href: '/profile', icon: UserIcon, roles: null },
  { name: '도움말', href: '/help', icon: HelpCircle, roles: null },
];

export default function MobileNav() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['unread-notifications'],
    queryFn: () => notifications.unreadCount().then((r) => r.data),
    refetchInterval: 30000,
  });

  return (
    <>
      {/* 모바일 상단 헤더 */}
      <div className="flex h-12 items-center justify-between border-b border-gray-200/60 bg-white/80 px-4 backdrop-blur-xl dark:border-gray-800/60 dark:bg-gray-900/80">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
            <span className="text-xs font-bold text-primary">C</span>
          </div>
          <span className="text-sm font-bold">변동점 관리</span>
        </div>
        <div className="flex items-center gap-1">
          <Link href="/notifications" className="relative rounded-lg p-2 text-muted-foreground hover:bg-gray-100 dark:hover:bg-gray-800">
            <Bell className="h-4.5 w-4.5" />
            {unreadCount > 0 && (
              <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
                {unreadCount > 99 ? '99+' : unreadCount}
              </span>
            )}
          </Link>
        </div>
      </div>

      {/* 하단 네비게이션 바 */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200/60 bg-white/90 backdrop-blur-xl dark:border-gray-800/60 dark:bg-gray-900/90 print:hidden" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
        <div className="mx-auto flex max-w-lg justify-around px-1">
          {bottomNav.map((item) => {
            if (item.roles && !item.roles.includes(user?.role || '')) return null;

            const isActive = !item.isMenu && (pathname === item.href || pathname.startsWith(item.href + '/'));
            const Icon = item.icon;

            if (item.isMenu) {
              return (
                <button
                  key="menu"
                  onClick={() => setMenuOpen(!menuOpen)}
                  className={cn(
                    'flex flex-1 flex-col items-center justify-center py-2 transition-colors',
                    menuOpen ? 'text-primary' : 'text-muted-foreground/60',
                  )}
                >
                  <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl transition-all', menuOpen && 'bg-primary/10')}>
                    {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
                  </div>
                  <span className="mt-0.5 text-[11px] font-medium">{menuOpen ? '닫기' : '더보기'}</span>
                </button>
              );
            }

            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className={cn(
                  'flex flex-1 flex-col items-center justify-center py-2 transition-colors',
                  isActive ? 'text-primary' : 'text-muted-foreground/60 hover:text-foreground',
                )}
              >
                <div className={cn('flex h-10 w-10 items-center justify-center rounded-xl transition-all', isActive && 'bg-primary/10 scale-105')}>
                  <Icon className="h-5 w-5" />
                </div>
                <span className={cn('mt-0.5 text-[11px] font-medium', isActive && 'font-semibold')}>{item.name}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* 더보기 메뉴 오버레이 */}
      {menuOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/30 backdrop-blur-sm" onClick={() => setMenuOpen(false)} />
          <div className="fixed bottom-[60px] left-0 right-0 z-40 animate-in slide-in-from-bottom-5 duration-200" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
            <div className="mx-3 mb-2 overflow-hidden rounded-2xl border border-gray-200/60 bg-white/95 shadow-xl backdrop-blur-xl dark:border-gray-800/60 dark:bg-gray-900/95">
              {/* 사용자 정보 */}
              <div className="flex items-center gap-3 border-b border-gray-100 px-4 py-3 dark:border-gray-800">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                  {user?.name?.charAt(0) || 'U'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="truncate text-sm font-semibold">{user?.name}</p>
                  <p className="text-[11px] text-muted-foreground">{ROLE_LABELS[user?.role || ''] || user?.role}</p>
                </div>
              </div>

              {/* 메뉴 아이템 */}
              <div className="grid grid-cols-3 gap-0.5 p-2">
                {extraMenuItems.map((item) => {
                  if (item.roles && !item.roles.includes(user?.role || '')) return null;
                  const isActive = pathname === item.href;
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      onClick={() => setMenuOpen(false)}
                      className={cn(
                        'flex flex-col items-center gap-1.5 rounded-xl px-2 py-3 text-center transition-colors',
                        isActive ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-gray-50 dark:hover:bg-gray-800/50',
                      )}
                    >
                      <Icon className="h-5 w-5" />
                      <span className="text-[11px] font-medium leading-tight">{item.name}</span>
                    </Link>
                  );
                })}
              </div>

              {/* 로그아웃 */}
              <div className="border-t border-gray-100 px-3 py-2 dark:border-gray-800">
                <button
                  onClick={() => { setMenuOpen(false); logout(); }}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-red-500 transition-colors hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  <LogOut className="h-4 w-4" />
                  <span className="font-medium">로그아웃</span>
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </>
  );
}
