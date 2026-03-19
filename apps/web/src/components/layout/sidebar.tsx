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
  Car,
  Building2,
  FolderTree,
} from 'lucide-react';

/* ── 역할별 라벨 ── */
const ROLE_LABELS: Record<string, string> = {
  ADMIN: '관리자',
  TIER1_EDITOR: '캠스 담당자',
  TIER1_REVIEWER: '캠스 담당자',
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
  { name: '대시보드',       href: '/dashboard',               icon: LayoutDashboard, roles: null },
  { name: '변동점 등록',    href: '/change-events/new',       icon: FileText,        roles: ['ADMIN', 'TIER1_EDITOR', 'TIER1_REVIEWER', 'EXEC_APPROVER', 'TIER2_EDITOR'] },
  { name: '내 요청',        href: '/change-events/my',        icon: ClipboardList,   roles: ['ADMIN', 'TIER1_EDITOR', 'TIER1_REVIEWER', 'EXEC_APPROVER', 'TIER2_EDITOR'] },
  { name: '승인함',         href: '/change-events/approvals', icon: CheckSquare,     roles: ['ADMIN', 'TIER1_REVIEWER', 'TIER1_EDITOR', 'EXEC_APPROVER'] },
  { name: '기초정보', href: '', icon: Database, roles: ['ADMIN'], isGroup: true, children: [
    { name: '분류 체계',   href: '/admin/master-data', icon: FolderTree },
    { name: '차종 현황',   href: '/admin/vehicles',    icon: Car },
    { name: '협력사 현황', href: '/admin/suppliers',   icon: Building2 },
  ]},
  { name: '사용자 관리',    href: '/admin/users',             icon: Users,           roles: ['ADMIN'] },
  { name: '정책 설정',      href: '/admin/settings',          icon: Settings,        roles: ['ADMIN'] },
  { name: '도움말',         href: '/help',                    icon: HelpCircle,      roles: null },
] as const;

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
        {navigation.map((item: any) => {
          if (item.roles && !item.roles.includes(user?.role || '')) return null;

          // 그룹 메뉴 (기초정보)
          if (item.isGroup && item.children) {
            const isGroupActive = item.children.some((c: any) => pathname === c.href || pathname.startsWith(c.href + '/'));
            const Icon = item.icon;
            return (
              <div key={item.name}>
                <div className={cn(
                  'flex items-center gap-3 rounded-xl px-3 py-2 text-[11px] font-semibold uppercase tracking-wider',
                  isGroupActive ? 'text-primary' : 'text-muted-foreground/60',
                )}>
                  <Icon className="h-[14px] w-[14px] flex-shrink-0" />
                  {item.name}
                </div>
                <div className="ml-3 space-y-0.5 border-l border-gray-200/60 pl-3 dark:border-gray-700/40">
                  {item.children.map((child: any) => {
                    const isActive = pathname === child.href || pathname.startsWith(child.href + '/');
                    const ChildIcon = child.icon;
                    return (
                      <Link
                        key={child.name}
                        href={child.href}
                        className={cn(
                          'group flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[13px] font-medium transition-all duration-200',
                          isActive
                            ? 'bg-primary/10 text-primary dark:bg-primary/20'
                            : 'text-muted-foreground hover:bg-gray-100/80 hover:text-foreground dark:hover:bg-gray-800/50',
                        )}
                      >
                        <ChildIcon className={cn('h-[15px] w-[15px] flex-shrink-0', isActive ? 'text-primary' : 'text-muted-foreground/60 group-hover:text-foreground')} />
                        {child.name}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          }

          // 일반 메뉴
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
