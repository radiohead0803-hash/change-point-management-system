'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { codeMasters } from '@/lib/api-client';
import { X, Search, ChevronRight, ChevronDown, Info, HelpCircle, ExternalLink } from 'lucide-react';
import Link from 'next/link';

/* ── DB에서 분류 데이터 조회 훅 ── */
function useClassificationData() {
  const { data: classes = [] } = useQuery<any[]>({
    queryKey: ['guide-classes'],
    queryFn: () => codeMasters.findClasses().then(r => r.data),
  });

  const { data: allCategories = [] } = useQuery<any[]>({
    queryKey: ['guide-categories-all'],
    queryFn: async () => {
      const results: any[] = [];
      for (const cls of classes) {
        const res = await codeMasters.findCategories(cls.code);
        results.push(...res.data.map((c: any) => ({ ...c, classCode: cls.code, className: cls.name })));
      }
      return results;
    },
    enabled: classes.length > 0,
  });

  const { data: allItems = [] } = useQuery<any[]>({
    queryKey: ['guide-items-all'],
    queryFn: () => codeMasters.findItems().then(r => r.data),
    enabled: allCategories.length > 0,
  });

  // 분류별로 그룹화
  const fourMData = useMemo(() => {
    const cats = allCategories.filter(c => c.classCode === 'FOUR_M' && c.depth === 1);
    return cats.map(cat => {
      const subCats = allCategories.filter(c => c.parentId === cat.id);
      const catIds = [cat.id, ...subCats.map(s => s.id)];
      const items = allItems.filter(i => catIds.includes(i.categoryId));
      return { category: cat.name, items: items.map((i: any) => ({ name: i.name, desc: i.description || '' })) };
    }).filter(c => c.items.length > 0);
  }, [allCategories, allItems]);

  const nonFourMData = useMemo(() => {
    const cats = allCategories.filter(c => c.classCode === 'NON_FOUR_M' && c.depth === 1);
    return cats.map(cat => {
      const subCats = allCategories.filter(c => c.parentId === cat.id);
      const catIds = [cat.id, ...subCats.map(s => s.id)];
      const items = allItems.filter(i => catIds.includes(i.categoryId));
      return { category: cat.name, items: items.map((i: any) => ({ name: i.name, desc: i.description || '' })) };
    }).filter(c => c.items.length > 0);
  }, [allCategories, allItems]);

  const cp96Data = useMemo(() => {
    const cats = allCategories.filter(c => c.classCode === 'CP_96' && c.depth === 1);
    return cats.map(cat => {
      const subCats = allCategories.filter(c => c.parentId === cat.id);
      const catIds = [cat.id, ...subCats.map(s => s.id)];
      const items = allItems.filter(i => catIds.includes(i.categoryId));
      return { category: cat.name, items: items.map((i: any) => i.name) };
    }).filter(c => c.items.length > 0);
  }, [allCategories, allItems]);

  return { fourMData, nonFourMData, cp96Data };
}

/* ── 가이드 카드 ── */
function GuideCard({ category, items, color }: {
  category: string;
  items: { name: string; desc: string }[];
  color: 'blue' | 'emerald' | 'purple';
}) {
  const [open, setOpen] = useState(false);
  const cls = {
    blue: { bg: 'bg-blue-50/80 dark:bg-blue-900/20', border: 'border-blue-100 dark:border-blue-800/40', text: 'text-blue-700 dark:text-blue-400', badge: 'bg-blue-100 text-blue-800 dark:bg-blue-900/50 dark:text-blue-300' },
    emerald: { bg: 'bg-emerald-50/80 dark:bg-emerald-900/20', border: 'border-emerald-100 dark:border-emerald-800/40', text: 'text-emerald-700 dark:text-emerald-400', badge: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300' },
    purple: { bg: 'bg-purple-50/80 dark:bg-purple-900/20', border: 'border-purple-100 dark:border-purple-800/40', text: 'text-purple-700 dark:text-purple-400', badge: 'bg-purple-100 text-purple-800 dark:bg-purple-900/50 dark:text-purple-300' },
  }[color];

  return (
    <div className={`rounded-lg border ${cls.border} ${cls.bg} overflow-hidden`}>
      <button onClick={() => setOpen(!open)} className="flex w-full items-center gap-2 px-3 py-2 text-left hover:opacity-80">
        <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${cls.badge}`}>{items.length}</span>
        <span className={`flex-1 text-xs font-semibold ${cls.text}`}>{category}</span>
        {open ? <ChevronDown className={`h-3.5 w-3.5 ${cls.text}`} /> : <ChevronRight className={`h-3.5 w-3.5 ${cls.text}`} />}
      </button>
      {open && (
        <div className="border-t border-white/40 px-2 pb-2">
          {items.map((item, i) => (
            <div key={i} className="mt-1.5 rounded bg-white/70 px-2.5 py-1.5 dark:bg-gray-800/40">
              <p className="text-[11px] font-medium">{item.name}</p>
              <p className="text-[10px] text-muted-foreground">{item.desc}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── 슬라이드 패널 ── */
export function ClassificationGuidePanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'4m' | 'non4m' | '96'>('4m');
  const { fourMData, nonFourMData, cp96Data } = useClassificationData();

  const filteredFourM = useMemo(() => {
    if (!search) return fourMData;
    const s = search.toLowerCase();
    return fourMData.map((c) => ({
      ...c,
      items: c.items.filter((i) => i.name.toLowerCase().includes(s) || i.desc.toLowerCase().includes(s)),
    })).filter((c) => c.items.length > 0);
  }, [search, fourMData]);

  const filteredNonFourM = useMemo(() => {
    if (!search) return nonFourMData;
    const s = search.toLowerCase();
    return nonFourMData.map((c) => ({
      ...c,
      items: c.items.filter((i) => i.name.toLowerCase().includes(s) || i.desc.toLowerCase().includes(s)),
    })).filter((c) => c.items.length > 0);
  }, [search, nonFourMData]);

  const filtered96 = useMemo(() => {
    if (!search) return cp96Data;
    const s = search.toLowerCase();
    return cp96Data.map((c) => ({
      ...c,
      items: c.items.filter((i: string) => i.toLowerCase().includes(s)),
    })).filter((c) => c.items.length > 0);
  }, [search, cp96Data]);

  if (!open) return null;

  const tabs = [
    { key: '4m' as const, label: '4M (17)', color: 'text-blue-600' },
    { key: 'non4m' as const, label: '4M외 (17)', color: 'text-emerald-600' },
    { key: '96' as const, label: '96항목', color: 'text-purple-600' },
  ];

  return (
    <>
      {/* 오버레이 */}
      <div className="fixed inset-0 z-50 bg-black/30 backdrop-blur-sm" onClick={onClose} />

      {/* 슬라이드 패널 */}
      <div className="fixed right-0 top-0 z-50 flex h-full w-full max-w-md flex-col border-l border-gray-200/60 bg-white/95 shadow-2xl backdrop-blur-xl dark:border-gray-800/60 dark:bg-gray-900/95 animate-in slide-in-from-right duration-300 sm:max-w-lg">
        {/* 헤더 */}
        <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-gray-800">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
              <HelpCircle className="h-4 w-4 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-bold">분류항목 가이드</h3>
              <p className="text-[10px] text-muted-foreground">항목을 참고하여 분류를 선택하세요</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <Link
              href="/help"
              onClick={onClose}
              className="rounded-lg p-2 text-muted-foreground/50 hover:bg-gray-100 hover:text-foreground dark:hover:bg-gray-800"
              title="도움말 전체보기"
            >
              <ExternalLink className="h-4 w-4" />
            </Link>
            <button onClick={onClose} className="rounded-lg p-2 text-muted-foreground/50 hover:bg-gray-100 hover:text-foreground dark:hover:bg-gray-800">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* 검색 */}
        <div className="border-b border-gray-100 px-4 py-2 dark:border-gray-800">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground/40" />
            <input
              type="text"
              placeholder="항목명 검색..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-9 w-full rounded-lg border border-gray-200 bg-gray-50/80 pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30 dark:border-gray-700 dark:bg-gray-800/50"
            />
          </div>
        </div>

        {/* 탭 */}
        <div className="flex border-b border-gray-100 px-4 dark:border-gray-800">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 border-b-2 py-2.5 text-xs font-semibold transition-all ${
                activeTab === tab.key
                  ? `border-primary ${tab.color}`
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* 컨텐츠 */}
        <div className="flex-1 overflow-y-auto px-4 py-3">
          {activeTab === '4m' && (
            <div className="space-y-2">
              <div className="flex items-start gap-2 rounded-lg bg-blue-50/80 px-3 py-2 dark:bg-blue-900/20">
                <Info className="mt-0.5 h-3 w-3 flex-shrink-0 text-blue-500" />
                <p className="text-[10px] text-blue-700 dark:text-blue-400">VAATZ - 4M 신고 시스템을 통해 신고 필수</p>
              </div>
              {filteredFourM.map((cat) => (
                <GuideCard key={cat.category} category={cat.category} items={cat.items} color="blue" />
              ))}
              {filteredFourM.length === 0 && <p className="py-8 text-center text-xs text-muted-foreground">검색 결과 없음</p>}
            </div>
          )}

          {activeTab === 'non4m' && (
            <div className="space-y-2">
              <div className="flex items-start gap-2 rounded-lg bg-emerald-50/80 px-3 py-2 dark:bg-emerald-900/20">
                <Info className="mt-0.5 h-3 w-3 flex-shrink-0 text-emerald-500" />
                <p className="text-[10px] text-emerald-700 dark:text-emerald-400">변동점 담당제를 통한 일관성 확보 및 문제 최소화</p>
              </div>
              {filteredNonFourM.map((cat) => (
                <GuideCard key={cat.category} category={cat.category} items={cat.items} color="emerald" />
              ))}
              {filteredNonFourM.length === 0 && <p className="py-8 text-center text-xs text-muted-foreground">검색 결과 없음</p>}
            </div>
          )}

          {activeTab === '96' && (
            <div className="space-y-2">
              <div className="flex items-start gap-2 rounded-lg bg-purple-50/80 px-3 py-2 dark:bg-purple-900/20">
                <Info className="mt-0.5 h-3 w-3 flex-shrink-0 text-purple-500" />
                <p className="text-[10px] text-purple-700 dark:text-purple-400">신기술(3) + 집중관리(9) + 신규&변동(84) = 96항목</p>
              </div>
              {filtered96.map((cat) => (
                <div key={cat.category} className="rounded-lg border border-purple-100 bg-purple-50/80 overflow-hidden dark:border-purple-800/40 dark:bg-purple-900/20">
                  <div className="px-3 py-2">
                    <p className="text-xs font-semibold text-purple-700 dark:text-purple-400">{cat.category}</p>
                  </div>
                  <div className="border-t border-white/40 px-2 pb-2">
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {cat.items.map((item, i) => (
                        <span key={i} className="rounded-md bg-white/80 px-2 py-1 text-[10px] font-medium text-purple-700 dark:bg-gray-800/50 dark:text-purple-300">
                          {item}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
              {filtered96.length === 0 && <p className="py-8 text-center text-xs text-muted-foreground">검색 결과 없음</p>}
            </div>
          )}
        </div>

        {/* 하단 */}
        <div className="border-t border-gray-100 px-4 py-3 dark:border-gray-800">
          <Link
            href="/help"
            onClick={onClose}
            className="flex items-center justify-center gap-2 rounded-xl bg-gray-50 px-4 py-2.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-gray-100 hover:text-foreground dark:bg-gray-800/50 dark:hover:bg-gray-800"
          >
            <HelpCircle className="h-3.5 w-3.5" />
            도움말 전체 페이지에서 상세 보기
            <ExternalLink className="h-3 w-3" />
          </Link>
        </div>
      </div>
    </>
  );
}
