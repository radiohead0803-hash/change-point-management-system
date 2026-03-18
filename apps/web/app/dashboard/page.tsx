'use client';

import { useAuth } from '@/contexts/auth-context';
import { changeEvents } from '@/lib/api-client';
import { useQuery } from '@tanstack/react-query';
import { ChangeEvent } from '@/types';
import { formatDate, getStatusColor, getStatusText } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { FileEdit, Plus } from 'lucide-react';

export default function DashboardPage() {
  const { user } = useAuth();
  const router = useRouter();

  // 변동점 목록 조회
  const { data: events = [], isLoading } = useQuery<ChangeEvent[]>({
    queryKey: ['change-events'],
    queryFn: () => changeEvents.list().then((res) => res.data),
  });

  // 상태별 건수 계산
  const statusCounts = events.reduce(
    (acc, event) => {
      acc[event.status] = (acc[event.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight">대시보드</h1>
        <Button onClick={() => router.push('/change-events/new')}>
          <Plus className="mr-2 h-4 w-4" />
          변동점 등록
        </Button>
      </div>

      {/* 상태별 카드 */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {['DRAFT', 'SUBMITTED', 'REVIEWED', 'APPROVED'].map((status) => (
          <div
            key={status}
            className="rounded-lg border bg-card p-6 text-card-foreground shadow-sm"
          >
            <div className="flex flex-row items-center justify-between space-y-0 pb-2">
              <h3 className="tracking-tight text-sm font-medium">{getStatusText(status)}</h3>
              <div
                className={`rounded-full px-2 py-1 text-xs font-semibold bg-${getStatusColor(
                  status,
                )}-100 text-${getStatusColor(status)}-800`}
              >
                {statusCounts[status] || 0}건
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 최근 변동점 목록 */}
      <div className="rounded-lg border bg-card text-card-foreground shadow-sm">
        <div className="p-6">
          <h3 className="font-semibold tracking-tight">최근 변동점</h3>
        </div>
        <div className="p-0">
          <div className="relative w-full overflow-auto">
            <table className="w-full caption-bottom text-sm">
              <thead className="border-b bg-muted/50">
                <tr className="[&>th]:whitespace-nowrap [&>th]:p-4 [&>th]:text-left [&>th]:font-medium">
                  <th>접수월</th>
                  <th>발생일</th>
                  <th>고객사</th>
                  <th>프로젝트</th>
                  <th>협력사</th>
                  <th>상태</th>
                  <th>작업</th>
                </tr>
              </thead>
              <tbody className="[&>tr]:border-b">
                {events.slice(0, 5).map((event) => (
                  <tr
                    key={event.id}
                    className="transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted"
                  >
                    <td className="p-4">{event.receiptMonth}</td>
                    <td className="p-4">{formatDate(event.occurredDate)}</td>
                    <td className="p-4">{event.customer}</td>
                    <td className="p-4">{event.project}</td>
                    <td className="p-4">{event.company.name}</td>
                    <td className="p-4">
                      <div
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-semibold bg-${getStatusColor(
                          event.status,
                        )}-100 text-${getStatusColor(event.status)}-800`}
                      >
                        {getStatusText(event.status)}
                      </div>
                    </td>
                    <td className="p-4">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => router.push(`/change-events/${event.id}`)}
                      >
                        <FileEdit className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
