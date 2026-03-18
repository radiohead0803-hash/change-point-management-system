'use client';

import { useAuth } from '@/contexts/auth-context';
import { changeEvents } from '@/lib/api-client';
import { useQuery } from '@tanstack/react-query';
import { ChangeEvent } from '@/types';
import { formatDate, formatDateTime, getStatusColor, getStatusText } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useToast } from '@/components/ui/use-toast';
import { useRouter } from 'next/navigation';
import { FileEdit, Download } from 'lucide-react';

export default function ChangeEventDetailPage({ params }: { params: { id: string } }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  // 변동점 상세 조회
  const { data: event, isLoading } = useQuery<ChangeEvent>({
    queryKey: ['change-events', params.id],
    queryFn: () => changeEvents.get(params.id).then((res) => res.data),
  });

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!event) {
    return <div>Not found</div>;
  }

  // 수정 권한 체크
  const canEdit =
    user?.role === 'ADMIN' ||
    (user?.role === 'TIER2_EDITOR' && event.createdById === user.id) ||
    (user?.role === 'TIER1_EDITOR' && event.status === 'REVIEW_RETURNED');

  // 승인 권한 체크
  const canApprove =
    (user?.role === 'TIER1_REVIEWER' && event.status === 'SUBMITTED') ||
    (user?.role === 'EXEC_APPROVER' && event.status === 'REVIEWED');

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">변동점 상세</h1>
        <div className="flex space-x-4">
          {canEdit && (
            <Button onClick={() => router.push(`/change-events/${event.id}/edit`)}>
              <FileEdit className="mr-2 h-4 w-4" />
              수정
            </Button>
          )}
          {event.status === 'APPROVED' && (
            <Button variant="outline" onClick={() => window.open(`/api/excel/${event.id}`)}>
              <Download className="mr-2 h-4 w-4" />
              엑셀 다운로드
            </Button>
          )}
        </div>
      </div>

      {/* 상태 정보 */}
      <div className="rounded-lg border bg-card p-6 text-card-foreground shadow-sm">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="text-sm font-medium text-gray-500 dark:text-gray-400">상태</div>
            <div
              className={`mt-1 inline-flex rounded-full px-2 py-1 text-xs font-semibold bg-${getStatusColor(
                event.status,
              )}-100 text-${getStatusColor(event.status)}-800`}
            >
              {getStatusText(event.status)}
            </div>
          </div>
          <div>
            <div className="text-sm font-medium text-gray-500 dark:text-gray-400">등록자</div>
            <div className="mt-1 text-sm">{event.createdBy.name}</div>
          </div>
          <div>
            <div className="text-sm font-medium text-gray-500 dark:text-gray-400">등록일시</div>
            <div className="mt-1 text-sm">{formatDateTime(event.createdAt)}</div>
          </div>
          <div>
            <div className="text-sm font-medium text-gray-500 dark:text-gray-400">수정일시</div>
            <div className="mt-1 text-sm">{formatDateTime(event.updatedAt)}</div>
          </div>
        </div>
      </div>

      {/* 기본 정보 */}
      <div className="rounded-lg border bg-card p-6 text-card-foreground shadow-sm">
        <h3 className="mb-4 text-lg font-medium">기본 정보</h3>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="text-sm font-medium text-gray-500 dark:text-gray-400">접수월</div>
            <div className="mt-1 text-sm">{event.receiptMonth}</div>
          </div>
          <div>
            <div className="text-sm font-medium text-gray-500 dark:text-gray-400">발생일</div>
            <div className="mt-1 text-sm">{formatDate(event.occurredDate)}</div>
          </div>
          <div>
            <div className="text-sm font-medium text-gray-500 dark:text-gray-400">고객사</div>
            <div className="mt-1 text-sm">{event.customer}</div>
          </div>
          <div>
            <div className="text-sm font-medium text-gray-500 dark:text-gray-400">프로젝트</div>
            <div className="mt-1 text-sm">{event.project}</div>
          </div>
          <div>
            <div className="text-sm font-medium text-gray-500 dark:text-gray-400">제품군</div>
            <div className="mt-1 text-sm">{event.productLine}</div>
          </div>
          <div>
            <div className="text-sm font-medium text-gray-500 dark:text-gray-400">부품번호</div>
            <div className="mt-1 text-sm">{event.partNumber}</div>
          </div>
          <div>
            <div className="text-sm font-medium text-gray-500 dark:text-gray-400">공장</div>
            <div className="mt-1 text-sm">{event.factory}</div>
          </div>
          <div>
            <div className="text-sm font-medium text-gray-500 dark:text-gray-400">라인</div>
            <div className="mt-1 text-sm">{event.productionLine}</div>
          </div>
          <div>
            <div className="text-sm font-medium text-gray-500 dark:text-gray-400">협력사</div>
            <div className="mt-1 text-sm">{event.company.name}</div>
          </div>
          <div>
            <div className="text-sm font-medium text-gray-500 dark:text-gray-400">4M/4M외</div>
            <div className="mt-1 text-sm">{event.changeType === 'FOUR_M' ? '4M' : '4M외'}</div>
          </div>
          <div>
            <div className="text-sm font-medium text-gray-500 dark:text-gray-400">대분류</div>
            <div className="mt-1 text-sm">{event.category}</div>
          </div>
          <div>
            <div className="text-sm font-medium text-gray-500 dark:text-gray-400">세부항목</div>
            <div className="mt-1 text-sm">{event.subCategory}</div>
          </div>
        </div>
      </div>

      {/* 변경 상세내용 */}
      <div className="rounded-lg border bg-card p-6 text-card-foreground shadow-sm">
        <h3 className="mb-4 text-lg font-medium">변경 상세내용</h3>
        <div className="whitespace-pre-wrap text-sm">{event.description}</div>
      </div>

      {/* 점검 결과 */}
      <div className="rounded-lg border bg-card p-6 text-card-foreground shadow-sm">
        <h3 className="mb-4 text-lg font-medium">점검 결과</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b bg-muted/50">
              <tr>
                <th className="whitespace-nowrap p-4 text-left font-medium">항목</th>
                <th className="whitespace-nowrap p-4 text-left font-medium">결과</th>
              </tr>
            </thead>
            <tbody className="[&>tr]:border-b">
              {event.inspectionResults.map((result) => (
                <tr key={result.id}>
                  <td className="p-4">{result.item.question}</td>
                  <td className="p-4">{result.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 첨부파일 */}
      {event.attachments.length > 0 && (
        <div className="rounded-lg border bg-card p-6 text-card-foreground shadow-sm">
          <h3 className="mb-4 text-lg font-medium">첨부파일</h3>
          <div className="space-y-2">
            {event.attachments.map((attachment) => (
              <div key={attachment.id} className="flex items-center space-x-2">
                <a
                  href={`/api/attachments/${attachment.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:underline dark:text-blue-500"
                >
                  {attachment.filename}
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 승인 버튼 */}
      {canApprove && (
        <div className="flex justify-end space-x-4">
          <Button
            variant="outline"
            onClick={async () => {
              try {
                await changeEvents.update(event.id, {
                  status: 'REVIEW_RETURNED',
                });
                toast({
                  title: '보완 요청되었습니다.',
                });
                router.refresh();
              } catch (error) {
                toast({
                  variant: 'destructive',
                  title: '처리 실패',
                  description: '다시 시도해주세요.',
                });
              }
            }}
          >
            보완 요청
          </Button>
          <Button
            onClick={async () => {
              try {
                await changeEvents.update(event.id, {
                  status: user?.role === 'TIER1_REVIEWER' ? 'REVIEWED' : 'APPROVED',
                });
                toast({
                  title: '승인되었습니다.',
                });
                router.refresh();
              } catch (error) {
                toast({
                  variant: 'destructive',
                  title: '처리 실패',
                  description: '다시 시도해주세요.',
                });
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
