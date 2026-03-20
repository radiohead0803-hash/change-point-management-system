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
  CheckCircle2, RotateCcw, ChevronRight, Shield,
  UserCheck, Clock, Search, Filter, FileSpreadsheet,
} from 'lucide-react';

function TipCell({ children, tip, className = '' }: { children: React.ReactNode; tip?: string; className?: string }) {
  return (
    <td className={`group/tip relative ${className}`}>
      {children}
      {tip && tip.length > 6 && (
        <div className="pointer-events-none absolute left-1/2 bottom-full z-50 mb-1 hidden -translate-x-1/2 whitespace-normal rounded-lg bg-gray-900 px-3 py-2 text-[10px] leading-relaxed text-white shadow-lg group-hover/tip:block max-w-[250px] text-left">
          {tip}
          <div className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
        </div>
      )}
    </td>
  );
}

const FLOW_STEPS = [
  { status: 'SUBMITTED', label: '접수완료', nextStatus: 'CONFIRMED', btnLabel: '제출완료', allowedRoles: ['TIER1_EDITOR', 'ADMIN'], needsExecutive: false },
  { status: 'CONFIRMED', label: '제출완료', nextStatus: 'REVIEWED', btnLabel: '1차 승인', allowedRoles: ['TIER1_REVIEWER', 'ADMIN'], needsExecutive: true },
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
  const [returnModal, setReturnModal] = useState<{ eventId: string; open: boolean }>({ eventId: '', open: false });
  const [returnComment, setReturnComment] = useState('');
  const [processing, setProcessing] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [stepFilter, setStepFilter] = useState<string>('ALL');

  const { data: events = [], isLoading } = useQuery<ChangeEvent[]>({
    queryKey: ['change-events'],
    queryFn: () => changeEvents.list().then((res) => res.data),
  });

  const { data: executives = [] } = useQuery<any[]>({
    queryKey: ['executives'],
    queryFn: async () => { try { return (await users.list()).data.filter((u: any) => ['EXEC_APPROVER', 'ADMIN'].includes(u.role)); } catch { return []; } },
  });

  const pendingApprovals = useMemo(() => events.filter((e) => user && !!getApprovalStep(e.status, user.role)), [events, user]);

  const filtered = useMemo(() => {
    return pendingApprovals.filter((e) => {
      const matchSearch = !searchTerm ||
        (e.customer || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (e.project || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        ((e as any).company?.name || '').toLowerCase().includes(searchTerm.toLowerCase());
      const matchStep = stepFilter === 'ALL' || e.status === stepFilter;
      return matchSearch && matchStep;
    });
  }, [pendingApprovals, searchTerm, stepFilter]);

  const stepCounts = useMemo(() => ({
    ALL: pendingApprovals.length,
    SUBMITTED: pendingApprovals.filter((e) => e.status === 'SUBMITTED').length,
    CONFIRMED: pendingApprovals.filter((e) => e.status === 'CONFIRMED').length,
    REVIEWED: pendingApprovals.filter((e) => e.status === 'REVIEWED').length,
  }), [pendingApprovals]);

  const handleApproveClick = (eventId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!user) return;
    const event = events.find((ev) => ev.id === eventId);
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
    } catch { toast({ variant: 'destructive', title: '처리 실패' }); }
    finally { setProcessing(null); }
  };

  const handleReturnClick = (eventId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setReturnModal({ eventId, open: true });
    setReturnComment('');
  };

  const handleReturn = async () => {
    if (!returnComment.trim()) {
      toast({ variant: 'destructive', title: '보완요청 사유를 입력해주세요.' });
      return;
    }
    try {
      setProcessing(returnModal.eventId);
      await changeEvents.update(returnModal.eventId, {
        status: 'REVIEW_RETURNED' as any,
        returnComment: returnComment.trim(),
      });
      queryClient.invalidateQueries({ queryKey: ['change-events'] });
      toast({ title: '보완 요청되었습니다.' });
      setReturnModal({ eventId: '', open: false });
    } catch { toast({ variant: 'destructive', title: '처리 실패' }); }
    finally { setProcessing(null); }
  };

  return (
    <div className="space-y-5">
      {/* 헤더 + 플로우 */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">승인함</h1>
          <p className="mt-1 text-sm text-muted-foreground">승인 대기 <span className="font-bold text-primary">{pendingApprovals.length}</span>건</p>
        </div>
        <div className="flex items-center gap-1.5 text-[10px] sm:text-xs">
          <div className="rounded-lg bg-emerald-100/80 px-2 py-1 dark:bg-emerald-900/30"><span className="font-bold text-emerald-700">접수</span></div>
          <ChevronRight className="h-3 w-3 text-muted-foreground/30" />
          <div className={`rounded-lg px-2 py-1 ${user?.role === 'TIER1_EDITOR' || user?.role === 'TIER1_REVIEWER' ? 'bg-blue-200/80 ring-1 ring-blue-400' : 'bg-blue-100/80'}`}>
            <span className="font-bold text-blue-700">1차 승인</span></div>
          <ChevronRight className="h-3 w-3 text-muted-foreground/30" />
          <div className={`rounded-lg px-2 py-1 ${user?.role === 'EXEC_APPROVER' ? 'bg-purple-200/80 ring-1 ring-purple-400' : 'bg-purple-100/80'}`}>
            <span className="font-bold text-purple-700">최종승인</span></div>
          <ChevronRight className="h-3 w-3 text-muted-foreground/30" />
          <div className="rounded-lg bg-green-100/80 px-2 py-1"><span className="font-bold text-green-700">완료</span></div>
        </div>
      </div>

      {/* 필터 */}
      <div className="overflow-x-auto rounded-xl border border-gray-100 bg-gray-50/30 dark:border-gray-800 dark:bg-gray-800/20">
        <div className="flex items-center gap-2 px-3 py-2.5 min-w-max sm:px-4 sm:py-3">
          <Filter className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground/50" />
          <div className="flex gap-1 rounded-lg bg-gray-100/60 p-0.5 dark:bg-gray-800/40">
            {[{ key: 'ALL', label: '전체' }, { key: 'SUBMITTED', label: '제출완료' }, { key: 'CONFIRMED', label: '1차' }, { key: 'REVIEWED', label: '최종' }].map((tab) => (
              <button key={tab.key} onClick={() => setStepFilter(tab.key)}
                className={`rounded-md px-2 py-1 text-[11px] font-medium transition-all whitespace-nowrap ${stepFilter === tab.key ? 'bg-white shadow-sm dark:bg-gray-700' : 'text-muted-foreground'}`}>
                {tab.label} ({stepCounts[tab.key as keyof typeof stepCounts] || 0})
              </button>
            ))}
          </div>
          <div className="relative">
            <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground/40" />
            <input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="검색..."
              className="h-8 w-[100px] rounded-lg border border-input bg-white pl-6 pr-2 text-[11px] focus:outline-none focus:ring-1 focus:ring-ring/40 dark:bg-gray-900 sm:w-[160px]" />
          </div>
          <span className="ml-auto text-[10px] text-muted-foreground whitespace-nowrap">{filtered.length}건</span>
        </div>
      </div>

      {/* 전담중역 모달 */}
      {executiveModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-900">
            <h3 className="mb-1 text-lg font-bold flex items-center gap-2"><UserCheck className="h-5 w-5 text-amber-600" />전담중역 지정</h3>
            <p className="mb-4 text-sm text-muted-foreground">최종승인자(전담중역)를 지정해주세요.</p>
            <select className="mb-4 h-11 w-full rounded-xl border border-input bg-background/60 px-3 text-sm" value={selectedExecutiveId} onChange={(e) => setSelectedExecutiveId(e.target.value)}>
              <option value="">전담중역 선택</option>
              {executives.map((u: any) => <option key={u.id} value={u.id}>{u.name}{u.company ? ` - ${u.company.name}` : ''}</option>)}
            </select>
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setExecutiveModal({ eventId: '', open: false })}>취소</Button>
              <Button className="flex-1" onClick={() => { if (!selectedExecutiveId) { toast({ variant: 'destructive', title: '전담중역을 선택해주세요.' }); return; } handleApprove(executiveModal.eventId, selectedExecutiveId); }}
                disabled={!selectedExecutiveId || processing === executiveModal.eventId}>
                <CheckCircle2 className="mr-1.5 h-4 w-4" />{processing === executiveModal.eventId ? '...' : '승인 & 지정'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 보완요청 코멘트 모달 */}
      {returnModal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-900">
            <h3 className="mb-1 text-lg font-bold flex items-center gap-2">
              <RotateCcw className="h-5 w-5 text-amber-600" />보완 요청
            </h3>
            <p className="mb-4 text-sm text-muted-foreground">보완이 필요한 사유를 입력해주세요.</p>
            <textarea
              className="mb-4 w-full rounded-xl border border-input bg-background/60 px-3 py-3 text-sm min-h-[120px] resize-none focus:outline-none focus:ring-2 focus:ring-amber-400/50"
              placeholder="예: 조치방안을 구체적으로 작성해주세요. / 품질검증 결과가 누락되었습니다."
              value={returnComment}
              onChange={(e) => setReturnComment(e.target.value)}
              autoFocus
            />
            <div className="flex gap-3">
              <Button variant="outline" className="flex-1" onClick={() => setReturnModal({ eventId: '', open: false })}>취소</Button>
              <Button
                className="flex-1 bg-amber-600 hover:bg-amber-700"
                onClick={handleReturn}
                disabled={!returnComment.trim() || processing === returnModal.eventId}
              >
                <RotateCcw className="mr-1.5 h-4 w-4" />
                {processing === returnModal.eventId ? '처리중...' : '보완 요청'}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* 테이블 */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-gray-50/30 py-20 text-center dark:border-gray-800">
          <CheckCircle2 className="mb-3 h-12 w-12 text-emerald-300" />
          <p className="text-sm font-medium text-muted-foreground">{searchTerm || stepFilter !== 'ALL' ? '조건에 맞는 승인 건이 없습니다' : '승인 대기 건이 없습니다'}</p>
        </div>
      ) : (
        {/* 모바일 카드 뷰 */}
        <div className="space-y-2 sm:hidden">
          {filtered.map((event, idx) => {
            const e = event as any;
            const step = user ? getApprovalStep(event.status, user.role) : null;
            return (
              <div key={event.id} onClick={() => router.push(`/change-events/${event.id}`)}
                className="cursor-pointer rounded-xl border border-white/60 bg-white/80 p-3.5 shadow-sm transition-all active:scale-[0.98] dark:border-gray-800/60 dark:bg-gray-900/70">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${
                      event.status === 'SUBMITTED' ? 'bg-indigo-100 text-indigo-700' : event.status === 'CONFIRMED' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                    }`}>{step?.btnLabel || '승인'}</span>
                    <span className="text-xs text-muted-foreground">{formatDate(event.occurredDate)}</span>
                  </div>
                </div>
                <p className="text-sm font-semibold mb-1.5 line-clamp-1">{e.primaryItem?.name || e.primaryItem?.category?.name || event.description?.slice(0, 30) || '미지정'}</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs mb-3">
                  <span className="text-muted-foreground">발생부서: <span className="text-foreground font-medium">{event.department || '-'}</span></span>
                  <span className="text-muted-foreground">담당자: <span className="text-foreground font-medium">{e.manager?.name || '-'}</span></span>
                  <span className={`${e.actionPlan ? 'text-muted-foreground' : 'text-red-400'}`}>조치방안: {e.actionPlan ? '입력' : '미입력'}</span>
                  <span className={`${e.qualityVerification ? 'text-muted-foreground' : 'text-red-400'}`}>품질검증: {e.qualityVerification ? '입력' : '미입력'}</span>
                </div>
                <div className="flex gap-2 justify-end pt-2 border-t border-gray-100 dark:border-gray-800">
                  {event.status !== 'SUBMITTED' && (
                    <button onClick={(ev) => handleReturnClick(event.id, ev)} disabled={processing === event.id}
                      className="rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-gray-100 disabled:opacity-50">
                      보완 요청
                    </button>
                  )}
                  <button onClick={(ev) => handleApproveClick(event.id, ev)} disabled={processing === event.id}
                    className={`rounded-lg px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50 ${event.status === 'SUBMITTED' ? 'bg-indigo-600' : event.status === 'CONFIRMED' ? 'bg-blue-600' : 'bg-purple-600'}`}>
                    {processing === event.id ? '처리중...' : step?.btnLabel || '승인'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* 데스크톱 테이블 뷰 */}
        <div className="hidden sm:block overflow-hidden rounded-2xl border border-white/60 bg-white/70 shadow-sm backdrop-blur-xl dark:border-gray-800/60 dark:bg-gray-900/70">
          <div className="overflow-auto max-h-[calc(100vh-240px)]">
            <table className="w-full min-w-[1100px] text-xs border-collapse">
              <thead className="sticky top-0 z-10">
                <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/60">
                  <th className="whitespace-nowrap px-2 py-2 text-center text-[10px] font-bold uppercase text-muted-foreground w-9 border-r border-gray-200">NO</th>
                  <th className="whitespace-nowrap px-2 py-2 text-center text-[10px] font-bold uppercase text-muted-foreground w-12">단계</th>
                  <th className="whitespace-nowrap px-2 py-2 text-center text-[10px] font-bold uppercase text-blue-600 border-r border-gray-200" colSpan={6}>발생내역</th>
                  <th className="whitespace-nowrap px-2 py-2 text-center text-[10px] font-bold uppercase text-amber-600 border-r border-gray-200" colSpan={4}>조치결과</th>
                  <th className="whitespace-nowrap px-2 py-2 text-center text-[10px] font-bold uppercase text-muted-foreground w-24">처리</th>
                </tr>
                <tr className="border-b border-gray-200 bg-gray-50/80 dark:border-gray-700 dark:bg-gray-800/40">
                  <th className="px-2 py-1 border-r border-gray-200"></th>
                  <th className="px-2 py-1"></th>
                  <th className="whitespace-nowrap px-2 py-1 text-center text-[9px] font-semibold text-blue-500/80">발생일</th>
                  <th className="whitespace-nowrap px-2 py-1 text-center text-[9px] font-semibold text-blue-500/80">대분류</th>
                  <th className="whitespace-nowrap px-2 py-1 text-center text-[9px] font-semibold text-blue-500/80">중분류</th>
                  <th className="whitespace-nowrap px-2 py-1 text-center text-[9px] font-semibold text-blue-500/80">세부항목</th>
                  <th className="whitespace-nowrap px-2 py-1 text-center text-[9px] font-semibold text-blue-500/80">발생부서</th>
                  <th className="whitespace-nowrap px-2 py-1 text-center text-[9px] font-semibold text-blue-500/80 border-r border-gray-200">담당자</th>
                  <th className="whitespace-nowrap px-2 py-1 text-center text-[9px] font-semibold text-amber-500/80">조치시점</th>
                  <th className="whitespace-nowrap px-2 py-1 text-center text-[9px] font-semibold text-amber-500/80">조치방안</th>
                  <th className="whitespace-nowrap px-2 py-1 text-center text-[9px] font-semibold text-amber-500/80">조치결과</th>
                  <th className="whitespace-nowrap px-2 py-1 text-center text-[9px] font-semibold text-amber-500/80 border-r border-gray-200">품질검증</th>
                  <th className="px-2 py-1"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800/50">
                {filtered.map((event, idx) => {
                  const e = event as any;
                  const isSubmitted = event.status === 'SUBMITTED';
                  const step = user ? getApprovalStep(event.status, user.role) : null;
                  return (
                    <tr key={event.id}
                      className={`cursor-pointer transition-colors hover:bg-blue-50/40 ${idx % 2 === 0 ? 'bg-white dark:bg-gray-900/40' : 'bg-gray-50/30 dark:bg-gray-800/20'}`}
                      onClick={() => router.push(`/change-events/${event.id}`)}>
                      <td className="whitespace-nowrap px-2 py-1.5 text-center text-[10px] font-bold text-muted-foreground/40 border-r border-gray-100">{idx + 1}</td>
                      <td className="whitespace-nowrap px-1.5 py-1.5 text-center">
                        <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-bold ${isSubmitted ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                          {isSubmitted ? '1차' : '최종'}
                        </span>
                      </td>
                      <td className="whitespace-nowrap px-2 py-1.5 text-center font-medium">{formatDate(event.occurredDate).slice(5)}</td>
                      <TipCell tip={e.primaryItem?.category?.class?.name || ''} className="max-w-[70px] truncate px-2 py-1.5 text-center text-[10px]">{e.primaryItem?.category?.class?.name || '-'}</TipCell>
                      <TipCell tip={e.primaryItem?.category?.name || ''} className="max-w-[70px] truncate px-2 py-1.5 text-center text-[10px] font-medium">{e.primaryItem?.category?.name || '-'}</TipCell>
                      <TipCell tip={e.primaryItem?.name || ''} className="max-w-[80px] truncate px-2 py-1.5 text-center text-[10px]">{e.primaryItem?.name || '-'}</TipCell>
                      <td className="whitespace-nowrap px-2 py-1.5 text-center">{event.department || '-'}</td>
                      <td className="whitespace-nowrap px-2 py-1.5 text-center border-r border-gray-100">{e.manager?.name || e.createdBy?.name || '-'}</td>
                      <td className={`whitespace-nowrap px-2 py-1.5 text-center ${!e.actionDate ? 'text-red-400 font-medium' : 'text-emerald-700'}`}>
                        {e.actionDate ? formatDate(e.actionDate).slice(5) : '미입력'}
                      </td>
                      <TipCell tip={e.actionPlan || ''} className={`max-w-[90px] truncate px-2 py-1.5 text-center ${!e.actionPlan ? 'text-red-400 font-medium' : ''}`}>{e.actionPlan || '미입력'}</TipCell>
                      <TipCell tip={e.actionResult || ''} className={`max-w-[90px] truncate px-2 py-1.5 text-center ${!e.actionResult ? 'text-red-400 font-medium' : ''}`}>{e.actionResult || '미입력'}</TipCell>
                      <TipCell tip={e.qualityVerification || ''} className={`max-w-[70px] truncate px-2 py-1.5 text-center border-r border-gray-100 ${!e.qualityVerification ? 'text-red-400 font-medium' : ''}`}>{e.qualityVerification || '미입력'}</TipCell>
                      <td className="whitespace-nowrap px-1.5 py-1.5 text-center">
                        <div className="flex gap-1 justify-center">
                          {event.status !== 'SUBMITTED' && (
                            <button onClick={(ev) => handleReturnClick(event.id, ev)} disabled={processing === event.id}
                              className="rounded-md border border-gray-200 px-1.5 py-0.5 text-[9px] font-medium text-muted-foreground hover:bg-gray-100 disabled:opacity-50">
                              보완
                            </button>
                          )}
                          <button onClick={(ev) => handleApproveClick(event.id, ev)} disabled={processing === event.id}
                            className={`rounded-md px-1.5 py-0.5 text-[9px] font-bold text-white disabled:opacity-50 ${event.status === 'SUBMITTED' ? 'bg-indigo-600 hover:bg-indigo-700' : event.status === 'CONFIRMED' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-purple-600 hover:bg-purple-700'}`}>
                            {processing === event.id ? '...' : step?.btnLabel || '승인'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
