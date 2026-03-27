'use client';

import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { notifications } from '@/lib/api-client';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import {
  Bell, CheckCircle2, AlertTriangle, Send, FileCheck,
  CheckCheck, Clock, Trash2, X, Settings,
} from 'lucide-react';
import { NotificationSettingsModal } from '@/components/notification-settings-modal';

const TYPE_CONFIG: Record<string, { icon: any; color: string; bg: string }> = {
  APPROVAL_REQUEST: { icon: Send, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-900/20' },
  APPROVED: { icon: CheckCircle2, color: 'text-green-600 dark:text-green-400', bg: 'bg-green-50 dark:bg-green-900/20' },
  REVIEW_RETURNED: { icon: AlertTriangle, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-900/20' },
  SUBMITTED: { icon: FileCheck, color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-900/20' },
};

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return '방금 전';
  if (mins < 60) return `${mins}분 전`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}시간 전`;
  const days = Math.floor(hours / 24);
  return `${days}일 전`;
}

type FilterType = 'ALL' | 'UNREAD' | 'READ';

export default function NotificationsPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [filter, setFilter] = useState<FilterType>('ALL');
  const [showSettings, setShowSettings] = useState(false);

  const { data: notifs = [], isLoading } = useQuery<any[]>({
    queryKey: ['notifications'],
    queryFn: () => notifications.list().then(r => r.data),
  });

  const markReadMutation = useMutation({
    mutationFn: (id: string) => notifications.markAsRead(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
      qc.invalidateQueries({ queryKey: ['unread-notifications'] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => notifications.markAllAsRead(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
      qc.invalidateQueries({ queryKey: ['unread-notifications'] });
      toast({ title: '모든 알림을 읽음 처리했습니다.' });
    },
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) => notifications.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
      qc.invalidateQueries({ queryKey: ['unread-notifications'] });
      toast({ title: '알림이 삭제되었습니다.' });
    },
  });

  const removeAllMutation = useMutation({
    mutationFn: () => notifications.removeAll(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['notifications'] });
      qc.invalidateQueries({ queryKey: ['unread-notifications'] });
      toast({ title: '모든 알림이 삭제되었습니다.' });
    },
  });

  const handleClick = (notif: any) => {
    if (!notif.isRead) markReadMutation.mutate(notif.id);
    if (notif.eventId) router.push(`/change-events/${notif.eventId}`);
  };

  const handleRemove = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    removeMutation.mutate(id);
  };

  const unreadCount = notifs.filter((n: any) => !n.isRead).length;
  const readCount = notifs.filter((n: any) => n.isRead).length;

  const filtered = useMemo(() => {
    if (filter === 'UNREAD') return notifs.filter((n: any) => !n.isRead);
    if (filter === 'READ') return notifs.filter((n: any) => n.isRead);
    return notifs;
  }, [notifs, filter]);

  const FILTERS: { key: FilterType; label: string; count: number }[] = [
    { key: 'ALL', label: '전체', count: notifs.length },
    { key: 'UNREAD', label: '읽지않음', count: unreadCount },
    { key: 'READ', label: '읽음', count: readCount },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">알림</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {unreadCount > 0 ? `읽지 않은 알림 ${unreadCount}건` : '모든 알림을 확인했습니다'}
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => setShowSettings(true)}>
            <Settings className="mr-1.5 h-4 w-4" />
            알림 설정
          </Button>
          {unreadCount > 0 && (
            <Button size="sm" variant="outline" onClick={() => markAllReadMutation.mutate()}>
              <CheckCheck className="mr-1.5 h-4 w-4" />
              모두 읽음
            </Button>
          )}
          {notifs.length > 0 && (
            <Button size="sm" variant="outline" className="text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => removeAllMutation.mutate()}>
              <Trash2 className="mr-1.5 h-4 w-4" />
              전체 삭제
            </Button>
          )}
        </div>
      </div>

      {/* 필터 탭 */}
      <div className="flex gap-1 rounded-xl bg-gray-100/60 p-1 dark:bg-gray-800/40 w-fit">
        {FILTERS.map((f) => (
          <button key={f.key} onClick={() => setFilter(f.key)}
            className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
              filter === f.key ? 'bg-white shadow-sm dark:bg-gray-700 text-primary' : 'text-muted-foreground hover:text-foreground'
            }`}>
            {f.label} ({f.count})
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Bell className="mb-3 h-10 w-10 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">
            {filter === 'UNREAD' ? '읽지 않은 알림이 없습니다' : filter === 'READ' ? '읽은 알림이 없습니다' : '알림이 없습니다'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((notif: any) => {
            const config = TYPE_CONFIG[notif.type] || TYPE_CONFIG.SUBMITTED;
            const Icon = config.icon;
            return (
              <div
                key={notif.id}
                onClick={() => handleClick(notif)}
                className={`group cursor-pointer rounded-2xl border p-4 transition-all hover:shadow-md ${
                  notif.isRead
                    ? 'border-white/60 bg-white/50 dark:border-gray-800/60 dark:bg-gray-900/50'
                    : 'border-primary/20 bg-white/80 shadow-sm dark:border-primary/30 dark:bg-gray-900/80'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl ${config.bg}`}>
                    <Icon className={`h-4.5 w-4.5 ${config.color}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className={`text-sm font-semibold ${notif.isRead ? 'text-muted-foreground' : ''}`}>
                        {notif.title}
                      </p>
                      {!notif.isRead && (
                        <span className="h-2 w-2 rounded-full bg-primary flex-shrink-0" />
                      )}
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground line-clamp-2">{notif.message}</p>
                    <p className="mt-1 flex items-center gap-1 text-[10px] text-muted-foreground/60">
                      <Clock className="h-3 w-3" />
                      {timeAgo(notif.createdAt)}
                    </p>
                  </div>
                  <button
                    onClick={(e) => handleRemove(e, notif.id)}
                    className="flex-shrink-0 rounded-lg p-1.5 opacity-0 transition-all hover:bg-red-50 hover:text-red-500 group-hover:opacity-100 dark:hover:bg-red-900/20"
                    title="삭제"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <NotificationSettingsModal open={showSettings} onClose={() => setShowSettings(false)} />
    </div>
  );
}
