'use client';

import { useState } from 'react';
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
  Image, FileText, X, ZoomIn,
} from 'lucide-react';

/* ── 승인 플로우 (3단계) ── */
const FLOW_STEPS = [
  { status: 'SUBMITTED', nextStatus: 'CONFIRMED', btnLabel: '제출완료', roles: ['TIER1_EDITOR', 'ADMIN'] },
  { status: 'CONFIRMED', nextStatus: 'REVIEWED', btnLabel: '1차 승인', roles: ['TIER1_REVIEWER', 'ADMIN'] },
  { status: 'REVIEWED', nextStatus: 'APPROVED', btnLabel: '최종승인', roles: ['EXEC_APPROVER', 'ADMIN'] },
];

/* ── 첨부파일 다운로드 헬퍼 ── */
async function downloadAttachment(attachmentId: string, filename: string) {
  try {
    const token = localStorage.getItem('token');
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || '';
    const url = `${baseUrl}/api/change-events/attachment-file/${attachmentId}`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      // fallback: base64 방식
      const attRes = await changeEvents.getAttachmentData(attachmentId);
      const data = attRes.data?.data;
      if (data) {
        const a = document.createElement('a');
        a.href = data;
        a.download = filename;
        a.click();
        return;
      }
      alert('파일을 불러올 수 없습니다.');
      return;
    }
    const blob = await res.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(blobUrl);
  } catch (err) {
    console.error('Download error:', err);
    // 최종 fallback: base64 다운로드
    try {
      const attRes = await changeEvents.getAttachmentData(attachmentId);
      const data = attRes.data?.data;
      if (data) {
        const a = document.createElement('a');
        a.href = data;
        a.download = filename;
        a.click();
        return;
      }
    } catch { /* ignore */ }
    alert('다운로드 실패');
  }
}

/* ── 첨부파일 섹션 ── */
function AttachmentSection({ eventId }: { eventId: string }) {
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [returnModal, setReturnModal] = useState(false);
  const [returnComment, setReturnComment] = useState('');
  const { data: attachments = [] } = useQuery<any[]>({
    queryKey: ['attachments', eventId],
    queryFn: () => changeEvents.getAttachments(eventId).then((r) => r.data),
  });

  if (attachments.length === 0) return null;

  const images = attachments.filter((a: any) => a.mimetype?.startsWith('image/'));
  const files = attachments.filter((a: any) => !a.mimetype?.startsWith('image/'));

  return (
    <>
      <div className="rounded-2xl border border-white/60 bg-white/70 p-4 shadow-sm backdrop-blur-xl sm:p-5 dark:border-gray-800/60 dark:bg-gray-900/70">
        <h3 className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          <Paperclip className="h-3.5 w-3.5" />
          첨부파일 및 사진 ({attachments.length})
        </h3>

        {/* 이미지 미리보기 그리드 */}
        {images.length > 0 && (
          <div className="mb-3">
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
              <Image className="inline h-3 w-3 mr-1" />사진 ({images.length})
            </p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
              {images.map((img: any) => (
                <button
                  key={img.id}
                  type="button"
                  onClick={() => setLightbox(img.id)}
                  className="group relative aspect-square overflow-hidden rounded-xl border border-gray-100 bg-gray-50 transition-all hover:ring-2 hover:ring-primary/40 dark:border-gray-800 dark:bg-gray-800/30"
                >
                  <ImagePreview attachmentId={img.id} filename={img.filename} />
                  <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-all group-hover:bg-black/20">
                    <ZoomIn className="h-6 w-6 text-white opacity-0 transition-opacity group-hover:opacity-100" />
                  </div>
                  <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/50 to-transparent px-2 pb-1.5 pt-4">
                    <p className="truncate text-[10px] font-medium text-white">{img.filename}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 일반 파일 목록 (다운로드 가능) */}
        {files.length > 0 && (
          <div>
            <p className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
              <FileText className="inline h-3 w-3 mr-1" />파일 ({files.length})
            </p>
            <div className="space-y-1.5">
              {files.map((file: any) => (
                <button key={file.id} type="button" onClick={() => downloadAttachment(file.id, file.filename)}
                  className="flex w-full items-center gap-2.5 rounded-xl border border-gray-100 bg-white/60 px-4 py-2.5 text-left transition-colors hover:bg-blue-50/50 dark:border-gray-800 dark:bg-gray-800/30 dark:hover:bg-gray-800/50">
                  <Download className="h-4 w-4 flex-shrink-0 text-primary/60" />
                  <span className="flex-1 truncate text-sm">{file.filename}</span>
                  <span className="flex-shrink-0 text-[10px] text-muted-foreground/50">{(file.size / 1024).toFixed(0)}KB</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 라이트박스 */}
      {lightbox && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4" onClick={() => setLightbox(null)}>
          <button className="absolute right-4 top-4 rounded-full bg-white/20 p-2 text-white hover:bg-white/40" onClick={() => setLightbox(null)}>
            <X className="h-6 w-6" />
          </button>
          <div className="flex flex-col items-center gap-3" onClick={(e) => e.stopPropagation()}>
            <ImagePreview attachmentId={lightbox} filename="" full />
            <button onClick={() => { const att = attachments.find((a: any) => a.id === lightbox); if (att) downloadAttachment(att.id, att.filename); }}
              className="flex items-center gap-2 rounded-xl bg-white/20 px-4 py-2 text-sm font-medium text-white hover:bg-white/30">
              <Download className="h-4 w-4" />다운로드
            </button>
          </div>
        </div>
      )}
    </>
  );
}

/* ── 이미지 미리보기 (API를 통해 base64 로드) ── */
function ImagePreview({ attachmentId, filename, full }: { attachmentId: string; filename: string; full?: boolean }) {
  const { data: attData, isLoading } = useQuery({
    queryKey: ['attachment-full', attachmentId],
    queryFn: async () => {
      try {
        const res = await changeEvents.getAttachmentData(attachmentId);
        return res.data;
      } catch {
        return null;
      }
    },
    staleTime: 5 * 60 * 1000, // 5분 캐시
  });

  if (attData?.data) {
    return full ? (
      <img src={attData.data} alt={filename} className="max-h-[80vh] max-w-[90vw] rounded-xl object-contain" />
    ) : (
      <img src={attData.data} alt={filename} className="h-full w-full object-cover" />
    );
  }

  return (
    <div className={`flex items-center justify-center ${full ? 'h-40 w-40' : 'h-full w-full'} bg-gray-100 dark:bg-gray-800`}>
      {isLoading ? (
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      ) : (
        <Image className="h-8 w-8 text-muted-foreground/30" />
      )}
    </div>
  );
}

const STATUS_FLOW = ['DRAFT', 'SUBMITTED', 'CONFIRMED', 'REVIEWED', 'APPROVED'];
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

  const isOwner = event.createdById === user?.id || event.managerId === user?.id;
  const isAdmin = user?.role === 'ADMIN';
  const isDraft = event.status === 'DRAFT';
  const isReturned = event.status === 'REVIEW_RETURNED';
  // 수정: 등록자(또는 담당자) + ADMIN만 가능
  const canEdit = isAdmin || (isOwner && (isDraft || isReturned));
  const canDelete = isAdmin || (isOwner && isDraft);

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

  const handleReturnOpen = () => {
    setReturnComment('');
    setReturnModal(true);
  };

  const handleReturn = async () => {
    if (!returnComment.trim()) {
      toast({ variant: 'destructive', title: '보완요청 사유를 입력해주세요.' });
      return;
    }
    try {
      await changeEvents.update(event.id, { status: 'REVIEW_RETURNED' as any, returnComment: returnComment.trim() });
      queryClient.invalidateQueries({ queryKey: ['change-events', params.id] });
      toast({ title: '보완 요청되었습니다.' });
      setReturnModal(false);
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
              <h1 className="text-xl font-bold tracking-tight sm:text-2xl">{event.customer || '(미지정)'}</h1>
              <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${getStatusBadgeClass(event.status)}`}>
                {getStatusText(event.status)}
              </span>
            </div>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {event.project || '-'} · {event.company?.name || '-'}
            </p>
          </div>
        </div>
        <div className="flex gap-2 pl-12 sm:pl-0">
          {canDelete && (
            <Button size="sm" variant="outline" className="text-red-500 hover:bg-red-50 hover:text-red-600"
              onClick={async () => {
                if (!confirm('정말 삭제하시겠습니까?')) return;
                try {
                  await changeEvents.delete(event.id);
                  toast({ title: '삭제되었습니다.' });
                  router.push('/change-events/my');
                } catch { toast({ variant: 'destructive', title: '삭제 실패' }); }
              }}>
              <X className="mr-1 h-4 w-4" />삭제
            </Button>
          )}
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
        <div className="flex items-center gap-1 sm:gap-2">
          {['접수·등록', '제출완료', '1차 승인', '최종승인'].map((step, i) => {
            const isComplete = flowStep > i;
            const isCurrent = flowStep === i;
            const isReturned = event.status === 'REVIEW_RETURNED' && i === 1;
            return (
              <div key={step} className="flex flex-1 items-center gap-1 sm:gap-2">
                <div className={`flex-1 text-center rounded-xl px-1.5 py-2.5 transition-all ${
                  isComplete ? 'bg-primary/10 ring-1 ring-primary/20' :
                  isCurrent ? 'bg-white/80 ring-1 ring-primary/30 shadow-sm dark:bg-gray-800/60' :
                  isReturned ? 'bg-amber-50 ring-1 ring-amber-300 dark:bg-amber-900/20' :
                  'bg-white/40 dark:bg-gray-800/20'
                }`}>
                  <div className={`text-[9px] font-bold sm:text-xs ${
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
                {i < 3 && <ChevronRight className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground/30" />}
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
          <InfoCard icon={Building2} label="고객사" value={event.customer || '-'} />
          <InfoCard icon={Briefcase} label="프로젝트" value={event.project || '-'} />
          <InfoCard icon={Tag} label="제품군" value={event.productLine || '-'} />
          <InfoCard icon={MapPin} label="공장" value={event.factory || '-'} />
          <InfoCard icon={Tag} label="품번" value={event.partNumber || '-'} mono />
          <InfoCard icon={Tag} label="품명" value={event.productName || '-'} />
          <InfoCard icon={MapPin} label="라인" value={event.productionLine || '-'} />
          <InfoCard icon={Building2} label="협력사" value={event.company?.name || '-'} />
        </div>
      </div>

      {/* 변동점 분류 */}
      <div className="rounded-2xl border border-blue-100 bg-blue-50/30 p-4 shadow-sm backdrop-blur-xl sm:p-5 dark:border-blue-900/30 dark:bg-blue-900/10">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-blue-700 dark:text-blue-400">변동점 분류</h3>
        {((event as any).primaryItem || (event.tags && event.tags.length > 0)) ? (
          <div className="space-y-2">
            {(event as any).primaryItem && (
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="rounded-md bg-blue-100 px-2 py-1 font-semibold text-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
                  {(event as any).primaryItem.category?.class?.name || '-'}
                </span>
                <ChevronRight className="h-3 w-3 text-muted-foreground/40" />
                <span className="rounded-md bg-blue-50 px-2 py-1 font-medium text-blue-700 dark:bg-blue-900/20 dark:text-blue-400">
                  {(event as any).primaryItem.category?.name || '-'}
                </span>
                <ChevronRight className="h-3 w-3 text-muted-foreground/40" />
                <span className="rounded-md bg-white px-2 py-1 font-medium ring-1 ring-blue-200 dark:bg-gray-800 dark:ring-blue-800">
                  {(event as any).primaryItem.name}
                </span>
              </div>
            )}
            {event.tags && event.tags.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {event.tags.map((tag: any) => (
                  <span key={tag.id || tag.itemId} className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ${
                    tag.tagType === 'PRIMARY'
                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300'
                      : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300'
                  }`}>
                    <Tag className="h-2.5 w-2.5" />
                    {tag.tagType === 'PRIMARY' && <span className="text-[9px] font-bold text-blue-600">주</span>}
                    {tag.item?.name || tag.itemId}
                    {tag.item?.category && <span className="text-[9px] text-muted-foreground/60 ml-0.5">({tag.item.category.name})</span>}
                  </span>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center gap-2 py-4 text-center">
            <Tag className="h-6 w-6 text-muted-foreground/30" />
            <p className="text-xs text-muted-foreground">분류 항목이 지정되지 않았습니다</p>
            {canEdit && (
              <button onClick={() => router.push(`/change-events/${event.id}/edit`)}
                className="mt-1 rounded-lg bg-primary/10 px-3 py-1.5 text-xs font-medium text-primary hover:bg-primary/20">
                수정하여 분류 지정하기
              </button>
            )}
          </div>
        )}
      </div>

      {/* 등록자 · 결재선 정보 */}
      <div className="rounded-2xl border border-white/60 bg-white/70 p-4 shadow-sm backdrop-blur-xl sm:p-5 dark:border-gray-800/60 dark:bg-gray-900/70">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">등록자 · 결재선 정보</h3>
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-3">
          <InfoCard icon={UserIcon} label="등록자/담당자" value={event.createdBy?.name || '-'} />
          <InfoCard icon={Building2} label="소속" value={event.company?.name || '-'} />
          <InfoCard icon={UserIcon} label="발생부서" value={event.department || '-'} />
          <InfoCard icon={UserIcon} label="1차 검토자" value={event.reviewer?.name || '-'} />
          <InfoCard icon={UserIcon} label="전담중역" value={event.executive?.name || '-'} />
          <InfoCard icon={Clock} label="등록일시" value={formatDateTime(event.createdAt)} />
        </div>
      </div>

      {/* 변경 상세내용 */}
      <div className="rounded-2xl border border-white/60 bg-white/70 p-4 shadow-sm backdrop-blur-xl sm:p-5 dark:border-gray-800/60 dark:bg-gray-900/70">
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">변경 상세내용</h3>
        <div className="whitespace-pre-wrap rounded-xl bg-gray-50/80 p-4 text-sm leading-relaxed dark:bg-gray-800/40">
          {event.description || '-'}
        </div>
      </div>

      {/* 조치결과 */}
      {(event.actionDate || event.actionPlan || event.actionResult || event.qualityVerification) && (
        <div className="rounded-2xl border border-amber-100 bg-amber-50/30 p-4 shadow-sm backdrop-blur-xl sm:p-5 dark:border-amber-900/30 dark:bg-amber-900/10">
          <h3 className="mb-3 text-xs font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">조치결과</h3>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
            <InfoCard icon={Calendar} label="조치시점" value={event.actionDate ? formatDate(event.actionDate) : '-'} />
            <InfoCard icon={Tag} label="조치방안" value={event.actionPlan || '-'} />
            <InfoCard icon={Tag} label="조치결과" value={event.actionResult || '-'} />
            <InfoCard icon={Tag} label="품질검증" value={event.qualityVerification || '-'} />
          </div>
        </div>
      )}

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

      {/* 첨부파일 및 사진 */}
      <AttachmentSection eventId={event.id} />

      {/* 승인/반려 버튼 */}
      {approvalStep && (
        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 backdrop-blur-xl sm:p-5 dark:bg-primary/10">
          <p className="mb-3 text-xs font-semibold text-primary">승인 처리</p>
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end sm:gap-3">
            {approvalStep.status !== 'SUBMITTED' && (
              <Button variant="outline" className="w-full sm:w-auto" onClick={handleReturnOpen}>
                <RotateCcw className="mr-1.5 h-4 w-4" />보완 요청
              </Button>
            )}
            <Button className="w-full sm:w-auto" onClick={handleApprove}>
              <CheckCircle2 className="mr-1.5 h-4 w-4" />{approvalStep.btnLabel}
            </Button>
          </div>
        </div>
      )}

      {/* 보완요청 코멘트 모달 */}
      {returnModal && (
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
              <Button variant="outline" className="flex-1" onClick={() => setReturnModal(false)}>취소</Button>
              <Button
                className="flex-1 bg-amber-600 hover:bg-amber-700"
                onClick={handleReturn}
                disabled={!returnComment.trim()}
              >
                <RotateCcw className="mr-1.5 h-4 w-4" />보완 요청
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
