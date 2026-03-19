'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import api from '@/lib/api';
import {
  Plus, Pencil, Trash2, X, Check, Car, Search, Filter,
} from 'lucide-react';

interface VehicleModel {
  id: string;
  name: string;
  code: string;
  customer: string;
  segment: string;
  year: string;
  status: string;
  createdAt: string;
}

// 차종 관리 API (localStorage 기반 임시 구현 - 추후 백엔드 연결)
const vehicleApi = {
  list: (): VehicleModel[] => {
    if (typeof window === 'undefined') return [];
    const stored = localStorage.getItem('cpms_vehicles');
    return stored ? JSON.parse(stored) : getDefaultVehicles();
  },
  save: (vehicles: VehicleModel[]) => {
    localStorage.setItem('cpms_vehicles', JSON.stringify(vehicles));
  },
};

function getDefaultVehicles(): VehicleModel[] {
  return [
    { id: '1', name: 'NE (아이오닉5)', code: 'NE', customer: '현대자동차', segment: 'CUV', year: '2021', status: '양산', createdAt: new Date().toISOString() },
    { id: '2', name: 'GN (제네시스 GV60)', code: 'GN', customer: '제네시스', segment: 'CUV', year: '2022', status: '양산', createdAt: new Date().toISOString() },
    { id: '3', name: 'MX5 (아이오닉6)', code: 'MX5', customer: '현대자동차', segment: 'Sedan', year: '2022', status: '양산', createdAt: new Date().toISOString() },
    { id: '4', name: 'NE1 (아이오닉5 F/L)', code: 'NE1', customer: '현대자동차', segment: 'CUV', year: '2024', status: '양산', createdAt: new Date().toISOString() },
    { id: '5', name: 'EN1 (EV9)', code: 'EN1', customer: '기아', segment: 'SUV', year: '2023', status: '양산', createdAt: new Date().toISOString() },
    { id: '6', name: 'SV (스타리아)', code: 'SV', customer: '현대자동차', segment: 'MPV', year: '2021', status: '양산', createdAt: new Date().toISOString() },
    { id: '7', name: 'CV (카니발)', code: 'CV', customer: '기아', segment: 'MPV', year: '2020', status: '양산', createdAt: new Date().toISOString() },
    { id: '8', name: 'OE (차세대 프로젝트)', code: 'OE', customer: '현대자동차', segment: 'CUV', year: '2026', status: '개발', createdAt: new Date().toISOString() },
  ];
}

type EditTarget = { id: string } | null;

export default function VehiclesPage() {
  const { toast } = useToast();
  const [vehicles, setVehicles] = useState<VehicleModel[]>(() => vehicleApi.list());
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [editing, setEditing] = useState<EditTarget>(null);
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: '', code: '', customer: '', segment: '', year: '', status: '양산' });

  const updateField = (field: string, value: string) => setForm(prev => ({ ...prev, [field]: value }));

  const filtered = vehicles.filter(v => {
    const matchSearch = !searchTerm ||
      v.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      v.customer.toLowerCase().includes(searchTerm.toLowerCase());
    const matchStatus = filterStatus === 'all' || v.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const statusCounts = {
    all: vehicles.length,
    양산: vehicles.filter(v => v.status === '양산').length,
    개발: vehicles.filter(v => v.status === '개발').length,
    단종: vehicles.filter(v => v.status === '단종').length,
  };

  const handleAdd = () => {
    if (!form.name || !form.code) {
      toast({ variant: 'destructive', title: '차종명과 코드를 입력해주세요' });
      return;
    }
    const newVehicle: VehicleModel = {
      id: Date.now().toString(),
      ...form,
      createdAt: new Date().toISOString(),
    };
    const updated = [newVehicle, ...vehicles];
    setVehicles(updated);
    vehicleApi.save(updated);
    setAdding(false);
    setForm({ name: '', code: '', customer: '', segment: '', year: '', status: '양산' });
    toast({ title: '차종이 추가되었습니다.' });
  };

  const handleEdit = (id: string) => {
    const v = vehicles.find(v => v.id === id);
    if (!v) return;
    setEditing({ id });
    setForm({ name: v.name, code: v.code, customer: v.customer, segment: v.segment, year: v.year, status: v.status });
  };

  const handleSaveEdit = () => {
    if (!editing) return;
    const updated = vehicles.map(v => v.id === editing.id ? { ...v, ...form } : v);
    setVehicles(updated);
    vehicleApi.save(updated);
    setEditing(null);
    setForm({ name: '', code: '', customer: '', segment: '', year: '', status: '양산' });
    toast({ title: '차종 정보가 수정되었습니다.' });
  };

  const handleDelete = (id: string, name: string) => {
    if (!confirm(`"${name}"을(를) 삭제하시겠습니까?`)) return;
    const updated = vehicles.filter(v => v.id !== id);
    setVehicles(updated);
    vehicleApi.save(updated);
    toast({ title: '차종이 삭제되었습니다.' });
  };

  const statusColors: Record<string, string> = {
    양산: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
    개발: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
    단종: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400',
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">차종 현황</h1>
          <p className="mt-1 text-sm text-muted-foreground">프로젝트별 차종 마스터 관리</p>
        </div>
        <Button size="sm" onClick={() => { setAdding(true); setEditing(null); setForm({ name: '', code: '', customer: '', segment: '', year: '', status: '양산' }); }}>
          <Plus className="mr-1.5 h-4 w-4" />
          <span className="hidden sm:inline">차종 추가</span>
          <span className="sm:hidden">추가</span>
        </Button>
      </div>

      {/* 상태 필터 칩 */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(statusCounts).map(([key, count]) => (
          <button
            key={key}
            onClick={() => setFilterStatus(key)}
            className={`rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
              filterStatus === key
                ? 'bg-primary text-white shadow-sm'
                : 'bg-white/70 text-muted-foreground hover:bg-gray-100 dark:bg-gray-800/60 dark:hover:bg-gray-700/60'
            }`}
          >
            {key === 'all' ? '전체' : key} ({count})
          </button>
        ))}
      </div>

      {/* 검색 */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/40" />
        <input
          className="h-10 w-full rounded-xl border border-input bg-white/60 pl-9 pr-4 text-sm backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-ring/40 dark:bg-gray-900/60"
          placeholder="차종명, 코드, 고객사 검색..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* 추가/수정 폼 */}
      {(adding || editing) && (
        <div className="rounded-2xl border border-blue-100 bg-blue-50/50 p-4 shadow-sm backdrop-blur-xl sm:p-5 dark:border-blue-900/30 dark:bg-blue-900/10">
          <h3 className="mb-3 text-sm font-semibold text-blue-700 dark:text-blue-400">
            {adding ? '새 차종 추가' : '차종 수정'}
          </h3>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <Input placeholder="차종명 *" value={form.name} onChange={e => updateField('name', e.target.value)} className="text-sm" />
            <Input placeholder="코드 *" value={form.code} onChange={e => updateField('code', e.target.value)} className="text-sm" />
            <Input placeholder="고객사" value={form.customer} onChange={e => updateField('customer', e.target.value)} className="text-sm" />
            <Input placeholder="세그먼트" value={form.segment} onChange={e => updateField('segment', e.target.value)} className="text-sm" />
            <Input placeholder="연도" value={form.year} onChange={e => updateField('year', e.target.value)} className="text-sm" />
            <select
              value={form.status}
              onChange={e => updateField('status', e.target.value)}
              className="h-11 w-full rounded-xl border border-input bg-background/60 px-3 text-sm"
            >
              <option value="양산">양산</option>
              <option value="개발">개발</option>
              <option value="단종">단종</option>
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
      <div className="rounded-2xl border border-white/60 bg-white/70 shadow-sm backdrop-blur-xl dark:border-gray-800/60 dark:bg-gray-900/70 overflow-hidden">
        {/* Desktop */}
        <div className="hidden sm:block overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50 dark:border-gray-800 dark:bg-gray-800/30">
                <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">코드</th>
                <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">차종명</th>
                <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">고객사</th>
                <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">세그먼트</th>
                <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">연도</th>
                <th className="px-4 py-3 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">상태</th>
                <th className="px-4 py-3 text-right text-[10px] font-semibold uppercase tracking-wider text-muted-foreground w-20">관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-gray-800/50">
              {filtered.map(v => (
                <tr key={v.id} className="transition-colors hover:bg-gray-50/80 dark:hover:bg-gray-800/40">
                  <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-muted-foreground">{v.code}</td>
                  <td className="px-4 py-3 font-medium">{v.name}</td>
                  <td className="px-4 py-3 text-muted-foreground">{v.customer}</td>
                  <td className="px-4 py-3 text-muted-foreground">{v.segment}</td>
                  <td className="px-4 py-3 text-muted-foreground">{v.year}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${statusColors[v.status] || ''}`}>{v.status}</span>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => handleEdit(v.id)} className="rounded p-1 text-muted-foreground/50 hover:text-primary hover:bg-primary/10"><Pencil className="h-3.5 w-3.5" /></button>
                      <button onClick={() => handleDelete(v.id, v.name)} className="rounded p-1 text-muted-foreground/50 hover:text-destructive hover:bg-red-50 dark:hover:bg-red-900/20"><Trash2 className="h-3.5 w-3.5" /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="py-16 text-center text-sm text-muted-foreground/50">차종 데이터가 없습니다</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <div className="sm:hidden divide-y divide-gray-50 dark:divide-gray-800/50">
          {filtered.map(v => (
            <div key={v.id} className="p-4">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <Car className="h-4 w-4 text-primary" />
                    <span className="font-medium text-sm">{v.name}</span>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">{v.code} · {v.customer} · {v.segment} · {v.year}</div>
                </div>
                <div className="flex items-center gap-1">
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusColors[v.status] || ''}`}>{v.status}</span>
                  <button onClick={() => handleEdit(v.id)} className="rounded p-1 text-muted-foreground/50 hover:text-primary"><Pencil className="h-3.5 w-3.5" /></button>
                  <button onClick={() => handleDelete(v.id, v.name)} className="rounded p-1 text-muted-foreground/50 hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>
                </div>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="py-16 text-center text-sm text-muted-foreground/50">차종 데이터가 없습니다</div>
          )}
        </div>
      </div>
    </div>
  );
}
