'use client';

import { useAuth } from '@/contexts/auth-context';
import { changeEvents } from '@/lib/api-client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ChangeEvent } from '@/types';
import { formatDate, getStatusBadgeClass, getStatusText } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { useRouter } from 'next/navigation';
import { CheckCircle2, RotateCcw, ArrowRight } from 'lucide-react';

export default function ApprovalsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: events = [], isLoading } = useQuery<ChangeEvent[]>({
    queryKey: ['change-events'],
    queryFn: () => changeEvents.list().then((res) => res.data),
  });

  // 승인 대기 건만 필터링
  const pendingApprovals = events.filter((e) => {
    if (user?.role === 'TIER1_REVIEWER' && e.status === 'SUBMITTED') return true;
    if (user?.role === 'EXEC_APPROVER' && e.status === 'REVIEWED') return true;
    if (user?.role === 'ADMIN') return ['SUBMITTED', 'REVIEWED'].includes(e.status);
    return false;
  });

  const handleApprove = async (eventId: string) => {
    try {
      const newStatus = user?.role === 'TIER1_REVIEWER' ? 'REVIEWED' : 'APPROVED';
      await changeEvents.update(eventId, { status: newStatus });
      queryClient.invalidateQueries({ queryKey: ['change-events'] });
      toast({ title: '승인 처리되었습니다.' });
    } catch {
      toast({ variant: 'destructive', title: '처리 실패' });
    }
  };

  const handleReturn = async (eventId: string) => {
    try {
      await changeEvents.update(eventId, { status: 'REVIEW_RETURNED' });
      queryClient.invalidateQueries({ queryKey: ['change-events'] });
      toast({ title: '보완 요청되었습니다.' });
    } catch {
      toast({ variant: 'destructive', title: '처리 실패' });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">승인함</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          승인 대기 중인 변동점 {pendingApprovals.length}건
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : pendingApprovals.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <CheckCircle2 className="mb-3 h-12 w-12 text-emerald-300" />
          <p className="text-sm font-medium text-muted-foreground">
            승인 대기 건이 없습니다
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {pendingApprovals.map((event) => (
            <div
              key={event.id}
              className="rounded-2xl border border-white/60 bg-white/70 p-4 shadow-sm backdrop-blur-xl transition-all duration-200 hover:shadow-md sm:p-5 dark:border-gray-800/60 dark:bg-gray-900/70"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                <div
                  className="flex-1 cursor-pointer active:opacity-70"
                  onClick={() => router.push(`/change-events/${event.id}`)}
                >
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-semibold">{event.customer}</h3>
                    <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${getStatusBadgeClass(event.status)}`}>
                      {getStatusText(event.status)}
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {event.project} · {event.company.name} · {event.receiptMonth}
                  </p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground/60">
                    발생일: {formatDate(event.occurredDate)}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 sm:flex-none"
                    onClick={() => handleReturn(event.id)}
                  >
                    <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                    보완요청
                  </Button>
                  <Button size="sm" className="flex-1 sm:flex-none" onClick={() => handleApprove(event.id)}>
                    <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                    {user?.role === 'TIER1_REVIEWER' ? '검토완료' : '승인'}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="hidden sm:inline-flex"
                    onClick={() => router.push(`/change-events/${event.id}`)}
                  >
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
