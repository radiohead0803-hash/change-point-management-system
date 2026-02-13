'use client';

import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { codeMasters } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { X } from 'lucide-react';

interface TagSelectorProps {
  value?: { itemId: string; tagType: 'PRIMARY' | 'TAG' }[];
  onChange?: (value: { itemId: string; tagType: 'PRIMARY' | 'TAG' }[]) => void;
  required?: boolean;
}

export function TagSelector({ value = [], onChange, required }: TagSelectorProps) {
  const [selectedClassCode, setSelectedClassCode] = useState<string>('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');

  // 분류 목록 조회
  const { data: classes = [] } = useQuery({
    queryKey: ['change-classes'],
    queryFn: () => codeMasters.findClasses().then((res) => res.data),
  });

  // 카테고리 목록 조회
  const { data: categories = [] } = useQuery({
    queryKey: ['change-categories', selectedClassCode],
    queryFn: () => codeMasters.findCategories(selectedClassCode).then((res) => res.data),
    enabled: !!selectedClassCode,
  });

  // 항목 목록 조회
  const { data: items = [] } = useQuery({
    queryKey: ['change-items', selectedCategoryId],
    queryFn: () => codeMasters.findItems(selectedCategoryId).then((res) => res.data),
    enabled: !!selectedCategoryId,
  });

  // 태그 추가
  const handleAddTag = (itemId: string) => {
    if (!onChange) return;

    // 이미 선택된 항목인지 확인
    if (value.some((tag) => tag.itemId === itemId)) return;

    // 주 분류가 없는 경우 PRIMARY로, 있는 경우 TAG로 추가
    const tagType = value.some((tag) => tag.tagType === 'PRIMARY') ? 'TAG' : 'PRIMARY';
    onChange([...value, { itemId, tagType }]);
  };

  // 태그 삭제
  const handleRemoveTag = (itemId: string) => {
    if (!onChange) return;
    onChange(value.filter((tag) => tag.itemId !== itemId));
  };

  // 필수 태그 여부 확인
  const hasRequiredTag = value.length > 0 || !required;

  return (
    <div className="space-y-4">
      {/* 선택된 태그 목록 */}
      <div className="flex flex-wrap gap-2">
        {value.map((tag) => {
          const item = items.find((i) => i.id === tag.itemId);
          if (!item) return null;

          return (
            <div
              key={tag.itemId}
              className={`flex items-center gap-1 rounded-full px-3 py-1 text-sm ${
                tag.tagType === 'PRIMARY'
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-gray-100 text-gray-800'
              }`}
            >
              <span>{item.name}</span>
              <button
                type="button"
                onClick={() => handleRemoveTag(tag.itemId)}
                className="ml-1 rounded-full p-1 hover:bg-gray-200"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          );
        })}
      </div>

      {/* 분류 선택 */}
      <div className="flex gap-4">
        <select
          className="block w-1/3 rounded-md border border-gray-300 px-3 py-2 text-sm"
          value={selectedClassCode}
          onChange={(e) => {
            setSelectedClassCode(e.target.value);
            setSelectedCategoryId('');
          }}
        >
          <option value="">분류 선택</option>
          {classes.map((cls) => (
            <option key={cls.code} value={cls.code}>
              {cls.name}
            </option>
          ))}
        </select>

        <select
          className="block w-1/3 rounded-md border border-gray-300 px-3 py-2 text-sm"
          value={selectedCategoryId}
          onChange={(e) => setSelectedCategoryId(e.target.value)}
          disabled={!selectedClassCode}
        >
          <option value="">카테고리 선택</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>

        <Input
          className="w-1/3"
          placeholder="항목 검색..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
      </div>

      {/* 항목 목록 */}
      <div className="grid max-h-60 grid-cols-2 gap-2 overflow-y-auto rounded-md border p-2">
        {items
          .filter((item) => item.name.includes(searchTerm))
          .map((item) => (
            <Button
              key={item.id}
              variant="ghost"
              className="justify-start"
              onClick={() => handleAddTag(item.id)}
              disabled={value.some((tag) => tag.itemId === item.id)}
            >
              {item.name}
            </Button>
          ))}
      </div>

      {/* 필수 태그 경고 */}
      {!hasRequiredTag && (
        <p className="text-sm text-red-500">96항목 태그는 필수 입력 항목입니다.</p>
      )}
    </div>
  );
}
