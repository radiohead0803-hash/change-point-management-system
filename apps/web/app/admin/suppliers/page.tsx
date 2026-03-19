'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { users } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import api from '@/lib/api';
import {
  Plus, Pencil, Trash2, X, Check, Building2, Search,
  Factory, Truck, Users as UsersIcon,
} from 'lucide-react';

interface Company {
  id: string;
  name: string;
  code: string;
  type: string;
  createdAt: string;
  _count?: { users: number; events: number };
}

export default function SuppliersPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [editing, setEditing] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: '', code: '', type: 'TIER2' });

  // 회사 목록 + 사용자/이벤트 카운트
  const { data: companies = [], isLoading } = useQuery<Company[]>({
    queryKey: ['companies-admin'],
    queryFn: async () => {
      const res = await api.get('/users/companies');
      return res.data;
    },
  });

  const createM = useMutation({
    mutationFn: (data: any) => api.post('/users/companies', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['companies-admin'] }); toast({ title: '협력사가 추가되었습니다.' }); setAdding(false); resetForm(); },
    onError: () => toast({ variant: 'destructive', title: '추가 실패' }),
  });

  const updateM = useMutation({
    mutationFn: ({ id, data }: any) => api.patch(`/users/companies/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['companies-admin'] }); toast({ title: '수정되었습니다.' }); setEditing(null); resetForm(); },
    onError: () => toast({ variant: 'destructive', title: '수정 실패' }),
  });

  const deleteM = useMutation({
    mutationFn: (id: string) => api.delete(`/users/companies/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['companies-admin'] }); toast({ title: '삭제되었습니다.' }); },
    onError: () => toast({ variant: 'destructive', title: '삭제 실패' }),
  });

  const resetForm = () => setForm({ name: '', code: '', type: 'TIER2' });

  const updateField = (field: string, value: string) => setForm(prev => ({ ...prev, [field]: value }));

  const filtered = companies.filter((c: Company) => {
    const matchSearch = !searchTerm ||
      c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.code.toLowerCase().includes(searchTerm.toLowerCase());
    const matchType = filterType === 'all' || c.type === filterType;
    return matchSearch && matchType;
  });

  const typeCounts = {
    all: companies.length,
    TIER1: companies.filter((c: Company) => c.type === 'TIER1').length,
    TIER2: companies.filter((c: Company) => c.type === 'TIER2').length,
    CUSTOMER: companies.filter((c: Company) => c.type === 'CUSTOMER').length,
  };

  const typeLabels: Record<string, string> = { TIER1: '1차사', TIER2: '협력사', CUSTOMER: '고객사' };
  const typeColors: Record<string, string> = {
    TIER1: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    TIER2: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
    CUSTOMER: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
  };
  const typeIcons: Record<string, any> = { TIER1: Factory, TIER2: Truck, CUSTOMER: Building2 };

  const handleAdd = () => {
    if (!form.name || !form.code) {
      toast({ variant: 'destructive', title: '업체명과 코드를 입력해주세요' });
      return;
    }
    createM.mutate(form);
  };

  const handleEdit = (id: string) => {
    const c = companies.find((c: Company) => c.id === id);
    if (!c) return;
    setEditing(id);
    setForm({ name: c.name, code: c.code, type: c.type });
  };

  const handleSaveEdit = () => {
    if (!editing) return;
    updateM.mutate({ id: editing, data: form });
  };

  const handleDelete = (id: string, name: string) => {
    if (!confirm(`"${name}"을(를) 삭제하시겠습니까?`)) return;
    deleteM.mutate(id);
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">협력사 현황</h1>
          <p className="mt-1 text-sm text-muted-foreground">1차사·협력사·고객사 마스터 관리</p>
        </div>
        <Button size="sm" onClick={() => { setAdding(true); setEditing(null); resetForm(); }}>
          <Plus className="mr-1.5 h-4 w-4" />
          <span className="hidden sm:inline">업체 추가</span>
          <span className="sm:hidden">추가</span>
        </Button>
      </div>

      {/* 통계 카드 */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {Object.entries(typeCounts).map(([key, count]) => {
          const Icon = typeIcons[key] || Building2;
          return (
            <button
              key={key}
              onClick={() => setFilterType(key)}
              className={`rounded-2xl border p-3 text-left transition-all sm:p-4 ${
                filterType === key
                  ? 'border-primary/30 bg-primary/5 shadow-sm'
                  : 'border-white/60 bg-white/70 hover:bg-gray-50 dark:border-gray-800/60 dark:bg-gray-900/70 dark:hover:bg-gray-800/50'
              }`}
            >
              <div className="flex items-center gap-2">
                <Icon className={`h-4 w-4 ${filterType === key ? 'text-primary' : 'text-muted-foreground/50'}`} />
                <span className="text-lg font-bold sm:text-2xl">{count}</span>
              </div>
              <p className="mt-0.5 text-[10px] font-medium text-muted-foreground sm:text-xs">
                {key === 'all' ? '전체 업체' : typeLabels[key] || key}
              </p>
            </button>
          );
        })}
      </div>

      {/* 검색 */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/40" />
        <input
          className="h-10 w-full rounded-xl border border-input bg-white/60 pl-9 pr-4 text-sm backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-ring/40 dark:bg-gray-900/60"
          placeholder="업체명, 코드 검색..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* 추가/수정 폼 */}
      {(adding || editing) && (
        <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-4 shadow-sm backdrop-blur-xl sm:p-5 dark:border-blue-900/30 dark:bg-blue-900/10">
          <h3 className="mb-3 text-sm font-semibold text-blue-700 dark:text-blue-400">
            {adding ? '새 업체 추가' : '업체 수정'}
          </h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Input placeholder="업체명 *" value={form.name} onChange={e => updateField('name', e.target.value)} className="text-sm" />
            <Input placeholder="코드 *" value={form.code} onChange={e => updateField('code', e.target.value)} className="text-sm" />
            <select
              value={form.type}
              onChange={e => updateField('type', e.target.value)}
              className="h-11 w-full rounded-xl border border-input bg-background/60 px-3 text-sm"
            >
              <option value="TIER1">1차사</option>
              <option value="TIER2">협력사</option>
              <option value="CUSTOMER">고객사</option>
            </select>
          </div>
          <div className="mt-3 flex gap-2 justify-end">
            <Button variant="outline" size="sm" onClick={() => { setAdding(false); setEditing(null); }}>취소</Button>
            <Button size="sm" onClick={adding ? handleAdd : handleSaveEdit}>
              <Check className="mr-1 h-3.5 w-3.5" />
              {adding ? '추가' : '저장'}
            </Button>
          </div>
        </div>
      )}

      {/* 테이블 */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : (
        <div className="rounded-2xl border border-white/60 bg-white/70 shadow-sm backdrop-blur-xl dark:border-gray-800/60 dark:bg-gray-900/70 overflow-hidden">
          {/* Desktop */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50 dark:border-gray-800 dark:bg-gray-800/30">
                  <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">코드</th>
                  <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">업체명</th>
                  <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">구분</th>
                  <th className="px-4 py-3 text-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">소속 인원</th>
                  <th className="px-4 py-3 text-center text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">변동점 건수</th>
                  <th className="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-wider text-muted-foreground w-20">관리</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-gray-800/50">
                {filtered.map((c: Company) => {
                  const Icon = typeIcons[c.type] || Building2;
                  return (
                    <tr key={c.id} className="transition-colors hover:bg-gray-50/80 dark:hover:bg-gray-800/40">
                      <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-muted-foreground">{c.code}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <Icon className="h-4 w-4 text-muted-foreground/40" />
                          <span className="font-medium">{c.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${typeColors[c.type] || ''}`}>
                          {typeLabels[c.type] || c.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center text-muted-foreground">{c._count?.users ?? '-'}</td>
                      <td className="px-4 py-3 text-center text-muted-foreground">{c._count?.events ?? '-'}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button onClick={() => handleEdit(c.id)} className="rounded p-1 text-muted-foreground/50 hover:text-primary hover:bg-primary/10"><Pencil className="h-3.5 w-3.5" /></button>
                          <button onClick={() => handleDelete(c.id, c.name)} className="rounded p-1 text-muted-foreground/50 hover:text-destructive hover:bg-red-50 dark:hover:bg-red-900/20"><Trash2 className="h-3.5 w-3.5" /></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr><td colSpan={6} className="py-16 text-center text-sm text-muted-foreground/50">업체 데이터가 없습니다</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="sm:hidden divide-y divide-gray-50 dark:divide-gray-800/50">
            {filtered.map((c: Company) => {
              const Icon = typeIcons[c.type] || Building2;
              return (
                <div key={c.id} className="p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <Icon className="h-4 w-4 text-primary" />
                        <span className="font-medium text-sm">{c.name}</span>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${typeColors[c.type] || ''}`}>
                          {typeLabels[c.type] || c.type}
                        </span>
                      </div>
                      <div className="mt-1 flex gap-3 text-xs text-muted-foreground">
                        <span>코드: {c.code}</span>
                        {c._count && <span>인원: {c._count.users}명</span>}
                        {c._count && <span>변동점: {c._count.events}건</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => handleEdit(c.id)} className="rounded p-1 text-muted-foreground/50 hover:text-primary"><Pencil className="h-3.5 w-3.5" /></button>
                      <button onClick={() => handleDelete(c.id, c.name)} className="rounded p-1 text-muted-foreground/50 hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  </div>
                </div>
              );
            })}
            {filtered.length === 0 && (
              <div className="py-16 text-center text-sm text-muted-foreground/50">업체 데이터가 없습니다</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
