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
  HelpCircle,
} from 'lucide-react';

const navigation = [
  { name: '대시보드', href: '/dashboard', icon: LayoutDashboard, roles: null },
  { name: '등록', href: '/change-events/new', icon: FileText, roles: ['ADMIN', 'TIER1_EDITOR', 'TIER1_REVIEWER', 'EXEC_APPROVER', 'TIER2_EDITOR'] },
  { name: '내 요청', href: '/change-events/my', icon: ClipboardList, roles: ['ADMIN', 'TIER1_EDITOR', 'TIER1_REVIEWER', 'EXEC_APPROVER', 'TIER2_EDITOR'] },
  { name: '승인함', href: '/change-events/approvals', icon: CheckSquare, roles: ['ADMIN', 'TIER1_REVIEWER', 'EXEC_APPROVER'] },
  { name: '도움말', href: '/help', icon: HelpCircle, roles: null },
];

export default function MobileNav() {
  const { user } = useAuth();
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-gray-200/60 bg-white/80 backdrop-blur-xl dark:border-gray-800/60 dark:bg-gray-900/80" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
      <div className="mx-auto flex max-w-lg justify-around px-1">
        {navigation.map((item) => {
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
                'flex flex-1 flex-col items-center justify-center py-2.5 transition-colors',
                isActive
                  ? 'text-primary'
                  : 'text-muted-foreground/60 hover:text-foreground',
              )}
            >
              <div className={cn(
                'flex h-9 w-9 items-center justify-center rounded-xl transition-all',
                isActive && 'bg-primary/10 scale-110',
              )}>
                <Icon className="h-5 w-5" />
              </div>
              <span className={cn(
                'mt-1 text-[10px] font-medium',
                isActive && 'font-semibold',
              )}>{item.name}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
