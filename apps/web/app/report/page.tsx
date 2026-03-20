'use client';

import { Suspense, useMemo, useState } from 'react';
import { changeEvents } from '@/lib/api-client';
import { useQuery } from '@tanstack/react-query';
import { ChangeEvent } from '@/types';
import { formatDate, getStatusText, getStatusBadgeClass } from '@/lib/utils';
import { useSearchParams } from 'next/navigation';
import { Printer, ArrowLeft, Calendar, TrendingUp, BarChart3, FileText, CheckCircle2, AlertTriangle, Clock, Users } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
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

  // 전월 데이터 (비교용)
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
    const qvFilled = filtered.filter((e) => (e as any).qualityVerification).length;

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

    return { total, prevTotal, trend, approved, pending, returned, reviewed, actionFilled, qvFilled,
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
    <div className="min-h-screen bg-gray-50">
      {/* 네비게이션 헤더 (프린트 시 숨김) */}
      <div className="print:hidden sticky top-0 z-50 border-b bg-white/95 backdrop-blur-sm shadow-sm">
        <div className="mx-auto max-w-[900px] flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <button onClick={() => window.history.back()} className="rounded-lg p-2 hover:bg-gray-100 transition-colors"><ArrowLeft className="h-5 w-5" /></button>
            <div>
              <h1 className="text-lg font-bold">변동점 관리 리포트</h1>
              <p className="text-xs text-muted-foreground">{periodLabel}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <select value={year} onChange={(e) => setYear(e.target.value)} className="h-9 rounded-lg border border-gray-200 px-3 text-sm bg-white focus:ring-2 focus:ring-primary/20 focus:outline-none">
              {[2024, 2025, 2026].map((y) => <option key={y} value={y}>{y}년</option>)}
            </select>
            <select value={month} onChange={(e) => setMonth(e.target.value)} className="h-9 rounded-lg border border-gray-200 px-3 text-sm bg-white focus:ring-2 focus:ring-primary/20 focus:outline-none">
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => <option key={m} value={m}>{m}월</option>)}
            </select>
            <button onClick={() => window.print()} className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90 transition-colors shadow-sm">
              <Printer className="h-4 w-4" />인쇄
            </button>
          </div>
        </div>
      </div>

      {/* A4 보고서 본문 */}
      <div className="mx-auto max-w-[900px] bg-white my-6 rounded-2xl shadow-lg print:my-0 print:shadow-none print:rounded-none">
        <div className="px-10 py-8 print:px-8 print:py-6">

          {/* 표지 헤더 */}
          <header className="mb-10 print:mb-8">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-medium uppercase tracking-[0.3em] text-primary/60">Change Point Management Report</p>
                <h1 className="mt-2 text-3xl font-extrabold tracking-tight text-gray-900">변동점 관리 월간 리포트</h1>
                <p className="mt-1.5 text-lg font-medium text-gray-500">{periodLabel}</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-semibold text-gray-700">(주)캠스</p>
                <p className="text-xs text-gray-400">품질관리부</p>
                <p className="mt-1 text-[10px] text-gray-300">{now.toLocaleDateString('ko-KR')} 발행</p>
              </div>
            </div>
            <div className="mt-4 h-1 rounded-full bg-gradient-to-r from-primary via-primary/50 to-transparent" />
          </header>

          {/* 1. 핵심 지표 */}
          <section className="mb-10 print:break-inside-avoid print:mb-8">
            <SectionTitle icon={TrendingUp} number={1} title="핵심 지표" />
            <div className="grid grid-cols-4 gap-3 mt-4">
              <KpiCard label="총 발생" value={stats.total} unit="건" trend={stats.trend} color="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200" />
              <KpiCard label="승인 완료" value={stats.approved} unit="건" sub={`승인율 ${stats.approvalRate}%`} color="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200" />
              <KpiCard label="조치 입력" value={stats.actionFilled} unit="건" sub={`완료율 ${stats.actionRate}%`} color="bg-gradient-to-br from-cyan-50 to-sky-50 border-cyan-200" />
              <KpiCard label="미처리" value={stats.pending} unit="건" sub={`보완요청 ${stats.returned}건`} color="bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200" alert={stats.pending > 0} />
            </div>
          </section>

          {/* 2. 시각화 분석 */}
          <section className="mb-10 print:break-inside-avoid print:mb-8">
            <SectionTitle icon={BarChart3} number={2} title="시각화 분석" />
            <div className="grid grid-cols-2 gap-4 mt-4">
              <ChartCard title="상태별 분포">
                {stats.statusData.length > 0 ? (
                  <div className="flex items-center gap-2">
                    <ResponsiveContainer width="50%" height={150}>
                      <PieChart><Pie data={stats.statusData} cx="50%" cy="50%" innerRadius={35} outerRadius={60} paddingAngle={2} dataKey="value">
                        {stats.statusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie></PieChart>
                    </ResponsiveContainer>
                    <div className="flex-1 space-y-1.5">
                      {stats.statusData.map((d, i) => (
                        <div key={d.name} className="flex items-center gap-2 text-xs">
                          <div className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                          <span className="text-gray-600 flex-1">{d.name}</span>
                          <span className="font-bold text-gray-800">{d.value}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : <EmptyState />}
              </ChartCard>

              <ChartCard title="변동점 분류별">
                {stats.classData.length > 0 ? (
                  <div className="flex items-center gap-2">
                    <ResponsiveContainer width="50%" height={150}>
                      <PieChart><Pie data={stats.classData} cx="50%" cy="50%" outerRadius={60} paddingAngle={2} dataKey="count">
                        {stats.classData.map((_, i) => <Cell key={i} fill={COLORS[(i + 2) % COLORS.length]} />)}
                      </Pie></PieChart>
                    </ResponsiveContainer>
                    <div className="flex-1 space-y-1.5">
                      {stats.classData.map((d, i) => (
                        <div key={d.name} className="flex items-center gap-2 text-xs">
                          <div className="h-2.5 w-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[(i + 2) % COLORS.length] }} />
                          <span className="text-gray-600 flex-1 truncate">{d.name}</span>
                          <span className="font-bold text-gray-800">{d.count}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : <EmptyState />}
              </ChartCard>

              <ChartCard title="협력사별">
                {stats.companyData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={130}>
                    <BarChart data={stats.companyData.slice(0, 6)} layout="vertical" margin={{ left: 5, right: 20 }}>
                      <XAxis type="number" tick={{ fontSize: 9 }} allowDecimals={false} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 9 }} width={70} />
                      <Bar dataKey="count" fill="#6366f1" radius={[0, 6, 6, 0]}>
                        <LabelList dataKey="count" position="right" style={{ fontSize: 10, fontWeight: 700 }} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : <EmptyState />}
              </ChartCard>

              <ChartCard title="발생부서별">
                {stats.deptData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={130}>
                    <BarChart data={stats.deptData.slice(0, 6)} layout="vertical" margin={{ left: 5, right: 20 }}>
                      <XAxis type="number" tick={{ fontSize: 9 }} allowDecimals={false} />
                      <YAxis type="category" dataKey="name" tick={{ fontSize: 9 }} width={70} />
                      <Bar dataKey="count" fill="#ec4899" radius={[0, 6, 6, 0]}>
                        <LabelList dataKey="count" position="right" style={{ fontSize: 10, fontWeight: 700 }} />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                ) : <EmptyState />}
              </ChartCard>
            </div>
          </section>

          {/* 3. 분포 상세 */}
          <section className="mb-10 print:break-inside-avoid print:mb-8">
            <SectionTitle icon={Users} number={3} title="분포 상세" />
            <div className="grid grid-cols-2 gap-6 mt-4">
              {[
                { title: '고객사별', data: stats.customerData, keyName: '고객사' },
                { title: '협력사별', data: stats.companyData, keyName: '협력사' },
                { title: '변동점 분류별', data: stats.classData, keyName: '분류' },
                { title: '발생부서별', data: stats.deptData, keyName: '부서' },
              ].map((sec) => (
                <div key={sec.title}>
                  <h4 className="mb-2 text-xs font-bold text-gray-700 flex items-center gap-1.5">
                    <div className="h-1 w-1 rounded-full bg-primary" />{sec.title}
                  </h4>
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b-2 border-gray-200">
                        <th className="py-1.5 text-left font-semibold text-gray-500">{sec.keyName}</th>
                        <th className="py-1.5 text-right w-14 font-semibold text-gray-500">건수</th>
                        <th className="py-1.5 text-right w-14 font-semibold text-gray-500">비율</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sec.data.map((d: any) => (
                        <tr key={d.name} className="border-b border-gray-50 hover:bg-gray-50/50">
                          <td className="py-1.5 truncate max-w-[130px] text-gray-700">{d.name}</td>
                          <td className="py-1.5 text-right font-semibold">{d.count}건</td>
                          <td className="py-1.5 text-right text-gray-400">{stats.total ? Math.round((d.count / stats.total) * 100) : 0}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {sec.data.length === 0 && <p className="py-4 text-center text-xs text-gray-300">데이터 없음</p>}
                </div>
              ))}
            </div>
          </section>

          {/* 4. 상세 목록 */}
          <section className="mb-8">
            <SectionTitle icon={FileText} number={4} title={`변동점 상세 목록 (${filtered.length}건)`} />
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-[10px] border-collapse">
                <thead>
                  <tr className="border-b-2 border-gray-300 bg-gray-50">
                    <th className="px-1.5 py-2 text-center w-6 font-bold text-gray-500">NO</th>
                    <th className="px-1.5 py-2 text-center font-bold text-gray-500">발생일</th>
                    <th className="px-1.5 py-2 text-center font-bold text-gray-500">고객사</th>
                    <th className="px-1.5 py-2 text-center font-bold text-gray-500">세부항목</th>
                    <th className="px-1.5 py-2 text-center font-bold text-gray-500">부서</th>
                    <th className="px-1.5 py-2 text-center font-bold text-gray-500">담당자</th>
                    <th className="px-1.5 py-2 text-center font-bold text-gray-500">조치시점</th>
                    <th className="px-1.5 py-2 text-center font-bold text-gray-500">조치방안</th>
                    <th className="px-1.5 py-2 text-center font-bold text-gray-500">조치결과</th>
                    <th className="px-1.5 py-2 text-center font-bold text-gray-500">품질검증</th>
                    <th className="px-1.5 py-2 text-center font-bold text-gray-500">상태</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((event, idx) => {
                    const e = event as any;
                    return (
                      <tr key={event.id} className={`border-b border-gray-100 ${idx % 2 === 1 ? 'bg-gray-50/40' : ''}`}>
                        <td className="px-1.5 py-1.5 text-center text-gray-400 font-medium">{idx + 1}</td>
                        <td className="px-1.5 py-1.5 text-center whitespace-nowrap">{formatDate(event.occurredDate).slice(5)}</td>
                        <td className="px-1.5 py-1.5 text-center truncate max-w-[60px]">{event.customer || '-'}</td>
                        <td className="px-1.5 py-1.5 text-center truncate max-w-[70px]">{e.primaryItem?.name || '-'}</td>
                        <td className="px-1.5 py-1.5 text-center">{event.department || '-'}</td>
                        <td className="px-1.5 py-1.5 text-center">{e.manager?.name || e.createdBy?.name || '-'}</td>
                        <td className={`px-1.5 py-1.5 text-center ${!e.actionDate ? 'text-red-400' : ''}`}>{e.actionDate ? formatDate(e.actionDate).slice(5) : '미입력'}</td>
                        <td className={`px-1.5 py-1.5 text-center truncate max-w-[60px] ${!e.actionPlan ? 'text-red-400' : ''}`}>{e.actionPlan || '미입력'}</td>
                        <td className={`px-1.5 py-1.5 text-center truncate max-w-[60px] ${!e.actionResult ? 'text-red-400' : ''}`}>{e.actionResult || '미입력'}</td>
                        <td className={`px-1.5 py-1.5 text-center truncate max-w-[50px] ${!e.qualityVerification ? 'text-red-400' : ''}`}>{e.qualityVerification || '미입력'}</td>
                        <td className="px-1.5 py-1.5 text-center">
                          <span className={`inline-block rounded-full px-1.5 py-0.5 text-[8px] font-bold ${getStatusBadgeClass(event.status)}`}>{getStatusText(event.status)}</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {filtered.length === 0 && <p className="py-12 text-center text-sm text-gray-400">해당 기간 데이터가 없습니다</p>}
            </div>
          </section>

          {/* 푸터 */}
          <footer className="border-t-2 border-gray-100 pt-6 text-center">
            <p className="text-[10px] text-gray-300">본 리포트는 변동점 관리시스템(CPMS)에서 자동 생성되었습니다.</p>
            <p className="mt-1 text-[10px] text-gray-300">(주)캠스 품질관리부 · {now.toLocaleDateString('ko-KR')} 발행</p>
          </footer>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; background: white !important; }
          .print\\:hidden { display: none !important; }
          .print\\:break-inside-avoid { break-inside: avoid; }
          @page { margin: 10mm; size: A4; }
        }
      `}</style>
    </div>
  );
}

/* ── 서브 컴포넌트 ── */

function SectionTitle({ icon: Icon, number, title }: { icon: any; number: number; title: string }) {
  return (
    <div className="flex items-center gap-2.5 border-b-2 border-primary/20 pb-2">
      <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10">
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <h2 className="text-base font-bold text-gray-900">
        <span className="text-primary mr-1">{number}.</span>{title}
      </h2>
    </div>
  );
}

function KpiCard({ label, value, unit, trend, sub, color, alert }: {
  label: string; value: number; unit: string; trend?: number; sub?: string; color: string; alert?: boolean;
}) {
  return (
    <div className={`rounded-xl border p-4 ${color}`}>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-500">{label}</p>
      <div className="mt-1 flex items-baseline gap-1">
        <span className={`text-2xl font-extrabold ${alert ? 'text-amber-600' : 'text-gray-900'}`}>{value}</span>
        <span className="text-sm text-gray-400">{unit}</span>
        {trend !== undefined && trend !== 0 && (
          <span className={`ml-auto text-[10px] font-bold ${trend > 0 ? 'text-red-500' : 'text-green-500'}`}>
            {trend > 0 ? '+' : ''}{trend}%
          </span>
        )}
      </div>
      {sub && <p className="mt-1 text-[10px] text-gray-400">{sub}</p>}
    </div>
  );
}

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-gray-200 p-4 print:break-inside-avoid">
      <h3 className="mb-3 text-xs font-bold text-gray-700">{title}</h3>
      {children}
    </div>
  );
}

function EmptyState() {
  return <p className="py-10 text-center text-xs text-gray-300">데이터 없음</p>;
}
