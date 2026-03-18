'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { codeMasters } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/components/ui/use-toast';
import {
  ChevronRight, ChevronDown, Plus, Pencil, Trash2,
  Database, FolderTree, Tag, Layers,
} from 'lucide-react';

interface ChangeClass {
  id: string;
  code: string;
  name: string;
  description?: string;
  categories?: ChangeCategory[];
}

interface ChangeCategory {
  id: string;
  classId: string;
  code: string;
  name: string;
  depth: number;
  parentId?: string;
  children?: ChangeCategory[];
  items?: ChangeItem[];
}

interface ChangeItem {
  id: string;
  categoryId: string;
  code: string;
  name: string;
  description?: string;
}

export default function MasterDataPage() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [expandedClasses, setExpandedClasses] = useState<Set<string>>(new Set());
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set());
  const [selectedClassCode, setSelectedClassCode] = useState<string | null>(null);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

  // 분류 목록 조회
  const { data: classes = [], isLoading } = useQuery<ChangeClass[]>({
    queryKey: ['change-classes'],
    queryFn: () => codeMasters.findClasses().then((res) => res.data),
  });

  // 카테고리 조회
  const { data: categories = [] } = useQuery<ChangeCategory[]>({
    queryKey: ['change-categories', selectedClassCode],
    queryFn: () => codeMasters.findCategories(selectedClassCode!).then((res) => res.data),
    enabled: !!selectedClassCode,
  });

  // 항목 조회
  const { data: items = [] } = useQuery<ChangeItem[]>({
    queryKey: ['change-items', selectedCategoryId],
    queryFn: () => codeMasters.findItems(selectedCategoryId!).then((res) => res.data),
    enabled: !!selectedCategoryId,
  });

  const toggleClass = (classId: string, classCode: string) => {
    const next = new Set(expandedClasses);
    if (next.has(classId)) {
      next.delete(classId);
      setSelectedClassCode(null);
    } else {
      next.add(classId);
      setSelectedClassCode(classCode);
    }
    setExpandedClasses(next);
  };

  const toggleCategory = (catId: string) => {
    const next = new Set(expandedCategories);
    if (next.has(catId)) {
      next.delete(catId);
      setSelectedCategoryId(null);
    } else {
      next.add(catId);
      setSelectedCategoryId(catId);
    }
    setExpandedCategories(next);
  };

  const classIcons: Record<string, string> = {
    FOUR_M: '4M',
    NON_FOUR_M: '외',
    CP_96: '96',
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">기초정보 관리</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          변동점 분류 체계를 관리합니다 (4M 17항목, 4M외 17항목, 96항목)
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        </div>
      ) : (
        <div className="space-y-3">
          {classes.map((cls) => (
            <div
              key={cls.id}
              className="overflow-hidden rounded-2xl border border-white/60 bg-white/70 shadow-sm backdrop-blur-xl dark:border-gray-800/60 dark:bg-gray-900/70"
            >
              {/* 클래스 헤더 */}
              <button
                onClick={() => toggleClass(cls.id, cls.code)}
                className="flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-gray-50/80 sm:p-5 dark:hover:bg-gray-800/40"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-xs font-bold text-primary">
                  {classIcons[cls.code] || <Database className="h-5 w-5" />}
                </div>
                <div className="flex-1">
                  <h3 className="text-sm font-semibold">{cls.name}</h3>
                  {cls.description && (
                    <p className="mt-0.5 text-xs text-muted-foreground">{cls.description}</p>
                  )}
                </div>
                {expandedClasses.has(cls.id) ? (
                  <ChevronDown className="h-5 w-5 text-muted-foreground" />
                ) : (
                  <ChevronRight className="h-5 w-5 text-muted-foreground" />
                )}
              </button>

              {/* 카테고리 목록 */}
              {expandedClasses.has(cls.id) && (
                <div className="border-t border-gray-100 dark:border-gray-800">
                  {categories.length === 0 ? (
                    <div className="p-4 text-center text-sm text-muted-foreground">
                      카테고리가 없습니다
                    </div>
                  ) : (
                    categories
                      .filter((cat) => cat.depth === 1)
                      .map((cat) => (
                        <div key={cat.id}>
                          <button
                            onClick={() => toggleCategory(cat.id)}
                            className="flex w-full items-center gap-2.5 border-b border-gray-50 px-4 py-3 text-left transition-colors hover:bg-gray-50/60 sm:gap-3 sm:px-6 dark:border-gray-800/50 dark:hover:bg-gray-800/30"
                          >
                            <FolderTree className="h-4 w-4 flex-shrink-0 text-muted-foreground/50" />
                            <div className="min-w-0 flex-1">
                              <span className="text-sm font-medium">{cat.name}</span>
                              <span className="ml-1.5 text-xs text-muted-foreground sm:ml-2">({cat.code})</span>
                            </div>
                            {expandedCategories.has(cat.id) ? (
                              <ChevronDown className="h-4 w-4 text-muted-foreground/50" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
                            )}
                          </button>

                          {/* 하위 카테고리 */}
                          {expandedCategories.has(cat.id) && categories
                            .filter((sub) => sub.parentId === cat.id)
                            .map((sub) => (
                              <div key={sub.id}>
                                <button
                                  onClick={() => toggleCategory(sub.id)}
                                  className="flex w-full items-center gap-2 border-b border-gray-50 px-6 py-2.5 text-left transition-colors hover:bg-gray-50/60 sm:gap-3 sm:px-10 dark:border-gray-800/50 dark:hover:bg-gray-800/30"
                                >
                                  <Layers className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground/40" />
                                  <span className="min-w-0 truncate text-sm">{sub.name}</span>
                                  <span className="hidden text-xs text-muted-foreground sm:inline">({sub.code})</span>
                                  {expandedCategories.has(sub.id) ? (
                                    <ChevronDown className="ml-auto h-3.5 w-3.5 text-muted-foreground/40" />
                                  ) : (
                                    <ChevronRight className="ml-auto h-3.5 w-3.5 text-muted-foreground/40" />
                                  )}
                                </button>
                                {expandedCategories.has(sub.id) && (
                                  <div className="bg-gray-50/30 dark:bg-gray-800/20">
                                    {items.map((item) => (
                                      <div
                                        key={item.id}
                                        className="flex items-center gap-2 border-b border-gray-50 px-8 py-2 sm:gap-3 sm:px-14 dark:border-gray-800/50"
                                      >
                                        <Tag className="h-3 w-3 flex-shrink-0 text-primary/50" />
                                        <span className="min-w-0 truncate text-xs">{item.name}</span>
                                        <span className="hidden text-[10px] text-muted-foreground/50 sm:inline">
                                          {item.code}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}

                          {/* 직접 항목 (하위 카테고리 없는 경우) */}
                          {expandedCategories.has(cat.id) &&
                            categories.filter((sub) => sub.parentId === cat.id).length === 0 &&
                            items.map((item) => (
                              <div
                                key={item.id}
                                className="flex items-center gap-2 border-b border-gray-50 bg-gray-50/30 px-6 py-2 sm:gap-3 sm:px-10 dark:border-gray-800/50 dark:bg-gray-800/20"
                              >
                                <Tag className="h-3 w-3 flex-shrink-0 text-primary/50" />
                                <span className="min-w-0 truncate text-xs">{item.name}</span>
                                <span className="hidden text-[10px] text-muted-foreground/50 sm:inline">{item.code}</span>
                              </div>
                            ))}
                        </div>
                      ))
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
