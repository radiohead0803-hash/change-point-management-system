'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { changeEvents, users } from '@/lib/api-client';
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
  ChevronRight, CheckCircle2, Clock, FileText,
} from 'lucide-react';

const changeEventSchema = z.object({
  occurredDate: z.string().min(1, '발생일을 입력해주세요'),
  customer: z.string().min(1, '고객사를 입력해주세요'),
  project: z.string().min(1, '프로젝트를 입력해주세요'),
  productLine: z.string().min(1, '제품군을 입력해주세요'),
  partNumber: z.string().min(1, '부품번호를 입력해주세요'),
  factory: z.string().min(1, '공장을 입력해주세요'),
  productionLine: z.string().min(1, '라인을 입력해주세요'),
  companyId: z.string().min(1, '협력사를 선택해주세요'),
  primaryItemId: z.string().min(1, '주 분류 항목을 선택해주세요'),
  tags: z.array(z.object({
    itemId: z.string(),
    tagType: z.enum(['PRIMARY', 'TAG']),
  })).default([]),
  description: z.string().min(1, '변경 상세내용을 입력해주세요'),
  department: z.string().min(1, '발생부서를 입력해주세요'),
  managerId: z.string().min(1, '실무담당자를 선택해주세요'),
  reviewerId: z.string().optional(),
  executiveId: z.string().optional(),
});

type ChangeEventForm = z.infer<typeof changeEventSchema>;

/* ── 승인 플로우 시각화 ── */
const APPROVAL_STEPS = [
  { key: 'register', label: '접수·등록', desc: '협력사/담당자' },
  { key: 'review', label: '1차 검토', desc: '담당자 승인' },
  { key: 'approve', label: '최종 승인', desc: '전담중역' },
  { key: 'done', label: '승인 완료', desc: '알림 발송' },
];

export default function NewChangeEventPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [draftSaving, setDraftSaving] = useState(false);
  const [files, setFiles] = useState<File[]>([]);

  const isTier2 = user?.role === 'TIER2_EDITOR'; // 협력사
  const flowCase = isTier2 ? 'CASE01' : 'CASE02';

  // 사용자 목록 조회
  const { data: allUsers = [] } = useQuery<any[]>({
    queryKey: ['all-users'],
    queryFn: async () => {
      try {
        const res = await users.list();
        return res.data;
      } catch {
        return [];
      }
    },
  });

  // 회사 목록
  const { data: companies = [] } = useQuery<any[]>({
    queryKey: ['companies'],
    queryFn: async () => {
      try {
        const res = await users.companies();
        return res.data;
      } catch {
        return [];
      }
    },
  });

  // 1차 검토자 (담당자 = TIER1_EDITOR, TIER1_REVIEWER, ADMIN)
  const reviewers = allUsers.filter((u: any) =>
    ['TIER1_REVIEWER', 'TIER1_EDITOR', 'ADMIN'].includes(u.role)
  );
  // 전담중역 (EXEC_APPROVER, ADMIN)
  const executives = allUsers.filter((u: any) =>
    ['EXEC_APPROVER', 'ADMIN'].includes(u.role)
  );

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ChangeEventForm>({
    resolver: zodResolver(changeEventSchema),
    defaultValues: {
      occurredDate: new Date().toISOString().slice(0, 10),
      companyId: user?.companyId || '',
      customer: '',
      project: '',
      productLine: '',
      partNumber: '',
      factory: '',
      productionLine: '',
      description: '',
      department: '',
      managerId: user?.id || '',
      primaryItemId: '',
      tags: [],
      reviewerId: '',
      executiveId: '',
    },
  });

  const occurredDate = watch('occurredDate');
  const receiptMonth = occurredDate ? occurredDate.slice(0, 7) : new Date().toISOString().slice(0, 7);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  // 임시 저장
  const handleDraftSave = async () => {
    const data = watch();
    if (!user?.id) return;

    try {
      setDraftSaving(true);
      const { tags, ...rest } = data;
      await changeEvents.create({
        ...rest,
        receiptMonth,
        status: 'DRAFT',
        changeType: 'FOUR_M',
        category: '',
        subCategory: '',
        createdById: user.id,
        tags: tags.map((tag: any) => ({ itemId: tag.itemId, tagType: tag.tagType })),
      });
      toast({ title: '임시 저장되었습니다.', description: '내 요청에서 확인 가능합니다.' });
      router.push('/change-events/my');
    } catch (error) {
      toast({ variant: 'destructive', title: '임시 저장 실패' });
    } finally {
      setDraftSaving(false);
    }
  };

  // 승인 요청 (제출)
  const onSubmit = async (data: ChangeEventForm) => {
    if (!user?.id) {
      toast({ variant: 'destructive', title: '로그인이 필요합니다.' });
      return;
    }

    // 검토자 필수 체크
    if (!data.reviewerId) {
      toast({ variant: 'destructive', title: '1차 검토자(담당자)를 지정해주세요.' });
      return;
    }

    try {
      setLoading(true);
      const { tags, ...rest } = data;
      await changeEvents.create({
        ...rest,
        receiptMonth,
        status: 'SUBMITTED',
        changeType: 'FOUR_M',
        category: '',
        subCategory: '',
        createdById: user.id,
        tags: tags.map((tag: any) => ({ itemId: tag.itemId, tagType: tag.tagType })),
      });
      toast({
        title: '승인 요청 완료',
        description: '1차 검토자에게 승인 요청이 전송되었습니다.',
      });
      router.push('/change-events/my');
    } catch (error) {
      toast({ variant: 'destructive', title: '등록 실패', description: '다시 시도해주세요.' });
    } finally {
      setLoading(false);
    }
  };

  const ROLE_LABELS: Record<string, string> = {
    ADMIN: '관리자',
    TIER1_EDITOR: '1차사 담당자',
    TIER1_REVIEWER: '1차사 검토자',
    EXEC_APPROVER: '전담중역',
  };

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex h-9 w-9 items-center justify-center rounded-xl transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div>
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">변동점 등록</h1>
          <p className="mt-0.5 text-sm text-muted-foreground">
            {flowCase === 'CASE01' ? '협력사 등록' : '담당자 등록'} → 승인요청 → 1차 검토 → 최종 승인
          </p>
        </div>
      </div>

      {/* 승인 플로우 시각화 */}
      <div className="rounded-2xl border border-blue-100 bg-gradient-to-r from-blue-50/80 via-indigo-50/80 to-purple-50/80 p-3 shadow-sm backdrop-blur-xl sm:p-4 dark:from-blue-900/10 dark:via-indigo-900/10 dark:to-purple-900/10 dark:border-gray-800/60">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
          {flowCase === 'CASE01' ? '승인 플로우 (협력사 등록)' : '승인 플로우 (담당자 등록)'}
        </p>
        <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto">
          {APPROVAL_STEPS.map((step, idx) => (
            <div key={step.key} className="flex items-center gap-1 sm:gap-2 flex-shrink-0">
              <div className={`rounded-lg px-2 py-1.5 shadow-sm text-center min-w-[60px] sm:min-w-[80px] ${
                idx === 0 ? 'bg-emerald-100 ring-2 ring-emerald-300 dark:bg-emerald-900/30 dark:ring-emerald-700' : 'bg-white/80 dark:bg-gray-800/60'
              }`}>
                <span className={`text-[10px] sm:text-xs font-bold ${
                  idx === 0 ? 'text-emerald-700 dark:text-emerald-400' :
                  idx === 1 ? 'text-blue-700 dark:text-blue-400' :
                  idx === 2 ? 'text-purple-700 dark:text-purple-400' :
                  'text-green-700 dark:text-green-400'
                }`}>{step.label}</span>
                <span className="block text-[8px] sm:text-[9px] text-muted-foreground">{step.desc}</span>
              </div>
              {idx < APPROVAL_STEPS.length - 1 && (
                <ChevronRight className="h-3 w-3 sm:h-3.5 sm:w-3.5 flex-shrink-0 text-muted-foreground/40" />
              )}
            </div>
          ))}
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* 기본 정보 */}
        <div className="rounded-2xl border border-white/60 bg-white/70 p-5 shadow-sm backdrop-blur-xl sm:p-6 dark:border-gray-800/60 dark:bg-gray-900/70">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            <FileText className="h-4 w-4" />
            기본 정보
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5">
            <div className="space-y-1.5">
              <label className="text-sm font-medium">발생일 <span className="text-red-400">*</span></label>
              <Input type="date" {...register('occurredDate')} error={errors.occurredDate?.message} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">접수월 (자동)</label>
              <div className="flex h-11 items-center rounded-xl border border-input bg-gray-50 px-3 text-sm dark:bg-gray-800">
                {receiptMonth}
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">고객사 <span className="text-red-400">*</span></label>
              <Input {...register('customer')} placeholder="고객사명" error={errors.customer?.message} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">프로젝트 <span className="text-red-400">*</span></label>
              <Input {...register('project')} placeholder="프로젝트명" error={errors.project?.message} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">제품군 <span className="text-red-400">*</span></label>
              <Input {...register('productLine')} placeholder="제품군" error={errors.productLine?.message} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">부품번호 <span className="text-red-400">*</span></label>
              <Input {...register('partNumber')} placeholder="부품번호" error={errors.partNumber?.message} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">공장 <span className="text-red-400">*</span></label>
              <Input {...register('factory')} placeholder="공장" error={errors.factory?.message} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">라인 <span className="text-red-400">*</span></label>
              <Input {...register('productionLine')} placeholder="생산라인" error={errors.productionLine?.message} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">발생부서 <span className="text-red-400">*</span></label>
              <Input {...register('department')} placeholder="발생부서" error={errors.department?.message} />
            </div>
            <div className="space-y-1.5">
              <label className="text-sm font-medium">협력사 <span className="text-red-400">*</span></label>
              <select
                {...register('companyId')}
                className="h-11 w-full rounded-xl border border-input bg-background/60 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
              >
                <option value="">협력사 선택</option>
                {companies.map((c: any) => (
                  <option key={c.id} value={c.id}>[{c.type}] {c.name}</option>
                ))}
              </select>
              {errors.companyId && <p className="text-xs text-red-500">{errors.companyId.message}</p>}
            </div>
          </div>
        </div>

        {/* 승인자 지정 */}
        <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-5 shadow-sm backdrop-blur-xl sm:p-6 dark:border-blue-900/30 dark:bg-blue-900/10">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-blue-700 dark:text-blue-400">
            <UserCheck className="h-4 w-4" />
            승인자 지정
          </h2>

          {/* 플로우 안내 */}
          <div className="mb-4 rounded-xl bg-blue-100/50 p-3 text-xs text-blue-800 dark:bg-blue-900/20 dark:text-blue-300">
            <p className="font-semibold mb-1">
              {flowCase === 'CASE01' ? '📋 CASE01: 협력사 등록 플로우' : '📋 CASE02: 담당자 등록 플로우'}
            </p>
            <p>등록 → <strong>1차 검토자(담당자)</strong> 지정 및 승인요청 → 1차 승인 시 <strong>전담중역</strong> 지정 → 최종승인 → 승인완료 알림</p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {/* 1차 검토자 - 등록 시 필수 지정 */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">
                1차 검토자 (담당자) <span className="text-red-400">*</span>
              </label>
              <select
                {...register('reviewerId')}
                className="h-11 w-full rounded-xl border border-input bg-background/60 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
              >
                <option value="">1차 검토자 선택</option>
                {reviewers.map((u: any) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({ROLE_LABELS[u.role] || u.role}){u.company ? ` - ${u.company.name}` : ''}
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-muted-foreground">승인요청 시 1차 검토자에게 알림이 전송됩니다</p>
            </div>

            {/* 전담중역 - 선택 지정 (1차 검토 시에도 지정 가능) */}
            <div className="space-y-1.5">
              <label className="text-sm font-medium">
                전담중역 (최종승인) <span className="text-muted-foreground text-xs">(선택)</span>
              </label>
              <select
                {...register('executiveId')}
                className="h-11 w-full rounded-xl border border-input bg-background/60 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
              >
                <option value="">전담중역 선택 (1차 검토 시 지정 가능)</option>
                {executives.map((u: any) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({ROLE_LABELS[u.role] || u.role}){u.company ? ` - ${u.company.name}` : ''}
                  </option>
                ))}
              </select>
              <p className="text-[10px] text-muted-foreground">미지정 시 1차 검토자가 승인 시 전담중역을 지정합니다</p>
            </div>
          </div>
        </div>

        {/* 변경 항목 (기초정보 기준) */}
        <div className="rounded-2xl border border-white/60 bg-white/70 p-5 shadow-sm backdrop-blur-xl sm:p-6 dark:border-gray-800/60 dark:bg-gray-900/70">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            <CheckCircle2 className="h-4 w-4" />
            변경 항목
          </h2>
          <p className="mb-3 text-xs text-muted-foreground">기초정보에 등록된 분류 체계에서 변경 항목을 선택합니다</p>
          <Controller
            name="tags"
            control={control}
            defaultValue={[]}
            render={({ field }) => (
              <TagSelector value={field.value as any} onChange={field.onChange} required />
            )}
          />
        </div>

        {/* 변경 상세내용 */}
        <div className="rounded-2xl border border-white/60 bg-white/70 p-5 shadow-sm backdrop-blur-xl sm:p-6 dark:border-gray-800/60 dark:bg-gray-900/70">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">변경 상세내용</h2>
          <textarea
            {...register('description')}
            rows={4}
            placeholder="변경 사항의 상세 내용을 입력해주세요"
            className="w-full rounded-xl border border-input bg-background/60 px-4 py-3 text-sm backdrop-blur-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-ring/40 transition-all"
          />
          {errors.description && <p className="mt-1.5 text-xs text-red-500">{errors.description.message}</p>}
        </div>

        {/* 첨부파일 */}
        <div className="rounded-2xl border border-white/60 bg-white/70 p-5 shadow-sm backdrop-blur-xl sm:p-6 dark:border-gray-800/60 dark:bg-gray-900/70">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">첨부파일</h2>
          <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-gray-50/50 px-6 py-8 transition-colors hover:border-primary/40 hover:bg-primary/5 dark:border-gray-700 dark:bg-gray-800/30">
            <Upload className="mb-2 h-8 w-8 text-muted-foreground/40" />
            <span className="text-sm font-medium text-muted-foreground">사진 또는 자료를 업로드하세요</span>
            <span className="mt-1 text-xs text-muted-foreground/60">PNG, JPG, PDF, Excel 등 (최대 10MB)</span>
            <input type="file" multiple accept="image/*,.pdf,.xlsx,.xls,.doc,.docx" className="hidden" onChange={handleFileChange} />
          </label>
          {files.length > 0 && (
            <div className="mt-3 space-y-2">
              {files.map((file, index) => (
                <div key={index} className="flex items-center justify-between rounded-xl border border-gray-100 bg-white/80 px-4 py-2.5 dark:border-gray-800 dark:bg-gray-800/40">
                  <div className="flex items-center gap-2 min-w-0">
                    <Paperclip className="h-4 w-4 flex-shrink-0 text-muted-foreground/50" />
                    <span className="truncate text-sm">{file.name}</span>
                    <span className="flex-shrink-0 text-xs text-muted-foreground/50">{(file.size / 1024).toFixed(0)}KB</span>
                  </div>
                  <button type="button" onClick={() => removeFile(index)} className="flex-shrink-0 rounded-lg p-1 text-muted-foreground/50 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 버튼 */}
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end sm:gap-3">
          <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => router.back()}>
            취소
          </Button>
          <Button type="button" variant="secondary" className="w-full sm:w-auto" onClick={handleDraftSave} disabled={draftSaving}>
            <Save className="mr-1.5 h-4 w-4" />
            {draftSaving ? '저장 중...' : '임시 저장'}
          </Button>
          <Button type="submit" className="w-full sm:w-auto" disabled={loading}>
            <Send className="mr-1.5 h-4 w-4" />
            {loading ? '제출 중...' : '승인 요청'}
          </Button>
        </div>
      </form>
    </div>
  );
}
