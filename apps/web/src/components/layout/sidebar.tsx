'use client';

import { useAuth } from '@/contexts/auth-context';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { notifications } from '@/lib/api-client';
import {
  LayoutDashboard,
  FileText,
  ClipboardList,
  Bell,
  CheckSquare,
  Settings,
  Database,
  Users,
  HelpCircle,
  LogOut,
} from 'lucide-react';

/* ── 역할별 라벨 ── */
const ROLE_LABELS: Record<string, string> = {
  ADMIN: '관리자',
  TIER1_EDITOR: '1차사 담당자',
  TIER1_REVIEWER: '1차사 검토자',
  EXEC_APPROVER: '전담중역',
  TIER2_EDITOR: '협력사 담당자',
  CUSTOMER_VIEWER: '고객사 뷰어',
};

/*
 * 권한 정책:
 * - ADMIN: 모든 메뉴
 * - TIER1_EDITOR, TIER1_REVIEWER, EXEC_APPROVER: 사용자관리 제외 전체
 * - TIER2_EDITOR (협력사): 대시보드, 변동점 등록, 내 요청, 도움말
 * - CUSTOMER_VIEWER: 대시보드, 도움말
 */
const navigation = [
  { name: '대시보드',       href: '/dashboard',               icon: LayoutDashboard, roles: null },           // 전체
  { name: '변동점 등록',    href: '/change-events/new',       icon: FileText,        roles: ['ADMIN', 'TIER1_EDITOR', 'TIER1_REVIEWER', 'EXEC_APPROVER', 'TIER2_EDITOR'] },
  { name: '내 요청',        href: '/change-events/my',        icon: ClipboardList,   roles: ['ADMIN', 'TIER1_EDITOR', 'TIER1_REVIEWER', 'EXEC_APPROVER', 'TIER2_EDITOR'] },
  { name: '승인함',         href: '/change-events/approvals', icon: CheckSquare,     roles: ['ADMIN', 'TIER1_REVIEWER', 'EXEC_APPROVER'] },
  { name: '기초정보 관리',  href: '/admin/master-data',       icon: Database,        roles: ['ADMIN'] },
  { name: '사용자 관리',    href: '/admin/users',             icon: Users,           roles: ['ADMIN'] },
  { name: '정책 설정',      href: '/admin/settings',          icon: Settings,        roles: ['ADMIN'] },
  { name: '도움말',         href: '/help',                    icon: HelpCircle,      roles: null },           // 전체
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  const { data: unreadCount = 0 } = useQuery({
    queryKey: ['unread-notifications'],
    queryFn: () => notifications.unreadCount().then(r => r.data),
    refetchInterval: 30000, // 30초마다 갱신
  });

  return (
    <div className="flex h-full w-[260px] flex-col border-r border-gray-200/60 bg-white/80 backdrop-blur-xl dark:border-gray-800/60 dark:bg-gray-900/80">
      {/* 로고 */}
      <div className="flex h-16 items-center justify-between px-5">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
            <span className="text-sm font-bold text-primary">C</span>
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight">변동점 관리</h1>
            <p className="text-[10px] text-muted-foreground">(주)캠스</p>
          </div>
        </div>
        <Link href="/notifications" className="relative rounded-lg p-1.5 text-muted-foreground/50 transition-colors hover:bg-gray-100 hover:text-foreground dark:hover:bg-gray-800">
          <Bell className="h-4.5 w-4.5" />
          {unreadCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Link>
      </div>

      {/* 네비게이션 */}
      <nav className="flex-1 space-y-1 px-3 py-4">
        {navigation.map((item) => {
          // roles가 null이면 전체 허용, 아니면 역할 체크
          if (item.roles && !item.roles.includes(user?.role || '')) {
            return null;
          }

          const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
          const Icon = item.icon;

          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200',
                isActive
                  ? 'bg-primary/10 text-primary dark:bg-primary/20'
                  : 'text-muted-foreground hover:bg-gray-100/80 hover:text-foreground dark:hover:bg-gray-800/50',
              )}
            >
              <Icon
                className={cn(
                  'h-[18px] w-[18px] flex-shrink-0 transition-colors',
                  isActive
                    ? 'text-primary'
                    : 'text-muted-foreground/70 group-hover:text-foreground',
                )}
              />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* 사용자 정보 */}
      <div className="border-t border-gray-200/60 p-3 dark:border-gray-800/60">
        <div className="flex items-center gap-3 rounded-xl px-3 py-2">
          <Link href="/profile" className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary hover:ring-2 hover:ring-primary/30 transition-all">
            {user?.name?.charAt(0) || 'U'}
          </Link>
          <div className="flex-1 min-w-0">
            <Link href="/profile" className="truncate text-sm font-medium hover:text-primary transition-colors block">{user?.name}</Link>
            <p className="truncate text-[11px] text-muted-foreground">{ROLE_LABELS[user?.role || ''] || user?.role}</p>
          </div>
          <button
            onClick={logout}
            className="rounded-lg p-1.5 text-muted-foreground/50 transition-colors hover:bg-gray-100 hover:text-foreground dark:hover:bg-gray-800"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
