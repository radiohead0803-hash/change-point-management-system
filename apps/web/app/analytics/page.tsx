'use client';

import { useMemo, useState } from 'react';
import { changeEvents } from '@/lib/api-client';
import { useQuery } from '@tanstack/react-query';
import { ChangeEvent } from '@/types';
import { formatDate, getStatusText } from '@/lib/utils';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, LabelList, Legend, AreaChart, Area,
} from 'recharts';
import {
  BarChart3, Building2, Calendar, TrendingUp, TrendingDown, AlertTriangle,
  Lightbulb, Filter, Clock, CheckCircle2, Shield, ArrowRight, PieChart as PieIcon,
  Activity, Target, Users, Layers, Zap,
} from 'lucide-react';

const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#a855f7', '#06b6d4', '#ec4899', '#6b7280'];
const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#a855f7', '#06b6d4'];

type TimeRange = 'month' | 'quarter' | 'half' | 'year' | 'all';

export default function AnalyticsPage() {
  const [timeRange, setTimeRange] = useState<TimeRange>('all');
  const [customerFilter, setCustomerFilter] = useState('ALL');
  const [companyFilter, setCompanyFilter] = useState('ALL');
  const [classFilter, setClassFilter] = useState('ALL');

  const { data: events = [], isLoading } = useQuery<ChangeEvent[]>({
    queryKey: ['change-events'],
    queryFn: () => changeEvents.list().then((r) => r.data),
  });

  // 기간 필터
  const filteredByTime = useMemo(() => {
    if (timeRange === 'all') return events;
    const now = new Date();
    const months = timeRange === 'month' ? 1 : timeRange === 'quarter' ? 3 : timeRange === 'half' ? 6 : 12;
    const cutoff = new Date(now.getFullYear(), now.getMonth() - months, 1);
    return events.filter((e) => new Date(e.occurredDate) >= cutoff);
  }, [events, timeRange]);

  // 추가 필터
  const filtered = useMemo(() => {
    return filteredByTime.filter((e) => {
      if (customerFilter !== 'ALL' && (e.customer || '') !== customerFilter) return false;
      if (companyFilter !== 'ALL' && (e as any).company?.name !== companyFilter) return false;
      if (classFilter !== 'ALL') {
        const className = (e as any).primaryItem?.category?.class?.name || '';
        if (className !== classFilter) return false;
      }
      return true;
    });
  }, [filteredByTime, customerFilter, companyFilter, classFilter]);

  // 옵션 목록
  const customers = useMemo(() => [...new Set(events.map((e) => e.customer || '').filter(Boolean))].sort(), [events]);
  const companies = useMemo(() => [...new Set(events.map((e) => (e as any).company?.name || '').filter(Boolean))].sort(), [events]);
  const classes = useMemo(() => [...new Set(events.map((e) => (e as any).primaryItem?.category?.class?.name || '').filter(Boolean))].sort(), [events]);

  // ── 통계 계산 ──
  const stats = useMemo(() => {
    const total = filtered.length;
    const approved = filtered.filter((e) => e.status === 'APPROVED').length;
    const pending = filtered.filter((e) => ['DRAFT', 'SUBMITTED'].includes(e.status)).length;
    const returned = filtered.filter((e) => e.status === 'REVIEW_RETURNED').length;
    const closed = filtered.filter((e) => e.status === 'CLOSED').length;
    const actionFilled = filtered.filter((e) => (e as any).actionPlan && (e as any).actionResult).length;
    return { total, approved, pending, returned, closed, approvalRate: total ? Math.round((approved / total) * 100) : 0, actionRate: total ? Math.round((actionFilled / total) * 100) : 0 };
  }, [filtered]);

  // 월별 추이
  const trendData = useMemo(() => {
    const map: Record<string, { month: string; count: number; approved: number; returned: number }> = {};
    filtered.forEach((e) => {
      const m = e.receiptMonth;
      if (!map[m]) map[m] = { month: m, count: 0, approved: 0, returned: 0 };
      map[m].count++;
      if (e.status === 'APPROVED' || e.status === 'CLOSED') map[m].approved++;
      if (e.status === 'REVIEW_RETURNED') map[m].returned++;
    });
    return Object.values(map).sort((a, b) => a.month.localeCompare(b.month)).slice(-12).map((d) => ({ ...d, label: d.month.slice(5) + '월' }));
  }, [filtered]);

  // 상태 분포
  const statusData = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.forEach((e) => { map[e.status] = (map[e.status] || 0) + 1; });
    return Object.entries(map).map(([status, value]) => ({ status, name: getStatusText(status), value })).sort((a, b) => b.value - a.value);
  }, [filtered]);

  // 협력사별
  const companyData = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.forEach((e) => { const n = (e as any).company?.name || '미지정'; map[n] = (map[n] || 0) + 1; });
    return Object.entries(map).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 8);
  }, [filtered]);

  // 고객사별
  const customerData = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.forEach((e) => { const n = e.customer || '미지정'; map[n] = (map[n] || 0) + 1; });
    return Object.entries(map).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
  }, [filtered]);

  // 분류별 (대분류)
  const classData = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.forEach((e) => { const n = (e as any).primaryItem?.category?.class?.name || '미분류'; map[n] = (map[n] || 0) + 1; });
    return Object.entries(map).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
  }, [filtered]);

  // 카테고리별 (중분류)
  const categoryData = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.forEach((e) => { const n = (e as any).primaryItem?.category?.name || '미분류'; map[n] = (map[n] || 0) + 1; });
    return Object.entries(map).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 10);
  }, [filtered]);

  // 부서별
  const deptData = useMemo(() => {
    const map: Record<string, number> = {};
    filtered.forEach((e) => { const n = e.department || '미지정'; map[n] = (map[n] || 0) + 1; });
    return Object.entries(map).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
  }, [filtered]);

  // 조치 완료율 추이
  const actionTrend = useMemo(() => {
    const map: Record<string, { month: string; total: number; filled: number }> = {};
    filtered.forEach((e) => {
      const m = e.receiptMonth;
      if (!map[m]) map[m] = { month: m, total: 0, filled: 0 };
      map[m].total++;
      if ((e as any).actionPlan && (e as any).actionResult) map[m].filled++;
    });
    return Object.values(map).sort((a, b) => a.month.localeCompare(b.month)).slice(-12).map((d) => ({
      label: d.month.slice(5) + '월', rate: d.total ? Math.round((d.filled / d.total) * 100) : 0, total: d.total,
    }));
  }, [filtered]);

  // AI 인사이트
  const insights = useMemo(() => {
    const result: Array<{ icon: any; title: string; desc: string; type: 'info' | 'warning' | 'success' }> = [];
    if (stats.approvalRate > 70) result.push({ icon: TrendingUp, title: `승인율 ${stats.approvalRate}%`, desc: '양호한 승인 처리율입니다.', type: 'success' });
    else result.push({ icon: TrendingDown, title: `승인율 ${stats.approvalRate}%`, desc: '승인 처리를 서둘러주세요.', type: 'warning' });
    if (stats.returned > 0) result.push({ icon: AlertTriangle, title: `보완요청 ${stats.returned}건`, desc: '빠른 보완 조치를 권장합니다.', type: 'warning' });
    if (stats.actionRate < 80) result.push({ icon: Clock, title: `조치 완료율 ${stats.actionRate}%`, desc: '미입력 항목을 확인해주세요.', type: 'warning' });
    else result.push({ icon: CheckCircle2, title: `조치 완료율 ${stats.actionRate}%`, desc: '조치 내용이 잘 기록되고 있습니다.', type: 'success' });
    if (companyData[0]) result.push({ icon: Building2, title: `주요 협력사: ${companyData[0].name}`, desc: `${companyData[0].count}건 (${stats.total ? Math.round((companyData[0].count / stats.total) * 100) : 0}%) 발생`, type: 'info' });
    if (stats.pending > 0) result.push({ icon: Clock, title: `미처리 ${stats.pending}건`, desc: '임시저장/제출대기 건이 처리를 기다리고 있습니다.', type: 'info' });
    return result;
  }, [stats, companyData]);

  const insightBg: Record<string, string> = { info: 'bg-blue-50/80 border-blue-100', warning: 'bg-amber-50/80 border-amber-100', success: 'bg-emerald-50/80 border-emerald-100' };
  const insightIcon: Record<string, string> = { info: 'text-blue-500', warning: 'text-amber-500', success: 'text-emerald-500' };

  const hasFilters = customerFilter !== 'ALL' || companyFilter !== 'ALL' || classFilter !== 'ALL';

  if (isLoading) return <div className="flex items-center justify-center py-20"><div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" /></div>;

  return (
    <div className="space-y-5">
      {/* 헤더 */}
      <div>
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">시각화 분석</h1>
        <p className="mt-1 text-sm text-muted-foreground">변동점 데이터 심층 분석 · {filtered.length}건</p>
      </div>

      {/* 필터 바 */}
      <div className="flex flex-wrap items-center gap-2 rounded-xl border border-gray-100 bg-gray-50/30 px-4 py-3 dark:border-gray-800 dark:bg-gray-800/20">
        <Filter className="h-3.5 w-3.5 text-muted-foreground/50" />
        <div className="flex gap-1 rounded-lg bg-gray-100/60 p-0.5 dark:bg-gray-800/40">
          {([['month', '1개월'], ['quarter', '3개월'], ['half', '6개월'], ['year', '1년'], ['all', '전체']] as [TimeRange, string][]).map(([key, label]) => (
            <button key={key} onClick={() => setTimeRange(key)}
              className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition-all ${timeRange === key ? 'bg-white shadow-sm dark:bg-gray-700' : 'text-muted-foreground'}`}>
              {label}
            </button>
          ))}
        </div>
        <select value={customerFilter} onChange={(e) => setCustomerFilter(e.target.value)} className="h-7 rounded-lg border border-input bg-white px-2 text-[11px] dark:bg-gray-900">
          <option value="ALL">전체 고객사</option>
          {customers.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={companyFilter} onChange={(e) => setCompanyFilter(e.target.value)} className="h-7 rounded-lg border border-input bg-white px-2 text-[11px] dark:bg-gray-900">
          <option value="ALL">전체 협력사</option>
          {companies.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={classFilter} onChange={(e) => setClassFilter(e.target.value)} className="h-7 rounded-lg border border-input bg-white px-2 text-[11px] dark:bg-gray-900">
          <option value="ALL">전체 분류</option>
          {classes.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        {hasFilters && <button onClick={() => { setCustomerFilter('ALL'); setCompanyFilter('ALL'); setClassFilter('ALL'); }} className="text-[10px] text-primary hover:underline">초기화</button>}
        <span className="ml-auto text-[10px] text-muted-foreground">{filtered.length}건</span>
      </div>

      {/* KPI 카드 */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
        {[
          { label: '전체', value: stats.total, icon: Layers, color: 'text-gray-600' },
          { label: '승인완료', value: stats.approved, icon: CheckCircle2, color: 'text-green-600' },
          { label: '미처리', value: stats.pending, icon: Clock, color: 'text-blue-600' },
          { label: '보완요청', value: stats.returned, icon: AlertTriangle, color: 'text-amber-600' },
          { label: '승인율', value: `${stats.approvalRate}%`, icon: Target, color: 'text-purple-600' },
          { label: '조치율', value: `${stats.actionRate}%`, icon: Zap, color: 'text-cyan-600' },
        ].map((kpi) => (
          <div key={kpi.label} className="rounded-xl border border-white/60 bg-white/70 p-3 shadow-sm backdrop-blur-xl dark:border-gray-800/60 dark:bg-gray-900/70">
            <div className="flex items-center gap-2">
              <kpi.icon className={`h-4 w-4 ${kpi.color}`} />
              <span className="text-[10px] text-muted-foreground">{kpi.label}</span>
            </div>
            <p className="mt-1 text-xl font-bold">{kpi.value}</p>
          </div>
        ))}
      </div>

      {/* 차트 1행: 발생 추이 + 승인/반려 추이 */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/60 bg-white/70 p-4 shadow-sm backdrop-blur-xl sm:p-5 dark:border-gray-800/60 dark:bg-gray-900/70">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold"><BarChart3 className="h-4 w-4 text-primary" />월별 발생 추이</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={trendData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
              <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb' }} />
              <Legend wrapperStyle={{ fontSize: 10 }} />
              <Bar dataKey="count" name="전체" fill="#3b82f6" radius={[4, 4, 0, 0]}>
                <LabelList dataKey="count" position="top" style={{ fontSize: 9, fontWeight: 600, fill: '#6b7280' }} />
              </Bar>
              <Bar dataKey="approved" name="승인" fill="#10b981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="returned" name="반려" fill="#ef4444" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-2xl border border-white/60 bg-white/70 p-4 shadow-sm backdrop-blur-xl sm:p-5 dark:border-gray-800/60 dark:bg-gray-900/70">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold"><Activity className="h-4 w-4 text-cyan-600" />조치 완료율 추이</h3>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={actionTrend} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis dataKey="label" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} domain={[0, 100]} unit="%" />
              <Tooltip contentStyle={{ borderRadius: '12px' }} formatter={(v: any) => [`${v}%`, '완료율']} />
              <Area type="monotone" dataKey="rate" stroke="#06b6d4" fill="#06b6d4" fillOpacity={0.15} strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 차트 2행: 상태 + 분류 */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/60 bg-white/70 p-4 shadow-sm backdrop-blur-xl sm:p-5 dark:border-gray-800/60 dark:bg-gray-900/70">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold"><PieIcon className="h-4 w-4 text-purple-600" />상태별 분포</h3>
          <div className="flex flex-col items-center sm:flex-row">
            <ResponsiveContainer width="100%" height={200} className="sm:!w-1/2">
              <PieChart><Pie data={statusData} cx="50%" cy="50%" innerRadius={45} outerRadius={75} paddingAngle={3} dataKey="value">
                {statusData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Pie><Tooltip /></PieChart>
            </ResponsiveContainer>
            <div className="mt-3 flex w-full flex-wrap gap-x-4 gap-y-1.5 sm:mt-0 sm:flex-1 sm:flex-col sm:space-y-1.5">
              {statusData.map((d, i) => (
                <div key={d.status} className="flex items-center gap-2 text-xs">
                  <div className="h-2.5 w-2.5 flex-shrink-0 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                  <span className="text-muted-foreground">{d.name}</span>
                  <span className="ml-auto font-semibold">{d.value}건</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-white/60 bg-white/70 p-4 shadow-sm backdrop-blur-xl sm:p-5 dark:border-gray-800/60 dark:bg-gray-900/70">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold"><Layers className="h-4 w-4 text-indigo-600" />대분류별 분포</h3>
          <div className="flex flex-col items-center sm:flex-row">
            <ResponsiveContainer width="100%" height={200} className="sm:!w-1/2">
              <PieChart><Pie data={classData} cx="50%" cy="50%" outerRadius={75} paddingAngle={2} dataKey="count">
                {classData.map((_, i) => <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />)}
              </Pie><Tooltip /></PieChart>
            </ResponsiveContainer>
            <div className="mt-3 flex w-full flex-wrap gap-x-4 gap-y-1.5 sm:mt-0 sm:flex-1 sm:flex-col sm:space-y-1.5">
              {classData.map((d, i) => (
                <div key={d.name} className="flex items-center gap-2 text-xs">
                  <div className="h-2.5 w-2.5 flex-shrink-0 rounded-full" style={{ backgroundColor: CHART_COLORS[i % CHART_COLORS.length] }} />
                  <span className="text-muted-foreground truncate">{d.name}</span>
                  <span className="ml-auto font-semibold">{d.count}건</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* 차트 3행: 중분류 + 부서별 */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/60 bg-white/70 p-4 shadow-sm backdrop-blur-xl sm:p-5 dark:border-gray-800/60 dark:bg-gray-900/70">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold"><BarChart3 className="h-4 w-4 text-emerald-600" />중분류별 Top 10</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={categoryData} layout="vertical" margin={{ top: 5, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 9 }} width={80} />
              <Tooltip />
              <Bar dataKey="count" fill="#10b981" radius={[0, 4, 4, 0]}>
                <LabelList dataKey="count" position="right" style={{ fontSize: 9, fontWeight: 600 }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-2xl border border-white/60 bg-white/70 p-4 shadow-sm backdrop-blur-xl sm:p-5 dark:border-gray-800/60 dark:bg-gray-900/70">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold"><Users className="h-4 w-4 text-pink-600" />발생부서별 분포</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={deptData} layout="vertical" margin={{ top: 5, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 9 }} width={80} />
              <Tooltip />
              <Bar dataKey="count" fill="#ec4899" radius={[0, 4, 4, 0]}>
                <LabelList dataKey="count" position="right" style={{ fontSize: 9, fontWeight: 600 }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 차트 4행: 협력사 + 고객사 */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/60 bg-white/70 p-4 shadow-sm backdrop-blur-xl sm:p-5 dark:border-gray-800/60 dark:bg-gray-900/70">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold"><Building2 className="h-4 w-4 text-green-600" />협력사별 변동점</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={companyData} layout="vertical" margin={{ top: 5, right: 20, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
              <XAxis type="number" tick={{ fontSize: 10 }} allowDecimals={false} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 9 }} width={80} />
              <Tooltip />
              <Bar dataKey="count" fill="#22c55e" radius={[0, 4, 4, 0]}>
                <LabelList dataKey="count" position="right" style={{ fontSize: 9, fontWeight: 600 }} />
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-2xl border border-white/60 bg-white/70 p-4 shadow-sm backdrop-blur-xl sm:p-5 dark:border-gray-800/60 dark:bg-gray-900/70">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold"><Building2 className="h-4 w-4 text-blue-600" />고객사별 변동점</h3>
          <div className="flex flex-col items-center sm:flex-row">
            <ResponsiveContainer width="100%" height={180} className="sm:!w-1/2">
              <PieChart><Pie data={customerData} cx="50%" cy="50%" outerRadius={65} paddingAngle={2} dataKey="count">
                {customerData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />)}
              </Pie><Tooltip /></PieChart>
            </ResponsiveContainer>
            <div className="mt-3 flex w-full flex-wrap gap-x-4 gap-y-1.5 sm:mt-0 sm:flex-1 sm:flex-col sm:space-y-1.5">
              {customerData.map((d, i) => (
                <div key={d.name} className="flex items-center gap-2 text-xs">
                  <div className="h-2.5 w-2.5 flex-shrink-0 rounded-full" style={{ backgroundColor: PIE_COLORS[i % PIE_COLORS.length] }} />
                  <span className="text-muted-foreground truncate">{d.name}</span>
                  <span className="ml-auto font-semibold">{d.count}건</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* AI 인사이트 */}
      <div className="rounded-2xl border border-white/60 bg-white/70 p-4 shadow-sm backdrop-blur-xl sm:p-5 dark:border-gray-800/60 dark:bg-gray-900/70">
        <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold"><Lightbulb className="h-4 w-4 text-violet-600" />AI 인사이트</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {insights.map((insight, i) => {
            const Icon = insight.icon;
            return (
              <div key={i} className={`rounded-xl border p-3.5 ${insightBg[insight.type]}`}>
                <div className="flex items-start gap-2.5">
                  <Icon className={`mt-0.5 h-4 w-4 flex-shrink-0 ${insightIcon[insight.type]}`} />
                  <div>
                    <p className="text-xs font-semibold">{insight.title}</p>
                    <p className="mt-0.5 text-[11px] text-muted-foreground leading-relaxed">{insight.desc}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
