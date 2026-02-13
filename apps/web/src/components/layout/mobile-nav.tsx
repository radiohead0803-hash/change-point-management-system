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
  User,
} from 'lucide-react';

const navigation = [
  { name: '대시보드', href: '/dashboard', icon: LayoutDashboard },
  { name: '등록', href: '/change-events/new', icon: FileText },
  { name: '내 요청', href: '/change-events/my', icon: ClipboardList },
  { name: '승인함', href: '/change-events/approvals', icon: CheckSquare },
  { name: '내 정보', href: '/profile', icon: User },
];

export default function MobileNav() {
  const { user } = useAuth();
  const pathname = usePathname();

  // 승인함 메뉴는 특정 권한을 가진 사용자만 볼 수 있음
  const canSeeApprovals = ['ADMIN', 'TIER1_REVIEWER', 'EXEC_APPROVER'].includes(user?.role || '');

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200 bg-white dark:border-gray-800 dark:bg-gray-900">
      <div className="mx-auto flex max-w-md justify-around">
        {navigation.map((item) => {
          // 승인함 메뉴 권한 체크
          if (item.href === '/change-events/approvals' && !canSeeApprovals) {
            return null;
          }

          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                'flex flex-1 flex-col items-center justify-center py-4',
                isActive
                  ? 'text-blue-600 dark:text-blue-500'
                  : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white',
              )}
            >
              <Icon className="h-6 w-6" />
              <span className="mt-1 text-xs">{item.name}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
