'use client';

import { useState, useMemo } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { changeEvents } from '@/lib/api-client';
import { useQuery } from '@tanstack/react-query';
import { ChangeEvent } from '@/types';
import { formatDate, getStatusBadgeClass, getStatusText } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import {
  Plus, Search, Calendar, Building2, Briefcase, FileText,
  ExternalLink, Clock, CheckCircle2, AlertTriangle, Send,
  Edit3, Package,
} from 'lucide-react';

/* ── 상태 설정 ── */
const STATUS_TABS = [
  { key: 'ALL', label: '전체', icon: null },
  { key: 'DRAFT', label: '임시저장', icon: Edit3, color: 'text-gray-500' },
  { key: 'SUBMITTED', label: '제출됨', icon: Send, color: 'text-blue-600' },
  { key: 'REVIEW_RETURNED', label: '보완요청', icon: AlertTriangle, color: 'text-amber-600' },
  { key: 'REVIEWED', label: '검토완료', icon: Clock, color: 'text-indigo-600' },
  { key: 'APPROVED', label: '승인완료', icon: CheckCircle2, color: 'text-green-600' },
];

const STATUS_ACCENT: Record<string, { border: string; hover: string }> = {
  DRAFT: { border: 'border-l-gray-400', hover: 'hover:bg-gray-50/40' },
  SUBMITTED: { border: 'border-l-blue-500', hover: 'hover:bg-blue-50/30' },
  REVIEW_RETURNED: { border: 'border-l-amber-500', hover: 'hover:bg-amber-50/30' },
  REVIEWED: { border: 'border-l-indigo-500', hover: 'hover:bg-indigo-50/30' },
  APPROVED: { border: 'border-l-green-500', hover: 'hover:bg-green-50/30' },
  REJECTED: { border: 'border-l-red-500', hover: 'hover:bg-red-50/30' },
  CLOSED: { border: 'border-l-gray-400', hover: 'hover:bg-gray-50/40' },
};

/* ── 진행률 계산 ── */
function getProgress(status: string) {
  switch (status) {
    case 'DRAFT': return 0;
    case 'SUBMITTED': return 33;
    case 'REVIEW_RETURNED': return 33;
    case 'REVIEWED': return 66;
    case 'APPROVED': return 100;
    case 'CLOSED': return 100;
    default: return 0;
  }
}

function getProgressColor(status: string) {
  switch (status) {
    case 'DRAFT': return 'bg-gray-300';
    case 'SUBMITTED': return 'bg-blue-500';
    case 'REVIEW_RETURNED': return 'bg-amber-500';
    case 'REVIEWED': return 'bg-indigo-500';
    case 'APPROVED': return 'bg-green-500';
    default: return 'bg-gray-300';
  }
}

export default function MyChangeEventsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  const { data: events = [], isLoading } = useQuery<ChangeEvent[]>({
    queryKey: ['change-events'],
    queryFn: () => changeEvents.list().then((res) => res.data),
  });

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: events.length };
    events.forEach((e) => { counts[e.status] = (counts[e.status] || 0) + 1; });
    return counts;
  }, [events]);

  const filtered = useMemo(() => {
    return events.filter((e) => {
      const matchSearch = !search ||
        e.customer.toLowerCase().includes(search.toLowerCase()) ||
        e.project.toLowerCase().includes(search.toLowerCase()) ||
        ((e as any).company?.name || '').toLowerCase().includes(search.toLowerCase()) ||
        (e.partNumber || '').toLowerCase().includes(search.toLowerCase()) ||
        e.receiptMonth.includes(search);
      const matchStatus = statusFilter === 'ALL' || e.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [events, search, statusFilter]);

  return (
    <div className="space-y-5">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">내 요청</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            등록한 변동점 <span className="font-bold text-primary">{events.length}</span>건
          </p>
        </div>
        <Button size="sm" className="sm:hidden" onClick={() => router.push('/change-events/new')}>
          <Plus className="mr-1 h-4 w-4" />등록
        </Button>
        <Button className="hidden sm:inline-flex" onClick={() => router.push('/change-events/new')}>
          <Plus className="mr-2 h-4 w-4" />변동점 등록
        </Button>
      </div>

      {/* 상태 탭 + 검색 */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="flex gap-1.5 overflow-x-auto rounded-xl bg-gray-100/60 p-1 dark:bg-gray-800/40">
          {STATUS_TABS.map((tab) => {
            const count = statusCounts[tab.key] || 0;
            if (tab.key !== 'ALL' && count === 0) return null;
            const TabIcon = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => setStatusFilter(tab.key)}
                className={`flex flex-shrink-0 items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all ${
                  statusFilter === tab.key
                    ? 'bg-white text-foreground shadow-sm dark:bg-gray-700'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                {TabIcon && <TabIcon className={`h-3 w-3 ${statusFilter === tab.key ? (tab.color || '') : ''}`} />}
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">{tab.label.slice(0, 2)}</span>
                <span className={`inline-flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[9px] font-bold ${
                  statusFilter === tab.key
                    ? 'bg-primary text-white'
                    : 'bg-gray-200 text-gray-600 dark:bg-gray-600 dark:text-gray-300'
                }`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/40" />
          <input
            className="h-9 w-full rounded-xl border border-input bg-white/60 pl-9 pr-3 text-sm backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-ring/40 dark:bg-gray-900/60"
            placeholder="고객사, 프로젝트, 협력사, 부품번호..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* 목록 */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-gray-50/30 py-20 text-center dark:border-gray-800 dark:bg-gray-900/20">
          <FileText className="mb-3 h-10 w-10 text-muted-foreground/20" />
          <p className="text-sm font-medium text-muted-foreground">
            {search || statusFilter !== 'ALL' ? '조건에 맞는 변동점이 없습니다' : '등록된 변동점이 없습니다'}
          </p>
          {search || statusFilter !== 'ALL' ? (
            <button
              onClick={() => { setSearch(''); setStatusFilter('ALL'); }}
              className="mt-2 text-xs text-primary hover:underline"
            >
              필터 초기화
            </button>
          ) : (
            <Button size="sm" variant="outline" className="mt-3" onClick={() => router.push('/change-events/new')}>
              <Plus className="mr-1 h-3.5 w-3.5" />첫 변동점 등록하기
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map((event) => {
            const accent = STATUS_ACCENT[event.status] || STATUS_ACCENT.DRAFT;
            const progress = getProgress(event.status);
            const progressColor = getProgressColor(event.status);

            return (
              <div
                key={event.id}
                onClick={() => router.push(`/change-events/${event.id}`)}
                className={`group relative cursor-pointer rounded-xl border border-l-[3px] ${accent.border} border-white/60 bg-white/70 shadow-sm backdrop-blur-xl transition-all duration-200 ${accent.hover} dark:border-gray-800/60 dark:bg-gray-900/70`}
              >
                <div className="p-4 sm:p-5">
                  {/* 상단: 제목 + 상태 */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="text-sm font-semibold leading-tight sm:text-[15px]">{event.customer} - {event.project}</h3>
                        <span className={`flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${getStatusBadgeClass(event.status)}`}>
                          {getStatusText(event.status)}
                        </span>
                      </div>
                    </div>
                    <ExternalLink className="h-4 w-4 flex-shrink-0 text-muted-foreground/20 transition-colors group-hover:text-muted-foreground/60" />
                  </div>

                  {/* 메타 정보 */}
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Building2 className="h-3 w-3" />
                      {(event as any).company?.name || '-'}
                    </span>
                    <span className="flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      {event.receiptMonth}
                    </span>
                    {event.partNumber && (
                      <span className="flex items-center gap-1">
                        <Package className="h-3 w-3" />
                        {event.partNumber}
                      </span>
                    )}
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {formatDate(event.occurredDate)}
                    </span>
                  </div>

                  {/* 승인자 정보 */}
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {(event as any).reviewer && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-blue-50/80 px-1.5 py-0.5 text-[10px] font-medium text-blue-700 dark:bg-blue-900/20 dark:text-blue-400">
                        담당자: {(event as any).reviewer.name}
                      </span>
                    )}
                    {(event as any).executive && (
                      <span className="inline-flex items-center gap-1 rounded-md bg-purple-50/80 px-1.5 py-0.5 text-[10px] font-medium text-purple-700 dark:bg-purple-900/20 dark:text-purple-400">
                        전담중역: {(event as any).executive.name}
                      </span>
                    )}
                  </div>

                  {/* 진행률 바 */}
                  <div className="mt-3 flex items-center gap-2">
                    <div className="flex-1 h-1 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${progressColor}`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-medium text-muted-foreground/60 w-8 text-right">{progress}%</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
