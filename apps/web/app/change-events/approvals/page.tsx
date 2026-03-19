'use client';

import { useState, useMemo } from 'react';
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
  UserCheck, Clock, Search, Filter, Building2, Calendar,
  FileText, ExternalLink,
} from 'lucide-react';

/* ── 승인 플로우 단계 ── */
const FLOW_STEPS = [
  { status: 'SUBMITTED', label: '접수완료', nextStatus: 'REVIEWED', btnLabel: '1차 승인', allowedRoles: ['TIER1_REVIEWER', 'TIER1_EDITOR', 'ADMIN'], needsExecutive: true },
  { status: 'REVIEWED', label: '검토완료', nextStatus: 'APPROVED', btnLabel: '최종승인', allowedRoles: ['EXEC_APPROVER', 'ADMIN'], needsExecutive: false },
];

function getApprovalStep(status: string, role: string) {
  return FLOW_STEPS.find((s) => s.status === status && s.allowedRoles.includes(role));
}

type StepFilter = 'ALL' | 'SUBMITTED' | 'REVIEWED';

export default function ApprovalsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [executiveModal, setExecutiveModal] = useState<{ eventId: string; open: boolean }>({ eventId: '', open: false });
  const [selectedExecutiveId, setSelectedExecutiveId] = useState('');
  const [processing, setProcessing] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [stepFilter, setStepFilter] = useState<StepFilter>('ALL');

  const { data: events = [], isLoading } = useQuery<ChangeEvent[]>({
    queryKey: ['change-events'],
    queryFn: () => changeEvents.list().then((res) => res.data),
  });

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
  const pendingApprovals = useMemo(() => {
    return events.filter((e) => {
      if (!user) return false;
      return !!getApprovalStep(e.status, user.role);
    });
  }, [events, user]);

  // 필터링
  const filtered = useMemo(() => {
    return pendingApprovals.filter((e) => {
      const matchSearch = !searchTerm ||
        e.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.project.toLowerCase().includes(searchTerm.toLowerCase()) ||
        ((e as any).company?.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        e.receiptMonth.includes(searchTerm);
      const matchStep = stepFilter === 'ALL' || e.status === stepFilter;
      return matchSearch && matchStep;
    });
  }, [pendingApprovals, searchTerm, stepFilter]);

  // 단계별 카운트
  const stepCounts = useMemo(() => ({
    ALL: pendingApprovals.length,
    SUBMITTED: pendingApprovals.filter((e) => e.status === 'SUBMITTED').length,
    REVIEWED: pendingApprovals.filter((e) => e.status === 'REVIEWED').length,
  }), [pendingApprovals]);

  const handleApproveClick = (eventId: string) => {
    if (!user) return;
    const event = events.find((e) => e.id === eventId);
    if (!event) return;
    const step = getApprovalStep(event.status, user.role);
    if (!step) return;
    if (step.needsExecutive && !event.executiveId) {
      setExecutiveModal({ eventId, open: true });
      setSelectedExecutiveId('');
      return;
    }
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
      if (executiveId) updateData.executiveId = executiveId;
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

  return (
    <div className="space-y-5">
      {/* 헤더 + 승인 플로우 */}
      <div className="rounded-2xl border border-white/60 bg-gradient-to-br from-white/80 via-blue-50/40 to-purple-50/40 p-5 shadow-sm backdrop-blur-xl sm:p-6 dark:from-gray-900/80 dark:via-blue-900/10 dark:to-purple-900/10 dark:border-gray-800/60">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight sm:text-2xl">승인함</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              승인 대기 <span className="font-bold text-primary">{pendingApprovals.length}</span>건
            </p>
          </div>
          {/* 미니 플로우 */}
          <div className="flex items-center gap-1.5 text-[10px] sm:text-xs">
            <div className="rounded-lg bg-emerald-100/80 px-2 py-1 dark:bg-emerald-900/30">
              <span className="font-bold text-emerald-700 dark:text-emerald-400">접수</span>
            </div>
            <ChevronRight className="h-3 w-3 text-muted-foreground/30" />
            <div className={`rounded-lg px-2 py-1 ${
              user?.role === 'TIER1_EDITOR' || user?.role === 'TIER1_REVIEWER'
                ? 'bg-blue-200/80 ring-1 ring-blue-400 dark:bg-blue-900/50'
                : 'bg-blue-100/80 dark:bg-blue-900/20'
            }`}>
              <span className="font-bold text-blue-700 dark:text-blue-400">1차 승인</span>
            </div>
            <ChevronRight className="h-3 w-3 text-muted-foreground/30" />
            <div className={`rounded-lg px-2 py-1 ${
              user?.role === 'EXEC_APPROVER'
                ? 'bg-purple-200/80 ring-1 ring-purple-400 dark:bg-purple-900/50'
                : 'bg-purple-100/80 dark:bg-purple-900/20'
            }`}>
              <span className="font-bold text-purple-700 dark:text-purple-400">최종승인</span>
            </div>
            <ChevronRight className="h-3 w-3 text-muted-foreground/30" />
            <div className="rounded-lg bg-green-100/80 px-2 py-1 dark:bg-green-900/20">
              <span className="font-bold text-green-700 dark:text-green-400">완료</span>
            </div>
          </div>
        </div>
      </div>

      {/* 필터 탭 + 검색 */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {/* 단계 필터 탭 */}
        <div className="flex gap-1.5 rounded-xl bg-gray-100/60 p-1 dark:bg-gray-800/40">
          {([
            { key: 'ALL' as StepFilter, label: '전체', color: '' },
            { key: 'SUBMITTED' as StepFilter, label: '1차 승인', color: 'text-blue-700 dark:text-blue-400' },
            { key: 'REVIEWED' as StepFilter, label: '최종 승인', color: 'text-purple-700 dark:text-purple-400' },
          ]).map((tab) => (
            <button
              key={tab.key}
              onClick={() => setStepFilter(tab.key)}
              className={`relative rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                stepFilter === tab.key
                  ? 'bg-white text-foreground shadow-sm dark:bg-gray-700'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
              {stepCounts[tab.key] > 0 && (
                <span className={`ml-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-bold ${
                  stepFilter === tab.key
                    ? 'bg-primary text-white'
                    : 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                }`}>
                  {stepCounts[tab.key]}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* 검색 */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/40" />
          <input
            className="h-9 w-full rounded-xl border border-input bg-white/60 pl-9 pr-3 text-sm backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-ring/40 dark:bg-gray-900/60"
            placeholder="고객사, 프로젝트, 협력사, 접수월 검색..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
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
                  {u.name}{u.company ? ` - ${u.company.name}` : ''}
                </option>
              ))}
            </select>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setExecutiveModal({ eventId: '', open: false })}>
                취소
              </Button>
              <Button className="flex-1" onClick={handleExecutiveApprove} disabled={!selectedExecutiveId || processing === executiveModal.eventId}>
                <CheckCircle2 className="mr-1.5 h-4 w-4" />
                {processing === executiveModal.eventId ? '처리 중...' : '승인 & 지정'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 승인 목록 */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-gray-50/30 py-20 text-center dark:border-gray-800 dark:bg-gray-900/20">
          <CheckCircle2 className="mb-3 h-12 w-12 text-emerald-300" />
          <p className="text-sm font-medium text-muted-foreground">
            {searchTerm || stepFilter !== 'ALL' ? '조건에 맞는 승인 건이 없습니다' : '승인 대기 건이 없습니다'}
          </p>
          {(searchTerm || stepFilter !== 'ALL') && (
            <button
              onClick={() => { setSearchTerm(''); setStepFilter('ALL'); }}
              className="mt-2 text-xs text-primary hover:underline"
            >
              필터 초기화
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2.5">
          {filtered.map((event) => {
            const isSubmitted = event.status === 'SUBMITTED';
            const step = user ? getApprovalStep(event.status, user.role) : null;
            const accentBorder = isSubmitted ? 'border-l-blue-500' : 'border-l-purple-500';
            const accentBg = isSubmitted ? 'hover:bg-blue-50/30 dark:hover:bg-blue-900/5' : 'hover:bg-purple-50/30 dark:hover:bg-purple-900/5';

            return (
              <div
                key={event.id}
                className={`group relative rounded-xl border border-l-[3px] ${accentBorder} border-white/60 bg-white/70 shadow-sm backdrop-blur-xl transition-all duration-200 ${accentBg} dark:border-gray-800/60 dark:bg-gray-900/70`}
              >
                <div className="flex flex-col sm:flex-row">
                  {/* 메인 콘텐츠 */}
                  <div
                    className="flex-1 cursor-pointer p-4 active:opacity-70 sm:p-5"
                    onClick={() => router.push(`/change-events/${event.id}`)}
                  >
                    {/* 상단: 단계 + 상태 */}
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-bold ${
                        isSubmitted
                          ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                          : 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
                      }`}>
                        {isSubmitted ? <Clock className="h-2.5 w-2.5" /> : <Shield className="h-2.5 w-2.5" />}
                        {isSubmitted ? '1차 승인 대기' : '최종승인 대기'}
                      </span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${getStatusBadgeClass(event.status)}`}>
                        {getStatusText(event.status)}
                      </span>
                    </div>

                    {/* 제목 */}
                    <h3 className="mt-2 text-sm font-semibold leading-tight sm:text-[15px]">
                      {event.customer || '-'} - {event.project || '-'}
                    </h3>

                    {/* 메타 정보 */}
                    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Building2 className="h-3 w-3" />
                        {(event as any).company?.name}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {event.receiptMonth}
                      </span>
                      <span className="flex items-center gap-1">
                        <FileText className="h-3 w-3" />
                        발생일 {formatDate(event.occurredDate)}
                      </span>
                    </div>

                    {/* 승인자 태그 */}
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {(event as any).reviewer && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-blue-50/80 px-1.5 py-0.5 text-[10px] font-medium text-blue-700 dark:bg-blue-900/20 dark:text-blue-400">
                          <UserCheck className="h-2.5 w-2.5" />
                          담당자: {(event as any).reviewer.name}
                        </span>
                      )}
                      {(event as any).executive ? (
                        <span className="inline-flex items-center gap-1 rounded-md bg-purple-50/80 px-1.5 py-0.5 text-[10px] font-medium text-purple-700 dark:bg-purple-900/20 dark:text-purple-400">
                          <Shield className="h-2.5 w-2.5" />
                          전담중역: {(event as any).executive.name}
                        </span>
                      ) : isSubmitted && (
                        <span className="inline-flex items-center gap-1 rounded-md bg-amber-50/80 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-900/20 dark:text-amber-400">
                          ⚠ 전담중역 미지정
                        </span>
                      )}
                    </div>
                  </div>

                  {/* 액션 영역 */}
                  <div className="flex items-center gap-2 border-t border-gray-100 px-4 py-3 sm:flex-col sm:justify-center sm:border-l sm:border-t-0 sm:px-4 sm:py-4 dark:border-gray-800/40">
                    <Button
                      size="sm"
                      onClick={() => handleApproveClick(event.id)}
                      disabled={processing === event.id}
                      className={`flex-1 sm:flex-none sm:w-24 ${
                        isSubmitted
                          ? 'bg-blue-600 hover:bg-blue-700'
                          : 'bg-purple-600 hover:bg-purple-700'
                      }`}
                    >
                      <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                      {processing === event.id ? '...' : step?.btnLabel || '승인'}
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 sm:flex-none sm:w-24"
                      onClick={() => handleReturn(event.id)}
                      disabled={processing === event.id}
                    >
                      <RotateCcw className="mr-1 h-3.5 w-3.5" />
                      보완요청
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="hidden sm:inline-flex sm:w-24"
                      onClick={() => router.push(`/change-events/${event.id}`)}
                    >
                      <ExternalLink className="mr-1 h-3.5 w-3.5" />
                      상세
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
