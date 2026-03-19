'use client';

import { useAuth } from '@/contexts/auth-context';
import { changeEvents } from '@/lib/api-client';
import { useQuery } from '@tanstack/react-query';
import { ChangeEvent } from '@/types';
import { formatDate, getStatusBadgeClass, getStatusText } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import {
  Plus, ChevronRight, Search, Filter, Calendar, Building2,
  Briefcase, ChevronDown, ChevronUp, FileText,
} from 'lucide-react';
import { useState } from 'react';
import { Input } from '@/components/ui/input';

/* ── 승인 플로우 스텝 ── */
const STATUS_FLOW = ['DRAFT', 'SUBMITTED', 'REVIEWED', 'APPROVED'];
function getFlowStep(status: string) {
  if (status === 'REVIEW_RETURNED') return 1;
  if (status === 'REJECTED') return -1;
  return STATUS_FLOW.indexOf(status);
}

export default function MyChangeEventsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data: events = [], isLoading } = useQuery<ChangeEvent[]>({
    queryKey: ['change-events'],
    queryFn: () => changeEvents.list().then((res) => res.data),
  });

  const filtered = events.filter((e) => {
    const matchSearch =
      !search ||
      e.customer.toLowerCase().includes(search.toLowerCase()) ||
      e.project.toLowerCase().includes(search.toLowerCase()) ||
      e.company.name.toLowerCase().includes(search.toLowerCase()) ||
      e.partNumber?.toLowerCase().includes(search.toLowerCase()) ||
      e.description?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === 'ALL' || e.status === statusFilter;
    return matchSearch && matchStatus;
  });

  // 상태별 카운트
  const statusCounts = events.reduce((acc, e) => {
    acc[e.status] = (acc[e.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">내 요청</h1>
          <p className="mt-1 text-sm text-muted-foreground">등록한 변동점 {events.length}건</p>
        </div>
        <Button size="sm" className="sm:hidden" onClick={() => router.push('/change-events/new')}>
          <Plus className="mr-1 h-4 w-4" />등록
        </Button>
        <Button className="hidden sm:inline-flex" onClick={() => router.push('/change-events/new')}>
          <Plus className="mr-2 h-4 w-4" />변동점 등록
        </Button>
      </div>

      {/* 상태별 필터 칩 */}
      <div className="flex flex-wrap gap-2">
        {[
          { key: 'ALL', label: '전체' },
          { key: 'DRAFT', label: '임시저장' },
          { key: 'SUBMITTED', label: '제출됨' },
          { key: 'REVIEW_RETURNED', label: '보완요청' },
          { key: 'REVIEWED', label: '검토완료' },
          { key: 'APPROVED', label: '승인완료' },
        ].map((s) => {
          const count = s.key === 'ALL' ? events.length : (statusCounts[s.key] || 0);
          if (s.key !== 'ALL' && count === 0) return null;
          return (
            <button
              key={s.key}
              onClick={() => setStatusFilter(s.key)}
              className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${
                statusFilter === s.key
                  ? s.key === 'ALL' ? 'bg-primary text-primary-foreground' : getStatusBadgeClass(s.key)
                  : 'bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400'
              }`}
            >
              {s.label} {count}
            </button>
          );
        })}
      </div>

      {/* 검색 */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/50" />
        <Input
          placeholder="고객사, 프로젝트, 협력사, 부품번호 검색..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
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
        <div className="space-y-3">
          {filtered.map((event) => {
            const isExpanded = expandedId === event.id;
            const flowStep = getFlowStep(event.status);

            return (
              <div
                key={event.id}
                className="overflow-hidden rounded-2xl border border-white/60 bg-white/70 shadow-sm backdrop-blur-xl transition-all duration-200 hover:shadow-md dark:border-gray-800/60 dark:bg-gray-900/70"
              >
                {/* 카드 헤더 */}
                <div className="p-4 sm:p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div
                      className="flex-1 cursor-pointer"
                      onClick={() => router.push(`/change-events/${event.id}`)}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-bold sm:text-base">{event.customer}</h3>
                        <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${getStatusBadgeClass(event.status)}`}>
                          {getStatusText(event.status)}
                        </span>
                      </div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Briefcase className="h-3 w-3" />
                          {event.project}
                        </span>
                        <span className="flex items-center gap-1">
                          <Building2 className="h-3 w-3" />
                          {event.company.name}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {event.receiptMonth}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => toggleExpand(event.id)}
                        className="rounded-lg p-1.5 text-muted-foreground/50 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
                      >
                        {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </button>
                      <button
                        onClick={() => router.push(`/change-events/${event.id}`)}
                        className="hidden sm:block rounded-lg p-1.5 text-muted-foreground/50 transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* 진행 상태 바 */}
                  <div className="mt-3 flex items-center gap-1">
                    {['접수', '검토', '승인'].map((step, i) => (
                      <div key={step} className="flex-1">
                        <div className={`h-1.5 rounded-full transition-all ${
                          flowStep > i ? 'bg-primary' :
                          flowStep === i ? 'bg-primary/40' :
                          event.status === 'REVIEW_RETURNED' && i === 1 ? 'bg-amber-400' :
                          'bg-gray-200 dark:bg-gray-700'
                        }`} />
                      </div>
                    ))}
                  </div>
                  <div className="mt-1 flex justify-between text-[9px] text-muted-foreground/50">
                    <span>접수</span>
                    <span>검토</span>
                    <span>승인</span>
                  </div>
                </div>

                {/* 카드 확장 - 세부정보 */}
                {isExpanded && (
                  <div className="border-t border-gray-100 bg-gray-50/50 p-4 sm:p-5 dark:border-gray-800 dark:bg-gray-800/20">
                    <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
                      <div>
                        <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60">발생일</p>
                        <p className="mt-0.5 text-xs font-medium">{formatDate(event.occurredDate)}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60">제품군</p>
                        <p className="mt-0.5 text-xs font-medium">{event.productLine || '-'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60">부품번호</p>
                        <p className="mt-0.5 text-xs font-mono font-medium">{event.partNumber || '-'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60">공장/라인</p>
                        <p className="mt-0.5 text-xs font-medium">{event.factory || '-'} / {event.productionLine || '-'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60">분류</p>
                        <p className="mt-0.5 text-xs font-medium">
                          {event.changeType === 'FOUR_M' ? '4M' : '4M외'} · {event.category || '-'}
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60">세부항목</p>
                        <p className="mt-0.5 text-xs font-medium">{event.subCategory || '-'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60">발생부서</p>
                        <p className="mt-0.5 text-xs font-medium">{event.department || '-'}</p>
                      </div>
                      <div>
                        <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60">등록자</p>
                        <p className="mt-0.5 text-xs font-medium">{event.createdBy?.name || '-'}</p>
                      </div>
                    </div>

                    {/* 변경 상세내용 미리보기 */}
                    {event.description && (
                      <div className="mt-3">
                        <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground/60">변경 상세내용</p>
                        <p className="mt-1 line-clamp-3 rounded-lg bg-white/80 p-2.5 text-xs leading-relaxed text-muted-foreground dark:bg-gray-800/40">
                          {event.description}
                        </p>
                      </div>
                    )}

                    {/* 상세보기 버튼 */}
                    <div className="mt-3 flex justify-end">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => router.push(`/change-events/${event.id}`)}
                        className="text-xs"
                      >
                        <FileText className="mr-1.5 h-3.5 w-3.5" />
                        상세보기
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
