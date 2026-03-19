'use client';

import { useAuth } from '@/contexts/auth-context';
import { changeEvents } from '@/lib/api-client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ChangeEvent } from '@/types';
import { formatDate, formatDateTime, getStatusBadgeClass, getStatusText } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft, FileEdit, Download, Paperclip, CheckCircle2,
  RotateCcw, Calendar, Building2, Briefcase, MapPin, Tag,
  User as UserIcon, Clock, ChevronRight, AlertTriangle,
} from 'lucide-react';

/* ── 승인 플로우 ── */
const FLOW_STEPS = [
  { status: 'SUBMITTED', nextStatus: 'REVIEWED', btnLabel: '검토완료', roles: ['TIER1_REVIEWER', 'ADMIN'] },
  { status: 'REVIEWED', nextStatus: 'APPROVED', btnLabel: '최종승인', roles: ['EXEC_APPROVER', 'ADMIN'] },
];

const STATUS_FLOW = ['DRAFT', 'SUBMITTED', 'REVIEWED', 'APPROVED'];
function getFlowStep(status: string) {
  if (status === 'REVIEW_RETURNED') return 1;
  if (status === 'REJECTED') return -1;
  return STATUS_FLOW.indexOf(status);
}

export default function ChangeEventDetailPage({ params }: { params: { id: string } }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data: event, isLoading } = useQuery<ChangeEvent>({
    queryKey: ['change-events', params.id],
    queryFn: () => changeEvents.get(params.id).then((res) => res.data),
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <p className="text-sm text-muted-foreground">데이터를 찾을 수 없습니다</p>
      </div>
    );
  }

  const canEdit =
    user?.role === 'ADMIN' ||
    (user?.role === 'TIER2_EDITOR' && event.createdById === user.id) ||
    (user?.role === 'TIER1_EDITOR' && event.status === 'REVIEW_RETURNED');

  const approvalStep = FLOW_STEPS.find(
    (s) => s.status === event.status && s.roles.includes(user?.role || '')
  );
  const flowStep = getFlowStep(event.status);

  const handleApprove = async () => {
    if (!approvalStep) return;
    try {
      await changeEvents.update(event.id, { status: approvalStep.nextStatus as any });
      queryClient.invalidateQueries({ queryKey: ['change-events', params.id] });
      toast({ title: `${approvalStep.btnLabel} 처리되었습니다.` });
    } catch {
      toast({ variant: 'destructive', title: '처리 실패' });
    }
  };

  const handleReturn = async () => {
    try {
      await changeEvents.update(event.id, { status: 'REVIEW_RETURNED' });
      queryClient.invalidateQueries({ queryKey: ['change-events', params.id] });
      toast({ title: '보완 요청되었습니다.' });
    } catch {
      toast({ variant: 'destructive', title: '처리 실패' });
    }
  };

  const InfoCard = ({ icon: Icon, label, value, mono }: { icon: any; label: string; value: string; mono?: boolean }) => (
    <div className="flex items-start gap-2.5 rounded-xl border border-gray-100 bg-white/60 p-3 dark:border-gray-800 dark:bg-gray-800/30">
      <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-primary/5">
        <Icon className="h-3.5 w-3.5 text-primary/60" />
      </div>
      <div className="min-w-0">
        <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60">{label}</p>
        <p className={`mt-0.5 text-sm font-medium truncate ${mono ? 'font-mono text-xs' : ''}`}>{value || '-'}</p>
      </div>
    </div>
  );

  return (
    <div className="space-y-5">
      {/* 헤더 */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="flex h-9 w-9 items-center justify-center rounded-xl transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold tracking-tight sm:text-2xl">{event.customer}</h1>
              <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${getStatusBadgeClass(event.status)}`}>
                {getStatusText(event.status)}
              </span>
            </div>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {event.project} · {event.company.name}
            </p>
          </div>
        </div>
        <div className="flex gap-2 pl-12 sm:pl-0">
          {canEdit && (
            <Button size="sm" onClick={() => router.push(`/change-events/${event.id}/edit`)}>
              <FileEdit className="mr-1.5 h-4 w-4" />수정
            </Button>
          )}
        </div>
      </div>

      {/* 승인 진행 상태 */}
      <div className="rounded-2xl border border-white/60 bg-gradient-to-r from-blue-50/60 via-indigo-50/60 to-purple-50/60 p-4 shadow-sm backdrop-blur-xl sm:p-5 dark:from-blue-900/10 dark:via-indigo-900/10 dark:to-purple-900/10 dark:border-gray-800/60">
        <p className="mb-3 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">승인 진행상태</p>
        <div className="flex items-center gap-2 sm:gap-3">
          {['접수·등록', '검토', '최종승인'].map((step, i) => {
            const isComplete = flowStep > i;
            const isCurrent = flowStep === i;
            const isReturned = event.status === 'REVIEW_RETURNED' && i === 1;
            return (
              <div key={step} className="flex flex-1 items-center gap-2 sm:gap-3">
                <div className={`flex-1 text-center rounded-xl px-2 py-2.5 transition-all ${
                  isComplete ? 'bg-primary/10 ring-1 ring-primary/20' :
                  isCurrent ? 'bg-white/80 ring-1 ring-primary/30 shadow-sm dark:bg-gray-800/60' :
                  isReturned ? 'bg-amber-50 ring-1 ring-amber-300 dark:bg-amber-900/20' :
                  'bg-white/40 dark:bg-gray-800/20'
                }`}>
                  <div className={`text-[10px] font-bold sm:text-xs ${
                    isComplete ? 'text-primary' :
                    isReturned ? 'text-amber-600 dark:text-amber-400' :
                    isCurrent ? 'text-primary' :
                    'text-muted-foreground/40'
                  }`}>
                    {isReturned ? '보완요청' : step}
                  </div>
                  {isComplete && <CheckCircle2 className="mx-auto mt-1 h-4 w-4 text-primary" />}
                  {isReturned && <AlertTriangle className="mx-auto mt-1 h-4 w-4 text-amber-500" />}
                </div>
                {i < 2 && <ChevronRight className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground/30" />}
              </div>
            );
          })}
        </div>
      </div>

      {/* 기본 정보 카드 그리드 */}
      <div className="rounded-2xl border border-white/60 bg-white/70 p-4 shadow-sm backdrop-blur-xl sm:p-5 dark:border-gray-800/60 dark:bg-gray-900/70">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">기본 정보</h3>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4 sm:gap-3">
          <InfoCard icon={Calendar} label="접수월" value={event.receiptMonth} />
          <InfoCard icon={Calendar} label="발생일" value={formatDate(event.occurredDate)} />
          <InfoCard icon={Building2} label="고객사" value={event.customer} />
          <InfoCard icon={Briefcase} label="프로젝트" value={event.project} />
          <InfoCard icon={Tag} label="제품군" value={event.productLine} />
          <InfoCard icon={Tag} label="부품번호" value={event.partNumber} mono />
          <InfoCard icon={MapPin} label="공장" value={event.factory} />
          <InfoCard icon={MapPin} label="라인" value={event.productionLine} />
          <InfoCard icon={Building2} label="협력사" value={event.company.name} />
          <InfoCard icon={Tag} label="분류" value={event.changeType === 'FOUR_M' ? '4M' : '4M외'} />
          <InfoCard icon={Tag} label="대분류" value={event.category} />
          <InfoCard icon={Tag} label="세부항목" value={event.subCategory} />
        </div>
      </div>

      {/* 담당자 정보 */}
      <div className="rounded-2xl border border-white/60 bg-white/70 p-4 shadow-sm backdrop-blur-xl sm:p-5 dark:border-gray-800/60 dark:bg-gray-900/70">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">담당자 정보</h3>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
          <InfoCard icon={UserIcon} label="등록자" value={event.createdBy?.name || '-'} />
          <InfoCard icon={UserIcon} label="발생부서" value={event.department} />
          <InfoCard icon={Clock} label="등록일시" value={formatDateTime(event.createdAt)} />
          <InfoCard icon={Clock} label="수정일시" value={formatDateTime(event.updatedAt)} />
        </div>
      </div>

      {/* 변경 상세내용 */}
      <div className="rounded-2xl border border-white/60 bg-white/70 p-4 shadow-sm backdrop-blur-xl sm:p-5 dark:border-gray-800/60 dark:bg-gray-900/70">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">변경 상세내용</h3>
        <div className="whitespace-pre-wrap rounded-xl bg-gray-50/80 p-4 text-sm leading-relaxed dark:bg-gray-800/40">
          {event.description || '-'}
        </div>
      </div>

      {/* 점검 결과 */}
      {event.inspectionResults && event.inspectionResults.length > 0 && (
        <div className="rounded-2xl border border-white/60 bg-white/70 p-4 shadow-sm backdrop-blur-xl sm:p-5 dark:border-gray-800/60 dark:bg-gray-900/70">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">점검 결과</h3>
          <div className="space-y-2">
            {event.inspectionResults.map((result) => (
              <div key={result.id} className="flex items-start gap-3 rounded-xl border border-gray-100 bg-white/60 p-3 dark:border-gray-800 dark:bg-gray-800/30">
                <div className="flex-1">
                  <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60">{result.item?.question}</p>
                  <p className="mt-0.5 text-sm font-medium">{result.value}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 첨부파일 */}
      {event.attachments && event.attachments.length > 0 && (
        <div className="rounded-2xl border border-white/60 bg-white/70 p-4 shadow-sm backdrop-blur-xl sm:p-5 dark:border-gray-800/60 dark:bg-gray-900/70">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">첨부파일</h3>
          <div className="space-y-2">
            {event.attachments.map((attachment) => (
              <a
                key={attachment.id}
                href={`/api/attachments/${attachment.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2.5 rounded-xl border border-gray-100 bg-white/60 px-4 py-3 transition-all hover:bg-primary/5 hover:border-primary/20 dark:border-gray-800 dark:bg-gray-800/30"
              >
                <Paperclip className="h-4 w-4 text-muted-foreground/50" />
                <span className="text-sm font-medium text-primary">{attachment.filename}</span>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* 승인/반려 버튼 */}
      {approvalStep && (
        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 backdrop-blur-xl sm:p-5 dark:bg-primary/10">
          <p className="mb-3 text-xs font-semibold text-primary">승인 처리</p>
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end sm:gap-3">
            <Button variant="outline" className="w-full sm:w-auto" onClick={handleReturn}>
              <RotateCcw className="mr-1.5 h-4 w-4" />보완 요청
            </Button>
            <Button className="w-full sm:w-auto" onClick={handleApprove}>
              <CheckCircle2 className="mr-1.5 h-4 w-4" />{approvalStep.btnLabel}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
