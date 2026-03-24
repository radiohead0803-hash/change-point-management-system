'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { codeMasters } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import {
  Plus, Pencil, Trash2, X, Check, Database, FolderTree, Tag,
  ChevronRight, ChevronDown,
} from 'lucide-react';

interface ChangeClass { id: string; code: string; name: string; description?: string; isActive?: boolean; }
interface ChangeCategory { id: string; classId: string; code: string; name: string; depth: number; parentId?: string; class?: ChangeClass; parent?: ChangeCategory; isActive?: boolean; }
interface ChangeItem { id: string; categoryId: string; code: string; name: string; description?: string; isActive?: boolean; }

type EditTarget = { type: 'class' | 'category' | 'item'; id: string; name: string } | null;
type AddTarget = { type: 'class' | 'category' | 'item'; parentId?: string; classId?: string } | null;

export default function MasterDataPage() {
  const { toast } = useToast();
  const qc = useQueryClient();

  const [selectedClassCode, setSelectedClassCode] = useState<string | null>(null);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  const [selectedCatId, setSelectedCatId] = useState<string | null>(null);
  const [expandedCats, setExpandedCats] = useState<Set<string>>(new Set());

  // Edit & Add state
  const [editing, setEditing] = useState<EditTarget>(null);
  const [editName, setEditName] = useState('');
  const [adding, setAdding] = useState<AddTarget>(null);
  const [addCode, setAddCode] = useState('');
  const [addName, setAddName] = useState('');

  // Queries
  const { data: classes = [], isLoading } = useQuery<ChangeClass[]>({
    queryKey: ['change-classes'],
    queryFn: () => codeMasters.findClasses().then(r => r.data),
  });

  const { data: categories = [] } = useQuery<ChangeCategory[]>({
    queryKey: ['change-categories', selectedClassCode],
    queryFn: () => codeMasters.findCategories(selectedClassCode!).then(r => r.data),
    enabled: !!selectedClassCode,
  });

  const { data: items = [] } = useQuery<ChangeItem[]>({
    queryKey: ['change-items', selectedCatId],
    queryFn: () => codeMasters.findItems(selectedCatId!).then(r => r.data),
    enabled: !!selectedCatId,
  });

  // Mutations
  const invalidateAll = () => {
    qc.invalidateQueries({ queryKey: ['change-classes'] });
    qc.invalidateQueries({ queryKey: ['change-categories'] });
    qc.invalidateQueries({ queryKey: ['change-items'] });
  };

  const createClassM = useMutation({ mutationFn: (d: any) => codeMasters.createClass(d), onSuccess: () => { invalidateAll(); toast({ title: '분류 추가됨' }); resetAdd(); } });
  const updateClassM = useMutation({ mutationFn: ({ id, data }: any) => codeMasters.updateClass(id, data), onSuccess: () => { invalidateAll(); toast({ title: '수정됨' }); setEditing(null); } });
  const deleteClassM = useMutation({ mutationFn: (id: string) => codeMasters.deleteClass(id), onSuccess: () => { invalidateAll(); toast({ title: '삭제됨' }); } });

  const createCatM = useMutation({ mutationFn: (d: any) => codeMasters.createCategory(d), onSuccess: () => { invalidateAll(); toast({ title: '카테고리 추가됨' }); resetAdd(); } });
  const updateCatM = useMutation({ mutationFn: ({ id, data }: any) => codeMasters.updateCategory(id, data), onSuccess: () => { invalidateAll(); toast({ title: '수정됨' }); setEditing(null); } });
  const deleteCatM = useMutation({ mutationFn: (id: string) => codeMasters.deleteCategory(id), onSuccess: () => { invalidateAll(); toast({ title: '삭제됨' }); } });

  const createItemM = useMutation({ mutationFn: (d: any) => codeMasters.createItem(d), onSuccess: () => { invalidateAll(); toast({ title: '항목 추가됨' }); resetAdd(); } });
  const updateItemM = useMutation({ mutationFn: ({ id, data }: any) => codeMasters.updateItem(id, data), onSuccess: () => { invalidateAll(); toast({ title: '수정됨' }); setEditing(null); } });
  const deleteItemM = useMutation({ mutationFn: (id: string) => codeMasters.deleteItem(id), onSuccess: () => { invalidateAll(); toast({ title: '삭제됨' }); } });

  const toggleActive = (type: 'class' | 'category' | 'item', id: string, currentActive: boolean) => {
    const newActive = !currentActive;
    if (type === 'class') updateClassM.mutate({ id, data: { isActive: newActive } });
    else if (type === 'category') updateCatM.mutate({ id, data: { isActive: newActive } });
    else updateItemM.mutate({ id, data: { isActive: newActive } });
  };

  const resetAdd = () => { setAdding(null); setAddCode(''); setAddName(''); };

  const startEdit = (type: 'class' | 'category' | 'item', id: string, name: string) => {
    setEditing({ type, id, name });
    setEditName(name);
  };

  const saveEdit = () => {
    if (!editing || !editName.trim()) return;
    if (editing.type === 'class') updateClassM.mutate({ id: editing.id, data: { name: editName } });
    else if (editing.type === 'category') updateCatM.mutate({ id: editing.id, data: { name: editName } });
    else updateItemM.mutate({ id: editing.id, data: { name: editName } });
  };

  const handleAdd = () => {
    if (!adding || !addCode.trim() || !addName.trim()) return;
    if (adding.type === 'class') createClassM.mutate({ code: addCode, name: addName });
    else if (adding.type === 'category') createCatM.mutate({ classId: adding.classId!, code: addCode, name: addName, parentId: adding.parentId });
    else createItemM.mutate({ categoryId: adding.parentId!, code: addCode, name: addName });
  };

  const handleDelete = (type: 'class' | 'category' | 'item', id: string, name: string) => {
    if (!confirm(`"${name}"을(를) 삭제하시겠습니까?`)) return;
    if (type === 'class') deleteClassM.mutate(id);
    else if (type === 'category') deleteCatM.mutate(id);
    else deleteItemM.mutate(id);
  };

  const selectClass = (cls: ChangeClass) => {
    setSelectedClassCode(cls.code);
    setSelectedClassId(cls.id);
    setSelectedCatId(null);
    setExpandedCats(new Set());
  };

  const toggleCat = (catId: string) => {
    const next = new Set(expandedCats);
    if (next.has(catId)) { next.delete(catId); if (selectedCatId === catId) setSelectedCatId(null); }
    else { next.add(catId); setSelectedCatId(catId); }
    setExpandedCats(next);
  };

  const depth1Cats = categories.filter(c => c.depth === 1);

  const classIcons: Record<string, string> = { FOUR_M: '4M', NON_FOUR_M: '외', CP_96: '96' };

  // Inline edit row
  const EditRow = () => (
    <div className="flex items-center gap-2 bg-primary/5 px-3 py-2">
      <Input value={editName} onChange={e => setEditName(e.target.value)} className="h-8 text-sm flex-1" autoFocus onKeyDown={e => e.key === 'Enter' && saveEdit()} />
      <button onClick={saveEdit} className="rounded p-1 text-primary hover:bg-primary/10"><Check className="h-4 w-4" /></button>
      <button onClick={() => setEditing(null)} className="rounded p-1 text-muted-foreground hover:bg-gray-100 dark:hover:bg-gray-800"><X className="h-4 w-4" /></button>
    </div>
  );

  // Add row
  const AddRow = ({ placeholder }: { placeholder: string }) => (
    <div className="flex items-center gap-2 bg-green-50/50 px-3 py-2 dark:bg-green-900/10">
      <Input placeholder="코드" value={addCode} onChange={e => setAddCode(e.target.value)} className="h-8 w-20 text-xs" />
      <Input placeholder={placeholder} value={addName} onChange={e => setAddName(e.target.value)} className="h-8 text-sm flex-1" autoFocus onKeyDown={e => e.key === 'Enter' && handleAdd()} />
      <button onClick={handleAdd} className="rounded p-1 text-green-600 hover:bg-green-100 dark:hover:bg-green-900/30"><Check className="h-4 w-4" /></button>
      <button onClick={resetAdd} className="rounded p-1 text-muted-foreground hover:bg-gray-100 dark:hover:bg-gray-800"><X className="h-4 w-4" /></button>
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight sm:text-2xl">기초정보 관리</h1>
          <p className="mt-1 text-sm text-muted-foreground">변동점 분류 체계 (4M·4M외·96항목)</p>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          {/* 1열: 분류 */}
          <div className="lg:col-span-3">
            <div className="rounded-2xl border border-white/60 bg-white/70 shadow-sm backdrop-blur-xl dark:border-gray-800/60 dark:bg-gray-900/70">
              <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-gray-800">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Database className="h-3.5 w-3.5" />분류
                </h3>
                <button onClick={() => setAdding({ type: 'class' })} className="rounded p-1 text-primary hover:bg-primary/10">
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              <div className="divide-y divide-gray-50 dark:divide-gray-800/50">
                {adding?.type === 'class' && <AddRow placeholder="분류명" />}
                {classes.map(cls => (
                  <div key={cls.id}>
                    {editing?.type === 'class' && editing.id === cls.id ? (
                      <EditRow />
                    ) : (
                      <div
                        onClick={() => selectClass(cls)}
                        className={`flex items-center gap-2.5 px-4 py-3 cursor-pointer transition-colors ${
                          selectedClassId === cls.id
                            ? 'bg-primary/10 border-l-2 border-l-primary'
                            : 'hover:bg-gray-50/80 dark:hover:bg-gray-800/40'
                        }`}
                      >
                        <div className={`flex h-8 w-8 items-center justify-center rounded-lg text-[10px] font-bold ${cls.isActive !== false ? 'bg-primary/10 text-primary' : 'bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500'}`}>
                          {classIcons[cls.code] || 'C'}
                        </div>
                        <div className={`flex-1 min-w-0 ${cls.isActive === false ? 'opacity-40' : ''}`}>
                          <p className="text-sm font-medium truncate">{cls.name}</p>
                          <p className="text-[10px] text-muted-foreground">{cls.code}</p>
                        </div>
                        <div className="flex items-center gap-0.5">
                          <input type="checkbox" checked={cls.isActive !== false} onChange={e => { e.stopPropagation(); toggleActive('class', cls.id, cls.isActive !== false); }}
                            className="h-3.5 w-3.5 rounded border-gray-300 text-primary focus:ring-primary/30 cursor-pointer" title={cls.isActive !== false ? '활성' : '비활성'} />
                          <button onClick={e => { e.stopPropagation(); startEdit('class', cls.id, cls.name); }} className="rounded p-1 text-muted-foreground/50 hover:text-primary hover:bg-primary/10"><Pencil className="h-3 w-3" /></button>
                          <button onClick={e => { e.stopPropagation(); handleDelete('class', cls.id, cls.name); }} className="rounded p-1 text-muted-foreground/50 hover:text-destructive hover:bg-red-50 dark:hover:bg-red-900/20"><Trash2 className="h-3 w-3" /></button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 2열: 카테고리 */}
          <div className="lg:col-span-4">
            <div className="rounded-2xl border border-white/60 bg-white/70 shadow-sm backdrop-blur-xl dark:border-gray-800/60 dark:bg-gray-900/70">
              <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-gray-800">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <FolderTree className="h-3.5 w-3.5" />카테고리
                </h3>
                {selectedClassId && (
                  <button onClick={() => setAdding({ type: 'category', classId: selectedClassId })} className="rounded p-1 text-primary hover:bg-primary/10">
                    <Plus className="h-4 w-4" />
                  </button>
                )}
              </div>
              {!selectedClassCode ? (
                <div className="flex items-center justify-center py-16 text-sm text-muted-foreground/50">← 분류를 선택하세요</div>
              ) : (
                <div className="divide-y divide-gray-50 dark:divide-gray-800/50 max-h-[600px] overflow-y-auto">
                  {adding?.type === 'category' && !adding.parentId && <AddRow placeholder="카테고리명" />}
                  {depth1Cats.map(cat => {
                    const subCats = categories.filter(c => c.parentId === cat.id);
                    const isExpanded = expandedCats.has(cat.id);
                    return (
                      <div key={cat.id}>
                        {editing?.type === 'category' && editing.id === cat.id ? (
                          <EditRow />
                        ) : (
                          <div
                            className={`flex items-center gap-2 px-4 py-2.5 cursor-pointer transition-colors ${
                              selectedCatId === cat.id ? 'bg-blue-50/80 dark:bg-blue-900/10' : 'hover:bg-gray-50/80 dark:hover:bg-gray-800/40'
                            }`}
                          >
                            <button onClick={() => toggleCat(cat.id)} className="p-0.5">
                              {isExpanded ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />}
                            </button>
                            <div className={`flex-1 min-w-0 ${cat.isActive === false ? 'opacity-40' : ''}`} onClick={() => { setSelectedCatId(cat.id); }}>
                              <span className="text-sm font-medium">{cat.name}</span>
                              <span className="ml-1.5 text-[10px] text-muted-foreground">({cat.code})</span>
                            </div>
                            <div className="flex items-center gap-0.5">
                              <input type="checkbox" checked={cat.isActive !== false} onChange={e => { e.stopPropagation(); toggleActive('category', cat.id, cat.isActive !== false); }}
                                className="h-3.5 w-3.5 rounded border-gray-300 text-primary focus:ring-primary/30 cursor-pointer" />
                              <button onClick={e => { e.stopPropagation(); setAdding({ type: 'category', classId: selectedClassId!, parentId: cat.id }); }} className="rounded p-1 text-muted-foreground/50 hover:text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20"><Plus className="h-3 w-3" /></button>
                              <button onClick={() => startEdit('category', cat.id, cat.name)} className="rounded p-1 text-muted-foreground/50 hover:text-primary hover:bg-primary/10"><Pencil className="h-3 w-3" /></button>
                              <button onClick={() => handleDelete('category', cat.id, cat.name)} className="rounded p-1 text-muted-foreground/50 hover:text-destructive hover:bg-red-50 dark:hover:bg-red-900/20"><Trash2 className="h-3 w-3" /></button>
                            </div>
                          </div>
                        )}
                        {/* 하위 카테고리 */}
                        {isExpanded && (
                          <div className="bg-gray-50/30 dark:bg-gray-800/10">
                            {adding?.type === 'category' && adding.parentId === cat.id && <AddRow placeholder="하위 카테고리명" />}
                            {subCats.map(sub => (
                              <div key={sub.id}>
                                {editing?.type === 'category' && editing.id === sub.id ? (
                                  <div className="pl-6"><EditRow /></div>
                                ) : (
                                  <div
                                    onClick={() => setSelectedCatId(sub.id)}
                                    className={`flex items-center gap-2 pl-9 pr-4 py-2 cursor-pointer transition-colors ${
                                      selectedCatId === sub.id ? 'bg-blue-50/80 dark:bg-blue-900/10' : 'hover:bg-gray-50/80 dark:hover:bg-gray-800/40'
                                    }`}
                                  >
                                    <span className={`flex-1 text-xs font-medium truncate ${sub.isActive === false ? 'opacity-40' : ''}`}>{sub.name}</span>
                                    <span className="text-[10px] text-muted-foreground">{sub.code}</span>
                                    <div className="flex items-center gap-0.5">
                                      <input type="checkbox" checked={sub.isActive !== false} onChange={e => { e.stopPropagation(); toggleActive('category', sub.id, sub.isActive !== false); }}
                                        className="h-3 w-3 rounded border-gray-300 text-primary focus:ring-primary/30 cursor-pointer" />
                                      <button onClick={e => { e.stopPropagation(); startEdit('category', sub.id, sub.name); }} className="rounded p-0.5 text-muted-foreground/50 hover:text-primary"><Pencil className="h-2.5 w-2.5" /></button>
                                      <button onClick={e => { e.stopPropagation(); handleDelete('category', sub.id, sub.name); }} className="rounded p-0.5 text-muted-foreground/50 hover:text-destructive"><Trash2 className="h-2.5 w-2.5" /></button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* 3열: 항목 */}
          <div className="lg:col-span-5">
            <div className="rounded-2xl border border-white/60 bg-white/70 shadow-sm backdrop-blur-xl dark:border-gray-800/60 dark:bg-gray-900/70">
              <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-gray-800">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Tag className="h-3.5 w-3.5" />세부 항목
                  {items.length > 0 && <span className="ml-1 text-primary">({items.length})</span>}
                </h3>
                {selectedCatId && (
                  <button onClick={() => setAdding({ type: 'item', parentId: selectedCatId })} className="rounded p-1 text-primary hover:bg-primary/10">
                    <Plus className="h-4 w-4" />
                  </button>
                )}
              </div>
              {!selectedCatId ? (
                <div className="flex items-center justify-center py-16 text-sm text-muted-foreground/50">← 카테고리를 선택하세요</div>
              ) : (
                <div className="max-h-[600px] overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50/50 dark:border-gray-800 dark:bg-gray-800/30">
                        <th className="px-4 py-2 text-center text-[10px] font-medium uppercase tracking-wider text-muted-foreground w-10">활성</th>
                        <th className="px-4 py-2 text-left text-[10px] font-medium uppercase tracking-wider text-muted-foreground w-16">코드</th>
                        <th className="px-4 py-2 text-left text-[10px] font-medium uppercase tracking-wider text-muted-foreground">항목명</th>
                        <th className="px-4 py-2 text-right text-[10px] font-medium uppercase tracking-wider text-muted-foreground w-20">관리</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 dark:divide-gray-800/50">
                      {adding?.type === 'item' && (
                        <tr className="bg-green-50/50 dark:bg-green-900/10">
                          <td colSpan={4} className="p-0"><AddRow placeholder="항목명" /></td>
                        </tr>
                      )}
                      {items.map((item, i) => (
                        <tr key={item.id} className={`transition-colors hover:bg-gray-50/80 dark:hover:bg-gray-800/40 ${item.isActive === false ? 'opacity-40' : ''}`}>
                          {editing?.type === 'item' && editing.id === item.id ? (
                            <td colSpan={4} className="p-0"><EditRow /></td>
                          ) : (
                            <>
                              <td className="px-4 py-2.5 text-center">
                                <input type="checkbox" checked={item.isActive !== false} onChange={() => toggleActive('item', item.id, item.isActive !== false)}
                                  className="h-3.5 w-3.5 rounded border-gray-300 text-primary focus:ring-primary/30 cursor-pointer" />
                              </td>
                              <td className="whitespace-nowrap px-4 py-2.5 font-mono text-[10px] text-muted-foreground">{item.code}</td>
                              <td className="px-4 py-2.5">
                                <span className="text-sm">{item.name}</span>
                              </td>
                              <td className="px-4 py-2.5 text-right">
                                <div className="flex items-center justify-end gap-0.5">
                                  <button onClick={() => startEdit('item', item.id, item.name)} className="rounded p-1 text-muted-foreground/50 hover:text-primary hover:bg-primary/10">
                                    <Pencil className="h-3 w-3" />
                                  </button>
                                  <button onClick={() => handleDelete('item', item.id, item.name)} className="rounded p-1 text-muted-foreground/50 hover:text-destructive hover:bg-red-50 dark:hover:bg-red-900/20">
                                    <Trash2 className="h-3 w-3" />
                                  </button>
                                </div>
                              </td>
                            </>
                          )}
                        </tr>
                      ))}
                      {items.length === 0 && (
                        <tr>
                          <td colSpan={4} className="py-10 text-center text-sm text-muted-foreground/50">
                            항목이 없습니다
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
