'use client';

import { useAuth } from '@/contexts/auth-context';
import { changeEvents } from '@/lib/api-client';
import { useQuery } from '@tanstack/react-query';
import { ChangeEvent } from '@/types';
import { formatDate, formatDateTime, getStatusBadgeClass, getStatusText } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { useRouter } from 'next/navigation';
import { ArrowLeft, FileEdit, Download, Paperclip } from 'lucide-react';

export default function ChangeEventDetailPage({ params }: { params: { id: string } }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

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

  const canApprove =
    (user?.role === 'TIER1_REVIEWER' && event.status === 'SUBMITTED') ||
    (user?.role === 'EXEC_APPROVER' && event.status === 'REVIEWED');

  const InfoItem = ({ label, value }: { label: string; value: string }) => (
    <div>
      <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/70 sm:text-xs">
        {label}
      </div>
      <div className="mt-1 text-sm font-medium">{value || '-'}</div>
    </div>
  );

  return (
    <div className="space-y-6">
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
            <h1 className="text-xl font-bold tracking-tight sm:text-2xl">변동점 상세</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {event.customer} · {event.project}
            </p>
          </div>
        </div>
        <div className="flex gap-2 pl-12 sm:pl-0">
          {canEdit && (
            <Button size="sm" onClick={() => router.push(`/change-events/${event.id}/edit`)}>
              <FileEdit className="mr-1.5 h-4 w-4" />
              수정
            </Button>
          )}
          {event.status === 'APPROVED' && (
            <Button size="sm" variant="outline" onClick={() => window.open(`/api/excel/${event.id}`)}>
              <Download className="mr-1.5 h-4 w-4" />
              엑셀
            </Button>
          )}
        </div>
      </div>

      {/* 상태 정보 */}
      <div className="rounded-2xl border border-white/60 bg-white/70 p-5 shadow-sm backdrop-blur-xl sm:p-6 dark:border-gray-800/60 dark:bg-gray-900/70">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <div>
            <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/70 sm:text-xs">
              상태
            </div>
            <div className="mt-1.5">
              <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusBadgeClass(event.status)}`}>
                {getStatusText(event.status)}
              </span>
            </div>
          </div>
          <InfoItem label="등록자" value={event.createdBy.name} />
          <InfoItem label="등록일시" value={formatDateTime(event.createdAt)} />
          <InfoItem label="수정일시" value={formatDateTime(event.updatedAt)} />
        </div>
      </div>

      {/* 기본 정보 */}
      <div className="rounded-2xl border border-white/60 bg-white/70 p-5 shadow-sm backdrop-blur-xl sm:p-6 dark:border-gray-800/60 dark:bg-gray-900/70">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          기본 정보
        </h3>
        <div className="grid grid-cols-2 gap-4 sm:gap-5 lg:grid-cols-4">
          <InfoItem label="접수월" value={event.receiptMonth} />
          <InfoItem label="발생일" value={formatDate(event.occurredDate)} />
          <InfoItem label="고객사" value={event.customer} />
          <InfoItem label="프로젝트" value={event.project} />
          <InfoItem label="제품군" value={event.productLine} />
          <InfoItem label="부품번호" value={event.partNumber} />
          <InfoItem label="공장" value={event.factory} />
          <InfoItem label="라인" value={event.productionLine} />
          <InfoItem label="협력사" value={event.company.name} />
          <InfoItem label="4M/4M외" value={event.changeType === 'FOUR_M' ? '4M' : '4M외'} />
          <InfoItem label="대분류" value={event.category} />
          <InfoItem label="세부항목" value={event.subCategory} />
        </div>
      </div>

      {/* 변경 상세내용 */}
      <div className="rounded-2xl border border-white/60 bg-white/70 p-5 shadow-sm backdrop-blur-xl sm:p-6 dark:border-gray-800/60 dark:bg-gray-900/70">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          변경 상세내용
        </h3>
        <div className="whitespace-pre-wrap rounded-xl bg-gray-50/80 p-4 text-sm leading-relaxed dark:bg-gray-800/40">
          {event.description}
        </div>
      </div>

      {/* 점검 결과 */}
      <div className="rounded-2xl border border-white/60 bg-white/70 p-5 shadow-sm backdrop-blur-xl sm:p-6 dark:border-gray-800/60 dark:bg-gray-900/70">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
          점검 결과
        </h3>
        {/* 데스크톱: 테이블 */}
        <div className="hidden overflow-x-auto sm:block">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50 dark:border-gray-800 dark:bg-gray-800/30">
                <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">항목</th>
                <th className="whitespace-nowrap px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">결과</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {event.inspectionResults.map((result) => (
                <tr key={result.id} className="transition-colors hover:bg-gray-50/60 dark:hover:bg-gray-800/30">
                  <td className="px-4 py-3">{result.item.question}</td>
                  <td className="px-4 py-3">{result.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {/* 모바일: 리스트 */}
        <div className="space-y-2 sm:hidden">
          {event.inspectionResults.map((result) => (
            <div key={result.id} className="rounded-xl border border-gray-100 bg-white/60 p-3.5 dark:border-gray-800 dark:bg-gray-800/30">
              <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/70">
                {result.item.question}
              </div>
              <div className="mt-1 text-sm font-medium">{result.value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* 첨부파일 */}
      {event.attachments.length > 0 && (
        <div className="rounded-2xl border border-white/60 bg-white/70 p-5 shadow-sm backdrop-blur-xl sm:p-6 dark:border-gray-800/60 dark:bg-gray-900/70">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            첨부파일
          </h3>
          <div className="space-y-2">
            {event.attachments.map((attachment) => (
              <a
                key={attachment.id}
                href={`/api/attachments/${attachment.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 rounded-xl border border-gray-100 bg-white/60 px-4 py-3 transition-all duration-200 hover:bg-primary/5 hover:border-primary/20 dark:border-gray-800 dark:bg-gray-800/30 dark:hover:border-primary/30"
              >
                <Paperclip className="h-4 w-4 text-muted-foreground/50" />
                <span className="text-sm font-medium text-primary">{attachment.filename}</span>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* 승인 버튼 */}
      {canApprove && (
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end sm:gap-3">
          <Button
            variant="outline"
            className="w-full sm:w-auto"
            onClick={async () => {
              try {
                await changeEvents.update(event.id, { status: 'REVIEW_RETURNED' });
                toast({ title: '보완 요청되었습니다.' });
                router.refresh();
              } catch (error) {
                toast({ variant: 'destructive', title: '처리 실패', description: '다시 시도해주세요.' });
              }
            }}
          >
            보완 요청
          </Button>
          <Button
            className="w-full sm:w-auto"
            onClick={async () => {
              try {
                await changeEvents.update(event.id, {
                  status: user?.role === 'TIER1_REVIEWER' ? 'REVIEWED' : 'APPROVED',
                });
                toast({ title: '승인되었습니다.' });
                router.refresh();
              } catch (error) {
                toast({ variant: 'destructive', title: '처리 실패', description: '다시 시도해주세요.' });
              }
            }}
          >
            {user?.role === 'TIER1_REVIEWER' ? '검토 완료' : '승인'}
          </Button>
        </div>
      )}
    </div>
  );
}
