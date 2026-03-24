'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { users } from '@/lib/api-client';
import { User, Company } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import {
  Plus, Pencil, Trash2, X, Search, Shield, UserCheck, Eye,
  UserCog, Users as UsersIcon, Building2, ChevronRight, KeyRound,
} from 'lucide-react';

/* ── 역할 정의 ── */
const ROLE_MAP: Record<string, { label: string; shortLabel: string; group: string; level: number; desc: string; color: string; badgeColor: string }> = {
  ADMIN:           { label: '관리자',       shortLabel: '관리자',   group: '관리자',     level: 0, desc: '시스템 전체 관리 / 전체 권한',               color: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400',         badgeColor: 'bg-red-500' },
  TIER1_EDITOR:    { label: '캠스 담당자',  shortLabel: '담당자',   group: '본사(캠스)', level: 1, desc: '변동점 등록·수정·접수 / 1차 승인',           color: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',     badgeColor: 'bg-blue-500' },
  TIER1_REVIEWER:  { label: '중역',         shortLabel: '중역',     group: '본사(캠스)', level: 2, desc: '변동점 검토·1차 승인 / 주간 점검',         color: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400', badgeColor: 'bg-indigo-500' },
  EXEC_APPROVER:   { label: '전담중역',     shortLabel: '전담중역', group: '본사(캠스)', level: 3, desc: '변동점 최종 승인 / 사장님 보고',               color: 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400', badgeColor: 'bg-purple-500' },
  TIER2_EDITOR:    { label: '협력사 담당자', shortLabel: '담당자',  group: '협력사',     level: 1, desc: '자사 변동점 등록·수정 / 접수',               color: 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400', badgeColor: 'bg-green-500' },
  CUSTOMER_VIEWER: { label: '고객사 뷰어',  shortLabel: '뷰어',    group: '협력사',     level: 0, desc: '열람 전용 (수정 불가)',                       color: 'bg-gray-50 text-gray-700 dark:bg-gray-800 dark:text-gray-400',       badgeColor: 'bg-gray-500' },
};

/* ── 그룹 정의 ── */
const ROLE_GROUPS = [
  { key: '관리자',     label: '관리자',     roles: ['ADMIN'], icon: Shield, accent: 'text-red-600 dark:text-red-400', border: 'border-red-200 dark:border-red-800' },
  { key: '본사(캠스)', label: '본사(캠스)', roles: ['TIER1_EDITOR', 'TIER1_REVIEWER', 'EXEC_APPROVER'], icon: UserCog, accent: 'text-blue-600 dark:text-blue-400', border: 'border-blue-200 dark:border-blue-800', subLabels: { 'TIER1_EDITOR': '담당자', 'TIER1_REVIEWER': '담당자', 'EXEC_APPROVER': '중역' } },
  { key: '협력사',     label: '협력사',     roles: ['TIER2_EDITOR', 'CUSTOMER_VIEWER'], icon: Building2, accent: 'text-green-600 dark:text-green-400', border: 'border-green-200 dark:border-green-800' },
];

/* ── 승인 플로우 ── */
const APPROVAL_FLOW = [
  { role: 'TIER1_EDITOR',   step: '접수·등록·1차승인', color: 'bg-blue-500', textColor: 'text-blue-700 dark:text-blue-400' },
  { role: 'EXEC_APPROVER',   step: '최종승인',          color: 'bg-purple-500', textColor: 'text-purple-700 dark:text-purple-400' },
];

interface FormData {
  email: string;
  password: string;
  name: string;
  role: string;
  companyId: string;
  team: string;
  position: string;
  phone: string;
}

const emptyForm: FormData = { email: '', password: '', name: '', role: 'TIER2_EDITOR', companyId: '', team: '', position: '', phone: '' };

export default function UserManagementPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [groupFilter, setGroupFilter] = useState('ALL');
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 15;
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);

  const { data: userList = [], isLoading } = useQuery<User[]>({
    queryKey: ['users'],
    queryFn: () => users.list().then((res) => res.data),
  });

  const { data: companies = [] } = useQuery<Company[]>({
    queryKey: ['companies'],
    queryFn: () => users.companies().then((res) => res.data),
  });

  const createMutation = useMutation({
    mutationFn: (data: FormData) => users.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast({ title: '사용자가 생성되었습니다.' });
      closeForm();
    },
    onError: (err: any) => {
      toast({ variant: 'destructive', title: err?.response?.data?.message || '생성 실패' });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<FormData> }) => users.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast({ title: '사용자 정보가 수정되었습니다.' });
      closeForm();
    },
    onError: () => {
      toast({ variant: 'destructive', title: '수정 실패' });
    },
  });

  const resetPwMutation = useMutation({
    mutationFn: ({ id, email }: { id: string; email: string }) => users.update(id, { password: email }),
    onSuccess: () => {
      toast({ title: '비밀번호가 아이디와 동일하게 초기화되었습니다.' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => users.remove(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast({ title: '사용자가 삭제되었습니다.' });
    },
  });

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
  };

  const openEdit = (user: User) => {
    setEditingId(user.id);
    setForm({
      email: user.email,
      password: '',
      name: user.name,
      role: user.role,
      companyId: user.companyId || '',
      team: (user as any).team || '',
      position: (user as any).position || '',
      phone: (user as any).phone || '',
    });
    setShowForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      const data: any = { name: form.name, role: form.role, companyId: form.companyId, team: form.team, position: form.position, phone: form.phone };
      if (form.password) data.password = form.password;
      updateMutation.mutate({ id: editingId, data });
    } else {
      if (!form.email || !form.password || !form.name) {
        toast({ variant: 'destructive', title: '필수 항목을 입력해주세요' });
        return;
      }
      createMutation.mutate(form);
    }
  };

  const filtered = userList.filter((u) => {
    const matchSearch = !search ||
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      (u.company?.name || '').toLowerCase().includes(search.toLowerCase());

    // 그룹 필터
    if (groupFilter !== 'ALL') {
      const group = ROLE_GROUPS.find((g) => g.key === groupFilter);
      if (group && !group.roles.includes(u.role)) return false;
    }

    const matchRole = roleFilter === 'ALL' || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  // 페이지네이션
  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safeCurrentPage = Math.min(currentPage, totalPages);
  const paginatedUsers = filtered.slice((safeCurrentPage - 1) * PAGE_SIZE, safeCurrentPage * PAGE_SIZE);

  // 필터 변경 시 1페이지로 리셋
  const handleFilterChange = (setter: Function, value: any) => {
    setter(value);
    setCurrentPage(1);
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'ADMIN': return <Shield className="h-3.5 w-3.5" />;
      case 'TIER1_REVIEWER':
      case 'EXEC_APPROVER': return <UserCheck className="h-3.5 w-3.5" />;
      case 'CUSTOMER_VIEWER': return <Eye className="h-3.5 w-3.5" />;
      default: return <UserCog className="h-3.5 w-3.5" />;
    }
  };

  const getLevelBadge = (role: string) => {
    const info = ROLE_MAP[role];
    if (!info || info.group !== '본사(캠스)') return null;
    return (
      <span className="ml-1 inline-flex items-center rounded bg-gray-100 px-1 text-[9px] font-bold text-gray-500 dark:bg-gray-800 dark:text-gray-400">
        Lv.{info.level}
      </span>
    );
  };

  return (
    <div className="space-y-5">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">사용자 관리</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            역할·권한별 계정 관리 ({userList.length}명)
          </p>
        </div>
        <Button size="sm" onClick={openCreate} className="sm:hidden">
          <Plus className="mr-1 h-4 w-4" />추가
        </Button>
        <Button onClick={openCreate} className="hidden sm:inline-flex">
          <Plus className="mr-2 h-4 w-4" />사용자 추가
        </Button>
      </div>

      {/* 승인 플로우 안내 */}
      <div className="rounded-2xl border border-white/60 bg-gradient-to-r from-blue-50/80 via-indigo-50/80 to-purple-50/80 p-3 shadow-sm backdrop-blur-xl sm:p-4 dark:from-blue-900/20 dark:via-indigo-900/20 dark:to-purple-900/20 dark:border-gray-800/60">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-muted-foreground sm:text-xs">승인 플로우</p>
        <div className="flex items-center gap-1 sm:gap-2">
          {APPROVAL_FLOW.map((step, i) => (
            <div key={step.role} className="flex items-center gap-1 sm:gap-2">
              <div className="flex items-center gap-1.5 rounded-lg bg-white/80 px-2 py-1.5 shadow-sm dark:bg-gray-800/60 sm:px-3">
                <div className={`h-2 w-2 rounded-full ${step.color}`} />
                <div>
                  <p className={`text-[10px] font-bold sm:text-xs ${step.textColor}`}>{step.step}</p>
                  <p className="text-[9px] text-muted-foreground sm:text-[10px]">{ROLE_MAP[step.role].label}</p>
                </div>
              </div>
              {i < APPROVAL_FLOW.length - 1 && (
                <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40" />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* 그룹별 카드 */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 sm:gap-3">
        {ROLE_GROUPS.map((group) => {
          const GroupIcon = group.icon;
          const count = userList.filter((u) => group.roles.includes(u.role)).length;
          const isActive = groupFilter === group.key;
          return (
            <button
              key={group.key}
              onClick={() => {
                setGroupFilter(isActive ? 'ALL' : group.key);
                setRoleFilter('ALL');
              }}
              className={`rounded-xl border p-3 text-center transition-all sm:p-4 ${
                isActive
                  ? `${group.border} bg-white/90 ring-1 ring-primary/20 shadow-sm dark:bg-gray-900/90`
                  : 'border-white/60 bg-white/70 hover:bg-white/90 dark:border-gray-800/60 dark:bg-gray-900/70 dark:hover:bg-gray-900/90'
              }`}
            >
              <GroupIcon className={`mx-auto mb-1 h-5 w-5 ${group.accent}`} />
              <p className="text-lg font-bold sm:text-xl">{count}</p>
              <p className="mt-0.5 text-[10px] font-medium text-muted-foreground sm:text-xs">{group.label}</p>
              {group.key === '본사(캠스)' ? (
                <div className="mt-1.5 flex flex-wrap justify-center gap-1">
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      setGroupFilter(group.key);
                      setRoleFilter(roleFilter === 'TIER1_EDITOR' ? 'ALL' : 'TIER1_EDITOR');
                    }}
                    className={`cursor-pointer rounded-full px-1.5 py-0.5 text-[9px] font-medium transition-all ${
                      roleFilter === 'TIER1_EDITOR' || roleFilter === 'TIER1_REVIEWER'
                        ? ROLE_MAP.TIER1_EDITOR.color
                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400'
                    }`}
                  >
                    담당자 {userList.filter((u) => u.role === 'TIER1_EDITOR' || u.role === 'TIER1_REVIEWER').length}
                  </span>
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      setGroupFilter(group.key);
                      setRoleFilter(roleFilter === 'EXEC_APPROVER' ? 'ALL' : 'EXEC_APPROVER');
                    }}
                    className={`cursor-pointer rounded-full px-1.5 py-0.5 text-[9px] font-medium transition-all ${
                      roleFilter === 'EXEC_APPROVER'
                        ? ROLE_MAP.EXEC_APPROVER.color
                        : 'bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400'
                    }`}
                  >
                    중역 {userList.filter((u) => u.role === 'EXEC_APPROVER').length}
                  </span>
                </div>
              ) : group.roles.length > 1 && (
                <div className="mt-1.5 flex flex-wrap justify-center gap-1">
                  {group.roles.map((r) => {
                    const ri = ROLE_MAP[r];
                    const rc = userList.filter((u) => u.role === r).length;
                    return (
                      <span
                        key={r}
                        onClick={(e) => {
                          e.stopPropagation();
                          setGroupFilter(group.key);
                          setRoleFilter(roleFilter === r ? 'ALL' : r);
                        }}
                        className={`cursor-pointer rounded-full px-1.5 py-0.5 text-[9px] font-medium transition-all ${
                          roleFilter === r
                            ? ri.color
                            : 'bg-gray-100 text-gray-500 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-400'
                        }`}
                      >
                        {ri.shortLabel} {rc}
                      </span>
                    );
                  })}
                </div>
              )}
            </button>
          );
        })}
      </div>

      {/* 검색 */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/50" />
          <Input
            placeholder="이름, 아이디, 회사 검색..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
            className="pl-10"
          />
        </div>
        <select
          value={groupFilter}
          onChange={(e) => { setGroupFilter(e.target.value); setRoleFilter('ALL'); }}
          className="h-11 rounded-xl border border-input bg-background/60 px-4 text-sm backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
        >
          <option value="ALL">전체 그룹</option>
          {ROLE_GROUPS.map((g) => (
            <option key={g.key} value={g.key}>{g.label}</option>
          ))}
        </select>
      </div>

      {/* 사용자 추가/수정 폼 */}
      {showForm && (
        <div className="rounded-2xl border border-primary/20 bg-primary/5 p-4 shadow-sm backdrop-blur-xl sm:p-5 dark:bg-primary/10">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-sm font-semibold">
              {editingId ? '사용자 수정' : '새 사용자 추가'}
            </h3>
            <button onClick={closeForm} className="rounded-lg p-1 hover:bg-gray-200/60 dark:hover:bg-gray-700/60">
              <X className="h-4 w-4" />
            </button>
          </div>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">아이디 (로그인 ID)</label>
              <Input
                type="text"
                placeholder="user01"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                disabled={!!editingId}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">
                비밀번호 {editingId && '(변경시에만 입력)'}
              </label>
              <Input
                type="password"
                placeholder={editingId ? '변경하지 않으려면 비워두세요' : '비밀번호'}
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">이름</label>
              <Input
                placeholder="홍길동"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">역할 (권한 레벨)</label>
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                className="h-11 w-full rounded-xl border border-input bg-background/60 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
              >
                <optgroup label="── 관리자 ──">
                  <option value="ADMIN">관리자 - 시스템 전체 관리</option>
                </optgroup>
                <optgroup label="── 본사(캠스) ──">
                  <option value="TIER1_EDITOR">캠스 담당자 - 등록·접수·1차승인</option>
                  <option value="TIER1_REVIEWER">중역 - 검토·1차승인·주간점검</option>
                  <option value="EXEC_APPROVER">전담중역 - 최종승인</option>
                </optgroup>
                <optgroup label="── 협력사 ──">
                  <option value="TIER2_EDITOR">협력사 담당자 - 변동점 등록·접수</option>
                  <option value="CUSTOMER_VIEWER">고객사 뷰어 - 열람 전용</option>
                </optgroup>
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">팀/부서</label>
              <Input
                placeholder="품질관리팀"
                value={form.team}
                onChange={(e) => setForm({ ...form, team: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">직급</label>
              <Input
                placeholder="과장"
                value={form.position}
                onChange={(e) => setForm({ ...form, position: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">전화번호</label>
              <Input
                placeholder="010-1234-5678"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">소속 회사</label>
              <select
                value={form.companyId}
                onChange={(e) => setForm({ ...form, companyId: e.target.value })}
                className="h-11 w-full rounded-xl border border-input bg-background/60 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
              >
                <option value="">회사 선택 (선택사항)</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    [{c.type}] {c.name} ({c.code})
                  </option>
                ))}
              </select>
            </div>
            <div className="flex gap-2 sm:col-span-2">
              <Button type="button" variant="outline" onClick={closeForm} className="flex-1 sm:flex-none">
                취소
              </Button>
              <Button type="submit" className="flex-1 sm:flex-none">
                {editingId ? '수정' : '추가'}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* 사용자 목록 */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <UsersIcon className="mb-3 h-10 w-10 text-muted-foreground/30" />
          <p className="text-sm text-muted-foreground">조건에 맞는 사용자가 없습니다</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-white/60 bg-white/70 shadow-sm backdrop-blur-xl dark:border-gray-800/60 dark:bg-gray-900/70">
          {/* 데스크톱 테이블 */}
          <div className="hidden sm:block">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50 dark:border-gray-800 dark:bg-gray-800/30">
                  <th className="whitespace-nowrap px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">이름</th>
                  <th className="whitespace-nowrap px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">아이디</th>
                  <th className="whitespace-nowrap px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">그룹</th>
                  <th className="whitespace-nowrap px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">역할 / 레벨</th>
                  <th className="whitespace-nowrap px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">소속</th>
                  <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">관리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {paginatedUsers.map((u) => {
                  const roleInfo = ROLE_MAP[u.role] || { label: u.role, color: '', group: '-', level: 0, shortLabel: u.role, badgeColor: 'bg-gray-500', desc: '' };
                  return (
                    <tr key={u.id} className="transition-colors hover:bg-gray-50/80 dark:hover:bg-gray-800/40">
                      <td className="whitespace-nowrap px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                            {u.name.charAt(0)}
                          </div>
                          <span className="font-medium">{u.name}</span>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-5 py-3.5 font-mono text-xs text-muted-foreground">{u.email}</td>
                      <td className="whitespace-nowrap px-5 py-3.5">
                        <span className="text-xs font-medium text-muted-foreground">{roleInfo.group}</span>
                      </td>
                      <td className="whitespace-nowrap px-5 py-3.5">
                        <div className="flex items-center gap-1.5">
                          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${roleInfo.color}`}>
                            {getRoleIcon(u.role)}
                            {roleInfo.label}
                          </span>
                          {getLevelBadge(u.role)}
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-5 py-3.5 text-muted-foreground">
                        {u.company ? (
                          <span className="flex items-center gap-1.5">
                            <Building2 className="h-3.5 w-3.5" />
                            {u.company.name}
                          </span>
                        ) : '-'}
                      </td>
                      <td className="whitespace-nowrap px-5 py-3.5 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(u)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-amber-600 hover:text-amber-700"
                            title="비밀번호 초기화"
                            onClick={() => {
                              if (confirm(`${u.name}님의 비밀번호를 아이디(${u.email})와 동일하게 초기화하시겠습니까?`)) {
                                resetPwMutation.mutate({ id: u.id, email: u.email });
                              }
                            }}
                          >
                            <KeyRound className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 text-destructive hover:text-destructive"
                            onClick={() => {
                              if (confirm(`${u.name}님을 삭제하시겠습니까?`)) {
                                deleteMutation.mutate(u.id);
                              }
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* 모바일 카드 */}
          <div className="space-y-2 p-3 sm:hidden">
            {paginatedUsers.map((u) => {
              const roleInfo = ROLE_MAP[u.role] || { label: u.role, color: '', group: '-', level: 0, shortLabel: u.role, badgeColor: 'bg-gray-500', desc: '' };
              return (
                <div
                  key={u.id}
                  className="rounded-xl border border-gray-100 bg-white/60 p-3.5 dark:border-gray-800 dark:bg-gray-800/40"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                        {u.name.charAt(0)}
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{u.name}</p>
                        <p className="font-mono text-[11px] text-muted-foreground">{u.email}</p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => openEdit(u)}
                        className="rounded-lg p-1.5 text-muted-foreground hover:bg-gray-100 dark:hover:bg-gray-700"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button
                        title="비밀번호 초기화"
                        onClick={() => {
                          if (confirm(`${u.name}님의 비밀번호를 아이디(${u.email})와 동일하게 초기화하시겠습니까?`)) {
                            resetPwMutation.mutate({ id: u.id, email: u.email });
                          }
                        }}
                        className="rounded-lg p-1.5 text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20"
                      >
                        <KeyRound className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => {
                          if (confirm(`${u.name}님을 삭제하시겠습니까?`)) {
                            deleteMutation.mutate(u.id);
                          }
                        }}
                        className="rounded-lg p-1.5 text-destructive hover:bg-red-50 dark:hover:bg-red-900/20"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[10px] font-semibold text-gray-600 dark:bg-gray-800 dark:text-gray-400">
                      {roleInfo.group}
                    </span>
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${roleInfo.color}`}>
                      {getRoleIcon(u.role)}
                      {roleInfo.label}
                    </span>
                    {getLevelBadge(u.role)}
                    {u.company && (
                      <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                        <Building2 className="h-3 w-3" />
                        {u.company.name}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* 페이지네이션 */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-gray-100 bg-gray-50/30 px-4 py-3 dark:border-gray-800 dark:bg-gray-800/20">
              <p className="text-xs text-muted-foreground">
                전체 {filtered.length}명 중 {(safeCurrentPage - 1) * PAGE_SIZE + 1}-{Math.min(safeCurrentPage * PAGE_SIZE, filtered.length)}명
              </p>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={safeCurrentPage === 1}
                  className="rounded-lg px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-gray-100 disabled:opacity-30 dark:hover:bg-gray-700"
                >
                  «
                </button>
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={safeCurrentPage === 1}
                  className="rounded-lg px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-gray-100 disabled:opacity-30 dark:hover:bg-gray-700"
                >
                  ‹
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter((p) => p === 1 || p === totalPages || Math.abs(p - safeCurrentPage) <= 2)
                  .reduce<(number | string)[]>((acc, p, i, arr) => {
                    if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push('...');
                    acc.push(p);
                    return acc;
                  }, [])
                  .map((p, i) =>
                    typeof p === 'string' ? (
                      <span key={`ellipsis-${i}`} className="px-1 text-xs text-muted-foreground">…</span>
                    ) : (
                      <button
                        key={p}
                        onClick={() => setCurrentPage(p)}
                        className={`min-w-[28px] rounded-lg px-2 py-1 text-xs font-medium transition-colors ${
                          p === safeCurrentPage
                            ? 'bg-primary text-primary-foreground'
                            : 'text-muted-foreground hover:bg-gray-100 dark:hover:bg-gray-700'
                        }`}
                      >
                        {p}
                      </button>
                    )
                  )}
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safeCurrentPage === totalPages}
                  className="rounded-lg px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-gray-100 disabled:opacity-30 dark:hover:bg-gray-700"
                >
                  ›
                </button>
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={safeCurrentPage === totalPages}
                  className="rounded-lg px-2 py-1 text-xs font-medium text-muted-foreground hover:bg-gray-100 disabled:opacity-30 dark:hover:bg-gray-700"
                >
                  »
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
