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
  UserCog, Users as UsersIcon, Building2,
} from 'lucide-react';

const ROLE_MAP: Record<string, { label: string; desc: string; color: string }> = {
  ADMIN: { label: '관리자', desc: '시스템 전체 관리 / 승인·접수 전체 권한', color: 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400' },
  TIER1_EDITOR: { label: '1차사 담당자', desc: '변동점 등록·수정 / 접수 권한', color: 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' },
  TIER2_EDITOR: { label: '협력사 담당자', desc: '자사 변동점 등록·수정 / 접수 권한', color: 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400' },
  TIER1_REVIEWER: { label: '1차사 검토자', desc: '변동점 검토 / 승인(1단계) 권한', color: 'bg-purple-50 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400' },
  EXEC_APPROVER: { label: '전담중역', desc: '변동점 최종 승인 권한', color: 'bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400' },
  CUSTOMER_VIEWER: { label: '고객사 뷰어', desc: '열람 전용 (수정 불가)', color: 'bg-gray-50 text-gray-700 dark:bg-gray-800 dark:text-gray-400' },
};

interface FormData {
  email: string;
  password: string;
  name: string;
  role: string;
  companyId: string;
}

const emptyForm: FormData = { email: '', password: '', name: '', role: 'TIER2_EDITOR', companyId: '' };

export default function UserManagementPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
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
    });
    setShowForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingId) {
      const data: any = { name: form.name, role: form.role, companyId: form.companyId };
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
    const matchRole = roleFilter === 'ALL' || u.role === roleFilter;
    return matchSearch && matchRole;
  });

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'ADMIN': return <Shield className="h-3.5 w-3.5" />;
      case 'TIER1_REVIEWER':
      case 'EXEC_APPROVER': return <UserCheck className="h-3.5 w-3.5" />;
      case 'CUSTOMER_VIEWER': return <Eye className="h-3.5 w-3.5" />;
      default: return <UserCog className="h-3.5 w-3.5" />;
    }
  };

  return (
    <div className="space-y-5">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">사용자 관리</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            관리자·담당자·협력사 계정을 관리합니다 ({userList.length}명)
          </p>
        </div>
        <Button size="sm" onClick={openCreate} className="sm:hidden">
          <Plus className="mr-1 h-4 w-4" />
          추가
        </Button>
        <Button onClick={openCreate} className="hidden sm:inline-flex">
          <Plus className="mr-2 h-4 w-4" />
          사용자 추가
        </Button>
      </div>

      {/* 권한 안내 카드 */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {Object.entries(ROLE_MAP).map(([key, { label, color }]) => {
          const count = userList.filter((u) => u.role === key).length;
          return (
            <button
              key={key}
              onClick={() => setRoleFilter(roleFilter === key ? 'ALL' : key)}
              className={`rounded-xl border p-2.5 text-center transition-all sm:p-3 ${
                roleFilter === key
                  ? 'border-primary/40 bg-primary/5 ring-1 ring-primary/20'
                  : 'border-white/60 bg-white/70 dark:border-gray-800/60 dark:bg-gray-900/70'
              }`}
            >
              <p className="text-lg font-bold sm:text-xl">{count}</p>
              <p className="mt-0.5 text-[10px] font-medium text-muted-foreground sm:text-xs">{label}</p>
            </button>
          );
        })}
      </div>

      {/* 검색 */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/50" />
          <Input
            placeholder="이름, 이메일, 회사 검색..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <select
          value={roleFilter}
          onChange={(e) => setRoleFilter(e.target.value)}
          className="h-11 rounded-xl border border-input bg-background/60 px-4 text-sm backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
        >
          <option value="ALL">전체 역할</option>
          {Object.entries(ROLE_MAP).map(([key, { label }]) => (
            <option key={key} value={key}>{label}</option>
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
              <label className="mb-1 block text-xs font-medium text-muted-foreground">이메일 (아이디)</label>
              <Input
                type="text"
                placeholder="user@email.com"
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
              <label className="mb-1 block text-xs font-medium text-muted-foreground">역할 (권한)</label>
              <select
                value={form.role}
                onChange={(e) => setForm({ ...form, role: e.target.value })}
                className="h-11 w-full rounded-xl border border-input bg-background/60 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
              >
                {Object.entries(ROLE_MAP).map(([key, { label, desc }]) => (
                  <option key={key} value={key}>{label} - {desc}</option>
                ))}
              </select>
            </div>
            <div className="sm:col-span-2">
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
                  <th className="whitespace-nowrap px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">이메일 (아이디)</th>
                  <th className="whitespace-nowrap px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">역할</th>
                  <th className="whitespace-nowrap px-5 py-3 text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">소속</th>
                  <th className="px-5 py-3 text-right text-xs font-medium uppercase tracking-wider text-muted-foreground">관리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {filtered.map((u) => {
                  const roleInfo = ROLE_MAP[u.role] || { label: u.role, color: '' };
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
                      <td className="whitespace-nowrap px-5 py-3.5 text-muted-foreground">{u.email}</td>
                      <td className="whitespace-nowrap px-5 py-3.5">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${roleInfo.color}`}>
                          {getRoleIcon(u.role)}
                          {roleInfo.label}
                        </span>
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
            {filtered.map((u) => {
              const roleInfo = ROLE_MAP[u.role] || { label: u.role, color: '' };
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
                        <p className="text-xs text-muted-foreground">{u.email}</p>
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
                  <div className="mt-2 flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ${roleInfo.color}`}>
                      {getRoleIcon(u.role)}
                      {roleInfo.label}
                    </span>
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
        </div>
      )}
    </div>
  );
}
