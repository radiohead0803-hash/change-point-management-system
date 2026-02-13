'use client';

import { useAuth } from '@/contexts/auth-context';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  FileText,
  ClipboardList,
  CheckSquare,
  Settings,
  LogOut,
} from 'lucide-react';

const navigation = [
  { name: '대시보드', href: '/dashboard', icon: LayoutDashboard },
  { name: '변동점 등록', href: '/change-events/new', icon: FileText },
  { name: '내 요청', href: '/change-events/my', icon: ClipboardList },
  { name: '승인함', href: '/change-events/approvals', icon: CheckSquare },
  { name: '관리', href: '/admin', icon: Settings, adminOnly: true },
];

export default function Sidebar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();

  return (
    <div className="flex h-full w-64 flex-col border-r border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
      {/* 로고 */}
      <div className="flex h-16 items-center border-b border-gray-200 px-4 dark:border-gray-800">
        <h1 className="text-lg font-semibold">변동점 관리 시스템</h1>
      </div>

      {/* 네비게이션 */}
      <nav className="flex-1 space-y-1 px-2 py-4">
        {navigation.map((item) => {
          // 관리자 전용 메뉴는 ADMIN 권한이 있는 경우에만 표시
          if (item.adminOnly && user?.role !== 'ADMIN') {
            return null;
          }

          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'group flex items-center rounded-lg px-3 py-2 text-sm font-medium',
                isActive
                  ? 'bg-gray-100 text-gray-900 dark:bg-gray-800 dark:text-white'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-800 dark:hover:text-white',
              )}
            >
              <Icon
                className={cn(
                  'mr-3 h-5 w-5 flex-shrink-0',
                  isActive
                    ? 'text-gray-500 dark:text-gray-300'
                    : 'text-gray-400 group-hover:text-gray-500 dark:text-gray-400 dark:group-hover:text-gray-300',
                )}
              />
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* 사용자 정보 */}
      <div className="border-t border-gray-200 p-4 dark:border-gray-800">
        <div className="flex items-center">
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-900 dark:text-white">{user?.name}</p>
            <p className="text-xs text-gray-500 dark:text-gray-400">{user?.email}</p>
          </div>
          <button
            onClick={logout}
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-500 dark:hover:bg-gray-800 dark:hover:text-gray-300"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}
