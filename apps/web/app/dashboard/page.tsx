'use client';

import { useMemo } from 'react';
import { useAuth } from '@/contexts/auth-context';
import { changeEvents, excel } from '@/lib/api-client';
import { useQuery } from '@tanstack/react-query';
import { ChangeEvent } from '@/types';
import { formatDate, getStatusBadgeClass, getStatusText, getStatusIconClass } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell,
} from 'recharts';
import {
  Plus, FileEdit, Clock, Send, CheckCircle2, ShieldCheck,
  ArrowRight, Download, TrendingUp, AlertTriangle, Lightbulb, BarChart3,
} from 'lucide-react';

const statusConfig = [
  { key: 'DRAFT', label: '임시저장', icon: Clock },
  { key: 'SUBMITTED', label: '제출됨', icon: Send },
  { key: 'REVIEWED', label: '검토완료', icon: CheckCircle2 },
  { key: 'APPROVED', label: '승인완료', icon: ShieldCheck },
];

const PIE_COLORS = ['#6b7280', '#3b82f6', '#10b981', '#22c55e', '#a855f7', '#ef4444', '#f59e0b'];

export default function DashboardPage() {
  const { user } = useAuth();
  const router = useRouter();

  const { data: events = [], isLoading } = useQuery<ChangeEvent[]>({
    queryKey: ['change-events'],
    queryFn: () => changeEvents.list().then((res) => res.data),
  });

  // 상태별 건수
  const statusCounts = events.reduce(
    (acc, event) => {
      acc[event.status] = (acc[event.status] || 0) + 1;
      return acc;
    },
    {} as Record<string, number>,
  );

  // 월별 추이 데이터
  const monthlyTrend = useMemo(() => {
    const months: Record<string, number> = {};
    events.forEach((e) => {
      const month = e.receiptMonth || 'N/A';
      months[month] = (months[month] || 0) + 1;
    });
    return Object.entries(months)
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-6)
      .map(([month, count]) => ({ month: month.slice(5) + '월', count }));
  }, [events]);

  // 상태별 파이 차트 데이터
  const statusPieData = useMemo(() => {
    return Object.entries(statusCounts).map(([status, count]) => ({
      name: getStatusText(status),
      value: count,
      status,
    }));
  }, [statusCounts]);

  // AI 인사이트 생성
  const insights = useMemo(() => {
    const result: { icon: any; title: string; desc: string; type: 'info' | 'warning' | 'success' }[] = [];
    const total = events.length;
    if (total === 0) return result;

    // 승인 비율
    const approved = statusCounts['APPROVED'] || 0;
    const rate = Math.round((approved / total) * 100);
    result.push({
      icon: TrendingUp,
      title: `승인율 ${rate}%`,
      desc: `전체 ${total}건 중 ${approved}건이 승인 완료되었습니다.`,
      type: rate >= 70 ? 'success' : 'info',
    });

    // 보완요청 건수
    const returned = statusCounts['REVIEW_RETURNED'] || 0;
    if (returned > 0) {
      result.push({
        icon: AlertTriangle,
        title: `보완요청 ${returned}건`,
        desc: '검토 후 보완이 필요한 변동점이 있습니다. 빠른 조치가 필요합니다.',
        type: 'warning',
      });
    }

    // 가장 많은 고객사
    const customerCounts: Record<string, number> = {};
    events.forEach((e) => { customerCounts[e.customer] = (customerCounts[e.customer] || 0) + 1; });
    const topCustomer = Object.entries(customerCounts).sort(([, a], [, b]) => b - a)[0];
    if (topCustomer) {
      result.push({
        icon: Lightbulb,
        title: `주요 고객사: ${topCustomer[0]}`,
        desc: `${topCustomer[0]}에서 ${topCustomer[1]}건의 변동점이 발생했습니다. 집중 관리가 권장됩니다.`,
        type: 'info',
      });
    }

    // 최근 변동점 추세
    if (monthlyTrend.length >= 2) {
      const last = monthlyTrend[monthlyTrend.length - 1]?.count || 0;
      const prev = monthlyTrend[monthlyTrend.length - 2]?.count || 0;
      if (last > prev) {
        result.push({
          icon: BarChart3,
          title: '변동점 증가 추세',
          desc: `이번 달 변동점이 전월 대비 ${last - prev}건 증가했습니다. 원인 분석을 권장합니다.`,
          type: 'warning',
        });
      } else if (last < prev) {
        result.push({
          icon: BarChart3,
          title: '변동점 감소 추세',
          desc: `이번 달 변동점이 전월 대비 ${prev - last}건 감소했습니다. 관리 효과가 나타나고 있습니다.`,
          type: 'success',
        });
      }
    }

    return result;
  }, [events, statusCounts, monthlyTrend]);

  const handleExcelExport = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    excel.downloadMonthly(year, month);
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

  return (
    <div className="space-y-6">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">대시보드</h1>
          <p className="mt-1 text-sm text-muted-foreground">변동점 현황을 한눈에 확인하세요</p>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={handleExcelExport} className="hidden sm:inline-flex">
            <Download className="mr-1.5 h-4 w-4" />
            월간 리포트
          </Button>
          <Button size="sm" className="sm:hidden" onClick={() => router.push('/change-events/new')}>
            <Plus className="mr-1 h-4 w-4" />
            등록
          </Button>
          <Button className="hidden sm:inline-flex" onClick={() => router.push('/change-events/new')}>
            <Plus className="mr-2 h-4 w-4" />
            변동점 등록
          </Button>
        </div>
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

      {/* 차트 영역 */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* 월별 추이 */}
        <div className="rounded-2xl border border-white/60 bg-white/70 p-5 shadow-sm backdrop-blur-xl dark:border-gray-800/60 dark:bg-gray-900/70">
          <h3 className="mb-4 text-sm font-semibold">월별 변동점 발생 추이</h3>
          {monthlyTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={monthlyTrend} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    borderRadius: '12px',
                    border: '1px solid #e5e7eb',
                    boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                  }}
                />
                <Bar dataKey="count" name="변동점" fill="#3b82f6" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">
              데이터가 없습니다
            </div>
          )}
        </div>

        {/* 상태 분포 */}
        <div className="rounded-2xl border border-white/60 bg-white/70 p-5 shadow-sm backdrop-blur-xl dark:border-gray-800/60 dark:bg-gray-900/70">
          <h3 className="mb-4 text-sm font-semibold">상태별 분포</h3>
          {statusPieData.length > 0 ? (
            <div className="flex items-center">
              <ResponsiveContainer width="50%" height={220}>
                <PieChart>
                  <Pie
                    data={statusPieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {statusPieData.map((_, idx) => (
                      <Cell key={idx} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 space-y-2">
                {statusPieData.map((d, idx) => (
                  <div key={d.status} className="flex items-center gap-2 text-xs">
                    <div
                      className="h-2.5 w-2.5 rounded-full"
                      style={{ backgroundColor: PIE_COLORS[idx % PIE_COLORS.length] }}
                    />
                    <span className="text-muted-foreground">{d.name}</span>
                    <span className="ml-auto font-semibold">{d.value}건</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex h-[220px] items-center justify-center text-sm text-muted-foreground">
              데이터가 없습니다
            </div>
          )}
        </div>
      </div>

      {/* AI 인사이트 */}
      {insights.length > 0 && (
        <div className="rounded-2xl border border-white/60 bg-white/70 p-5 shadow-sm backdrop-blur-xl dark:border-gray-800/60 dark:bg-gray-900/70">
          <div className="mb-4 flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-violet-500 to-blue-500">
              <Lightbulb className="h-4 w-4 text-white" />
            </div>
            <h3 className="text-sm font-semibold">AI 인사이트</h3>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {insights.map((insight, idx) => {
              const Icon = insight.icon;
              return (
                <div
                  key={idx}
                  className={`rounded-xl border p-4 ${insightBg[insight.type]}`}
                >
                  <div className="flex items-start gap-3">
                    <Icon className={`mt-0.5 h-5 w-5 flex-shrink-0 ${insightIcon[insight.type]}`} />
                    <div>
                      <p className="text-sm font-semibold">{insight.title}</p>
                      <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{insight.desc}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 최근 변동점 목록 */}
      <div className="overflow-hidden rounded-2xl border border-white/60 bg-white/70 shadow-sm backdrop-blur-xl dark:border-gray-800/60 dark:bg-gray-900/70">
        <div className="flex items-center justify-between p-5 sm:p-6">
          <h3 className="text-base font-semibold tracking-tight">최근 변동점</h3>
          <button
            onClick={() => router.push('/change-events/my')}
            className="flex items-center gap-1 text-xs font-medium text-primary transition-colors hover:text-primary/80"
          >
            전체보기 <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : events.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 dark:bg-gray-800">
              <FileEdit className="h-6 w-6 text-muted-foreground/50" />
            </div>
            <p className="mt-3 text-sm font-medium text-muted-foreground">등록된 변동점이 없습니다</p>
            <Button size="sm" className="mt-4" onClick={() => router.push('/change-events/new')}>
              <Plus className="mr-1 h-4 w-4" /> 첫 변동점 등록
            </Button>
          </div>
        ) : (
          <>
            {/* 데스크톱 테이블 */}
            <div className="hidden sm:block">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-t border-b border-gray-100 bg-gray-50/50 dark:border-gray-800 dark:bg-gray-800/30">
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
                  {events.slice(0, 5).map((event) => (
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

            {/* 모바일 카드 */}
            <div className="space-y-2 p-4 pt-0 sm:hidden">
              {events.slice(0, 5).map((event) => (
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
          </>
        )}
      </div>
    </div>
  );
}
