'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { changeEvents, users } from '@/lib/api-client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ChangeEvent } from '@/types';
import { formatDate, getStatusBadgeClass, getStatusText } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { useRouter } from 'next/navigation';
import {
  CheckCircle2, RotateCcw, ArrowRight, ChevronRight, Shield,
  UserCheck, Clock, Send,
} from 'lucide-react';

/* ── 승인 플로우 단계 ── */
const FLOW_STEPS = [
  { status: 'SUBMITTED', label: '접수완료', nextStatus: 'REVIEWED', btnLabel: '1차 승인', allowedRoles: ['TIER1_REVIEWER', 'TIER1_EDITOR', 'ADMIN'], needsExecutive: true },
  { status: 'REVIEWED', label: '검토완료', nextStatus: 'APPROVED', btnLabel: '최종승인', allowedRoles: ['EXEC_APPROVER', 'ADMIN'], needsExecutive: false },
];

function getApprovalStep(status: string, role: string) {
  return FLOW_STEPS.find((s) => s.status === status && s.allowedRoles.includes(role));
}

export default function ApprovalsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [executiveModal, setExecutiveModal] = useState<{ eventId: string; open: boolean }>({ eventId: '', open: false });
  const [selectedExecutiveId, setSelectedExecutiveId] = useState('');
  const [processing, setProcessing] = useState<string | null>(null);

  const { data: events = [], isLoading } = useQuery<ChangeEvent[]>({
    queryKey: ['change-events'],
    queryFn: () => changeEvents.list().then((res) => res.data),
  });

  // 전담중역 목록
  const { data: executives = [] } = useQuery<any[]>({
    queryKey: ['executives'],
    queryFn: async () => {
      try {
        const res = await users.list();
        return res.data.filter((u: any) => ['EXEC_APPROVER', 'ADMIN'].includes(u.role));
      } catch {
        return [];
      }
    },
  });

  // 내 역할에 맞는 승인 대기 건
  const pendingApprovals = events.filter((e) => {
    if (!user) return false;
    return !!getApprovalStep(e.status, user.role);
  });

  // 1차 승인 처리 (전담중역 지정 필요 여부 확인)
  const handleApproveClick = (eventId: string) => {
    if (!user) return;
    const event = events.find((e) => e.id === eventId);
    if (!event) return;
    const step = getApprovalStep(event.status, user.role);
    if (!step) return;

    // 1차 승인 시 전담중역이 미지정이면 모달 표시
    if (step.needsExecutive && !event.executiveId) {
      setExecutiveModal({ eventId, open: true });
      setSelectedExecutiveId('');
      return;
    }

    // 전담중역이 이미 지정되어 있으면 바로 승인
    handleApprove(eventId);
  };

  const handleApprove = async (eventId: string, executiveId?: string) => {
    if (!user) return;
    const event = events.find((e) => e.id === eventId);
    if (!event) return;
    const step = getApprovalStep(event.status, user.role);
    if (!step) return;

    try {
      setProcessing(eventId);
      const updateData: any = { status: step.nextStatus };
      if (executiveId) {
        updateData.executiveId = executiveId;
      }
      await changeEvents.update(eventId, updateData);
      queryClient.invalidateQueries({ queryKey: ['change-events'] });
      toast({ title: `${step.btnLabel} 처리되었습니다.` });
      setExecutiveModal({ eventId: '', open: false });
    } catch {
      toast({ variant: 'destructive', title: '처리 실패' });
    } finally {
      setProcessing(null);
    }
  };

  const handleReturn = async (eventId: string) => {
    try {
      setProcessing(eventId);
      await changeEvents.update(eventId, { status: 'REVIEW_RETURNED' as any });
      queryClient.invalidateQueries({ queryKey: ['change-events'] });
      toast({ title: '보완 요청되었습니다.' });
    } catch {
      toast({ variant: 'destructive', title: '처리 실패' });
    } finally {
      setProcessing(null);
    }
  };

  const handleExecutiveApprove = () => {
    if (!selectedExecutiveId) {
      toast({ variant: 'destructive', title: '전담중역을 선택해주세요.' });
      return;
    }
    handleApprove(executiveModal.eventId, selectedExecutiveId);
  };

  const getStepInfo = (status: string) => {
    if (status === 'SUBMITTED') return { step: '1단계', label: '1차 검토 대기', color: 'bg-blue-500', textColor: 'text-blue-700 dark:text-blue-400', icon: Clock };
    if (status === 'REVIEWED') return { step: '2단계', label: '최종승인 대기', color: 'bg-purple-500', textColor: 'text-purple-700 dark:text-purple-400', icon: Shield };
    return { step: '', label: '', color: 'bg-gray-500', textColor: '', icon: Clock };
  };

  const ROLE_LABELS: Record<string, string> = {
    ADMIN: '관리자',
    EXEC_APPROVER: '전담중역',
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
        <div className="flex items-center gap-1 sm:gap-2 text-[10px] sm:text-xs overflow-x-auto">
          <div className="flex-shrink-0 rounded-lg bg-emerald-50 px-2 py-1.5 shadow-sm dark:bg-emerald-900/30">
            <span className="font-bold text-emerald-700 dark:text-emerald-400">접수·등록</span>
            <span className="block text-[9px] text-muted-foreground">협력사/담당자</span>
          </div>
          <ChevronRight className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground/40" />
          <div className={`flex-shrink-0 rounded-lg px-2 py-1.5 shadow-sm ${
            user?.role === 'TIER1_REVIEWER' || user?.role === 'TIER1_EDITOR'
              ? 'bg-blue-100 ring-2 ring-blue-300 dark:bg-blue-900/40 dark:ring-blue-700'
              : 'bg-white/80 dark:bg-gray-800/60'
          }`}>
            <span className="font-bold text-blue-700 dark:text-blue-400">1차 검토</span>
            <span className="block text-[9px] text-muted-foreground">담당자 승인</span>
          </div>
          <ChevronRight className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground/40" />
          <div className="flex-shrink-0 rounded-lg bg-amber-50 px-2 py-1.5 shadow-sm dark:bg-amber-900/20">
            <span className="font-bold text-amber-700 dark:text-amber-400">전담중역 지정</span>
            <span className="block text-[9px] text-muted-foreground">1차 승인 시</span>
          </div>
          <ChevronRight className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground/40" />
          <div className={`flex-shrink-0 rounded-lg px-2 py-1.5 shadow-sm ${
            user?.role === 'EXEC_APPROVER'
              ? 'bg-purple-100 ring-2 ring-purple-300 dark:bg-purple-900/40 dark:ring-purple-700'
              : 'bg-white/80 dark:bg-gray-800/60'
          }`}>
            <span className="font-bold text-purple-700 dark:text-purple-400">최종승인</span>
            <span className="block text-[9px] text-muted-foreground">전담중역</span>
          </div>
          <ChevronRight className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground/40" />
          <div className="flex-shrink-0 rounded-lg bg-green-50 px-2 py-1.5 shadow-sm dark:bg-green-900/20">
            <span className="font-bold text-green-700 dark:text-green-400">완료</span>
            <span className="block text-[9px] text-muted-foreground">알림 발송</span>
          </div>
        </div>
      </div>

      {/* 전담중역 지정 모달 */}
      {executiveModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-900">
            <h3 className="mb-1 text-lg font-bold flex items-center gap-2">
              <UserCheck className="h-5 w-5 text-amber-600" />
              전담중역 지정
            </h3>
            <p className="mb-4 text-sm text-muted-foreground">
              1차 승인 완료 시 최종승인자(전담중역)를 지정해주세요.
            </p>
            <select
              className="mb-4 h-11 w-full rounded-xl border border-input bg-background/60 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
              value={selectedExecutiveId}
              onChange={(e) => setSelectedExecutiveId(e.target.value)}
            >
              <option value="">전담중역 선택</option>
              {executives.map((u: any) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({ROLE_LABELS[u.role] || u.role}){u.company ? ` - ${u.company.name}` : ''}
                </option>
              ))}
            </select>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setExecutiveModal({ eventId: '', open: false })}
              >
                취소
              </Button>
              <Button
                className="flex-1"
                onClick={handleExecutiveApprove}
                disabled={!selectedExecutiveId || processing === executiveModal.eventId}
              >
                <CheckCircle2 className="mr-1.5 h-4 w-4" />
                {processing === executiveModal.eventId ? '처리 중...' : '1차 승인 & 전담중역 지정'}
              </Button>
            </div>
          </div>
        </div>
      )}

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
            const StepIcon = stepInfo.icon;
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
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="flex items-center gap-1.5">
                        <StepIcon className={`h-3.5 w-3.5 ${stepInfo.textColor}`} />
                        <span className={`text-[10px] font-bold ${stepInfo.textColor}`}>{stepInfo.step} {stepInfo.label}</span>
                      </div>
                      <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${getStatusBadgeClass(event.status)}`}>
                        {getStatusText(event.status)}
                      </span>
                    </div>
                    <h3 className="mt-1.5 text-sm font-semibold">{event.customer} - {event.project}</h3>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {(event as any).company?.name} · {event.receiptMonth} · 발생일: {formatDate(event.occurredDate)}
                    </p>
                    {/* 승인자 정보 */}
                    <div className="mt-1.5 flex flex-wrap gap-2 text-[10px]">
                      {(event as any).reviewer && (
                        <span className="rounded-md bg-blue-50 px-1.5 py-0.5 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400">
                          검토자: {(event as any).reviewer.name}
                        </span>
                      )}
                      {(event as any).executive && (
                        <span className="rounded-md bg-purple-50 px-1.5 py-0.5 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400">
                          전담중역: {(event as any).executive.name}
                        </span>
                      )}
                      {!event.executiveId && event.status === 'SUBMITTED' && (
                        <span className="rounded-md bg-amber-50 px-1.5 py-0.5 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
                          ⚠ 전담중역 미지정
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 sm:flex-none"
                      onClick={() => handleReturn(event.id)}
                      disabled={processing === event.id}
                    >
                      <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
                      보완요청
                    </Button>
                    <Button
                      size="sm"
                      className="flex-1 sm:flex-none"
                      onClick={() => handleApproveClick(event.id)}
                      disabled={processing === event.id}
                    >
                      <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                      {processing === event.id ? '처리 중...' : step?.btnLabel || '승인'}
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
