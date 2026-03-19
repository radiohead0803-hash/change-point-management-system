'use client';

import { useMemo, useState, useEffect } from 'react';
import { changeEvents } from '@/lib/api-client';
import { useQuery } from '@tanstack/react-query';
import { ChangeEvent } from '@/types';
import { formatDate, getStatusText } from '@/lib/utils';
import { useSearchParams } from 'next/navigation';
import { Printer, Download, ArrowLeft } from 'lucide-react';

export default function ReportPage() {
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

  const filtered = useMemo(() => {
    return events.filter((e) => e.receiptMonth === periodKey);
  }, [events, periodKey]);

  // 통계
  const stats = useMemo(() => {
    const total = filtered.length;
    const approved = filtered.filter((e) => e.status === 'APPROVED' || e.status === 'CLOSED').length;
    const pending = filtered.filter((e) => ['DRAFT', 'SUBMITTED'].includes(e.status)).length;
    const returned = filtered.filter((e) => e.status === 'REVIEW_RETURNED').length;
    const reviewed = filtered.filter((e) => e.status === 'REVIEWED').length;
    const actionFilled = filtered.filter((e) => (e as any).actionPlan && (e as any).actionResult).length;
    const byCustomer: Record<string, number> = {};
    const byCompany: Record<string, number> = {};
    const byClass: Record<string, number> = {};
    const byDept: Record<string, number> = {};
    filtered.forEach((e: any) => {
      byCustomer[e.customer || '미지정'] = (byCustomer[e.customer || '미지정'] || 0) + 1;
      byCompany[e.company?.name || '미지정'] = (byCompany[e.company?.name || '미지정'] || 0) + 1;
      byClass[e.primaryItem?.category?.class?.name || '미분류'] = (byClass[e.primaryItem?.category?.class?.name || '미분류'] || 0) + 1;
      byDept[e.department || '미지정'] = (byDept[e.department || '미지정'] || 0) + 1;
    });
    return { total, approved, pending, returned, reviewed, actionFilled,
      approvalRate: total ? Math.round((approved / total) * 100) : 0,
      actionRate: total ? Math.round((actionFilled / total) * 100) : 0,
      byCustomer: Object.entries(byCustomer).sort((a, b) => b[1] - a[1]),
      byCompany: Object.entries(byCompany).sort((a, b) => b[1] - a[1]),
      byClass: Object.entries(byClass).sort((a, b) => b[1] - a[1]),
      byDept: Object.entries(byDept).sort((a, b) => b[1] - a[1]),
    };
  }, [filtered]);

  const handlePrint = () => window.print();

  return (
    <div className="min-h-screen bg-white">
      {/* 프린트 헤더 (화면에서만 보임) */}
      <div className="print:hidden sticky top-0 z-50 flex items-center justify-between border-b bg-white px-6 py-3">
        <div className="flex items-center gap-3">
          <button onClick={() => window.close()} className="rounded-lg p-1.5 hover:bg-gray-100"><ArrowLeft className="h-5 w-5" /></button>
          <h1 className="text-lg font-bold">월간 리포트</h1>
        </div>
        <div className="flex items-center gap-3">
          <select value={year} onChange={(e) => setYear(e.target.value)} className="h-9 rounded-lg border px-3 text-sm">
            {[2024, 2025, 2026].map((y) => <option key={y} value={y}>{y}년</option>)}
          </select>
          <select value={month} onChange={(e) => setMonth(e.target.value)} className="h-9 rounded-lg border px-3 text-sm">
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => <option key={m} value={m}>{m}월</option>)}
          </select>
          <button onClick={handlePrint} className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-primary/90">
            <Printer className="h-4 w-4" />인쇄
          </button>
        </div>
      </div>

      {/* 리포트 본문 */}
      <div className="mx-auto max-w-[210mm] px-8 py-6 print:px-0 print:py-0">
        {/* 표지 */}
        <div className="mb-8 text-center print:mb-12 print:pt-20">
          <p className="text-sm text-gray-400 uppercase tracking-widest">Change Point Management System</p>
          <h1 className="mt-4 text-3xl font-bold print:text-4xl">변동점 관리 월간 리포트</h1>
          <p className="mt-3 text-xl text-gray-600">{periodLabel}</p>
          <p className="mt-6 text-sm text-gray-400">(주)캠스 · 품질관리부</p>
          <p className="mt-1 text-xs text-gray-300">발행일: {new Date().toLocaleDateString('ko-KR')}</p>
        </div>

        {/* 1. 요약 */}
        <section className="mb-8 print:break-inside-avoid">
          <h2 className="mb-4 border-b-2 border-primary pb-2 text-lg font-bold text-primary">1. 월간 요약</h2>
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: '전체 발생', value: stats.total, unit: '건' },
              { label: '승인 완료', value: stats.approved, unit: '건' },
              { label: '승인율', value: stats.approvalRate, unit: '%' },
              { label: '조치 완료율', value: stats.actionRate, unit: '%' },
            ].map((s) => (
              <div key={s.label} className="rounded-lg border p-3 text-center">
                <p className="text-xs text-gray-500">{s.label}</p>
                <p className="mt-1 text-2xl font-bold">{s.value}<span className="text-sm font-normal text-gray-400">{s.unit}</span></p>
              </div>
            ))}
          </div>
          <div className="mt-3 grid grid-cols-4 gap-3">
            {[
              { label: '미처리(대기)', value: stats.pending },
              { label: '검토 완료', value: stats.reviewed },
              { label: '보완 요청', value: stats.returned },
              { label: '조치 입력', value: stats.actionFilled },
            ].map((s) => (
              <div key={s.label} className="rounded-lg border p-3 text-center">
                <p className="text-xs text-gray-500">{s.label}</p>
                <p className="mt-1 text-xl font-bold">{s.value}<span className="text-sm font-normal text-gray-400">건</span></p>
              </div>
            ))}
          </div>
        </section>

        {/* 2. 분포 분석 */}
        <section className="mb-8 print:break-inside-avoid">
          <h2 className="mb-4 border-b-2 border-primary pb-2 text-lg font-bold text-primary">2. 분포 분석</h2>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <h3 className="mb-2 text-sm font-semibold text-gray-700">고객사별</h3>
              <table className="w-full text-xs">
                <thead><tr className="border-b"><th className="py-1.5 text-left">고객사</th><th className="py-1.5 text-right">건수</th><th className="py-1.5 text-right">비율</th></tr></thead>
                <tbody>{stats.byCustomer.map(([name, count]) => (
                  <tr key={name} className="border-b border-gray-50"><td className="py-1.5">{name}</td><td className="py-1.5 text-right font-medium">{count}건</td><td className="py-1.5 text-right text-gray-400">{stats.total ? Math.round((count / stats.total) * 100) : 0}%</td></tr>
                ))}</tbody>
              </table>
            </div>
            <div>
              <h3 className="mb-2 text-sm font-semibold text-gray-700">협력사별</h3>
              <table className="w-full text-xs">
                <thead><tr className="border-b"><th className="py-1.5 text-left">협력사</th><th className="py-1.5 text-right">건수</th><th className="py-1.5 text-right">비율</th></tr></thead>
                <tbody>{stats.byCompany.map(([name, count]) => (
                  <tr key={name} className="border-b border-gray-50"><td className="py-1.5">{name}</td><td className="py-1.5 text-right font-medium">{count}건</td><td className="py-1.5 text-right text-gray-400">{stats.total ? Math.round((count / stats.total) * 100) : 0}%</td></tr>
                ))}</tbody>
              </table>
            </div>
            <div>
              <h3 className="mb-2 text-sm font-semibold text-gray-700">변동점 분류별</h3>
              <table className="w-full text-xs">
                <thead><tr className="border-b"><th className="py-1.5 text-left">분류</th><th className="py-1.5 text-right">건수</th><th className="py-1.5 text-right">비율</th></tr></thead>
                <tbody>{stats.byClass.map(([name, count]) => (
                  <tr key={name} className="border-b border-gray-50"><td className="py-1.5">{name}</td><td className="py-1.5 text-right font-medium">{count}건</td><td className="py-1.5 text-right text-gray-400">{stats.total ? Math.round((count / stats.total) * 100) : 0}%</td></tr>
                ))}</tbody>
              </table>
            </div>
            <div>
              <h3 className="mb-2 text-sm font-semibold text-gray-700">발생부서별</h3>
              <table className="w-full text-xs">
                <thead><tr className="border-b"><th className="py-1.5 text-left">부서</th><th className="py-1.5 text-right">건수</th><th className="py-1.5 text-right">비율</th></tr></thead>
                <tbody>{stats.byDept.map(([name, count]) => (
                  <tr key={name} className="border-b border-gray-50"><td className="py-1.5">{name}</td><td className="py-1.5 text-right font-medium">{count}건</td><td className="py-1.5 text-right text-gray-400">{stats.total ? Math.round((count / stats.total) * 100) : 0}%</td></tr>
                ))}</tbody>
              </table>
            </div>
          </div>
        </section>

        {/* 3. 상세 목록 */}
        <section className="mb-8">
          <h2 className="mb-4 border-b-2 border-primary pb-2 text-lg font-bold text-primary">3. 변동점 상세 목록 ({filtered.length}건)</h2>
          <table className="w-full text-[10px] border-collapse">
            <thead>
              <tr className="border-b-2 border-gray-300 bg-gray-50">
                <th className="px-1.5 py-2 text-center w-6">NO</th>
                <th className="px-1.5 py-2 text-center">발생일</th>
                <th className="px-1.5 py-2 text-center">대분류</th>
                <th className="px-1.5 py-2 text-center">중분류</th>
                <th className="px-1.5 py-2 text-center">세부항목</th>
                <th className="px-1.5 py-2 text-center">부서</th>
                <th className="px-1.5 py-2 text-center">조치시점</th>
                <th className="px-1.5 py-2 text-center">조치방안</th>
                <th className="px-1.5 py-2 text-center">조치결과</th>
                <th className="px-1.5 py-2 text-center">품질검증</th>
                <th className="px-1.5 py-2 text-center">상태</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((event, idx) => {
                const e = event as any;
                return (
                  <tr key={event.id} className={`border-b ${idx % 2 === 0 ? '' : 'bg-gray-50/50'}`}>
                    <td className="px-1.5 py-1.5 text-center text-gray-400">{idx + 1}</td>
                    <td className="px-1.5 py-1.5 text-center">{formatDate(event.occurredDate).slice(5)}</td>
                    <td className="px-1.5 py-1.5 text-center max-w-[50px] truncate">{e.primaryItem?.category?.class?.name || '-'}</td>
                    <td className="px-1.5 py-1.5 text-center max-w-[50px] truncate">{e.primaryItem?.category?.name || '-'}</td>
                    <td className="px-1.5 py-1.5 text-center max-w-[60px] truncate">{e.primaryItem?.name || '-'}</td>
                    <td className="px-1.5 py-1.5 text-center">{event.department || '-'}</td>
                    <td className={`px-1.5 py-1.5 text-center ${!e.actionDate ? 'text-red-400' : ''}`}>{e.actionDate ? formatDate(e.actionDate).slice(5) : '미입력'}</td>
                    <td className={`px-1.5 py-1.5 text-center max-w-[60px] truncate ${!e.actionPlan ? 'text-red-400' : ''}`}>{e.actionPlan || '미입력'}</td>
                    <td className={`px-1.5 py-1.5 text-center max-w-[60px] truncate ${!e.actionResult ? 'text-red-400' : ''}`}>{e.actionResult || '미입력'}</td>
                    <td className={`px-1.5 py-1.5 text-center max-w-[50px] truncate ${!e.qualityVerification ? 'text-red-400' : ''}`}>{e.qualityVerification || '미입력'}</td>
                    <td className="px-1.5 py-1.5 text-center font-medium">{getStatusText(event.status)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {filtered.length === 0 && <p className="py-8 text-center text-sm text-gray-400">해당 기간 데이터가 없습니다</p>}
        </section>

        {/* 푸터 */}
        <div className="mt-12 border-t pt-4 text-center text-[10px] text-gray-300 print:mt-8">
          <p>본 리포트는 변동점 관리시스템에서 자동 생성되었습니다.</p>
          <p className="mt-1">(주)캠스 품질관리부 · {new Date().toLocaleDateString('ko-KR')} 발행</p>
        </div>
      </div>

      {/* 프린트 스타일 */}
      <style jsx global>{`
        @media print {
          body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .print\\:hidden { display: none !important; }
          .print\\:break-inside-avoid { break-inside: avoid; }
          .print\\:pt-20 { padding-top: 5rem; }
          .print\\:mb-12 { margin-bottom: 3rem; }
          .print\\:px-0 { padding-left: 0; padding-right: 0; }
          .print\\:py-0 { padding-top: 0; padding-bottom: 0; }
          .print\\:mt-8 { margin-top: 2rem; }
          .print\\:text-4xl { font-size: 2.25rem; }
          @page { margin: 15mm; size: A4; }
        }
      `}</style>
    </div>
  );
}
