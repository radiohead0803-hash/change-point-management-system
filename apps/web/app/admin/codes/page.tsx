'use client';

import { useState, useEffect } from 'react';
import { getCommonCodes, saveCommonCodes, CodeGroup } from '@/lib/common-codes';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import {
  Plus, Pencil, Trash2, X, Check, Search, GripVertical,
  Building2, Car, Package, Factory, Columns, Users,
} from 'lucide-react';

const GROUP_ICONS: Record<string, any> = {
  CUSTOMER: Building2,
  PROJECT: Car,
  PRODUCT_LINE: Package,
  FACTORY: Factory,
  LINE: Columns,
  DEPARTMENT: Users,
};

const GROUP_COLORS: Record<string, string> = {
  CUSTOMER: 'text-blue-600 bg-blue-50 dark:bg-blue-900/20',
  PROJECT: 'text-purple-600 bg-purple-50 dark:bg-purple-900/20',
  PRODUCT_LINE: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20',
  FACTORY: 'text-orange-600 bg-orange-50 dark:bg-orange-900/20',
  LINE: 'text-cyan-600 bg-cyan-50 dark:bg-cyan-900/20',
  DEPARTMENT: 'text-pink-600 bg-pink-50 dark:bg-pink-900/20',
};

export default function CommonCodesPage() {
  const { toast } = useToast();
  const [codes, setCodes] = useState<CodeGroup[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<string>('CUSTOMER');
  const [adding, setAdding] = useState(false);
  const [addValue, setAddValue] = useState('');
  const [editing, setEditing] = useState<{ index: number; value: string } | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    setCodes(getCommonCodes());
  }, []);

  const currentGroup = codes.find((c) => c.key === selectedGroup);
  const filteredItems = currentGroup?.items.filter((item) =>
    !search || item.toLowerCase().includes(search.toLowerCase())
  ) || [];

  const handleAdd = () => {
    if (!addValue.trim() || !currentGroup) return;
    if (currentGroup.items.includes(addValue.trim())) {
      toast({ variant: 'destructive', title: '이미 존재하는 항목입니다' });
      return;
    }
    const updated = codes.map((g) =>
      g.key === selectedGroup ? { ...g, items: [...g.items, addValue.trim()] } : g
    );
    setCodes(updated);
    saveCommonCodes(updated);
    setAddValue('');
    setAdding(false);
    toast({ title: '항목이 추가되었습니다.' });
  };

  const handleEdit = (index: number) => {
    if (!editing || !currentGroup) return;
    const updated = codes.map((g) => {
      if (g.key !== selectedGroup) return g;
      const items = [...g.items];
      items[index] = editing.value;
      return { ...g, items };
    });
    setCodes(updated);
    saveCommonCodes(updated);
    setEditing(null);
    toast({ title: '항목이 수정되었습니다.' });
  };

  const handleDelete = (item: string) => {
    if (!confirm(`"${item}"을(를) 삭제하시겠습니까?`)) return;
    const updated = codes.map((g) =>
      g.key === selectedGroup ? { ...g, items: g.items.filter((i) => i !== item) } : g
    );
    setCodes(updated);
    saveCommonCodes(updated);
    toast({ title: '항목이 삭제되었습니다.' });
  };

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">공통코드 관리</h1>
        <p className="mt-1 text-sm text-muted-foreground">변동점 등록 시 사용되는 드롭다운 옵션을 관리합니다</p>
      </div>

      {/* 그룹 탭 */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        {codes.map((group) => {
          const Icon = GROUP_ICONS[group.key] || Package;
          const isActive = selectedGroup === group.key;
          const colorClass = GROUP_COLORS[group.key] || 'text-gray-600 bg-gray-50';
          return (
            <button
              key={group.key}
              onClick={() => { setSelectedGroup(group.key); setSearch(''); setEditing(null); setAdding(false); }}
              className={`rounded-xl border p-3 text-center transition-all ${
                isActive
                  ? 'border-primary/30 bg-primary/5 ring-1 ring-primary/20 shadow-sm'
                  : 'border-white/60 bg-white/70 hover:bg-white/90 dark:border-gray-800/60 dark:bg-gray-900/70'
              }`}
            >
              <div className={`mx-auto mb-1.5 flex h-8 w-8 items-center justify-center rounded-lg ${colorClass}`}>
                <Icon className="h-4 w-4" />
              </div>
              <p className="text-xs font-semibold">{group.label}</p>
              <p className="mt-0.5 text-[10px] text-muted-foreground">{group.items.length}개</p>
            </button>
          );
        })}
      </div>

      {/* 항목 관리 */}
      {currentGroup && (
        <div className="rounded-2xl border border-white/60 bg-white/70 shadow-sm backdrop-blur-xl dark:border-gray-800/60 dark:bg-gray-900/70">
          {/* 헤더 */}
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-3 dark:border-gray-800">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              {(() => { const Icon = GROUP_ICONS[selectedGroup] || Package; return <Icon className="h-4 w-4 text-primary" />; })()}
              {currentGroup.label} ({currentGroup.items.length})
            </h3>
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground/40" />
                <input
                  className="h-8 w-40 rounded-lg border border-input bg-background/60 pl-7 pr-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring/40"
                  placeholder="검색..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Button size="sm" variant="outline" onClick={() => { setAdding(true); setEditing(null); setAddValue(''); }}>
                <Plus className="mr-1 h-3.5 w-3.5" />추가
              </Button>
            </div>
          </div>

          {/* 추가 폼 */}
          {adding && (
            <div className="flex items-center gap-2 border-b border-green-100 bg-green-50/30 px-5 py-3 dark:bg-green-900/10 dark:border-green-900/30">
              <Plus className="h-4 w-4 flex-shrink-0 text-green-600" />
              <Input
                className="h-8 flex-1 text-sm"
                placeholder={`새 ${currentGroup.label} 항목 입력...`}
                value={addValue}
                onChange={(e) => setAddValue(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                autoFocus
              />
              <button onClick={handleAdd} className="rounded p-1 text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30">
                <Check className="h-4 w-4" />
              </button>
              <button onClick={() => setAdding(false)} className="rounded p-1 text-muted-foreground hover:bg-gray-100 dark:hover:bg-gray-800">
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* 항목 목록 */}
          <div className="divide-y divide-gray-50 dark:divide-gray-800/50">
            {filteredItems.length === 0 ? (
              <div className="py-12 text-center text-sm text-muted-foreground/50">
                {search ? '검색 결과가 없습니다' : '항목이 없습니다. 추가 버튼을 눌러주세요.'}
              </div>
            ) : (
              filteredItems.map((item, idx) => {
                const realIdx = currentGroup.items.indexOf(item);
                const isEditing = editing?.index === realIdx;
                return (
                  <div key={`${item}-${idx}`} className="flex items-center gap-3 px-5 py-2.5 transition-colors hover:bg-gray-50/80 dark:hover:bg-gray-800/40">
                    <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md bg-gray-100 text-[10px] font-bold text-gray-400 dark:bg-gray-800">
                      {realIdx + 1}
                    </span>
                    {isEditing ? (
                      <>
                        <Input
                          className="h-8 flex-1 text-sm"
                          value={editing.value}
                          onChange={(e) => setEditing({ ...editing, value: e.target.value })}
                          onKeyDown={(e) => e.key === 'Enter' && handleEdit(realIdx)}
                          autoFocus
                        />
                        <button onClick={() => handleEdit(realIdx)} className="rounded p-1 text-primary hover:bg-primary/10">
                          <Check className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => setEditing(null)} className="rounded p-1 text-muted-foreground hover:bg-gray-100 dark:hover:bg-gray-800">
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </>
                    ) : (
                      <>
                        <span className="flex-1 text-sm">{item}</span>
                        <button
                          onClick={() => setEditing({ index: realIdx, value: item })}
                          className="rounded p-1 text-muted-foreground/40 hover:text-primary hover:bg-primary/10"
                        >
                          <Pencil className="h-3 w-3" />
                        </button>
                        <button
                          onClick={() => handleDelete(item)}
                          className="rounded p-1 text-muted-foreground/40 hover:text-destructive hover:bg-red-50 dark:hover:bg-red-900/20"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
