'use client';

import { useMemo, useState } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { changeEvents, excel } from '@/lib/api-client';
import { useQuery } from '@tanstack/react-query';
import { ChangeEvent } from '@/types';
import { formatDate, getStatusBadgeClass, getStatusText, getStatusIconClass } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, LabelList,
} from 'recharts';
import {
  Plus, FileEdit, Clock, Send, CheckCircle2, ShieldCheck,
  ArrowRight, Download, TrendingUp, TrendingDown, AlertTriangle,
  Lightbulb, BarChart3, Building2, Calendar, Filter, Search, FileSpreadsheet,
  ChevronDown,
} from 'lucide-react';

/* ── 접기/펼치기 섹션 ── */
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

function CollapsibleSection({ title, icon: Icon, defaultOpen = true, children, className = '', linkHref }: {
  title: string; icon?: any; defaultOpen?: boolean; children: React.ReactNode; className?: string; linkHref?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const r = useRouter();
  return (
    <div className={`overflow-hidden rounded-2xl border border-white/60 bg-white/70 shadow-sm backdrop-blur-xl dark:border-gray-800/60 dark:bg-gray-900/70 ${className}`}>
      <div className="flex items-center justify-between p-4 sm:p-5">
        <h3
          className={`flex items-center gap-2 text-sm font-semibold ${linkHref ? 'cursor-pointer hover:text-primary transition-colors' : ''}`}
          onClick={() => linkHref && r.push(linkHref)}
        >
          {Icon && <Icon className="h-4 w-4 text-primary" />}
          {title}
          {linkHref && <ArrowRight className="h-3.5 w-3.5 text-muted-foreground/40" />}
        </h3>
        <button onClick={() => setOpen(!open)} className="rounded-lg p-1 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors">
          <ChevronDown className={`h-4 w-4 text-muted-foreground/50 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
        </button>
      </div>
      {open && <div className="border-t border-gray-100 dark:border-gray-800">{children}</div>}
    </div>
  );
}

const statusConfig = [
  { key: 'DRAFT', label: '임시저장', icon: Clock },
  { key: 'SUBMITTED', label: '제출됨', icon: Send },
  { key: 'REVIEWED', label: '검토완료', icon: CheckCircle2 },
  { key: 'APPROVED', label: '승인완료', icon: ShieldCheck },
];

const PIE_COLORS = ['#6b7280', '#3b82f6', '#f59e0b', '#10b981', '#22c55e', '#a855f7', '#ef4444'];
const COMPANY_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#a855f7', '#06b6d4', '#ec4899', '#84cc16'];

type TimeRange = 'week' | 'month' | 'quarter' | 'year' | 'all';

function getTimeRangeFilter(range: TimeRange): Date | null {
  const now = new Date();
  switch (range) {
    case 'week': return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    case 'month': return new Date(now.getFullYear(), now.getMonth(), 1);
    case 'quarter': return new Date(now.getFullYear(), now.getMonth() - 2, 1);
    case 'year': return new Date(now.getFullYear(), 0, 1);
    case 'all': return null;
  }
}

export default function DashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [timeRange, setTimeRange] = useState<TimeRange>('all');

  const { data: allEvents = [], isLoading } = useQuery<ChangeEvent[]>({
    queryKey: ['change-events'],
    queryFn: () => changeEvents.list().then((res) => res.data),
  });

  // 기간 필터링
  const events = useMemo(() => {
    const cutoff = getTimeRangeFilter(timeRange);
    if (!cutoff) return allEvents;
    return allEvents.filter(e => new Date(e.createdAt) >= cutoff);
  }, [allEvents, timeRange]);

  // 상태별 건수
  const statusCounts = useMemo(() => {
    return events.reduce((acc, event) => {
      acc[event.status] = (acc[event.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [events]);

  // 발생 추이 데이터 (기간별)
  const trendData = useMemo(() => {
    const buckets: Record<string, number> = {};
    events.forEach((e) => {
      let key: string;
      if (timeRange === 'week') {
        const d = new Date(e.createdAt);
        key = `${d.getMonth() + 1}/${d.getDate()}`;
      } else {
        key = e.receiptMonth || 'N/A';
      }
      buckets[key] = (buckets[key] || 0) + 1;
    });
    return Object.entries(buckets)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-12)
      .map(([label, count]) => ({
        label: timeRange === 'week' ? label : label.slice(5) + '월',
        count,
      }));
  }, [events, timeRange]);

  // 상태별 파이 차트
  const statusPieData = useMemo(() => {
    return Object.entries(statusCounts).map(([status, count]) => ({
      name: getStatusText(status),
      value: count,
      status,
    }));
  }, [statusCounts]);

  // 업체별 분석
  const companyData = useMemo(() => {
    const counts: Record<string, number> = {};
    events.forEach((e) => {
      const name = e.company?.name || '미지정';
      counts[name] = (counts[name] || 0) + 1;
    });
    return Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 8)
      .map(([name, count]) => ({ name: name.length > 8 ? name.slice(0, 7) + '…' : name, fullName: name, count }));
  }, [events]);

  // 고객사별 분석
  const customerData = useMemo(() => {
    const counts: Record<string, number> = {};
    events.forEach((e) => {
      const cust = e.customer || '미지정';
      counts[cust] = (counts[cust] || 0) + 1;
    });
    return Object.entries(counts)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 6)
      .map(([name, count]) => ({ name: name.length > 8 ? name.slice(0, 7) + '…' : name, fullName: name, count }));
  }, [events]);

  // 반응형 AI 인사이트
  const insights = useMemo(() => {
    const result: { icon: any; title: string; desc: string; type: 'info' | 'warning' | 'success' }[] = [];
    const total = events.length;
    if (total === 0) return result;

    const rangeLabel = { week: '이번 주', month: '이번 달', quarter: '이번 분기', year: '올해', all: '전체' }[timeRange];

    // 승인율
    const approved = statusCounts['APPROVED'] || 0;
    const rate = Math.round((approved / total) * 100);
    result.push({
      icon: rate >= 70 ? TrendingUp : TrendingDown,
      title: `${rangeLabel} 승인율 ${rate}%`,
      desc: `${total}건 중 ${approved}건 승인 완료. ${rate >= 70 ? '양호한 수준입니다.' : '승인 처리를 서둘러주세요.'}`,
      type: rate >= 70 ? 'success' : 'warning',
    });

    // 보완요청 건수
    const returned = statusCounts['REVIEW_RETURNED'] || 0;
    if (returned > 0) {
      const returnRate = Math.round((returned / total) * 100);
      result.push({
        icon: AlertTriangle,
        title: `보완요청 ${returned}건 (${returnRate}%)`,
        desc: returnRate > 20 ? '보완요청 비율이 높습니다. 초기 작성 품질 개선이 필요합니다.' : '빠른 보완 조치를 권장합니다.',
        type: 'warning',
      });
    }

    // 업체별 집중도
    if (companyData.length > 0) {
      const top = companyData[0];
      const topRate = Math.round((top.count / total) * 100);
      result.push({
        icon: Building2,
        title: `주요 협력사: ${top.fullName}`,
        desc: `${top.count}건 (${topRate}%) 발생. ${topRate > 40 ? '특정 업체 집중도가 높아 리스크 관리가 필요합니다.' : '분산 관리가 잘 되고 있습니다.'}`,
        type: topRate > 40 ? 'warning' : 'info',
      });
    }

    // 추이 분석
    if (trendData.length >= 2) {
      const last = trendData[trendData.length - 1]?.count || 0;
      const prev = trendData[trendData.length - 2]?.count || 0;
      const diff = last - prev;
      if (diff > 0) {
        const pct = prev > 0 ? Math.round((diff / prev) * 100) : 100;
        result.push({
          icon: TrendingUp,
          title: `변동점 ${pct}% 증가`,
          desc: `직전 대비 ${diff}건 증가. 원인 분석과 예방 조치를 권장합니다.`,
          type: 'warning',
        });
      } else if (diff < 0) {
        const pct = prev > 0 ? Math.round((Math.abs(diff) / prev) * 100) : 0;
        result.push({
          icon: TrendingDown,
          title: `변동점 ${pct}% 감소`,
          desc: `직전 대비 ${Math.abs(diff)}건 감소. 관리 효과가 나타나고 있습니다.`,
          type: 'success',
        });
      }
    }

    // 미처리 건수
    const pending = (statusCounts['SUBMITTED'] || 0) + (statusCounts['DRAFT'] || 0);
    if (pending > 0) {
      result.push({
        icon: Clock,
        title: `미처리 ${pending}건`,
        desc: `임시저장 ${statusCounts['DRAFT'] || 0}건, 제출대기 ${statusCounts['SUBMITTED'] || 0}건이 처리를 기다리고 있습니다.`,
        type: pending > 10 ? 'warning' : 'info',
      });
    }

    return result;
  }, [events, statusCounts, companyData, trendData, timeRange]);

  const handleExcelExport = () => {
    const now = new Date();
    excel.downloadMonthly(now.getFullYear(), now.getMonth() + 1);
  };

  const insightBg = {
    info: 'bg-blue-50/80 border-blue-100 dark:bg-blue-900/20 dark:border-blue-800/40',
    warning: 'bg-amber-50/80 border-amber-100 dark:bg-amber-900/20 dark:border-amber-800/40',
    success: 'bg-emerald-50/80 border-emerald-100 dark:bg-emerald-900/20 dark:border-emerald-800/40',
  };
  const insightIcon = {
    info: 'text-blue-500',
    warning: 'text-amber-500',
    success: 'text-emerald-500',
  };

  const timeRanges: { key: TimeRange; label: string }[] = [
    { key: 'week', label: '주간' },
    { key: 'month', label: '월간' },
    { key: 'quarter', label: '분기' },
    { key: 'year', label: '연간' },
    { key: 'all', label: '전체' },
  ];

  return (
    <div className="space-y-5">
      {/* 헤더 */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">대시보드</h1>
          <p className="mt-1 text-sm text-muted-foreground">변동점 현황을 한눈에 확인하세요</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={() => router.push(`/report?year=${new Date().getFullYear()}&month=${new Date().getMonth() + 1}`)} className="hidden sm:inline-flex">
            <Download className="mr-1.5 h-4 w-4" />월간 리포트
          </Button>
          <Button size="icon" variant="outline" onClick={() => router.push(`/report?year=${new Date().getFullYear()}&month=${new Date().getMonth() + 1}`)} className="h-9 w-9 sm:hidden">
            <Download className="h-4 w-4" />
          </Button>
          <Button size="sm" className="sm:hidden" onClick={() => router.push('/change-events/new')}>
            <Plus className="mr-1 h-4 w-4" />등록
          </Button>
          <Button className="hidden sm:inline-flex" onClick={() => router.push('/change-events/new')}>
            <Plus className="mr-2 h-4 w-4" />변동점 등록
          </Button>
        </div>
      </div>

      {/* 기간 필터 */}
      <div className="flex items-center gap-2">
        <Calendar className="h-4 w-4 text-muted-foreground" />
        <div className="flex rounded-xl border border-gray-200 bg-white/80 p-0.5 dark:border-gray-700 dark:bg-gray-800/80">
          {timeRanges.map((tr) => (
            <button
              key={tr.key}
              onClick={() => setTimeRange(tr.key)}
              className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                timeRange === tr.key
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tr.label}
            </button>
          ))}
        </div>
        <span className="text-xs text-muted-foreground">{events.length}건</span>
      </div>

      {/* 상태별 카드 */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {statusConfig.map(({ key, label, icon: Icon }) => (
          <div
            key={key}
            className="group relative overflow-hidden rounded-2xl border border-white/60 bg-white/70 p-4 shadow-sm backdrop-blur-xl transition-all duration-200 hover:shadow-md hover:-translate-y-0.5 sm:p-5 dark:border-gray-800/60 dark:bg-gray-900/70"
          >
            <div className="flex items-center justify-between">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-800">
                <Icon className={`h-5 w-5 ${getStatusIconClass(key)}`} />
              </div>
              <span className="text-2xl font-bold tracking-tight sm:text-3xl">
                {statusCounts[key] || 0}
              </span>
            </div>
            <p className="mt-3 text-xs font-medium text-muted-foreground sm:text-sm">{label}</p>
          </div>
        ))}
      </div>

      {/* 시각화 분석 (전체 접기/펼치기) */}
      <CollapsibleSection title="시각화 분석 · AI 인사이트" icon={BarChart3} linkHref="/analytics">
        <div className="space-y-4 p-4 sm:p-5">
          {/* 차트 1행 */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div>
              <h4 className="mb-2 text-xs font-semibold text-muted-foreground flex items-center gap-1.5"><BarChart3 className="h-3.5 w-3.5 text-primary" />발생 추이</h4>
              {trendData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={trendData} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                    <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb' }} />
                    <Bar dataKey="count" name="변동점" fill="#3b82f6" radius={[6, 6, 0, 0]}>
                      <LabelList dataKey="count" position="top" style={{ fontSize: 10, fontWeight: 600, fill: '#6b7280' }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">데이터가 없습니다</div>}
            </div>
            <div>
              <h4 className="mb-2 text-xs font-semibold text-muted-foreground">상태별 분포</h4>
              {statusPieData.length > 0 ? (
                <div className="flex flex-col items-center sm:flex-row">
                  <ResponsiveContainer width="100%" height={180} className="sm:!w-1/2">
                    <PieChart><Pie data={statusPieData} cx="50%" cy="50%" innerRadius={40} outerRadius={65} paddingAngle={3} dataKey="value">
                      {statusPieData.map((_, idx) => (<Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />))}
                    </Pie><Tooltip /></PieChart>
                  </ResponsiveContainer>
                  <div className="mt-3 flex w-full flex-wrap gap-x-4 gap-y-1.5 sm:mt-0 sm:flex-1 sm:flex-col sm:space-y-2">
                    {statusPieData.map((d, idx) => (
                      <div key={d.status} className="flex items-center gap-2 text-xs">
                        <div className="h-2.5 w-2.5 flex-shrink-0 rounded-full" style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }} />
                        <span className="text-muted-foreground">{d.name}</span>
                        <span className="ml-auto font-semibold">{d.value}건</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">데이터가 없습니다</div>}
            </div>
          </div>

          {/* 차트 2행 */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
            <div>
              <h4 className="mb-2 text-xs font-semibold text-muted-foreground flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5 text-green-600" />협력사별 변동점</h4>
              {companyData.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={companyData} layout="vertical" margin={{ top: 5, right: 20, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                    <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={70} />
                    <Tooltip contentStyle={{ borderRadius: '12px', border: '1px solid #e5e7eb' }} />
                    <Bar dataKey="count" fill="#10b981" radius={[0, 6, 6, 0]}>
                      <LabelList dataKey="count" position="right" style={{ fontSize: 10, fontWeight: 600, fill: '#6b7280' }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">데이터가 없습니다</div>}
            </div>
            <div>
              <h4 className="mb-2 text-xs font-semibold text-muted-foreground flex items-center gap-1.5"><Building2 className="h-3.5 w-3.5 text-blue-600" />고객사별 변동점</h4>
              {customerData.length > 0 ? (
                <div className="flex flex-col items-center sm:flex-row">
                  <ResponsiveContainer width="100%" height={180} className="sm:!w-1/2">
                    <PieChart><Pie data={customerData} cx="50%" cy="50%" outerRadius={65} paddingAngle={2} dataKey="count" nameKey="fullName">
                      {customerData.map((_, idx) => (<Cell key={idx} fill={COMPANY_COLORS[idx % COMPANY_COLORS.length]} />))}
                    </Pie><Tooltip /></PieChart>
                  </ResponsiveContainer>
                  <div className="mt-3 flex w-full flex-wrap gap-x-4 gap-y-1.5 sm:mt-0 sm:flex-1 sm:flex-col sm:space-y-2">
                    {customerData.map((d, idx) => (
                      <div key={d.fullName} className="flex items-center gap-2 text-xs">
                        <div className="h-2.5 w-2.5 flex-shrink-0 rounded-full" style={{ backgroundColor: COMPANY_COLORS[idx % COMPANY_COLORS.length] }} />
                        <span className="text-muted-foreground truncate">{d.fullName}</span>
                        <span className="ml-auto font-semibold">{d.count}건</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : <div className="flex h-[200px] items-center justify-center text-sm text-muted-foreground">데이터가 없습니다</div>}
            </div>
          </div>

          {/* AI 인사이트 */}
          {insights.length > 0 && (
            <div>
              <h4 className="mb-2 text-xs font-semibold text-muted-foreground flex items-center gap-1.5"><Lightbulb className="h-3.5 w-3.5 text-violet-600" />AI 인사이트</h4>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {insights.map((insight, idx) => {
                  const Icon = insight.icon;
                  return (
                    <div key={idx} className={`rounded-xl border p-3.5 ${insightBg[insight.type]}`}>
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
          )}
        </div>
      </CollapsibleSection>

      {/* 최근 변동점 - 필수 작성 항목 테이블 */}
      <ChangeEventTable events={allEvents} isLoading={isLoading} router={router} />

    </div>
  );
}

/* ── 변동점 테이블 (필터 + 엑셀 내보내기) ── */
function ChangeEventTable({ events, isLoading, router }: { events: ChangeEvent[]; isLoading: boolean; router: any }) {
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [customerFilter, setCustomerFilter] = useState('ALL');
  const [searchText, setSearchText] = useState('');
  const [exporting, setExporting] = useState(false);

  const customers = useMemo(() => {
    const set = new Set(events.map((e) => e.customer || '').filter(Boolean));
    return Array.from(set).sort();
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
          (e.description || '').toLowerCase().includes(s);
      }
      return true;
    });
  }, [events, dateFrom, dateTo, statusFilter, customerFilter, searchText]);

  const handleExcelExport = async () => {
    setExporting(true);
    try {
      // CSV 생성 (고객사 제출용)
      const headers = ['NO', '발생일', '발생항목(고객사)', '프로젝트', '발생부서', '담당자', '조치시점', '조치방안', '조치결과', '품질검증', '상태', '협력사', '품번', '품명', '변경상세내용'];
      const rows = filtered.map((e, i) => {
        const ev = e as any;
        return [
          i + 1,
          formatDate(e.occurredDate),
          e.customer || '-',
          e.project || '-',
          e.department || '-',
          ev.manager?.name || ev.createdBy?.name || '-',
          ev.actionDate ? formatDate(ev.actionDate) : '미입력',
          ev.actionPlan || '미입력',
          ev.actionResult || '미입력',
          ev.qualityVerification || '미입력',
          getStatusText(e.status),
          ev.company?.name || '-',
          e.partNumber || '-',
          e.productName || '-',
          (e.description || '').replace(/\n/g, ' ').slice(0, 100),
        ].map((v) => `"${v}"`).join(',');
      });
      const bom = '\uFEFF';
      const csv = bom + headers.join(',') + '\n' + rows.join('\n');
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `변동점_필수작성항목_${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      // fallback
    } finally {
      setExporting(false);
    }
  };

  const hasFilters = dateFrom || dateTo || statusFilter !== 'ALL' || customerFilter !== 'ALL' || searchText;

  return (
    <div className="overflow-hidden rounded-2xl border border-white/60 bg-white/70 shadow-sm backdrop-blur-xl dark:border-gray-800/60 dark:bg-gray-900/70">
      {/* 헤더 */}
      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <h3 className="text-sm font-semibold">필수 작성 항목 (발생 & 조치결과)</h3>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={handleExcelExport} disabled={exporting || filtered.length === 0}>
            <FileSpreadsheet className="mr-1.5 h-3.5 w-3.5" />
            {exporting ? '내보내기...' : `엑셀 내보내기 (${filtered.length}건)`}
          </Button>
          <button onClick={() => router.push('/change-events/my')} className="flex items-center gap-1 text-xs font-medium text-primary hover:text-primary/80">
            전체보기 <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* 필터 */}
      <div className="flex flex-wrap items-center gap-2 border-t border-gray-100 bg-gray-50/30 px-4 py-3 dark:border-gray-800 dark:bg-gray-800/20">
        <Filter className="h-3.5 w-3.5 text-muted-foreground/50" />
        <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)}
          className="h-8 rounded-lg border border-input bg-white px-2 text-[11px] focus:outline-none focus:ring-1 focus:ring-ring/40 dark:bg-gray-900 w-[120px]" />
        <span className="text-[10px] text-muted-foreground">~</span>
        <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)}
          className="h-8 rounded-lg border border-input bg-white px-2 text-[11px] focus:outline-none focus:ring-1 focus:ring-ring/40 dark:bg-gray-900 w-[120px]" />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="h-8 rounded-lg border border-input bg-white px-2 text-[11px] focus:outline-none focus:ring-1 focus:ring-ring/40 dark:bg-gray-900">
          <option value="ALL">전체 상태</option>
          <option value="DRAFT">임시저장</option>
          <option value="SUBMITTED">제출됨</option>
          <option value="REVIEW_RETURNED">보완요청</option>
          <option value="REVIEWED">검토완료</option>
          <option value="APPROVED">승인완료</option>
          <option value="CLOSED">종결</option>
        </select>
        <select value={customerFilter} onChange={(e) => setCustomerFilter(e.target.value)}
          className="h-8 rounded-lg border border-input bg-white px-2 text-[11px] focus:outline-none focus:ring-1 focus:ring-ring/40 dark:bg-gray-900">
          <option value="ALL">전체 고객사</option>
          {customers.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <div className="relative">
          <Search className="absolute left-2 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground/40" />
          <input value={searchText} onChange={(e) => setSearchText(e.target.value)} placeholder="검색..."
            className="h-8 w-[100px] rounded-lg border border-input bg-white pl-6 pr-2 text-[11px] focus:outline-none focus:ring-1 focus:ring-ring/40 dark:bg-gray-900 sm:w-[140px]" />
        </div>
        {hasFilters && (
          <button onClick={() => { setDateFrom(''); setDateTo(''); setStatusFilter('ALL'); setCustomerFilter('ALL'); setSearchText(''); }}
            className="text-[10px] text-primary hover:underline">초기화</button>
        )}
        <span className="ml-auto text-[10px] text-muted-foreground">{filtered.length}건</span>
      </div>

      {/* 테이블 */}
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <FileEdit className="mb-3 h-10 w-10 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">{hasFilters ? '조건에 맞는 데이터가 없습니다' : '등록된 변동점이 없습니다'}</p>
        </div>
      ) : (
        <div className="overflow-auto max-h-[500px]">
          <table className="w-full min-w-[1200px] text-xs border-collapse">
            <thead className="sticky top-0 z-10">
              <tr className="border-b border-gray-200 bg-gray-50 dark:border-gray-700 dark:bg-gray-800/60">
                <th className="whitespace-nowrap px-3 py-2.5 text-center text-[10px] font-bold uppercase text-muted-foreground w-10 border-r border-gray-200 dark:border-gray-700">NO</th>
                <th className="whitespace-nowrap px-3 py-2.5 text-center text-[10px] font-bold uppercase text-blue-600 dark:text-blue-400 border-r border-gray-200 dark:border-gray-700" colSpan={6}>발생내역</th>
                <th className="whitespace-nowrap px-3 py-2.5 text-center text-[10px] font-bold uppercase text-amber-600 dark:text-amber-400 border-r border-gray-200 dark:border-gray-700" colSpan={4}>조치결과</th>
                <th className="whitespace-nowrap px-3 py-2.5 text-center text-[10px] font-bold uppercase text-muted-foreground w-16">상태</th>
              </tr>
              <tr className="border-b border-gray-200 bg-gray-50/80 dark:border-gray-700 dark:bg-gray-800/40">
                <th className="px-3 py-1.5 border-r border-gray-200 dark:border-gray-700"></th>
                <th className="whitespace-nowrap px-3 py-1.5 text-center text-[9px] font-semibold text-blue-500/80">발생일</th>
                <th className="whitespace-nowrap px-3 py-1.5 text-center text-[9px] font-semibold text-blue-500/80">대분류</th>
                <th className="whitespace-nowrap px-3 py-1.5 text-center text-[9px] font-semibold text-blue-500/80">중분류</th>
                <th className="whitespace-nowrap px-3 py-1.5 text-center text-[9px] font-semibold text-blue-500/80">세부항목</th>
                <th className="whitespace-nowrap px-3 py-1.5 text-center text-[9px] font-semibold text-blue-500/80">발생부서</th>
                <th className="whitespace-nowrap px-3 py-1.5 text-center text-[9px] font-semibold text-blue-500/80 border-r border-gray-200 dark:border-gray-700">담당자</th>
                <th className="whitespace-nowrap px-3 py-1.5 text-center text-[9px] font-semibold text-amber-500/80">조치시점</th>
                <th className="whitespace-nowrap px-3 py-1.5 text-center text-[9px] font-semibold text-amber-500/80">조치방안</th>
                <th className="whitespace-nowrap px-3 py-1.5 text-center text-[9px] font-semibold text-amber-500/80">조치결과</th>
                <th className="whitespace-nowrap px-3 py-1.5 text-center text-[9px] font-semibold text-amber-500/80 border-r border-gray-200 dark:border-gray-700">품질검증</th>
                <th className="px-3 py-1.5"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800/50">
              {filtered.map((event, idx) => {
                const e = event as any;
                return (
                  <tr key={event.id}
                    className={`cursor-pointer transition-colors hover:bg-blue-50/40 dark:hover:bg-blue-900/10 ${idx % 2 === 0 ? 'bg-white dark:bg-gray-900/40' : 'bg-gray-50/30 dark:bg-gray-800/20'}`}
                    onClick={() => router.push(`/change-events/${event.id}`)}>
                    <td className="whitespace-nowrap px-3 py-3 text-center text-[10px] font-bold text-muted-foreground/40 border-r border-gray-100 dark:border-gray-800">{idx + 1}</td>
                    <td className="whitespace-nowrap px-3 py-3 text-center font-medium">{formatDate(event.occurredDate).slice(5)}</td>
                    <TipCell tip={e.primaryItem?.category?.class?.name || ''} className="max-w-[80px] truncate px-3 py-3 text-center text-[10px]">{e.primaryItem?.category?.class?.name || '-'}</TipCell>
                    <TipCell tip={e.primaryItem?.category?.name || ''} className="max-w-[80px] truncate px-3 py-3 text-center text-[10px] font-medium">{e.primaryItem?.category?.name || '-'}</TipCell>
                    <TipCell tip={e.primaryItem?.name || ''} className="max-w-[90px] truncate px-3 py-3 text-center text-[10px]">{e.primaryItem?.name || '-'}</TipCell>
                    <td className="whitespace-nowrap px-3 py-3 text-center">{event.department || '-'}</td>
                    <td className="whitespace-nowrap px-3 py-3 text-center border-r border-gray-100 dark:border-gray-800">{e.manager?.name || e.createdBy?.name || '-'}</td>
                    <td className={`whitespace-nowrap px-3 py-3 text-center ${!e.actionDate ? 'text-red-400 font-medium' : 'text-emerald-700 dark:text-emerald-400'}`}>
                      {e.actionDate ? formatDate(e.actionDate).slice(5) : '미입력'}
                    </td>
                    <TipCell tip={e.actionPlan || ''} className={`max-w-[120px] truncate px-3 py-3 text-center ${!e.actionPlan ? 'text-red-400 font-medium' : ''}`}>{e.actionPlan || '미입력'}</TipCell>
                    <TipCell tip={e.actionResult || ''} className={`max-w-[120px] truncate px-3 py-3 text-center ${!e.actionResult ? 'text-red-400 font-medium' : ''}`}>{e.actionResult || '미입력'}</TipCell>
                    <TipCell tip={e.qualityVerification || ''} className={`max-w-[100px] truncate px-3 py-3 text-center border-r border-gray-100 dark:border-gray-800 ${!e.qualityVerification ? 'text-red-400 font-medium' : ''}`}>{e.qualityVerification || '미입력'}</TipCell>
                    <td className="whitespace-nowrap px-2 py-2.5 text-center">
                      <span className={`rounded-full px-1.5 py-0.5 text-[9px] font-semibold ${getStatusBadgeClass(event.status)}`}>{getStatusText(event.status)}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
