'use client';

import { Suspense, useMemo, useRef, useState } from 'react';
import { changeEvents } from '@/lib/api-client';
import { useQuery } from '@tanstack/react-query';
import { ChangeEvent } from '@/types';
import { formatDate, getStatusText, getStatusBadgeClass } from '@/lib/utils';
import { useSearchParams } from 'next/navigation';
import { Printer, ArrowLeft, TrendingUp, BarChart3, FileText, Users } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, ResponsiveContainer,
  PieChart, Pie, Cell, LabelList,
} from 'recharts';

const COLORS = ['#6366f1', '#22c55e', '#f59e0b', '#ef4444', '#a855f7', '#06b6d4', '#ec4899', '#64748b'];

export default function ReportPage() {
  return <Suspense fallback={<div className="flex items-center justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>}><ReportContent /></Suspense>;
}

function ReportContent() {
  const searchParams = useSearchParams();
  const now = new Date();
  const [year, setYear] = useState(searchParams.get('year') || now.getFullYear().toString());
  const [month, setMonth] = useState(searchParams.get('month') || (now.getMonth() + 1).toString());

  const { data: events = [] } = useQuery<ChangeEvent[]>({
    queryKey: ['change-events'],
    queryFn: () => changeEvents.list().then((r) => r.data),
  });

  const periodLabel = `${year}년 ${month.padStart(2, '0')}월`;
  const periodKey = `${year}-${month.padStart(2, '0')}`;
  const filtered = useMemo(() => events.filter((e) => e.receiptMonth === periodKey), [events, periodKey]);

  const prevKey = useMemo(() => {
    const m = parseInt(month) - 1;
    if (m <= 0) return `${parseInt(year) - 1}-12`;
    return `${year}-${String(m).padStart(2, '0')}`;
  }, [year, month]);
  const prevFiltered = useMemo(() => events.filter((e) => e.receiptMonth === prevKey), [events, prevKey]);

  const stats = useMemo(() => {
    const total = filtered.length;
    const prevTotal = prevFiltered.length;
    const approved = filtered.filter((e) => e.status === 'APPROVED' || e.status === 'CLOSED').length;
    const pending = filtered.filter((e) => ['DRAFT', 'SUBMITTED', 'CONFIRMED'].includes(e.status)).length;
    const returned = filtered.filter((e) => e.status === 'REVIEW_RETURNED').length;
    const reviewed = filtered.filter((e) => e.status === 'REVIEWED').length;
    const actionFilled = filtered.filter((e) => (e as any).actionPlan && (e as any).actionResult).length;

    const byStatus: Record<string, number> = {};
    const byCustomer: Record<string, number> = {};
    const byCompany: Record<string, number> = {};
    const byClass: Record<string, number> = {};
    const byDept: Record<string, number> = {};
    filtered.forEach((e: any) => {
      byStatus[getStatusText(e.status)] = (byStatus[getStatusText(e.status)] || 0) + 1;
      byCustomer[e.customer || '미지정'] = (byCustomer[e.customer || '미지정'] || 0) + 1;
      byCompany[e.company?.name || '미지정'] = (byCompany[e.company?.name || '미지정'] || 0) + 1;
      byClass[e.primaryItem?.category?.class?.name || '미분류'] = (byClass[e.primaryItem?.category?.class?.name || '미분류'] || 0) + 1;
      byDept[e.department || '미지정'] = (byDept[e.department || '미지정'] || 0) + 1;
    });

    const trend = prevTotal > 0 ? Math.round(((total - prevTotal) / prevTotal) * 100) : 0;

    return { total, prevTotal, trend, approved, pending, returned, reviewed, actionFilled,
      approvalRate: total ? Math.round((approved / total) * 100) : 0,
      actionRate: total ? Math.round((actionFilled / total) * 100) : 0,
      statusData: Object.entries(byStatus).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value),
      customerData: Object.entries(byCustomer).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
      companyData: Object.entries(byCompany).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
      classData: Object.entries(byClass).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
      deptData: Object.entries(byDept).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
    };
  }, [filtered, prevFiltered]);

  return (
    <div className="min-h-screen bg-gray-50 report-root">
      {/* 네비게이션 헤더 */}
      <div className="no-print sticky top-0 z-50 border-b bg-white/95 backdrop-blur-sm shadow-sm">
        <div className="mx-auto max-w-[900px] flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <button onClick={() => window.history.back()} className="rounded-lg p-2 hover:bg-gray-100 transition-colors"><ArrowLeft className="h-5 w-5" /></button>
            <div>
              <h1 className="text-lg font-bold">변동점 관리 리포트</h1>
              <p className="text-xs text-muted-foreground">{periodLabel}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <select value={year} onChange={(e) => setYear(e.target.value)} className="h-9 rounded-lg border border-gray-200 px-3 text-sm bg-white">
              {[2024, 2025, 2026].map((y) => <option key={y} value={y}>{y}년</option>)}
            </select>
            <select value={month} onChange={(e) => setMonth(e.target.value)} className="h-9 rounded-lg border border-gray-200 px-3 text-sm bg-white">
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => <option key={m} value={m}>{m}월</option>)}
            </select>
            <button onClick={() => window.print()} className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 shadow-sm">
              <Printer className="h-4 w-4" />인쇄
            </button>
          </div>
        </div>
      </div>

      {/* ===== 페이지 1: 요약 + 차트 + 분포 ===== */}
      <div className="print-page mx-auto max-w-[900px] bg-white my-6 rounded-2xl shadow-lg print-container">
        <div className="px-10 py-8 print-inner">

          {/* 표지 헤더 */}
          <header className="mb-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-primary/60">Change Point Management Report</p>
                <h1 className="mt-1 text-2xl font-extrabold tracking-tight text-gray-900">변동점 관리 월간 리포트</h1>
                <p className="mt-1 text-base font-medium text-gray-500">{periodLabel}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-gray-700">(주)캠스</p>
                <p className="text-xs text-gray-400">품질관리부</p>
                <p className="mt-1 text-[10px] text-gray-300">{now.toLocaleDateString('ko-KR')} 발행</p>
              </div>
            </div>
            <div className="mt-3 h-0.5 rounded-full bg-gradient-to-r from-primary via-primary/50 to-transparent" />
          </header>

          {/* 1. 핵심 지표 */}
          <section className="mb-5">
            <SectionTitle icon={TrendingUp} number={1} title="핵심 지표" />
            <div className="grid grid-cols-4 gap-2 mt-3">
              <KpiCard label="총 발생" value={stats.total} unit="건" trend={stats.trend} color="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200" />
              <KpiCard label="승인 완료" value={stats.approved} unit="건" sub={`승인율 ${stats.approvalRate}%`} color="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200" />
              <KpiCard label="조치 입력" value={stats.actionFilled} unit="건" sub={`완료율 ${stats.actionRate}%`} color="bg-gradient-to-br from-cyan-50 to-sky-50 border-cyan-200" />
              <KpiCard label="미처리" value={stats.pending} unit="건" sub={`보완요청 ${stats.returned}건`} color="bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200" alert={stats.pending > 0} />
            </div>
          </section>

          {/* 2. 시각화 분석 (축소) */}
          <section className="mb-5">
            <SectionTitle icon={BarChart3} number={2} title="시각화 분석" />
            <div className="grid grid-cols-2 gap-3 mt-3">
              {/* 상태별 분포 - 텍스트 기반 */}
              <div className="rounded-lg border p-3">
                <h3 className="mb-2 text-[10px] font-bold text-gray-600">상태별 분포</h3>
                {stats.statusData.length > 0 ? (
                  <div className="space-y-1">
                    {stats.statusData.map((d, i) => (
                      <div key={d.name} className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                        <span className="text-[10px] text-gray-600 flex-1">{d.name}</span>
                        <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${stats.total ? (d.value / stats.total) * 100 : 0}%`, backgroundColor: COLORS[i % COLORS.length] }} />
                        </div>
                        <span className="text-[10px] font-bold text-gray-800 w-6 text-right">{d.value}</span>
                      </div>
                    ))}
                  </div>
                ) : <p className="py-4 text-center text-[10px] text-gray-300">데이터 없음</p>}
              </div>

              {/* 분류별 */}
              <div className="rounded-lg border p-3">
                <h3 className="mb-2 text-[10px] font-bold text-gray-600">변동점 분류별</h3>
                {stats.classData.length > 0 ? (
                  <div className="space-y-1">
                    {stats.classData.map((d, i) => (
                      <div key={d.name} className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[(i + 2) % COLORS.length] }} />
                        <span className="text-[10px] text-gray-600 flex-1 truncate">{d.name}</span>
                        <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${stats.total ? (d.count / stats.total) * 100 : 0}%`, backgroundColor: COLORS[(i + 2) % COLORS.length] }} />
                        </div>
                        <span className="text-[10px] font-bold text-gray-800 w-6 text-right">{d.count}</span>
                      </div>
                    ))}
                  </div>
                ) : <p className="py-4 text-center text-[10px] text-gray-300">데이터 없음</p>}
              </div>

              {/* 협력사별 */}
              <div className="rounded-lg border p-3">
                <h3 className="mb-2 text-[10px] font-bold text-gray-600">협력사별</h3>
                {stats.companyData.length > 0 ? (
                  <div className="space-y-1">
                    {stats.companyData.slice(0, 5).map((d, i) => (
                      <div key={d.name} className="flex items-center gap-2">
                        <span className="text-[10px] text-gray-600 w-16 truncate flex-shrink-0">{d.name}</span>
                        <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full bg-indigo-500" style={{ width: `${stats.total ? (d.count / stats.total) * 100 : 0}%` }} />
                        </div>
                        <span className="text-[10px] font-bold text-gray-800 w-6 text-right">{d.count}</span>
                      </div>
                    ))}
                  </div>
                ) : <p className="py-4 text-center text-[10px] text-gray-300">데이터 없음</p>}
              </div>

              {/* 발생부서별 */}
              <div className="rounded-lg border p-3">
                <h3 className="mb-2 text-[10px] font-bold text-gray-600">발생부서별</h3>
                {stats.deptData.length > 0 ? (
                  <div className="space-y-1">
                    {stats.deptData.slice(0, 5).map((d, i) => (
                      <div key={d.name} className="flex items-center gap-2">
                        <span className="text-[10px] text-gray-600 w-16 truncate flex-shrink-0">{d.name}</span>
                        <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                          <div className="h-full rounded-full bg-pink-500" style={{ width: `${stats.total ? (d.count / stats.total) * 100 : 0}%` }} />
                        </div>
                        <span className="text-[10px] font-bold text-gray-800 w-6 text-right">{d.count}</span>
                      </div>
                    ))}
                  </div>
                ) : <p className="py-4 text-center text-[10px] text-gray-300">데이터 없음</p>}
              </div>
            </div>
          </section>

          {/* 3. 분포 상세 */}
          <section className="mb-4">
            <SectionTitle icon={Users} number={3} title="분포 상세" />
            <div className="grid grid-cols-4 gap-3 mt-3">
              {[
                { title: '고객사별', data: stats.customerData, keyName: '고객사' },
                { title: '협력사별', data: stats.companyData, keyName: '협력사' },
                { title: '분류별', data: stats.classData, keyName: '분류' },
                { title: '부서별', data: stats.deptData, keyName: '부서' },
              ].map((sec) => (
                <div key={sec.title}>
                  <h4 className="mb-1 text-[10px] font-bold text-gray-700">{sec.title}</h4>
                  <table className="w-full text-[9px]">
                    <thead>
                      <tr className="border-b border-gray-200">
                        <th className="py-1 text-left font-semibold text-gray-500">{sec.keyName}</th>
                        <th className="py-1 text-right w-8 font-semibold text-gray-500">건</th>
                        <th className="py-1 text-right w-8 font-semibold text-gray-500">%</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sec.data.slice(0, 5).map((d: any) => (
                        <tr key={d.name} className="border-b border-gray-50">
                          <td className="py-0.5 truncate max-w-[80px] text-gray-700">{d.name}</td>
                          <td className="py-0.5 text-right font-semibold">{d.count}</td>
                          <td className="py-0.5 text-right text-gray-400">{stats.total ? Math.round((d.count / stats.total) * 100) : 0}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
            </div>
          </section>

          <footer className="border-t pt-2 text-center">
            <p className="text-[8px] text-gray-300">1 / 2 · (주)캠스 변동점 관리시스템</p>
          </footer>
        </div>
      </div>

      {/* ===== 페이지 2: 상세 목록 ===== */}
      <div className="print-page mx-auto max-w-[900px] bg-white mb-6 rounded-2xl shadow-lg print-container">
        <div className="px-10 py-8 print-inner">

          <header className="mb-4 flex items-center justify-between">
            <div>
              <h1 className="text-lg font-extrabold text-gray-900">변동점 관리 월간 리포트</h1>
              <p className="text-xs text-gray-400">{periodLabel} · 변동점 발생현황 리스트</p>
            </div>
            <div className="text-right text-[10px] text-gray-400">
              <p>(주)캠스 품질관리부</p>
              <p>{now.toLocaleDateString('ko-KR')}</p>
            </div>
          </header>
          <div className="h-0.5 rounded-full bg-gradient-to-r from-primary via-primary/50 to-transparent mb-4" />

          <section>
            <SectionTitle icon={FileText} number={4} title={`변동점 발생현황 리스트 (${filtered.length}건)`} />
            <div className="mt-3 overflow-x-auto">
              <table className="w-full text-[9px] border-collapse">
                <thead>
                  <tr className="border-b-2 border-gray-300 bg-gray-50">
                    <th className="px-1.5 py-1.5 text-center w-6 font-bold text-gray-500 border-r border-gray-200" rowSpan={2}>NO</th>
                    <th className="px-1.5 py-1 text-center font-bold text-blue-600 border-r border-gray-200" colSpan={4}>발생내역</th>
                    <th className="px-1.5 py-1 text-center font-bold text-amber-600 border-r border-gray-200" colSpan={4}>조치결과</th>
                    <th className="px-1.5 py-1.5 text-center w-12 font-bold text-gray-500" rowSpan={2}>상태</th>
                  </tr>
                  <tr className="border-b border-gray-200 bg-gray-50/60">
                    <th className="px-1.5 py-0.5 text-center text-[8px] font-semibold text-blue-500/80">발생일</th>
                    <th className="px-1.5 py-0.5 text-center text-[8px] font-semibold text-blue-500/80">발생항목</th>
                    <th className="px-1.5 py-0.5 text-center text-[8px] font-semibold text-blue-500/80">발생부서</th>
                    <th className="px-1.5 py-0.5 text-center text-[8px] font-semibold text-blue-500/80 border-r border-gray-200">담당자</th>
                    <th className="px-1.5 py-0.5 text-center text-[8px] font-semibold text-amber-500/80">조치시점</th>
                    <th className="px-1.5 py-0.5 text-center text-[8px] font-semibold text-amber-500/80">조치방안</th>
                    <th className="px-1.5 py-0.5 text-center text-[8px] font-semibold text-amber-500/80">조치결과</th>
                    <th className="px-1.5 py-0.5 text-center text-[8px] font-semibold text-amber-500/80 border-r border-gray-200">품질검증</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((event, idx) => {
                    const e = event as any;
                    return (
                      <tr key={event.id} className={`border-b border-gray-100 ${idx % 2 === 1 ? 'bg-gray-50/40' : ''}`}>
                        <td className="px-1 py-1 text-center text-gray-400 font-medium border-r border-gray-100">{idx + 1}</td>
                        <td className="px-1 py-1 text-center whitespace-nowrap">{formatDate(event.occurredDate).slice(5)}</td>
                        <td className="px-1 py-1 text-center truncate max-w-[70px]">{e.primaryItem?.name || '-'}</td>
                        <td className="px-1 py-1 text-center">{event.department || '-'}</td>
                        <td className="px-1 py-1 text-center border-r border-gray-100">{e.manager?.name || e.createdBy?.name || '-'}</td>
                        <td className={`px-1 py-1 text-center whitespace-nowrap ${!e.actionDate ? 'text-red-400' : ''}`}>{e.actionDate ? formatDate(e.actionDate).slice(5) : '미입력'}</td>
                        <td className={`px-1 py-1 text-center truncate max-w-[60px] ${!e.actionPlan ? 'text-red-400' : ''}`}>{e.actionPlan || '미입력'}</td>
                        <td className={`px-1 py-1 text-center truncate max-w-[60px] ${!e.actionResult ? 'text-red-400' : ''}`}>{e.actionResult || '미입력'}</td>
                        <td className={`px-1 py-1 text-center truncate max-w-[50px] border-r border-gray-100 ${!e.qualityVerification ? 'text-red-400' : ''}`}>{e.qualityVerification || '미입력'}</td>
                        <td className="px-1 py-1 text-center">
                          <span className={`inline-block rounded-full px-1 py-0.5 text-[7px] font-bold ${getStatusBadgeClass(event.status)}`}>{getStatusText(event.status)}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {filtered.length === 0 && <p className="py-8 text-center text-xs text-gray-400">해당 기간 데이터가 없습니다</p>}
            </div>
          </section>

          <footer className="border-t pt-3 mt-4 text-center">
            <p className="text-[8px] text-gray-300">2 / 2 · 본 리포트는 변동점 관리시스템(CPMS)에서 자동 생성되었습니다.</p>
            <p className="text-[8px] text-gray-300">(주)캠스 품질관리부 · {now.toLocaleDateString('ko-KR')} 발행</p>
          </footer>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }
          body { background: white !important; margin: 0 !important; padding: 0 !important; }
          .no-print { display: none !important; }
          .report-root { background: white !important; }
          .print-container {
            margin: 0 !important; padding: 0 !important;
            box-shadow: none !important; border-radius: 0 !important;
            max-width: 100% !important;
          }
          .print-inner { padding: 8mm 10mm !important; }
          .print-page { page-break-after: always; break-after: page; }
          .print-page:last-child { page-break-after: auto; break-after: auto; }
          @page { margin: 8mm; size: A4; }
          /* 바 차트 색상 보존 */
          .recharts-bar-rectangle path, .recharts-pie-sector path,
          div[class*="bg-gradient"], div[class*="bg-blue"], div[class*="bg-green"],
          div[class*="bg-cyan"], div[class*="bg-amber"], div[class*="bg-indigo"],
          div[class*="bg-pink"], div[class*="rounded-full"] {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>
    </div>
  );
}

/* ── 서브 컴포넌트 ── */

function SectionTitle({ icon: Icon, number, title }: { icon: any; number: number; title: string }) {
  return (
    <div className="flex items-center gap-2 border-b-2 border-primary/20 pb-1.5">
      <div className="flex h-5 w-5 items-center justify-center rounded bg-primary/10">
        <Icon className="h-3 w-3 text-primary" />
      </div>
      <h2 className="text-sm font-bold text-gray-900">
        <span className="text-primary mr-1">{number}.</span>{title}
      </h2>
    </div>
  );
}

function KpiCard({ label, value, unit, trend, sub, color, alert }: {
  label: string; value: number; unit: string; trend?: number; sub?: string; color: string; alert?: boolean;
}) {
  return (
    <div className={`rounded-lg border p-3 ${color}`}>
      <p className="text-[9px] font-semibold uppercase tracking-wider text-gray-500">{label}</p>
      <div className="mt-0.5 flex items-baseline gap-1">
        <span className={`text-xl font-extrabold ${alert ? 'text-amber-600' : 'text-gray-900'}`}>{value}</span>
        <span className="text-xs text-gray-400">{unit}</span>
        {trend !== undefined && trend !== 0 && (
          <span className={`ml-auto text-[9px] font-bold ${trend > 0 ? 'text-red-500' : 'text-green-500'}`}>
            {trend > 0 ? '+' : ''}{trend}%
          </span>
        )}
      </div>
      {sub && <p className="mt-0.5 text-[9px] text-gray-400">{sub}</p>}
    </div>
  );
}
