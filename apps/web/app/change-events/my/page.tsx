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
  Plus, Search, Filter, FileSpreadsheet, ArrowRight,
  FileText, ChevronDown,
} from 'lucide-react';

/* ── Tooltip 셀 ── */
function TipCell({ children, tip, className = '' }: { children: React.ReactNode; tip?: string; className?: string }) {
  return (
    <td className={`group/tip relative ${className}`}>
      {children}
      {tip && tip.length > 6 && (
        <div className="pointer-events-none absolute left-1/2 bottom-full z-50 mb-1 hidden -translate-x-1/2 whitespace-normal rounded-lg bg-gray-900 px-3 py-2 text-[10px] leading-relaxed text-white shadow-lg group-hover/tip:block max-w-[250px] text-left">
          {tip}
          <div className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
        </div>
      )}
    </td>
  );
}

export default function MyChangeEventsPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [customerFilter, setCustomerFilter] = useState('ALL');
  const [searchText, setSearchText] = useState('');
  const [exporting, setExporting] = useState(false);

  const { data: events = [], isLoading } = useQuery<ChangeEvent[]>({
    queryKey: ['change-events'],
    queryFn: () => changeEvents.list().then((res) => res.data),
  });

  const customers = useMemo(() => {
    const set = new Set(events.map((e) => e.customer || '').filter(Boolean));
    return Array.from(set).sort();
  }, [events]);

  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: events.length };
    events.forEach((e) => { counts[e.status] = (counts[e.status] || 0) + 1; });
    return counts;
  }, [events]);

  const filtered = useMemo(() => {
    return events.filter((e) => {
      if (dateFrom && e.occurredDate < dateFrom) return false;
      if (dateTo && e.occurredDate > dateTo + 'T23:59:59') return false;
      if (statusFilter !== 'ALL' && e.status !== statusFilter) return false;
      if (customerFilter !== 'ALL' && (e.customer || '') !== customerFilter) return false;
      if (searchText) {
        const s = searchText.toLowerCase();
        return (e.customer || '').toLowerCase().includes(s) ||
          (e.project || '').toLowerCase().includes(s) ||
          (e.department || '').toLowerCase().includes(s) ||
          (e.description || '').toLowerCase().includes(s) ||
          (e.partNumber || '').toLowerCase().includes(s);
      }
      return true;
    });
  }, [events, dateFrom, dateTo, statusFilter, customerFilter, searchText]);

  const hasFilters = dateFrom || dateTo || statusFilter !== 'ALL' || customerFilter !== 'ALL' || searchText;

  const handleExcelExport = () => {
    setExporting(true);
    try {
      // 목록 테이블 구조와 동일하게 내보내기
      const headers = ['NO', '발생일', '대분류', '중분류', '세부항목', '발생부서', '담당자', '고객사', '프로젝트', '공장', '품번', '협력사', '조치시점', '조치방안', '조치결과', '품질검증', '상태', '품명', '변경상세내용'];
      const rows = filtered.map((e, i) => {
        const ev = e as any;
        return [
          i + 1,
          formatDate(e.occurredDate),
          ev.primaryItem?.category?.class?.name || '-',
          ev.primaryItem?.category?.name || '-',
          ev.primaryItem?.name || '-',
          e.department || '-',
          ev.manager?.name || ev.createdBy?.name || '-',
          e.customer || '-',
          e.project || '-',
          e.factory || '-',
          e.partNumber || '-',
          ev.company?.name || '-',
          ev.actionDate ? formatDate(ev.actionDate) : '미입력',
          ev.actionPlan || '미입력',
          ev.actionResult || '미입력',
          ev.qualityVerification || '미입력',
          getStatusText(e.status),
          e.productName || '-',
          (e.description || '').replace(/\n/g, ' ').slice(0, 200),
        ].map((v) => `"${v}"`).join(',');
      });
      const bom = '\uFEFF';
      const csv = bom + headers.join(',') + '\n' + rows.join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `변동점_발생현황_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } finally { setExporting(false); }
  };

  return (
    <div className="space-y-5">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">변동점 발생현황</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            필수 작성 항목 (발생 & 조치결과) · <span className="font-bold text-primary">{events.length}</span>건
          </p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={handleExcelExport} disabled={exporting || filtered.length === 0}>
            <FileSpreadsheet className="mr-1.5 h-3.5 w-3.5" />
            <span className="hidden sm:inline">엑셀 ({filtered.length}건)</span>
            <span className="sm:hidden">{filtered.length}</span>
          </Button>
          <Button size="sm" onClick={() => router.push('/change-events/new')}>
            <Plus className="mr-1 h-4 w-4" />
            <span className="hidden sm:inline">변동점 등록</span>
            <span className="sm:hidden">등록</span>
          </Button>
        </div>
      </div>

      {/* 필터 */}
      <div className="overflow-x-auto rounded-xl border border-gray-100 bg-gray-50/30 dark:border-gray-800 dark:bg-gray-800/20">
        <div className="flex items-center gap-2 px-3 py-2.5 min-w-max sm:px-4 sm:py-3">
          <Filter className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground/50" />
          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
            className="h-8 rounded-lg border border-input bg-white px-2 text-[11px] focus:outline-none focus:ring-1 focus:ring-ring/40 dark:bg-gray-900 w-[115px]" />
          <span className="text-[10px] text-muted-foreground">~</span>
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
            className="h-8 rounded-lg border border-input bg-white px-2 text-[11px] focus:outline-none focus:ring-1 focus:ring-ring/40 dark:bg-gray-900 w-[115px]" />
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
            className="h-8 rounded-lg border border-input bg-white px-2 text-[11px] focus:outline-none focus:ring-1 focus:ring-ring/40 dark:bg-gray-900">
            <option value="ALL">전체 ({statusCounts.ALL || 0})</option>
            <option value="DRAFT">임시저장 ({statusCounts.DRAFT || 0})</option>
            <option value="SUBMITTED">제출 ({statusCounts.SUBMITTED || 0})</option>
            <option value="REVIEW_RETURNED">보완 ({statusCounts.REVIEW_RETURNED || 0})</option>
            <option value="REVIEWED">검토 ({statusCounts.REVIEWED || 0})</option>
            <option value="APPROVED">승인 ({statusCounts.APPROVED || 0})</option>
            <option value="CLOSED">종결 ({statusCounts.CLOSED || 0})</option>
          </select>
          <select value={customerFilter} onChange={(e) => setCustomerFilter(e.target.value)}
            className="h-8 rounded-lg border border-input bg-white px-2 text-[11px] focus:outline-none focus:ring-1 focus:ring-ring/40 dark:bg-gray-900">
            <option value="ALL">전체 고객사</option>
            {customers.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <div className="relative">
            <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground/40" />
            <input value={searchText} onChange={(e) => setSearchText(e.target.value)} placeholder="검색..."
              className="h-8 w-[100px] rounded-lg border border-input bg-white pl-6 pr-2 text-[11px] focus:outline-none focus:ring-1 focus:ring-ring/40 dark:bg-gray-900 sm:w-[180px]" />
          </div>
          {hasFilters && (
            <button onClick={() => { setDateFrom(''); setDateTo(''); setStatusFilter('ALL'); setCustomerFilter('ALL'); setSearchText(''); }}
              className="text-[10px] text-primary hover:underline whitespace-nowrap">초기화</button>
          )}
          <span className="ml-auto text-[10px] text-muted-foreground whitespace-nowrap">{filtered.length}건</span>
        </div>
      </div>

      {/* 테이블 */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-gray-200 bg-gray-50/30 py-20 text-center dark:border-gray-800 dark:bg-gray-900/20">
          <FileText className="mb-3 h-10 w-10 text-muted-foreground/20" />
          <p className="text-sm font-medium text-muted-foreground">
            {hasFilters ? '조건에 맞는 변동점이 없습니다' : '등록된 변동점이 없습니다'}
          </p>
          {hasFilters ? (
            <button onClick={() => { setDateFrom(''); setDateTo(''); setStatusFilter('ALL'); setCustomerFilter('ALL'); setSearchText(''); }}
              className="mt-2 text-xs text-primary hover:underline">필터 초기화</button>
          ) : (
            <Button size="sm" variant="outline" className="mt-3" onClick={() => router.push('/change-events/new')}>
              <Plus className="mr-1 h-3.5 w-3.5" />첫 변동점 등록하기
            </Button>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-white/60 bg-white/70 shadow-sm backdrop-blur-xl dark:border-gray-800/60 dark:bg-gray-900/70">
          <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-280px)]">
            <table className="w-full min-w-[1600px] text-xs border-collapse">
              <thead className="sticky top-0 z-10">
                <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/60">
                  <th className="whitespace-nowrap px-2 py-2.5 text-center text-[10px] font-bold uppercase text-muted-foreground w-8 border-r border-gray-200">NO</th>
                  <th className="whitespace-nowrap px-2 py-2.5 text-center text-[10px] font-bold uppercase text-blue-600 border-r border-gray-200" colSpan={6}>발생내역</th>
                  <th className="whitespace-nowrap px-2 py-2.5 text-center text-[10px] font-bold uppercase text-gray-500 border-r border-gray-200" colSpan={5}>기본정보</th>
                  <th className="whitespace-nowrap px-2 py-2.5 text-center text-[10px] font-bold uppercase text-amber-600 border-r border-gray-200" colSpan={4}>조치결과</th>
                  <th className="whitespace-nowrap px-2 py-2.5 text-center text-[10px] font-bold uppercase text-muted-foreground w-14">상태</th>
                </tr>
                <tr className="border-b border-gray-200 bg-gray-50/80 dark:border-gray-700 dark:bg-gray-800/40">
                  <th className="px-2 py-1.5 border-r border-gray-200"></th>
                  <th className="whitespace-nowrap px-2 py-1.5 text-center text-[9px] font-semibold text-blue-500/80">발생일</th>
                  <th className="whitespace-nowrap px-2 py-1.5 text-center text-[9px] font-semibold text-blue-500/80">대분류</th>
                  <th className="whitespace-nowrap px-2 py-1.5 text-center text-[9px] font-semibold text-blue-500/80">중분류</th>
                  <th className="whitespace-nowrap px-2 py-1.5 text-center text-[9px] font-semibold text-blue-500/80">세부항목</th>
                  <th className="whitespace-nowrap px-2 py-1.5 text-center text-[9px] font-semibold text-blue-500/80">발생부서</th>
                  <th className="whitespace-nowrap px-2 py-1.5 text-center text-[9px] font-semibold text-blue-500/80 border-r border-gray-200">담당자</th>
                  <th className="whitespace-nowrap px-2 py-1.5 text-center text-[9px] font-semibold text-gray-400">고객사</th>
                  <th className="whitespace-nowrap px-2 py-1.5 text-center text-[9px] font-semibold text-gray-400">프로젝트</th>
                  <th className="whitespace-nowrap px-2 py-1.5 text-center text-[9px] font-semibold text-gray-400">공장</th>
                  <th className="whitespace-nowrap px-2 py-1.5 text-center text-[9px] font-semibold text-gray-400">품번</th>
                  <th className="whitespace-nowrap px-2 py-1.5 text-center text-[9px] font-semibold text-gray-400 border-r border-gray-200">협력사</th>
                  <th className="whitespace-nowrap px-2 py-1.5 text-center text-[9px] font-semibold text-amber-500/80">조치시점</th>
                  <th className="whitespace-nowrap px-2 py-1.5 text-center text-[9px] font-semibold text-amber-500/80">조치방안</th>
                  <th className="whitespace-nowrap px-2 py-1.5 text-center text-[9px] font-semibold text-amber-500/80">조치결과</th>
                  <th className="whitespace-nowrap px-2 py-1.5 text-center text-[9px] font-semibold text-amber-500/80 border-r border-gray-200">품질검증</th>
                  <th className="px-2 py-1.5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800/50">
                {filtered.map((event, idx) => {
                  const e = event as any;
                  return (
                    <tr key={event.id}
                      className={`cursor-pointer transition-colors hover:bg-blue-50/40 dark:hover:bg-blue-900/10 ${idx % 2 === 0 ? 'bg-white dark:bg-gray-900/40' : 'bg-gray-50/30 dark:bg-gray-800/20'}`}
                      onClick={() => router.push(`/change-events/${event.id}`)}>
                      <td className="whitespace-nowrap px-2 py-2.5 text-center text-[10px] font-bold text-muted-foreground/40 border-r border-gray-100">{idx + 1}</td>
                      <td className="whitespace-nowrap px-2 py-2.5 text-center font-medium">{formatDate(event.occurredDate).slice(5)}</td>
                      <TipCell tip={e.primaryItem?.category?.class?.name || ''} className="max-w-[80px] truncate px-2 py-2.5 text-center text-[10px]">{e.primaryItem?.category?.class?.name || '-'}</TipCell>
                      <TipCell tip={e.primaryItem?.category?.name || ''} className="max-w-[80px] truncate px-2 py-2.5 text-center text-[10px] font-medium">{e.primaryItem?.category?.name || '-'}</TipCell>
                      <TipCell tip={e.primaryItem?.name || ''} className="max-w-[90px] truncate px-2 py-2.5 text-center text-[10px]">{e.primaryItem?.name || '-'}</TipCell>
                      <td className="whitespace-nowrap px-2 py-2.5 text-center">{event.department || '-'}</td>
                      <td className="whitespace-nowrap px-2 py-2.5 text-center border-r border-gray-100">{e.manager?.name || e.createdBy?.name || '-'}</td>
                      <TipCell tip={event.customer || ''} className="max-w-[70px] truncate px-2 py-2.5 text-center text-muted-foreground">{event.customer || '-'}</TipCell>
                      <TipCell tip={event.project || ''} className="max-w-[80px] truncate px-2 py-2.5 text-center text-muted-foreground">{event.project || '-'}</TipCell>
                      <td className="whitespace-nowrap px-2 py-2.5 text-center text-muted-foreground">{event.factory || '-'}</td>
                      <td className="whitespace-nowrap px-2 py-2.5 text-center font-mono text-[10px] text-muted-foreground">{event.partNumber || '-'}</td>
                      <TipCell tip={e.company?.name || ''} className="max-w-[70px] truncate px-2 py-2.5 text-center text-muted-foreground border-r border-gray-100">{e.company?.name || '-'}</TipCell>
                      <td className={`whitespace-nowrap px-2 py-2.5 text-center ${!e.actionDate ? 'text-red-400 font-medium' : 'text-emerald-700 dark:text-emerald-400'}`}>
                        {e.actionDate ? formatDate(e.actionDate).slice(5) : '미입력'}
                      </td>
                      <TipCell tip={e.actionPlan || ''} className={`max-w-[100px] truncate px-2 py-2.5 text-center ${!e.actionPlan ? 'text-red-400 font-medium' : ''}`}>{e.actionPlan || '미입력'}</TipCell>
                      <TipCell tip={e.actionResult || ''} className={`max-w-[100px] truncate px-2 py-2.5 text-center ${!e.actionResult ? 'text-red-400 font-medium' : ''}`}>{e.actionResult || '미입력'}</TipCell>
                      <TipCell tip={e.qualityVerification || ''} className={`max-w-[80px] truncate px-2 py-2.5 text-center border-r border-gray-100 ${!e.qualityVerification ? 'text-red-400 font-medium' : ''}`}>{e.qualityVerification || '미입력'}</TipCell>
                      <td className="whitespace-nowrap px-2 py-2 text-center">
                        <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${getStatusBadgeClass(event.status)}`}>{getStatusText(event.status)}</span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
