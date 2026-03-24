'use client';

import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { changeEvents, users, commonCodes } from '@/lib/api-client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { useRouter } from 'next/navigation';
import { TagSelector } from '@/components/change-events/tag-selector';
import { SearchSelect } from '@/components/ui/search-select';
import { ChangeEvent } from '@/types';
import {
  ArrowLeft, Upload, X, Paperclip, Save, Send, UserCheck,
  ChevronRight, CheckCircle2, FileText, Clipboard, Trash2, HelpCircle,
} from 'lucide-react';
import { ClassificationGuidePanel } from '@/components/change-events/classification-guide';

const schema = z.object({
  occurredDate: z.string().min(1, '발생일을 입력해주세요'),
  department: z.string().optional(),
  customer: z.string().optional(),
  project: z.string().optional(),
  productLine: z.string().optional(),
  partNumber: z.string().optional(),
  productName: z.string().optional(),
  factory: z.string().optional(),
  productionLine: z.string().optional(),
  companyId: z.string().min(1, '협력사를 선택해주세요'),
  primaryItemId: z.string().optional(),
  tags: z.array(z.object({ itemId: z.string(), tagType: z.enum(['PRIMARY', 'TAG']), customName: z.string().optional() })).default([]),
  description: z.string().optional(),
  actionDate: z.string().optional(),
  actionPlan: z.string().optional(),
  actionResult: z.string().optional(),
  qualityVerification: z.string().optional(),
  managerId: z.string().min(1),
  reviewerId: z.string().optional(),
  executiveId: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

interface Att { id?: string; filename: string; mimetype: string; size: number; data?: string; preview?: string; isExisting?: boolean }

const STEPS = [
  { label: '접수·등록', desc: '협력사/담당자' },
  { label: '1차 승인', desc: '캠스 담당자' },
  { label: '최종 승인', desc: '전담중역' },
  { label: '승인 완료', desc: '알림 발송' },
];

export default function EditChangeEventPage({ params }: { params: { id: string } }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const queryClient = useQueryClient();
  const [loading, setLoading] = useState(false);
  const [draftSaving, setDraftSaving] = useState(false);
  const [attachments, setAttachments] = useState<Att[]>([]);
  const [removedAttIds, setRemovedAttIds] = useState<string[]>([]);
  const [guideOpen, setGuideOpen] = useState(false);

  // Load existing event
  const { data: event, isLoading: eventLoading } = useQuery<ChangeEvent>({
    queryKey: ['change-events', params.id],
    queryFn: () => changeEvents.get(params.id).then((r) => r.data),
  });

  // Load existing attachments
  const { data: existingAtts = [] } = useQuery<any[]>({
    queryKey: ['attachments', params.id],
    queryFn: () => changeEvents.getAttachments(params.id).then((r) => r.data),
    enabled: !!params.id,
  });

  // Common code options - useMemo로 이벤트 데이터 포함하여 즉시 계산
  const addIfMissing = (opts: string[], val?: string | null) => {
    if (val && !opts.includes(val)) return [...opts.filter(x => x !== '기타'), val, '기타'];
    return opts;
  };

  // 공통코드 옵션 (DB API 기반)
  const { data: codeData } = useQuery<Record<string, string[]>>({
    queryKey: ['common-codes-all'],
    queryFn: async () => { try { return (await commonCodes.getAll()).data; } catch { return {}; } },
    staleTime: 60000,
  });
  const CUSTOMERS = useMemo(() => addIfMissing(codeData?.CUSTOMER || [], event?.customer), [codeData, event?.customer]);
  const PROJECTS = useMemo(() => addIfMissing(codeData?.PROJECT || [], event?.project), [codeData, event?.project]);
  const PRODUCT_LINES = useMemo(() => addIfMissing(codeData?.PRODUCT_LINE || [], event?.productLine), [codeData, event?.productLine]);
  const FACTORIES = useMemo(() => addIfMissing(codeData?.FACTORY || [], event?.factory), [codeData, event?.factory]);
  const LINES = useMemo(() => addIfMissing(codeData?.LINE || [], event?.productionLine), [codeData, event?.productionLine]);
  const DEPTS = useMemo(() => addIfMissing(codeData?.DEPARTMENT || [], event?.department), [codeData, event?.department]);

  const { data: allUsers = [] } = useQuery<any[]>({ queryKey: ['all-users'], queryFn: async () => { try { return (await users.list()).data; } catch { return []; } } });
  const { data: companiesList = [] } = useQuery<any[]>({ queryKey: ['companies'], queryFn: async () => { try { return (await users.companies()).data; } catch { return []; } } });

  const reviewers = allUsers.filter((u: any) => ['TIER1_REVIEWER', 'TIER1_EDITOR', 'ADMIN'].includes(u.role));
  const executives = allUsers.filter((u: any) => ['EXEC_APPROVER', 'ADMIN'].includes(u.role));

  const { register, handleSubmit, control, watch, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      occurredDate: '', companyId: '', customer: '', project: '', productLine: '',
      partNumber: '', productName: '', factory: '', productionLine: '',
      description: '', department: '', managerId: '',
      actionDate: '', actionPlan: '', actionResult: '', qualityVerification: '',
      primaryItemId: '', tags: [], reviewerId: '', executiveId: '',
    },
  });

  // 폼 초기화 - event + codeData 모두 로드 완료 후 1회 실행
  const formInitRef = useRef(false);
  const eventIdRef = useRef('');

  useEffect(() => {
    // 공통코드(codeData)가 로드되기 전에는 reset 하지 않음 (SELECT 옵션이 비어서 값이 유실됨)
    if (!event || !codeData || (formInitRef.current && eventIdRef.current === event.id)) return;
    formInitRef.current = true;
    eventIdRef.current = event.id;

    const tags = event.tags as any[] || [];
    const primaryTag = tags.find((t: any) => t.tagType === 'PRIMARY');
    const primaryItemId = event.primaryItemId || primaryTag?.itemId || primaryTag?.item?.id || '';

    reset({
      occurredDate: event.occurredDate ? new Date(event.occurredDate).toISOString().slice(0, 10) : '',
      department: event.department || '',
      customer: event.customer || '',
      project: event.project || '',
      productLine: event.productLine || '',
      partNumber: event.partNumber || '',
      productName: event.productName || '',
      factory: event.factory || '',
      productionLine: event.productionLine || '',
      companyId: event.companyId || '',
      primaryItemId,
      tags: tags.map((t: any) => ({ itemId: t.itemId || t.item?.id, tagType: t.tagType })),
      description: event.description || '',
      actionDate: event.actionDate ? new Date(event.actionDate).toISOString().slice(0, 10) : '',
      actionPlan: event.actionPlan || '',
      actionResult: event.actionResult || '',
      qualityVerification: event.qualityVerification || '',
      managerId: event.managerId || user?.id || '',
      reviewerId: event.reviewerId || '',
      executiveId: event.executiveId || '',
    });
  }, [event, reset, user, codeData]);

  // Populate existing attachments
  const attsInitRef = useRef(false);
  useEffect(() => {
    if (existingAtts.length > 0 && !attsInitRef.current) {
      attsInitRef.current = true;
      setAttachments(existingAtts.map((a: any) => ({
        id: a.id, filename: a.filename, mimetype: a.mimetype, size: a.size, isExisting: true,
      })));
    }
  }, [existingAtts]);

  const occurredDate = watch('occurredDate');
  const receiptMonth = occurredDate ? occurredDate.slice(0, 7) : '';

  /* ── 파일 처리 ── */
  const MAX_FILE_SIZE = 10 * 1024 * 1024;
  const MAX_TOTAL_SIZE = 30 * 1024 * 1024;
  const toBase64 = (file: File): Promise<string> => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result as string); r.onerror = rej; r.readAsDataURL(file); });

  const addFiles = async (files: FileList | File[]) => {
    const validFiles: File[] = [];
    const currentTotal = attachments.reduce((sum, a) => sum + a.size, 0);
    let addedSize = 0;
    for (const f of Array.from(files)) {
      if (f.size > MAX_FILE_SIZE) {
        toast({ variant: 'destructive', title: '파일 크기 초과', description: `${f.name} (${(f.size / 1024 / 1024).toFixed(1)}MB) - 최대 10MB` });
        continue;
      }
      if (currentTotal + addedSize + f.size > MAX_TOTAL_SIZE) {
        toast({ variant: 'destructive', title: '전체 첨부 용량 초과', description: '최대 30MB까지 첨부 가능합니다' });
        break;
      }
      addedSize += f.size;
      validFiles.push(f);
    }
    if (validFiles.length === 0) return;
    const items = await Promise.all(validFiles.map(async (f) => {
      const data = await toBase64(f);
      return { filename: f.name, mimetype: f.type, size: f.size, data, preview: f.type.startsWith('image/') ? data : undefined };
    }));
    setAttachments((p) => [...p, ...items]);
  };

  const handlePaste = useCallback(async (e: React.ClipboardEvent) => {
    const items = e.clipboardData?.items;
    if (!items) return;
    const imgs: File[] = [];
    for (const item of Array.from(items)) {
      if (item.type.startsWith('image/')) {
        const f = item.getAsFile();
        if (f) imgs.push(new File([f], `캡처_${Date.now()}.png`, { type: f.type }));
      }
    }
    if (imgs.length) { e.preventDefault(); await addFiles(imgs); toast({ title: `${imgs.length}개 이미지 붙여넣기 완료` }); }
  }, [toast]);

  const removeAtt = (index: number) => {
    const att = attachments[index];
    if (att.isExisting && att.id) {
      setRemovedAttIds((p) => [...p, att.id!]);
    }
    setAttachments((p) => p.filter((_, j) => j !== index));
  };

  /* ── 저장 ── */
  const save = async (data: FormData, status: 'DRAFT' | 'CONFIRMED') => {
    if (!user?.id) return;

    // tags에서 primaryItemId 자동 추출
    const primaryTag = data.tags?.find((t) => t.tagType === 'PRIMARY');
    const primaryItemId = primaryTag?.itemId?.startsWith('custom_') ? '' : (data.primaryItemId || primaryTag?.itemId || '');

    if (status === 'CONFIRMED') {
      if (!data.reviewerId) { toast({ variant: 'destructive', title: '1차 검토자를 지정해주세요.' }); return; }
      if (!primaryItemId && !primaryTag?.customName) { toast({ variant: 'destructive', title: '주 분류 항목을 선택해주세요.' }); return; }
      if (!data.description) { toast({ variant: 'destructive', title: '변경 상세내용을 입력해주세요.' }); return; }
    }

    try {
      status === 'DRAFT' ? setDraftSaving(true) : setLoading(true);
      const { tags, ...rest } = data;

      // Update event
      await changeEvents.update(params.id, {
        ...rest as any,
        primaryItemId: primaryItemId || undefined,
        receiptMonth: receiptMonth || rest.occurredDate?.slice(0, 7),
        status,
        tags: tags.map((t) => ({ itemId: t.itemId, tagType: t.tagType, customName: t.customName })),
      });

      // Remove deleted attachments
      await Promise.all(removedAttIds.map((id) => changeEvents.removeAttachment(id)));

      // Upload new attachments
      const newAtts = attachments.filter((a) => !a.isExisting && a.data);
      if (newAtts.length > 0) {
        await Promise.all(newAtts.map((a) => changeEvents.addAttachment(params.id, {
          filename: a.filename, mimetype: a.mimetype, size: a.size, data: a.data!,
        })));
      }

      queryClient.invalidateQueries({ queryKey: ['change-events'] });
      toast({ title: status === 'DRAFT' ? '임시 저장 완료' : '승인 요청 완료' });
      router.push(`/change-events/${params.id}`);
    } catch (err: any) {
      toast({ variant: 'destructive', title: '저장 실패', description: err?.response?.data?.message || '서버 오류' });
    } finally { setDraftSaving(false); setLoading(false); }
  };

  if (eventLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!event) {
    return <div className="flex flex-col items-center justify-center py-20"><p className="text-sm text-muted-foreground">데이터를 찾을 수 없습니다</p></div>;
  }

  const canSubmit = event.status === 'DRAFT' || event.status === 'REVIEW_RETURNED';
  const ROLES: Record<string, string> = { ADMIN: '관리자', TIER1_EDITOR: '캠스 담당자', TIER1_REVIEWER: '캠스 담당자', EXEC_APPROVER: '전담중역' };

  const CSel = ({ name, label, req, opts, err }: { name: string; label: string; req?: boolean; opts: string[]; err?: string }) => (
    <Controller name={name as any} control={control} render={({ field }) => (
      <div className="space-y-1.5">
        <label className="text-sm font-medium">{label} {req && <span className="text-red-400">*</span>}</label>
        <select value={field.value as string || ''} onChange={field.onChange} onBlur={field.onBlur} ref={field.ref}
          className="h-10 w-full rounded-xl border border-input bg-background/60 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring/40">
          <option value="">{label} 선택</option>
          {(opts || []).map((o: string) => <option key={o} value={o}>{o}</option>)}
        </select>
        {err && <p className="text-xs text-red-500">{err}</p>}
      </div>
    )} />
  );

  return (
    <div className="space-y-5" onPaste={handlePaste}>
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => router.back()} className="flex h-9 w-9 items-center justify-center rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800"><ArrowLeft className="h-5 w-5" /></button>
        <div>
          <h1 className="text-lg font-bold tracking-tight sm:text-2xl">변동점 수정</h1>
          <p className="mt-0.5 text-xs sm:text-sm text-muted-foreground">
            상태: <span className="font-medium">{event.status === 'DRAFT' ? '임시저장' : event.status === 'REVIEW_RETURNED' ? '보완요청' : event.status}</span>
          </p>
        </div>
      </div>

      {/* 플로우 */}
      <div className="rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50/80 to-purple-50/80 p-3 dark:from-blue-900/10 dark:to-purple-900/10 dark:border-gray-800/60">
        <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto">
          {STEPS.map((s, i) => (
            <div key={s.label} className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
              <div className={`rounded-lg px-2 py-1 text-center min-w-[55px] ${i === 0 ? 'bg-emerald-100 dark:bg-emerald-900/30' : 'bg-white/80 dark:bg-gray-800/60'}`}>
                <span className="text-[10px] sm:text-xs font-bold">{s.label}</span>
                <span className="block text-[8px] sm:text-[9px] text-muted-foreground">{s.desc}</span>
              </div>
              {i < STEPS.length - 1 && <ChevronRight className="h-3 w-3 text-muted-foreground/40" />}
            </div>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit((d) => save(d, 'CONFIRMED'))} className="space-y-5">
        {/* ① 변동점 발생항목 */}
        <div className="rounded-2xl border border-white/60 bg-white/70 p-4 shadow-sm backdrop-blur-xl sm:p-6 dark:border-gray-800/60 dark:bg-gray-900/70">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              <CheckCircle2 className="h-4 w-4" /> 변동점 발생항목
            </h2>
            <button type="button" onClick={() => setGuideOpen(true)}
              className="flex items-center gap-1.5 rounded-xl bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-600 transition-all hover:bg-blue-100 dark:bg-blue-900/30 dark:text-blue-400">
              <HelpCircle className="h-3.5 w-3.5" /><span className="hidden sm:inline">분류항목 가이드</span><span className="sm:hidden">가이드</span>
            </button>
          </div>
          <div className="mb-4 max-w-xs">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">발생일 <span className="text-red-400">*</span></label>
              <Input type="date" {...register('occurredDate')} error={errors.occurredDate?.message} />
            </div>
          </div>
          <p className="mb-3 text-xs text-muted-foreground">기초정보 분류 체계에서 발생 항목을 선택합니다</p>
          <Controller name="tags" control={control} defaultValue={[]} render={({ field }) => <TagSelector value={field.value as any} onChange={field.onChange} />} />
        </div>

        {/* ② 기본 정보 */}
        <div className="rounded-2xl border border-white/60 bg-white/70 p-4 shadow-sm backdrop-blur-xl sm:p-6 dark:border-gray-800/60 dark:bg-gray-900/70">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            <FileText className="h-4 w-4" /> 기본 정보
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
            <CSel name="customer" label="고객사" opts={CUSTOMERS} />
            <CSel name="project" label="프로젝트" opts={PROJECTS} />
            <CSel name="productLine" label="제품군" opts={PRODUCT_LINES} />
            <CSel name="factory" label="공장" opts={FACTORIES} />
            <div className="space-y-1.5"><label className="text-sm font-medium">품번</label><Input {...register('partNumber')} placeholder="품번 입력" /></div>
            <div className="space-y-1.5"><label className="text-sm font-medium">품명</label><Input {...register('productName')} placeholder="품명 입력" /></div>
            <div className="space-y-1.5"><label className="text-sm font-medium">라인</label><Input {...register('productionLine')} placeholder="라인 입력" /></div>
            <CSel name="department" label="발생부서" opts={DEPTS} />
            <div className="space-y-1.5">
              <label className="text-sm font-medium">협력사 <span className="text-red-400">*</span></label>
              <select {...register('companyId')} className="h-10 w-full rounded-xl border border-input bg-background/60 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring/40">
                <option value="">협력사 선택</option>
                {companiesList.map((c: any) => <option key={c.id} value={c.id}>[{c.type}] {c.name}</option>)}
              </select>
              {errors.companyId && <p className="text-xs text-red-500">{errors.companyId.message}</p>}
            </div>
          </div>
        </div>

        {/* ③ 승인자 */}
        <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-4 shadow-sm sm:p-6 dark:border-blue-900/30 dark:bg-blue-900/10">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-blue-700 dark:text-blue-400">
            <UserCheck className="h-4 w-4" /> 승인자 지정
          </h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">1차 검토자 <span className="text-red-400">*</span></label>
              <Controller name="reviewerId" control={control} render={({ field }) => (
                <SearchSelect
                  options={reviewers.map((u: any) => ({ value: u.id, label: `${u.name} (${ROLES[u.role] || u.role})` }))}
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="검토자 선택"
                />
              )} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">전담중역 <span className="text-xs text-muted-foreground">(선택)</span></label>
              <Controller name="executiveId" control={control} render={({ field }) => (
                <SearchSelect
                  options={executives.map((u: any) => ({ value: u.id, label: `${u.name} (${ROLES[u.role] || u.role})` }))}
                  value={field.value}
                  onChange={field.onChange}
                  placeholder="전담중역 선택"
                />
              )} />
            </div>
          </div>
        </div>

        {/* ④ 상세내용 */}
        <div className="rounded-2xl border border-white/60 bg-white/70 p-4 shadow-sm sm:p-6 dark:border-gray-800/60 dark:bg-gray-900/70">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">변경 상세내용</h2>
          <textarea {...register('description')} rows={4} placeholder="변경 사항의 상세 내용을 입력해주세요"
            className="w-full rounded-xl border border-input bg-background/60 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring/40" />
          {errors.description && <p className="mt-1.5 text-xs text-red-500">{errors.description.message}</p>}
        </div>

        {/* ⑤ 조치결과 */}
        <div className="rounded-2xl border border-amber-100 bg-amber-50/30 p-4 shadow-sm sm:p-6 dark:border-amber-900/30 dark:bg-amber-900/10">
          <h2 className="mb-1 text-sm font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">조치결과</h2>
          <p className="mb-4 text-[11px] text-muted-foreground">승인 요청 시 필수 작성 항목입니다</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">조치시점</label>
              <Input type="date" {...register('actionDate')} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">조치방안</label>
              <Input {...register('actionPlan')} placeholder="조치방안 입력" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">조치결과</label>
              <Input {...register('actionResult')} placeholder="조치결과 입력" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">품질검증</label>
              <Input {...register('qualityVerification')} placeholder="품질검증 내용 입력" />
            </div>
          </div>
        </div>

        {/* ⑥ 첨부파일 */}
        <div className="rounded-2xl border border-white/60 bg-white/70 p-4 shadow-sm sm:p-6 dark:border-gray-800/60 dark:bg-gray-900/70">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">첨부파일 및 사진</h2>
          <p className="mb-3 flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Clipboard className="h-3 w-3" />
            캡처 후 <kbd className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-mono font-bold dark:bg-gray-800">Ctrl+V</kbd>로 이미지 붙여넣기 가능
          </p>
          <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-gray-50/50 px-6 py-5 hover:border-primary/40 hover:bg-primary/5 dark:border-gray-700 dark:bg-gray-800/30">
            <Upload className="mb-2 h-6 w-6 text-muted-foreground/40" />
            <span className="text-sm font-medium text-muted-foreground">파일 선택 또는 드래그 & 드롭</span>
            <span className="mt-1 text-xs text-muted-foreground/60">PNG, JPG, PDF, Excel (최대 10MB)</span>
            <input type="file" multiple accept="image/*,.pdf,.xlsx,.xls,.doc,.docx" className="hidden" onChange={(e) => e.target.files && addFiles(e.target.files)} />
          </label>
          {attachments.length > 0 && (
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {attachments.map((att, i) => (
                <div key={att.id || i} className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white/80 px-3 py-2 dark:border-gray-800 dark:bg-gray-800/40">
                  {att.preview ? (
                    <img src={att.preview} alt="" className="h-12 w-12 rounded-lg object-cover flex-shrink-0" />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-700">
                      <Paperclip className="h-5 w-5 text-muted-foreground/50" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm">{att.filename}</p>
                    <p className="text-[10px] text-muted-foreground/50">
                      {(att.size / 1024).toFixed(0)}KB
                      {att.isExisting && <span className="ml-1 text-primary">(기존)</span>}
                    </p>
                  </div>
                  <button type="button" onClick={() => removeAtt(i)} className="rounded-lg p-1.5 text-muted-foreground/50 hover:bg-red-50 hover:text-red-500">
                    {att.isExisting ? <Trash2 className="h-4 w-4" /> : <X className="h-4 w-4" />}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 버튼 */}
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => router.back()}>취소</Button>
          <Button type="button" variant="secondary" className="w-full sm:w-auto" onClick={() => save(watch() as FormData, 'DRAFT')} disabled={draftSaving}>
            <Save className="mr-1.5 h-4 w-4" />{draftSaving ? '저장 중...' : '임시 저장'}
          </Button>
          {canSubmit && (
            <Button type="submit" className="w-full sm:w-auto" disabled={loading}>
              <Send className="mr-1.5 h-4 w-4" />{loading ? '제출 중...' : '승인 요청'}
            </Button>
          )}
        </div>
      </form>

      <ClassificationGuidePanel open={guideOpen} onClose={() => setGuideOpen(false)} />
    </div>
  );
}
