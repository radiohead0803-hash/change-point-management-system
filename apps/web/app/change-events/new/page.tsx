'use client';

import { useState, useCallback, useEffect } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { changeEvents, users } from '@/lib/api-client';
import { getCodeOptions } from '@/lib/common-codes';
import { useQuery } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { useRouter } from 'next/navigation';
import { TagSelector } from '@/components/change-events/tag-selector';
import {
  ArrowLeft, Upload, X, Paperclip, Save, Send, UserCheck,
  ChevronRight, CheckCircle2, FileText, Clipboard, HelpCircle,
  ChevronDown, Info, Search,
} from 'lucide-react';
import { ClassificationGuidePanel } from '@/components/change-events/classification-guide';

const schema = z.object({
  // 발생내역
  occurredDate: z.string().min(1, '발생일을 입력해주세요'),
  department: z.string().optional(),
  // 기본정보 (선택)
  customer: z.string().optional(),
  project: z.string().optional(),
  productLine: z.string().optional(),
  partNumber: z.string().optional(),
  productName: z.string().optional(),
  factory: z.string().optional(),
  productionLine: z.string().optional(),
  companyId: z.string().min(1, '협력사를 선택해주세요'),
  primaryItemId: z.string().optional(),
  tags: z.array(z.object({ itemId: z.string(), tagType: z.enum(['PRIMARY', 'TAG']) })).default([]),
  description: z.string().optional(),
  // 조치결과
  actionDate: z.string().optional(),
  actionPlan: z.string().optional(),
  actionResult: z.string().optional(),
  qualityVerification: z.string().optional(),
  // 담당자
  managerId: z.string().min(1),
  reviewerId: z.string().optional(),
  executiveId: z.string().optional(),
});

type FormData = z.infer<typeof schema>;

/* ── 선택 옵션 (기초정보 공통코드에서 로드) ── */

const STEPS = [
  { label: '접수·등록', desc: '협력사/담당자' },
  { label: '1차 승인', desc: '캠스 담당자' },
  { label: '최종 승인', desc: '전담중역' },
  { label: '승인 완료', desc: '알림 발송' },
];

interface Att { filename: string; mimetype: string; size: number; data: string; preview?: string }

export default function NewChangeEventPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [draftSaving, setDraftSaving] = useState(false);
  const [attachments, setAttachments] = useState<Att[]>([]);
  const [guideOpen, setGuideOpen] = useState(false);

  // 공통코드에서 드롭다운 옵션 로드
  const [CUSTOMERS, setCustomers] = useState<string[]>([]);
  const [PROJECTS, setProjects] = useState<string[]>([]);
  const [PRODUCT_LINES, setProductLines] = useState<string[]>([]);
  const [FACTORIES, setFactories] = useState<string[]>([]);
  const [LINES, setLines] = useState<string[]>([]);
  const [DEPTS, setDepts] = useState<string[]>([]);

  useEffect(() => {
    setCustomers([...getCodeOptions('CUSTOMER'), '기타']);
    // 프로젝트: 차종현황(localStorage)에서 로드
    try {
      const stored = localStorage.getItem('cpms_vehicles');
      if (stored) {
        const vehicles = JSON.parse(stored) as Array<{ name: string; status: string }>;
        const names = vehicles.filter((v) => v.status !== '단종').map((v) => v.name);
        setProjects([...names, '기타']);
      } else {
        setProjects([...getCodeOptions('PROJECT'), '기타']);
      }
    } catch {
      setProjects([...getCodeOptions('PROJECT'), '기타']);
    }
    setProductLines([...getCodeOptions('PRODUCT_LINE'), '기타']);
    setFactories([...getCodeOptions('FACTORY'), '기타']);
    setLines([...getCodeOptions('LINE'), '기타']);
    setDepts([...getCodeOptions('DEPARTMENT'), '기타']);
  }, []);

  const { data: allUsers = [] } = useQuery<any[]>({ queryKey: ['all-users'], queryFn: async () => { try { return (await users.list()).data; } catch { return []; } } });
  const { data: companies = [] } = useQuery<any[]>({ queryKey: ['companies'], queryFn: async () => { try { return (await users.companies()).data; } catch { return []; } } });

  const reviewers = allUsers.filter((u: any) => ['TIER1_REVIEWER', 'TIER1_EDITOR', 'ADMIN'].includes(u.role));
  const executives = allUsers.filter((u: any) => ['EXEC_APPROVER', 'ADMIN'].includes(u.role));

  const { register, handleSubmit, control, watch, setValue, getValues, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: {
      occurredDate: new Date().toISOString().slice(0, 10),
      companyId: user?.companyId || '', customer: '', project: '', productLine: '',
      partNumber: '', productName: '', factory: '', productionLine: '',
      description: '', department: '', managerId: user?.id || '',
      actionDate: '', actionPlan: '', actionResult: '', qualityVerification: '',
      primaryItemId: '', tags: [], reviewerId: '', executiveId: '',
    },
  });

  // user 로드 후 managerId/companyId 자동 설정
  useEffect(() => {
    if (user?.id) {
      const currentMgr = watch('managerId');
      if (!currentMgr) setValue('managerId', user.id);
      if (user.companyId) {
        const currentCo = watch('companyId');
        if (!currentCo) setValue('companyId', user.companyId);
      }
    }
  }, [user, setValue, watch]);

  const occurredDate = watch('occurredDate');
  const receiptMonth = occurredDate ? occurredDate.slice(0, 7) : new Date().toISOString().slice(0, 7);

  /* ── 파일 처리 ── */
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
  const MAX_TOTAL_SIZE = 30 * 1024 * 1024; // 전체 30MB
  const toBase64 = (file: File): Promise<string> => new Promise((res, rej) => { const r = new FileReader(); r.onload = () => res(r.result as string); r.onerror = rej; r.readAsDataURL(file); });

  const addFiles = async (files: FileList | File[]) => {
    const validFiles: File[] = [];
    const currentTotal = attachments.reduce((sum, a) => sum + a.size, 0);
    let addedSize = 0;

    for (const f of Array.from(files)) {
      if (f.size > MAX_FILE_SIZE) {
        toast({ variant: 'destructive', title: `파일 크기 초과`, description: `${f.name} (${(f.size / 1024 / 1024).toFixed(1)}MB) - 최대 10MB` });
        continue;
      }
      if (currentTotal + addedSize + f.size > MAX_TOTAL_SIZE) {
        toast({ variant: 'destructive', title: '전체 첨부 용량 초과', description: `최대 30MB까지 첨부 가능합니다` });
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

  /* ── 저장 ── */
  const save = async (data: FormData, status: 'DRAFT' | 'SUBMITTED') => {
    if (!user?.id) return;

    // tags에서 primaryItemId 자동 추출
    const primaryTag = data.tags?.find((t) => t.tagType === 'PRIMARY');
    const primaryItemId = data.primaryItemId || primaryTag?.itemId || '';

    if (status === 'SUBMITTED') {
      if (!data.reviewerId) { toast({ variant: 'destructive', title: '1차 검토자를 지정해주세요.' }); return; }
      if (!primaryItemId) { toast({ variant: 'destructive', title: '주 분류 항목을 선택해주세요.' }); return; }
      if (!data.description) { toast({ variant: 'destructive', title: '변경 상세내용을 입력해주세요.' }); return; }
      if (!data.department) { toast({ variant: 'destructive', title: '발생부서를 선택해주세요.' }); return; }
      if (!data.actionDate) { toast({ variant: 'destructive', title: '조치시점을 입력해주세요.' }); return; }
      if (!data.actionPlan) { toast({ variant: 'destructive', title: '조치방안을 입력해주세요.' }); return; }
      if (!data.actionResult) { toast({ variant: 'destructive', title: '조치결과를 입력해주세요.' }); return; }
      if (!data.qualityVerification) { toast({ variant: 'destructive', title: '품질검증을 입력해주세요.' }); return; }
    }
    try {
      status === 'DRAFT' ? setDraftSaving(true) : setLoading(true);
      const { tags, ...rest } = data;
      const result = await changeEvents.create({
        ...rest,
        managerId: rest.managerId || user?.id,
        primaryItemId: primaryItemId || undefined,
        receiptMonth, status,
        tags: tags.map((t) => ({ itemId: t.itemId, tagType: t.tagType })),
      });
      if (attachments.length && result.data?.id) {
        await Promise.all(attachments.map((a) => changeEvents.addAttachment(result.data.id, { filename: a.filename, mimetype: a.mimetype, size: a.size, data: a.data })));
      }
      toast({ title: status === 'DRAFT' ? '임시 저장 완료' : '승인 요청 완료' });
      router.push('/change-events/my');
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || '서버 오류';
      toast({ variant: 'destructive', title: '등록 실패', description: typeof msg === 'string' ? msg : JSON.stringify(msg) });
    } finally { setDraftSaving(false); setLoading(false); }
  };

  const ROLES: Record<string, string> = { ADMIN: '관리자', TIER1_EDITOR: '캠스 담당자', TIER1_REVIEWER: '캠스 담당자', EXEC_APPROVER: '전담중역' };

  const Sel = ({ label, req, opts, err, ...p }: any) => {
    const listId = `dl-${p.name || label}`;
    return (
      <div className="space-y-1.5">
        <label className="text-sm font-medium">{label} {req && <span className="text-red-400">*</span>}</label>
        <input {...p} list={listId} placeholder={`${label} 입력`} autoComplete="off"
          className="h-11 w-full rounded-xl border border-input bg-background/60 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring/40" />
        <datalist id={listId}>
          {opts.filter((o: string) => o !== '기타').map((o: string) => <option key={o} value={o} />)}
        </datalist>
        {err && <p className="text-xs text-red-500">{err}</p>}
      </div>
    );
  };

  return (
    <div className="space-y-5" onPaste={handlePaste}>
      <div className="flex items-center gap-3">
        <button type="button" onClick={() => router.back()} className="flex h-9 w-9 items-center justify-center rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800"><ArrowLeft className="h-5 w-5" /></button>
        <div>
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">변동점 등록</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">접수·등록 → 1차 승인 → 최종 승인</p>
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

      <form onSubmit={handleSubmit((d) => save(d, 'SUBMITTED'), (formErrors) => {
        // zod 유효성 검사 실패 시 첫 번째 에러 표시
        const firstError = Object.values(formErrors)[0];
        const msg = firstError?.message || '필수 항목을 확인해주세요';
        toast({ variant: 'destructive', title: '입력 오류', description: typeof msg === 'string' ? msg : '필수 항목을 확인해주세요' });
      })} className="space-y-5">
        {/* ① 변동점 발생항목 */}
        <div className="rounded-2xl border border-white/60 bg-white/70 p-5 shadow-sm backdrop-blur-xl sm:p-6 dark:border-gray-800/60 dark:bg-gray-900/70">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
              <CheckCircle2 className="h-4 w-4" /> 변동점 발생항목
            </h2>
            <button
              type="button"
              onClick={() => setGuideOpen(true)}
              className="flex items-center gap-1.5 rounded-xl bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-600 transition-all hover:bg-blue-100 hover:shadow-sm dark:bg-blue-900/30 dark:text-blue-400 dark:hover:bg-blue-900/50"
            >
              <HelpCircle className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">분류항목 가이드</span>
              <span className="sm:hidden">가이드</span>
            </button>
          </div>
          <div className="mb-4 max-w-xs">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">발생일 <span className="text-red-400">*</span></label>
              <Input type="date" {...register('occurredDate')} error={errors.occurredDate?.message} />
            </div>
          </div>
          <p className="mb-3 text-xs text-muted-foreground">기초정보 분류 체계에서 발생 항목을 선택합니다</p>
          <Controller name="tags" control={control} defaultValue={[]} render={({ field }) => <TagSelector value={field.value as any} onChange={field.onChange} required />} />
        </div>

        {/* ② 기본 정보 */}
        <div className="rounded-2xl border border-white/60 bg-white/70 p-5 shadow-sm backdrop-blur-xl sm:p-6 dark:border-gray-800/60 dark:bg-gray-900/70">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            <FileText className="h-4 w-4" /> 기본 정보
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5">
            <Sel label="고객사" opts={CUSTOMERS} {...register('customer')} />
            <Sel label="프로젝트" opts={PROJECTS} {...register('project')} />
            <Sel label="제품군" opts={PRODUCT_LINES} {...register('productLine')} />
            <Sel label="공장" opts={FACTORIES} {...register('factory')} />
            <div className="space-y-1.5">
              <label className="text-sm font-medium">품번</label>
              <Input {...register('partNumber')} placeholder="품번 입력" />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">품명</label>
              <Input {...register('productName')} placeholder="품명 입력" />
            </div>
            <Sel label="라인" opts={LINES} {...register('productionLine')} />
            <Sel label="발생부서" req opts={DEPTS} {...register('department')} err={errors.department?.message} />
            <div className="space-y-1.5">
              <label className="text-sm font-medium">협력사 <span className="text-red-400">*</span></label>
              <select {...register('companyId')} className="h-11 w-full rounded-xl border border-input bg-background/60 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring/40">
                <option value="">협력사 선택</option>
                {companies.map((c: any) => <option key={c.id} value={c.id}>[{c.type}] {c.name}</option>)}
              </select>
              {errors.companyId && <p className="text-xs text-red-500">{errors.companyId.message}</p>}
            </div>
          </div>
        </div>

        {/* ③ 승인자 */}
        <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-5 shadow-sm sm:p-6 dark:border-blue-900/30 dark:bg-blue-900/10">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-blue-700 dark:text-blue-400">
            <UserCheck className="h-4 w-4" /> 승인자 지정
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">1차 검토자 <span className="text-red-400">*</span></label>
              <select {...register('reviewerId')} className="h-11 w-full rounded-xl border border-input bg-background/60 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring/40">
                <option value="">검토자 선택</option>
                {reviewers.map((u: any) => <option key={u.id} value={u.id}>{u.name} ({ROLES[u.role] || u.role})</option>)}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">전담중역 <span className="text-xs text-muted-foreground">(선택)</span></label>
              <select {...register('executiveId')} className="h-11 w-full rounded-xl border border-input bg-background/60 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring/40">
                <option value="">전담중역 선택</option>
                {executives.map((u: any) => <option key={u.id} value={u.id}>{u.name} ({ROLES[u.role] || u.role})</option>)}
              </select>
            </div>
          </div>
        </div>

        {/* ④ 상세내용 */}
        <div className="rounded-2xl border border-white/60 bg-white/70 p-5 shadow-sm sm:p-6 dark:border-gray-800/60 dark:bg-gray-900/70">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">변경 상세내용</h2>
          <textarea {...register('description')} rows={4} placeholder="변경 사항의 상세 내용을 입력해주세요"
            className="w-full rounded-xl border border-input bg-background/60 px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring/40" />
          {errors.description && <p className="mt-1.5 text-xs text-red-500">{errors.description.message}</p>}
        </div>

        {/* ⑤ 조치결과 */}
        <div className="rounded-2xl border border-amber-100 bg-amber-50/30 p-5 shadow-sm sm:p-6 dark:border-amber-900/30 dark:bg-amber-900/10">
          <h2 className="mb-1 text-sm font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">조치결과 (필수)</h2>
          <p className="mb-4 text-[11px] text-muted-foreground">운영가이드 필수 작성 항목입니다</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">조치시점 <span className="text-red-400">*</span></label>
              <Input type="date" {...register('actionDate')} error={errors.actionDate?.message} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">조치방안 <span className="text-red-400">*</span></label>
              <Input {...register('actionPlan')} placeholder="조치방안 입력" error={errors.actionPlan?.message} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">조치결과 <span className="text-red-400">*</span></label>
              <Input {...register('actionResult')} placeholder="조치결과 입력" error={errors.actionResult?.message} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">품질검증 <span className="text-red-400">*</span></label>
              <Input {...register('qualityVerification')} placeholder="품질검증 내용 입력" error={errors.qualityVerification?.message} />
            </div>
          </div>
        </div>

        {/* ⑥ 첨부파일 (Ctrl+V 붙여넣기) */}
        <div className="rounded-2xl border border-white/60 bg-white/70 p-5 shadow-sm sm:p-6 dark:border-gray-800/60 dark:bg-gray-900/70">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">첨부파일 및 사진</h2>
          <p className="mb-3 flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Clipboard className="h-3 w-3" />
            캡처 후 <kbd className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-mono font-bold dark:bg-gray-800">Ctrl+V</kbd>로 이미지 붙여넣기 가능
          </p>
          <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-gray-50/50 px-6 py-6 hover:border-primary/40 hover:bg-primary/5 dark:border-gray-700 dark:bg-gray-800/30">
            <Upload className="mb-2 h-7 w-7 text-muted-foreground/40" />
            <span className="text-sm font-medium text-muted-foreground">파일 선택 또는 드래그 & 드롭</span>
            <span className="mt-1 text-xs text-muted-foreground/60">PNG, JPG, PDF, Excel (최대 10MB)</span>
            <input type="file" multiple accept="image/*,.pdf,.xlsx,.xls,.doc,.docx" className="hidden" onChange={(e) => e.target.files && addFiles(e.target.files)} />
          </label>
          {attachments.length > 0 && (
            <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {attachments.map((att, i) => (
                <div key={i} className="flex items-center gap-3 rounded-xl border border-gray-100 bg-white/80 px-3 py-2 dark:border-gray-800 dark:bg-gray-800/40">
                  {att.preview ? (
                    <img src={att.preview} alt="" className="h-12 w-12 rounded-lg object-cover flex-shrink-0" />
                  ) : (
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-gray-100 dark:bg-gray-700"><Paperclip className="h-5 w-5 text-muted-foreground/50" /></div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="truncate text-sm">{att.filename}</p>
                    <p className="text-[10px] text-muted-foreground/50">{(att.size / 1024).toFixed(0)}KB</p>
                  </div>
                  <button type="button" onClick={() => setAttachments((p) => p.filter((_, j) => j !== i))} className="rounded-lg p-1.5 text-muted-foreground/50 hover:bg-red-50 hover:text-red-500"><X className="h-4 w-4" /></button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 버튼 */}
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => router.back()}>취소</Button>
          <Button type="button" variant="secondary" className="w-full sm:w-auto" onClick={() => save(getValues() as FormData, 'DRAFT')} disabled={draftSaving}>
            <Save className="mr-1.5 h-4 w-4" />{draftSaving ? '저장 중...' : '임시 저장'}
          </Button>
          <Button type="submit" className="w-full sm:w-auto" disabled={loading}>
            <Send className="mr-1.5 h-4 w-4" />{loading ? '제출 중...' : '승인 요청'}
          </Button>
        </div>
      </form>

      {/* 분류항목 가이드 슬라이드 패널 */}
      <ClassificationGuidePanel open={guideOpen} onClose={() => setGuideOpen(false)} />
    </div>
  );
}
