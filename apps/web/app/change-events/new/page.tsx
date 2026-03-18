'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { changeEvents } from '@/lib/api-client';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { useRouter } from 'next/navigation';
import { TagSelector } from '@/components/change-events/tag-selector';
import { ArrowLeft, Upload, X, Paperclip } from 'lucide-react';

const changeEventSchema = z.object({
  receiptMonth: z.string().regex(/^\d{4}-(0[1-9]|1[0-2])$/, '올바른 접수월을 입력해주세요 (YYYY-MM)'),
  occurredDate: z.string(),
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
});

type ChangeEventForm = z.infer<typeof changeEventSchema>;

export default function NewChangeEventPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [files, setFiles] = useState<File[]>([]);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<ChangeEventForm>({
    resolver: zodResolver(changeEventSchema),
    defaultValues: {
      receiptMonth: new Date().toISOString().slice(0, 7),
      occurredDate: new Date().toISOString().slice(0, 10),
      companyId: user?.companyId,
      customer: '',
      project: '',
      productLine: '',
      partNumber: '',
      factory: '',
      productionLine: '',
      description: '',
      department: '',
      managerId: '',
      primaryItemId: '',
      tags: [],
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setFiles((prev) => [...prev, ...Array.from(e.target.files!)]);
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const onSubmit = async (data: ChangeEventForm) => {
    if (!user?.id) {
      toast({
        variant: 'destructive',
        title: '로그인이 필요합니다.',
      });
      return;
    }

    try {
      setLoading(true);
      const { tags, ...rest } = data;
      await changeEvents.create({
        ...rest,
        status: 'DRAFT',
        changeType: 'FOUR_M',
        category: '',
        subCategory: '',
        createdById: user.id,
        tags: tags.map(tag => ({
          itemId: tag.itemId,
          tagType: tag.tagType,
        })),
      });
      toast({
        title: '변동점이 등록되었습니다.',
        description: '변동점 목록에서 확인하실 수 있습니다.',
      });
      router.push('/dashboard');
    } catch (error) {
      toast({
        variant: 'destructive',
        title: '변동점 등록 실패',
        description: '다시 시도해주세요.',
      });
    } finally {
      setLoading(false);
    }
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
          <p className="mt-0.5 text-sm text-muted-foreground">새로운 변동점을 등록합니다</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* 기본 정보 섹션 */}
        <div className="rounded-2xl border border-white/60 bg-white/70 p-5 shadow-sm backdrop-blur-xl sm:p-6 dark:border-gray-800/60 dark:bg-gray-900/70">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            기본 정보
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-5">
            <div className="space-y-1.5">
              <label htmlFor="receiptMonth" className="text-sm font-medium">접수월</label>
              <Input id="receiptMonth" type="month" {...register('receiptMonth')} error={errors.receiptMonth?.message} />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="occurredDate" className="text-sm font-medium">발생일</label>
              <Input id="occurredDate" type="date" {...register('occurredDate')} error={errors.occurredDate?.message} />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="customer" className="text-sm font-medium">고객사</label>
              <Input id="customer" {...register('customer')} error={errors.customer?.message} />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="project" className="text-sm font-medium">프로젝트</label>
              <Input id="project" {...register('project')} error={errors.project?.message} />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="productLine" className="text-sm font-medium">제품군</label>
              <Input id="productLine" {...register('productLine')} error={errors.productLine?.message} />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="partNumber" className="text-sm font-medium">부품번호</label>
              <Input id="partNumber" {...register('partNumber')} error={errors.partNumber?.message} />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="factory" className="text-sm font-medium">공장</label>
              <Input id="factory" {...register('factory')} error={errors.factory?.message} />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="productionLine" className="text-sm font-medium">라인</label>
              <Input id="productionLine" {...register('productionLine')} error={errors.productionLine?.message} />
            </div>
            <div className="space-y-1.5">
              <label htmlFor="department" className="text-sm font-medium">발생부서</label>
              <Input id="department" {...register('department')} error={errors.department?.message} />
            </div>
          </div>
        </div>

        {/* 변경 분류 섹션 */}
        <div className="rounded-2xl border border-white/60 bg-white/70 p-5 shadow-sm backdrop-blur-xl sm:p-6 dark:border-gray-800/60 dark:bg-gray-900/70">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            변경 항목
          </h2>
          <Controller
            name="tags"
            control={control}
            defaultValue={[]}
            render={({ field }) => (
              <TagSelector value={field.value as any} onChange={field.onChange} required />
            )}
          />
        </div>

        {/* 변경 상세내용 섹션 */}
        <div className="rounded-2xl border border-white/60 bg-white/70 p-5 shadow-sm backdrop-blur-xl sm:p-6 dark:border-gray-800/60 dark:bg-gray-900/70">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            변경 상세내용
          </h2>
          <textarea
            id="description"
            {...register('description')}
            rows={4}
            placeholder="변경 사항의 상세 내용을 입력해주세요"
            className="w-full rounded-xl border border-input bg-background/60 px-4 py-3 text-sm backdrop-blur-sm placeholder:text-muted-foreground/60 focus:outline-none focus:ring-2 focus:ring-ring/40 focus:border-primary/50 transition-all duration-200 dark:border-gray-700 dark:bg-gray-800/60"
          />
          {errors.description && (
            <p className="mt-1.5 text-xs font-medium text-red-500">{errors.description.message}</p>
          )}
        </div>

        {/* 첨부파일 섹션 */}
        <div className="rounded-2xl border border-white/60 bg-white/70 p-5 shadow-sm backdrop-blur-xl sm:p-6 dark:border-gray-800/60 dark:bg-gray-900/70">
          <h2 className="mb-4 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            첨부파일
          </h2>
          <div className="space-y-3">
            <label className="flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-gray-50/50 px-6 py-8 transition-colors hover:border-primary/40 hover:bg-primary/5 dark:border-gray-700 dark:bg-gray-800/30 dark:hover:border-primary/40">
              <Upload className="mb-2 h-8 w-8 text-muted-foreground/40" />
              <span className="text-sm font-medium text-muted-foreground">
                사진 또는 자료를 업로드하세요
              </span>
              <span className="mt-1 text-xs text-muted-foreground/60">
                PNG, JPG, PDF, Excel 등 (최대 10MB)
              </span>
              <input
                type="file"
                multiple
                accept="image/*,.pdf,.xlsx,.xls,.doc,.docx"
                className="hidden"
                onChange={handleFileChange}
              />
            </label>
            {files.length > 0 && (
              <div className="space-y-2">
                {files.map((file, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between rounded-xl border border-gray-100 bg-white/80 px-4 py-2.5 dark:border-gray-800 dark:bg-gray-800/40"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <Paperclip className="h-4 w-4 flex-shrink-0 text-muted-foreground/50" />
                      <span className="truncate text-sm">{file.name}</span>
                      <span className="flex-shrink-0 text-xs text-muted-foreground/50">
                        {(file.size / 1024).toFixed(0)}KB
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => removeFile(index)}
                      className="flex-shrink-0 rounded-lg p-1 text-muted-foreground/50 transition-colors hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 버튼 */}
        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end sm:gap-3">
          <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={() => router.back()}>
            취소
          </Button>
          <Button type="submit" className="w-full sm:w-auto" loading={loading}>
            등록
          </Button>
        </div>
      </form>
    </div>
  );
}
