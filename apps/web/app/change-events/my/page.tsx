'use client';

import { useAuth } from '@/contexts/auth-context';
import { changeEvents } from '@/lib/api-client';
import { useQuery } from '@tanstack/react-query';
import { ChangeEvent } from '@/types';
import { formatDate, getStatusBadgeClass, getStatusText } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { Plus, ArrowRight, Search, Filter } from 'lucide-react';
import { useState } from 'react';
import { Input } from '@/components/ui/input';

export default function MyChangeEventsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const { data: events = [], isLoading } = useQuery<ChangeEvent[]>({
    queryKey: ['change-events'],
    queryFn: () => changeEvents.list().then((res) => res.data),
  });

  const filtered = events.filter((e) => {
    const matchSearch =
      !search ||
      e.customer.toLowerCase().includes(search.toLowerCase()) ||
      e.project.toLowerCase().includes(search.toLowerCase()) ||
      e.company.name.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'ALL' || e.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">내 요청</h1>
          <p className="mt-1 text-sm text-muted-foreground">등록한 변동점 목록을 확인합니다</p>
        </div>
        <Button size="sm" className="sm:hidden" onClick={() => router.push('/change-events/new')}>
          <Plus className="mr-1 h-4 w-4" />
          등록
        </Button>
        <Button className="hidden sm:inline-flex" onClick={() => router.push('/change-events/new')}>
          <Plus className="mr-2 h-4 w-4" />
          변동점 등록
        </Button>
      </div>

      {/* 필터 */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/50" />
          <Input
            placeholder="고객사, 프로젝트, 협력사 검색..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-11 rounded-xl border border-input bg-background/60 px-4 text-sm backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
        >
          <option value="ALL">전체 상태</option>
          <option value="DRAFT">임시저장</option>
          <option value="SUBMITTED">제출됨</option>
          <option value="REVIEW_RETURNED">보완요청</option>
          <option value="REVIEWED">검토완료</option>
          <option value="APPROVED">승인완료</option>
        </select>
      </div>

      {/* 결과 */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Filter className="mb-3 h-10 w-10 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">조건에 맞는 변동점이 없습니다</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-white/60 bg-white/70 shadow-sm backdrop-blur-xl dark:border-gray-800/60 dark:bg-gray-900/70">
          {/* 데스크톱 */}
          <div className="hidden sm:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50 dark:border-gray-800 dark:bg-gray-800/30">
                  <th className="whitespace-nowrap px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">접수월</th>
                  <th className="whitespace-nowrap px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">발생일</th>
                  <th className="whitespace-nowrap px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">고객사</th>
                  <th className="whitespace-nowrap px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">프로젝트</th>
                  <th className="whitespace-nowrap px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">협력사</th>
                  <th className="whitespace-nowrap px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">상태</th>
                  <th className="px-6 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {filtered.map((event) => (
                  <tr
                    key={event.id}
                    className="cursor-pointer transition-colors hover:bg-gray-50/80 dark:hover:bg-gray-800/40"
                    onClick={() => router.push(`/change-events/${event.id}`)}
                  >
                    <td className="whitespace-nowrap px-6 py-4 font-medium">{event.receiptMonth}</td>
                    <td className="whitespace-nowrap px-6 py-4 text-muted-foreground">{formatDate(event.occurredDate)}</td>
                    <td className="whitespace-nowrap px-6 py-4">{event.customer}</td>
                    <td className="whitespace-nowrap px-6 py-4 text-muted-foreground">{event.project}</td>
                    <td className="whitespace-nowrap px-6 py-4 text-muted-foreground">{event.company.name}</td>
                    <td className="whitespace-nowrap px-6 py-4">
                      <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${getStatusBadgeClass(event.status)}`}>
                        {getStatusText(event.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {/* 모바일 */}
          <div className="space-y-2 p-4 sm:hidden">
            {filtered.map((event) => (
              <div
                key={event.id}
                className="rounded-xl border border-gray-100 bg-white/60 p-3.5 transition-all duration-200 active:scale-[0.98] dark:border-gray-800 dark:bg-gray-800/40"
                onClick={() => router.push(`/change-events/${event.id}`)}
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold">{event.customer}</span>
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${getStatusBadgeClass(event.status)}`}>
                    {getStatusText(event.status)}
                  </span>
                </div>
                <p className="mt-1.5 text-xs text-muted-foreground">{event.project} · {event.company.name}</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground/60">{event.receiptMonth} · {formatDate(event.occurredDate)}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
