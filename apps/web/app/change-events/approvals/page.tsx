'use client';

import { useAuth } from '@/contexts/auth-context';
import { changeEvents } from '@/lib/api-client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ChangeEvent } from '@/types';
import { formatDate, getStatusBadgeClass, getStatusText } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { useRouter } from 'next/navigation';
import { CheckCircle2, RotateCcw, ArrowRight, ChevronRight, Shield } from 'lucide-react';

/* ── 승인 플로우 단계 ── */
const FLOW_STEPS = [
  { status: 'SUBMITTED',  label: '접수완료',  nextStatus: 'REVIEWED',  btnLabel: '검토완료', allowedRoles: ['TIER1_REVIEWER', 'ADMIN'] },
  { status: 'REVIEWED',   label: '검토완료',  nextStatus: 'APPROVED',  btnLabel: '최종승인', allowedRoles: ['EXEC_APPROVER', 'ADMIN'] },
];

function getApprovalStep(status: string, role: string) {
  return FLOW_STEPS.find((s) => s.status === status && s.allowedRoles.includes(role));
}

export default function ApprovalsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: events = [], isLoading } = useQuery<ChangeEvent[]>({
    queryKey: ['change-events'],
    queryFn: () => changeEvents.list().then((res) => res.data),
  });

  // 내 역할에 맞는 승인 대기 건 필터링
  const pendingApprovals = events.filter((e) => {
    if (!user) return false;
    return !!getApprovalStep(e.status, user.role);
  });

  const handleApprove = async (eventId: string) => {
    if (!user) return;
    const event = events.find((e) => e.id === eventId);
    if (!event) return;
    const step = getApprovalStep(event.status, user.role);
    if (!step) return;

    try {
      await changeEvents.update(eventId, { status: step.nextStatus as any });
      queryClient.invalidateQueries({ queryKey: ['change-events'] });
      toast({ title: `${step.btnLabel} 처리되었습니다.` });
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

  const getStepInfo = (status: string) => {
    if (status === 'SUBMITTED') return { step: '1단계', label: '검토 대기', color: 'bg-blue-500', textColor: 'text-blue-700 dark:text-blue-400' };
    if (status === 'REVIEWED') return { step: '2단계', label: '최종승인 대기', color: 'bg-purple-500', textColor: 'text-purple-700 dark:text-purple-400' };
    return { step: '', label: '', color: 'bg-gray-500', textColor: '' };
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">승인함</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          승인 대기 중인 변동점 {pendingApprovals.length}건
        </p>
      </div>

      {/* 승인 플로우 안내 */}
      <div className="rounded-2xl border border-white/60 bg-gradient-to-r from-blue-50/80 via-indigo-50/80 to-purple-50/80 p-3 shadow-sm backdrop-blur-xl sm:p-4 dark:from-blue-900/20 dark:via-indigo-900/20 dark:to-purple-900/20 dark:border-gray-800/60">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">승인 플로우</p>
        <div className="flex items-center gap-1 sm:gap-2 text-[10px] sm:text-xs">
          <div className="rounded-lg bg-white/80 px-2 py-1.5 shadow-sm dark:bg-gray-800/60">
            <span className="font-bold text-green-700 dark:text-green-400">접수·등록</span>
            <span className="block text-[9px] text-muted-foreground">협력사/담당자</span>
          </div>
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40" />
          <div className={`rounded-lg px-2 py-1.5 shadow-sm ${user?.role === 'TIER1_REVIEWER' ? 'bg-blue-100 ring-2 ring-blue-300 dark:bg-blue-900/40 dark:ring-blue-700' : 'bg-white/80 dark:bg-gray-800/60'}`}>
            <span className="font-bold text-blue-700 dark:text-blue-400">검토·승인</span>
            <span className="block text-[9px] text-muted-foreground">1차사 검토자</span>
          </div>
          <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40" />
          <div className={`rounded-lg px-2 py-1.5 shadow-sm ${user?.role === 'EXEC_APPROVER' ? 'bg-purple-100 ring-2 ring-purple-300 dark:bg-purple-900/40 dark:ring-purple-700' : 'bg-white/80 dark:bg-gray-800/60'}`}>
            <span className="font-bold text-purple-700 dark:text-purple-400">최종승인</span>
            <span className="block text-[9px] text-muted-foreground">전담중역</span>
          </div>
        </div>
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
          {pendingApprovals.map((event) => {
            const stepInfo = getStepInfo(event.status);
            const step = user ? getApprovalStep(event.status, user.role) : null;
            return (
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
                      <div className="flex items-center gap-1.5">
                        <div className={`h-2 w-2 rounded-full ${stepInfo.color}`} />
                        <span className={`text-[10px] font-bold ${stepInfo.textColor}`}>{stepInfo.step}</span>
                      </div>
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
                      {step?.btnLabel || '승인'}
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
            );
          })}
        </div>
      )}
    </div>
  );
}
