'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { codeMasters } from '@/lib/api-client';
import { X, Tag, ChevronRight, Search } from 'lucide-react';

interface TagSelectorProps {
  value?: { itemId: string; tagType: 'PRIMARY' | 'TAG' }[];
  onChange?: (value: { itemId: string; tagType: 'PRIMARY' | 'TAG' }[]) => void;
  required?: boolean;
}

export function TagSelector({ value = [], onChange, required }: TagSelectorProps) {
  const [selectedClassCode, setSelectedClassCode] = useState<string>('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');

  // 분류 목록 (4M, 4M외, 96항목)
  const { data: classes = [] } = useQuery<any[]>({
    queryKey: ['change-classes'],
    queryFn: () => codeMasters.findClasses().then((res) => res.data),
  });

  // 카테고리 목록
  const { data: categories = [] } = useQuery<any[]>({
    queryKey: ['change-categories', selectedClassCode],
    queryFn: () => codeMasters.findCategories(selectedClassCode).then((res) => res.data),
    enabled: !!selectedClassCode,
  });

  // 항목 목록
  const { data: items = [] } = useQuery<any[]>({
    queryKey: ['change-items', selectedCategoryId],
    queryFn: () => codeMasters.findItems(selectedCategoryId).then((res) => res.data),
    enabled: !!selectedCategoryId,
  });

  // 전체 아이템 (선택된 태그 이름 표시용)
  const { data: allItems = [] } = useQuery<any[]>({
    queryKey: ['all-change-items'],
    queryFn: async () => {
      try {
        const res = await codeMasters.findItems();
        return res.data;
      } catch {
        return [];
      }
    },
  });

  const handleAddTag = (itemId: string) => {
    if (!onChange) return;
    if (value.some((tag) => tag.itemId === itemId)) return;
    const tagType = value.some((tag) => tag.tagType === 'PRIMARY') ? 'TAG' : 'PRIMARY';
    onChange([...value, { itemId, tagType }]);
  };

  const handleRemoveTag = (itemId: string) => {
    if (!onChange) return;
    onChange(value.filter((tag) => tag.itemId !== itemId));
  };

  const getItemName = (itemId: string) => {
    const fromItems = items.find((i: any) => i.id === itemId);
    if (fromItems) return fromItems.name;
    const fromAll = allItems.find((i: any) => i.id === itemId);
    return fromAll?.name || itemId;
  };

  const getItemCategory = (itemId: string) => {
    const fromAll = allItems.find((i: any) => i.id === itemId);
    return fromAll?.category?.name || '';
  };

  const selectedClass = classes.find((c: any) => c.code === selectedClassCode);
  const selectedCategory = categories.find((c: any) => c.id === selectedCategoryId);

  const filteredItems = items.filter((item: any) =>
    !searchTerm || item.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const hasRequiredTag = value.length > 0 || !required;

  return (
    <div className="space-y-4">
      {/* 선택된 태그 목록 */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {value.map((tag, idx) => (
            <div
              key={tag.itemId}
              className={`group flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all ${
                tag.tagType === 'PRIMARY'
                  ? 'bg-blue-100 text-blue-800 ring-1 ring-blue-200 dark:bg-blue-900/40 dark:text-blue-300 dark:ring-blue-800'
                  : 'bg-gray-100 text-gray-700 ring-1 ring-gray-200 dark:bg-gray-800/60 dark:text-gray-300 dark:ring-gray-700'
              }`}
            >
              <Tag className="h-3 w-3" />
              <span className="max-w-[120px] truncate sm:max-w-none">
                {tag.tagType === 'PRIMARY' && <span className="mr-1 text-[10px] font-bold text-blue-600 dark:text-blue-400">주</span>}
                {getItemName(tag.itemId)}
              </span>
              <span className="hidden text-[10px] text-muted-foreground/60 sm:inline">
                {getItemCategory(tag.itemId)}
              </span>
              <button
                type="button"
                onClick={() => handleRemoveTag(tag.itemId)}
                className="ml-0.5 rounded-full p-0.5 opacity-60 transition-opacity hover:opacity-100 hover:bg-red-100 dark:hover:bg-red-900/30"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* 계단식 선택 UI */}
      <div className="space-y-3">
        {/* 분류/카테고리/검색 행 */}
        <div className="flex flex-col gap-2 sm:flex-row sm:gap-3">
          <div className="flex-1">
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">분류</label>
            <select
              className="h-10 w-full rounded-xl border border-input bg-background/60 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring/40"
              value={selectedClassCode}
              onChange={(e) => {
                setSelectedClassCode(e.target.value);
                setSelectedCategoryId('');
                setSearchTerm('');
              }}
            >
              <option value="">분류 선택</option>
              {classes.map((cls: any) => (
                <option key={cls.code} value={cls.code}>{cls.name}</option>
              ))}
            </select>
          </div>

          <div className="flex-1">
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">카테고리</label>
            <select
              className="h-10 w-full rounded-xl border border-input bg-background/60 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring/40 disabled:opacity-50"
              value={selectedCategoryId}
              onChange={(e) => {
                setSelectedCategoryId(e.target.value);
                setSearchTerm('');
              }}
              disabled={!selectedClassCode}
            >
              <option value="">카테고리 선택</option>
              {categories.map((cat: any) => (
                <option key={cat.id} value={cat.id}>{cat.name}</option>
              ))}
            </select>
          </div>

          <div className="flex-1">
            <label className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">항목 검색</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/40" />
              <input
                className="h-10 w-full rounded-xl border border-input bg-background/60 pl-8 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring/40 disabled:opacity-50"
                placeholder="항목명 검색..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                disabled={!selectedCategoryId}
              />
            </div>
          </div>
        </div>

        {/* 경로 표시 */}
        {selectedClassCode && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <span className="font-medium text-foreground">{selectedClass?.name}</span>
            {selectedCategory && (
              <>
                <ChevronRight className="h-3 w-3" />
                <span className="font-medium text-foreground">{selectedCategory.name}</span>
              </>
            )}
            {selectedCategoryId && (
              <>
                <ChevronRight className="h-3 w-3" />
                <span>{filteredItems.length}개 항목</span>
              </>
            )}
          </div>
        )}

        {/* 항목 그리드 */}
        {selectedCategoryId && (
          <div className="max-h-52 overflow-y-auto rounded-xl border border-gray-100 bg-gray-50/50 p-2 dark:border-gray-800 dark:bg-gray-900/30">
            {filteredItems.length === 0 ? (
              <p className="py-6 text-center text-xs text-muted-foreground/60">항목이 없습니다</p>
            ) : (
              <div className="grid grid-cols-1 gap-1 sm:grid-cols-2 lg:grid-cols-3">
                {filteredItems.map((item: any) => {
                  const isSelected = value.some((tag) => tag.itemId === item.id);
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => !isSelected && handleAddTag(item.id)}
                      disabled={isSelected}
                      className={`flex items-center gap-2 rounded-lg px-3 py-2 text-left text-xs transition-all ${
                        isSelected
                          ? 'bg-blue-50 text-blue-400 cursor-not-allowed ring-1 ring-blue-200 dark:bg-blue-900/20 dark:ring-blue-800'
                          : 'hover:bg-white hover:shadow-sm active:scale-[0.98] dark:hover:bg-gray-800/60'
                      }`}
                    >
                      <span className={`flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-md text-[10px] font-bold ${
                        isSelected ? 'bg-blue-200 text-blue-700' : 'bg-gray-200 text-gray-500 dark:bg-gray-700 dark:text-gray-400'
                      }`}>
                        {isSelected ? '✓' : '+'}
                      </span>
                      <span className="truncate">{item.name}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* 필수 경고 */}
      {!hasRequiredTag && (
        <p className="text-xs text-red-500">96항목 태그는 필수 입력 항목입니다.</p>
      )}
    </div>
  );
}
