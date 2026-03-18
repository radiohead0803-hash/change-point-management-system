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
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">변동점 등록</h1>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          {/* 접수월 */}
          <div>
            <label
              htmlFor="receiptMonth"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              접수월
            </label>
            <Input
              id="receiptMonth"
              type="month"
              {...register('receiptMonth')}
              error={errors.receiptMonth?.message}
            />
          </div>

          {/* 발생일 */}
          <div>
            <label
              htmlFor="occurredDate"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              발생일
            </label>
            <Input
              id="occurredDate"
              type="date"
              {...register('occurredDate')}
              error={errors.occurredDate?.message}
            />
          </div>

          {/* 고객사 */}
          <div>
            <label
              htmlFor="customer"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              고객사
            </label>
            <Input id="customer" {...register('customer')} error={errors.customer?.message} />
          </div>

          {/* 프로젝트 */}
          <div>
            <label
              htmlFor="project"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              프로젝트
            </label>
            <Input id="project" {...register('project')} error={errors.project?.message} />
          </div>

          {/* 제품군 */}
          <div>
            <label
              htmlFor="productLine"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              제품군
            </label>
            <Input
              id="productLine"
              {...register('productLine')}
              error={errors.productLine?.message}
            />
          </div>

          {/* 부품번호 */}
          <div>
            <label
              htmlFor="partNumber"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              부품번호
            </label>
            <Input id="partNumber" {...register('partNumber')} error={errors.partNumber?.message} />
          </div>

          {/* 공장 */}
          <div>
            <label
              htmlFor="factory"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              공장
            </label>
            <Input id="factory" {...register('factory')} error={errors.factory?.message} />
          </div>

          {/* 라인 */}
          <div>
            <label
              htmlFor="productionLine"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              라인
            </label>
            <Input
              id="productionLine"
              {...register('productionLine')}
              error={errors.productionLine?.message}
            />
          </div>

          {/* 변경 항목 태그 */}
          <div className="col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
              변경 항목
            </label>
            <Controller
              name="tags"
              control={control}
              defaultValue={[]}
              render={({ field }) => (
                <TagSelector
                  value={field.value as any}
                  onChange={field.onChange}
                  required
                />
              )}
            />
          </div>

          {/* 발생부서 */}
          <div>
            <label
              htmlFor="department"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              발생부서
            </label>
            <Input id="department" {...register('department')} error={errors.department?.message} />
          </div>
        </div>

        {/* 변경 상세내용 */}
        <div>
          <label
            htmlFor="description"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            변경 상세내용
          </label>
          <textarea
            id="description"
            {...register('description')}
            rows={4}
            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring-primary sm:text-sm"
          />
          {errors.description && (
            <p className="mt-1 text-xs text-red-500">{errors.description.message}</p>
          )}
        </div>

        <div className="flex justify-end space-x-4">
          <Button variant="outline" onClick={() => router.back()}>
            취소
          </Button>
          <Button type="submit" loading={loading}>
            등록
          </Button>
        </div>
      </form>
    </div>
  );
}
