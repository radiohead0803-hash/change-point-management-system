'use client';

import { Suspense, useMemo, useState } from 'react';
import { changeEvents } from '@/lib/api-client';
import { useQuery } from '@tanstack/react-query';
import { ChangeEvent } from '@/types';
import { formatDate, getStatusText } from '@/lib/utils';
import { useSearchParams } from 'next/navigation';
import { Printer, ArrowLeft } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LabelList,
} from 'recharts';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#a855f7', '#06b6d4', '#ec4899', '#6b7280'];

export default function ReportPage() {
  return <Suspense fallback={<div className="flex items-center justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>}><ReportContent /></Suspense>;
}

function ReportContent() {
  const searchParams = useSearchParams();
  const yearParam = searchParams.get('year') || new Date().getFullYear().toString();
  const monthParam = searchParams.get('month') || (new Date().getMonth() + 1).toString();
  const [year, setYear] = useState(yearParam);
  const [month, setMonth] = useState(monthParam);

  const { data: events = [] } = useQuery<ChangeEvent[]>({
    queryKey: ['change-events'],
    queryFn: () => changeEvents.list().then((r) => r.data),
  });

  const periodLabel = `${year}년 ${month.padStart(2, '0')}월`;
  const periodKey = `${year}-${month.padStart(2, '0')}`;

  const filtered = useMemo(() => events.filter((e) => e.receiptMonth === periodKey), [events, periodKey]);

  const stats = useMemo(() => {
    const total = filtered.length;
    const approved = filtered.filter((e) => e.status === 'APPROVED' || e.status === 'CLOSED').length;
    const pending = filtered.filter((e) => ['DRAFT', 'SUBMITTED'].includes(e.status)).length;
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
    return { total, approved, pending, returned, reviewed, actionFilled,
      approvalRate: total ? Math.round((approved / total) * 100) : 0,
      actionRate: total ? Math.round((actionFilled / total) * 100) : 0,
      statusData: Object.entries(byStatus).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value),
      customerData: Object.entries(byCustomer).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
      companyData: Object.entries(byCompany).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
      classData: Object.entries(byClass).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
      deptData: Object.entries(byDept).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
    };
  }, [filtered]);

  return (
    <div className="min-h-screen bg-white">
      {/* 프린트 헤더 */}
      <div className="print:hidden sticky top-0 z-50 flex items-center justify-between border-b bg-white px-6 py-3 shadow-sm">
        <div className="flex items-center gap-3">
          <button onClick={() => window.history.back()} className="rounded-lg p-1.5 hover:bg-gray-100"><ArrowLeft className="h-5 w-5" /></button>
          <h1 className="text-lg font-bold">월간 리포트</h1>
        </div>
        <div className="flex items-center gap-3">
          <select value={year} onChange={(e) => setYear(e.target.value)} className="h-9 rounded-lg border px-3 text-sm">
            {[2024, 2025, 2026].map((y) => <option key={y} value={y}>{y}년</option>)}
          </select>
          <select value={month} onChange={(e) => setMonth(e.target.value)} className="h-9 rounded-lg border px-3 text-sm">
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => <option key={m} value={m}>{m}월</option>)}
          </select>
          <button onClick={() => window.print()} className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90">
            <Printer className="h-4 w-4" />인쇄
          </button>
        </div>
      </div>

      <div className="mx-auto max-w-[210mm] px-8 py-6 print:px-0 print:py-0">
        {/* 표지 */}
        <div className="mb-8 text-center print:mb-10 print:pt-16">
          <p className="text-xs text-gray-400 uppercase tracking-[0.3em]">Change Point Management System</p>
          <h1 className="mt-3 text-3xl font-bold">변동점 관리 월간 리포트</h1>
          <p className="mt-2 text-xl text-gray-600">{periodLabel}</p>
          <div className="mx-auto mt-4 h-0.5 w-16 bg-primary" />
          <p className="mt-4 text-sm text-gray-400">(주)캠스 품질관리부</p>
          <p className="mt-1 text-xs text-gray-300">발행일: {new Date().toLocaleDateString('ko-KR')}</p>
        </div>

        {/* 1. KPI 요약 */}
        <section className="mb-8 print:break-inside-avoid">
          <h2 className="mb-4 border-b-2 border-primary pb-2 text-base font-bold text-primary">1. 월간 요약</h2>
          <div className="grid grid-cols-4 gap-2">
            {[
              { label: '전체 발생', value: stats.total, unit: '건', color: 'border-l-gray-400' },
              { label: '승인 완료', value: stats.approved, unit: '건', color: 'border-l-green-500' },
              { label: '승인율', value: stats.approvalRate, unit: '%', color: 'border-l-blue-500' },
              { label: '조치 완료율', value: stats.actionRate, unit: '%', color: 'border-l-cyan-500' },
              { label: '미처리', value: stats.pending, unit: '건', color: 'border-l-amber-500' },
              { label: '검토 완료', value: stats.reviewed, unit: '건', color: 'border-l-indigo-500' },
              { label: '보완 요청', value: stats.returned, unit: '건', color: 'border-l-red-500' },
              { label: '조치 입력', value: stats.actionFilled, unit: '건', color: 'border-l-emerald-500' },
            ].map((s) => (
              <div key={s.label} className={`rounded-lg border border-l-[3px] ${s.color} p-2.5 text-center`}>
                <p className="text-[10px] text-gray-500">{s.label}</p>
                <p className="mt-0.5 text-lg font-bold">{s.value}<span className="text-xs font-normal text-gray-400 ml-0.5">{s.unit}</span></p>
              </div>
            ))}
          </div>
        </section>

        {/* 2. 시각화 분석 */}
        <section className="mb-8 print:break-inside-avoid">
          <h2 className="mb-4 border-b-2 border-primary pb-2 text-base font-bold text-primary">2. 시각화 분석</h2>
          <div className="grid grid-cols-2 gap-4">
            {/* 상태별 분포 */}
            <div className="rounded-lg border p-3">
              <h3 className="mb-2 text-xs font-semibold text-gray-600">상태별 분포</h3>
              {stats.statusData.length > 0 ? (
                <div className="flex items-center">
                  <ResponsiveContainer width="50%" height={140}>
                    <PieChart><Pie data={stats.statusData} cx="50%" cy="50%" innerRadius={30} outerRadius={55} paddingAngle={2} dataKey="value">
                      {stats.statusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie></PieChart>
                  </ResponsiveContainer>
                  <div className="flex-1 space-y-1">
                    {stats.statusData.map((d, i) => (
                      <div key={d.name} className="flex items-center gap-1.5 text-[10px]">
                        <div className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                        <span className="text-gray-600">{d.name}</span>
                        <span className="ml-auto font-semibold">{d.value}건</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : <p className="py-8 text-center text-xs text-gray-300">데이터 없음</p>}
            </div>

            {/* 분류별 */}
            <div className="rounded-lg border p-3">
              <h3 className="mb-2 text-xs font-semibold text-gray-600">변동점 분류별</h3>
              {stats.classData.length > 0 ? (
                <div className="flex items-center">
                  <ResponsiveContainer width="50%" height={140}>
                    <PieChart><Pie data={stats.classData} cx="50%" cy="50%" outerRadius={55} paddingAngle={2} dataKey="count">
                      {stats.classData.map((_, i) => <Cell key={i} fill={COLORS[(i + 2) % COLORS.length]} />)}
                    </Pie></PieChart>
                  </ResponsiveContainer>
                  <div className="flex-1 space-y-1">
                    {stats.classData.map((d, i) => (
                      <div key={d.name} className="flex items-center gap-1.5 text-[10px]">
                        <div className="h-2 w-2 rounded-full flex-shrink-0" style={{ backgroundColor: COLORS[(i + 2) % COLORS.length] }} />
                        <span className="text-gray-600 truncate max-w-[100px]">{d.name}</span>
                        <span className="ml-auto font-semibold">{d.count}건</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : <p className="py-8 text-center text-xs text-gray-300">데이터 없음</p>}
            </div>

            {/* 협력사별 */}
            <div className="rounded-lg border p-3">
              <h3 className="mb-2 text-xs font-semibold text-gray-600">협력사별</h3>
              {stats.companyData.length > 0 ? (
                <ResponsiveContainer width="100%" height={120}>
                  <BarChart data={stats.companyData} layout="vertical" margin={{ left: 0, right: 15 }}>
                    <XAxis type="number" tick={{ fontSize: 9 }} allowDecimals={false} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 9 }} width={65} />
                    <Bar dataKey="count" fill="#10b981" radius={[0, 4, 4, 0]}>
                      <LabelList dataKey="count" position="right" style={{ fontSize: 9, fontWeight: 600 }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : <p className="py-8 text-center text-xs text-gray-300">데이터 없음</p>}
            </div>

            {/* 발생부서별 */}
            <div className="rounded-lg border p-3">
              <h3 className="mb-2 text-xs font-semibold text-gray-600">발생부서별</h3>
              {stats.deptData.length > 0 ? (
                <ResponsiveContainer width="100%" height={120}>
                  <BarChart data={stats.deptData} layout="vertical" margin={{ left: 0, right: 15 }}>
                    <XAxis type="number" tick={{ fontSize: 9 }} allowDecimals={false} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 9 }} width={65} />
                    <Bar dataKey="count" fill="#ec4899" radius={[0, 4, 4, 0]}>
                      <LabelList dataKey="count" position="right" style={{ fontSize: 9, fontWeight: 600 }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : <p className="py-8 text-center text-xs text-gray-300">데이터 없음</p>}
            </div>
          </div>
        </section>

        {/* 3. 분포 테이블 */}
        <section className="mb-8 print:break-inside-avoid">
          <h2 className="mb-4 border-b-2 border-primary pb-2 text-base font-bold text-primary">3. 분포 상세</h2>
          <div className="grid grid-cols-2 gap-4">
            {[
              { title: '고객사별', data: stats.customerData, keyName: '고객사' },
              { title: '협력사별', data: stats.companyData, keyName: '협력사' },
              { title: '변동점 분류별', data: stats.classData, keyName: '분류' },
              { title: '발생부서별', data: stats.deptData, keyName: '부서' },
            ].map((section) => (
              <div key={section.title}>
                <h3 className="mb-1.5 text-xs font-semibold text-gray-700">{section.title}</h3>
                <table className="w-full text-[10px]">
                  <thead><tr className="border-b"><th className="py-1 text-left">{section.keyName}</th><th className="py-1 text-right w-12">건수</th><th className="py-1 text-right w-10">비율</th></tr></thead>
                  <tbody>{section.data.map(([name, count]: any) => {
                    const c = typeof count === 'number' ? count : (count as any);
                    return (
                      <tr key={name} className="border-b border-gray-50"><td className="py-1 truncate max-w-[120px]">{name}</td><td className="py-1 text-right font-medium">{c}건</td><td className="py-1 text-right text-gray-400">{stats.total ? Math.round((c / stats.total) * 100) : 0}%</td></tr>
                    );
                  })}</tbody>
                </table>
              </div>
            ))}
          </div>
        </section>

        {/* 4. 상세 목록 */}
        <section className="mb-8">
          <h2 className="mb-4 border-b-2 border-primary pb-2 text-base font-bold text-primary">4. 변동점 상세 목록 ({filtered.length}건)</h2>
          <table className="w-full text-[9px] border-collapse">
            <thead>
              <tr className="border-b-2 border-gray-300 bg-gray-50">
                <th className="px-1 py-1.5 text-center w-5">NO</th>
                <th className="px-1 py-1.5 text-center">발생일</th>
                <th className="px-1 py-1.5 text-center">대분류</th>
                <th className="px-1 py-1.5 text-center">중분류</th>
                <th className="px-1 py-1.5 text-center">세부항목</th>
                <th className="px-1 py-1.5 text-center">부서</th>
                <th className="px-1 py-1.5 text-center">담당자</th>
                <th className="px-1 py-1.5 text-center">조치시점</th>
                <th className="px-1 py-1.5 text-center">조치방안</th>
                <th className="px-1 py-1.5 text-center">조치결과</th>
                <th className="px-1 py-1.5 text-center">품질검증</th>
                <th className="px-1 py-1.5 text-center">상태</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((event, idx) => {
                const e = event as any;
                return (
                  <tr key={event.id} className={`border-b ${idx % 2 === 0 ? '' : 'bg-gray-50/50'}`}>
                    <td className="px-1 py-1 text-center text-gray-400">{idx + 1}</td>
                    <td className="px-1 py-1 text-center">{formatDate(event.occurredDate).slice(5)}</td>
                    <td className="px-1 py-1 text-center max-w-[40px] truncate">{e.primaryItem?.category?.class?.name || '-'}</td>
                    <td className="px-1 py-1 text-center max-w-[40px] truncate">{e.primaryItem?.category?.name || '-'}</td>
                    <td className="px-1 py-1 text-center max-w-[50px] truncate">{e.primaryItem?.name || '-'}</td>
                    <td className="px-1 py-1 text-center">{event.department || '-'}</td>
                    <td className="px-1 py-1 text-center">{e.manager?.name || e.createdBy?.name || '-'}</td>
                    <td className={`px-1 py-1 text-center ${!e.actionDate ? 'text-red-400' : ''}`}>{e.actionDate ? formatDate(e.actionDate).slice(5) : '미입력'}</td>
                    <td className={`px-1 py-1 text-center max-w-[50px] truncate ${!e.actionPlan ? 'text-red-400' : ''}`}>{e.actionPlan || '미입력'}</td>
                    <td className={`px-1 py-1 text-center max-w-[50px] truncate ${!e.actionResult ? 'text-red-400' : ''}`}>{e.actionResult || '미입력'}</td>
                    <td className={`px-1 py-1 text-center max-w-[40px] truncate ${!e.qualityVerification ? 'text-red-400' : ''}`}>{e.qualityVerification || '미입력'}</td>
                    <td className="px-1 py-1 text-center font-medium">{getStatusText(event.status)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && <p className="py-8 text-center text-xs text-gray-400">해당 기간 데이터가 없습니다</p>}
        </section>

        {/* 푸터 */}
        <div className="mt-10 border-t pt-4 text-center text-[9px] text-gray-300">
          <p>본 리포트는 변동점 관리시스템에서 자동 생성되었습니다.</p>
          <p className="mt-0.5">(주)캠스 품질관리부 · {new Date().toLocaleDateString('ko-KR')} 발행</p>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .print\\:hidden { display: none !important; }
          .print\\:break-inside-avoid { break-inside: avoid; }
          .print\\:pt-16 { padding-top: 4rem; }
          .print\\:mb-10 { margin-bottom: 2.5rem; }
          .print\\:px-0 { padding-left: 0; padding-right: 0; }
          .print\\:py-0 { padding-top: 0; padding-bottom: 0; }
          @page { margin: 12mm; size: A4; }
        }
      `}</style>
    </div>
  );
}
