'use client';

import { useState, useMemo } from 'react';
import { X, Search, ChevronRight, ChevronDown, Info, HelpCircle, ExternalLink } from 'lucide-react';
import Link from 'next/link';

/* ── 4M 항목 데이터 ── */
const FOUR_M_ITEMS = [
  { category: 'MAN (인원)', items: [
    { name: '작업자변경 (실명제 및 주요/보안 공정)', desc: '보안공정 또는 주요공정에서 작업자가 변경된 경우' },
    { name: '작업자변경 (일반 공정)', desc: '일반 공정에서의 작업자 변경' },
  ]},
  { category: 'MACHINE (설비)', items: [
    { name: '금형, 지그 신작', desc: '신규 금형 또는 지그 제작. 초도품 검사 필수' },
    { name: '생산설비 조건변경', desc: '설비의 가공조건, 온도, 압력, 속도 등 파라미터 변경' },
  ]},
  { category: 'MATERIAL (자재)', items: [
    { name: '재질변경 (원재료)', desc: '원재료의 재질(성분, 물성) 변경' },
    { name: '재질변경 (부자재)', desc: '접착제, 코팅제 등 부자재의 재질 변경' },
    { name: '재질변경 (부품)', desc: '조립용 서브부품의 재질 변경' },
    { name: '사급형태 변경', desc: '사급(무상/유상) 형태 변경. 수입검사 기준 재설정' },
    { name: '공급업체 변경', desc: '원재료 또는 부품 공급업체 변경' },
  ]},
  { category: 'METHOD (방법)', items: [
    { name: '생산 위치 변경 (공장)', desc: '생산 공장 이전' },
    { name: '생산 위치 변경 (라인)', desc: '동일 공장 내 생산 라인 변경' },
    { name: '작업조건 변경 (공정 파라미터)', desc: '온도, 압력, 시간 등 변경' },
    { name: '작업조건 변경 (작업 방법)', desc: '작업 순서, 방법, 도구 사용법 변경' },
    { name: '소재가공관련 관리기준 변경', desc: '소재 가공 시 관리기준 변경' },
    { name: '공정관리 및 검사기준 변경 (공정)', desc: 'CP 또는 관리기준 변경' },
    { name: '공정관리 및 검사기준 변경 (검사)', desc: '검사 기준/방법/빈도 변경' },
    { name: '도면 관리기준 변경', desc: '제품 도면 또는 도면 관리기준 변경' },
  ]},
];

const NON_FOUR_M_ITEMS = [
  { category: '작업자', items: [
    { name: '작업자 임시 대체', desc: '질병, 휴가 등 임시 대체' },
    { name: '작업자 근무 교대시간 변경', desc: '교대 시간 변경' },
    { name: '작업자 역할 분담 변경', desc: '담당 공정 재배치' },
  ]},
  { category: '설비/공구', items: [
    { name: '툴(공구) 변경', desc: '드릴, 탭, 리머 등 공구 교체' },
    { name: '동일 조건의 설비/라인 변경', desc: '예비설비 또는 예비라인 변경' },
  ]},
  { category: '공장 조건', items: [
    { name: '도장/토출 조건 변경', desc: '도장 두께, 토출량, 건조 조건 변경' },
    { name: '작업 속도/주기 변경', desc: '컨베이어 속도, 사이클 타임 변경' },
    { name: '설비 온도/압력 변경', desc: '설비 온도·압력 미세 조정' },
    { name: '작업 각도/방식 변경', desc: '작업자 자세, 각도, 방식 변경' },
  ]},
  { category: '소모품/윤활관리', items: [
    { name: '그리스/윤활유 정기보충(교체)', desc: '그리스, 윤활유 정기 보충/교체' },
    { name: '냉각수/워터호스 정기보충(교체)', desc: '냉각수 보충 및 호스 교체' },
    { name: '설비 부자재 정기교체', desc: '필터, 패킹, 벨트 등 교체' },
  ]},
  { category: '공정 외', items: [
    { name: '단전/단수 발생', desc: '정전·단수 시 재가동 품질 확인' },
    { name: '파업 발생', desc: '노사 분규 후 재가동 품질 점검' },
    { name: '물류/파렛트 변경', desc: '운송 방법 또는 파렛트 변경' },
  ]},
  { category: '2/3차사 관련', items: [
    { name: '2/3차사 입고품 변경', desc: '2·3차 협력사 입고 부품 사양 변경' },
  ]},
  { category: '기타', items: [
    { name: '상기 16항목 외', desc: '위 항목에 해당하지 않는 기타' },
  ]},
];

const CP96_CATEGORIES = [
  { category: '신기술 (3)', items: ['세계 최초', '국내 최초', 'HKMC 최초'] },
  { category: '집중관리 (9)', items: ['최초 거래 협력사', '5년 이력부재', '다사양/복잡도 높은 품목', '혼류생산 불가', '핵심공정 외주화', '신규 공장설비', '품질이슈 다발', '개발로드 집중', '관리부실'] },
  { category: '품목 (6)', items: ['협력사최초 개발', '이관차 개발', '외주화 개발', '일정단축 요청', '수입 신규품목', '글로벌/현지사 품목'] },
  { category: '협력사 (9)', items: ['신규 거래', '신규 지역', '협력사 변경', '생산공장 변경', '관리주체 변경'] },
  { category: '사양/기능 (3)', items: ['신규사양', '신규 기능', '기능 보완'] },
  { category: '공법 (5)', items: ['협력사최초 적용', '신규 공법', '공법 변경'] },
  { category: '소재 (16)', items: ['신규 재질', '신규 원단', '신규 소재', '클레임 이력', '대체소재', '재질 변경', '원단/패턴 변경'] },
  { category: '구조 (7)', items: ['신규 구조(Sub)', '신규 구조(연관)', '신규 디자인', '조립구조 변경', '서브부품수 증대', '부품 융합', '특허 구조변경'] },
  { category: '공정 (7)', items: ['신규 라인', '신규 설비', '라인 개조', '설비 개조', '공정 추가/삭제'] },
  { category: '칼라/표면처리 (4)', items: ['신규 칼라', '신규 표면처리', '칼라 변경', '표면처리 변경'] },
  { category: '스펙/법규 (4)', items: ['신규스펙 제정', '신법규 대응', '개정법규 대응', '스펙 변경'] },
  { category: '소프트웨어 (20)', items: ['신규 O/S', '신규 플랫폼', '신규 통신방식', '신규 진단로직', '신규 사양/기능/로직', '신규 UX/그래픽', '변경(차세대) 시리즈 등'] },
  { category: '기타 (3)', items: ['직거래품 설계변경', '물류/포장 변경', '작업자 변경'] },
];

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

  const filteredFourM = useMemo(() => {
    if (!search) return FOUR_M_ITEMS;
    const s = search.toLowerCase();
    return FOUR_M_ITEMS.map((c) => ({
      ...c,
      items: c.items.filter((i) => i.name.toLowerCase().includes(s) || i.desc.toLowerCase().includes(s)),
    })).filter((c) => c.items.length > 0);
  }, [search]);

  const filteredNonFourM = useMemo(() => {
    if (!search) return NON_FOUR_M_ITEMS;
    const s = search.toLowerCase();
    return NON_FOUR_M_ITEMS.map((c) => ({
      ...c,
      items: c.items.filter((i) => i.name.toLowerCase().includes(s) || i.desc.toLowerCase().includes(s)),
    })).filter((c) => c.items.length > 0);
  }, [search]);

  const filtered96 = useMemo(() => {
    if (!search) return CP96_CATEGORIES;
    const s = search.toLowerCase();
    return CP96_CATEGORIES.map((c) => ({
      ...c,
      items: c.items.filter((i) => i.toLowerCase().includes(s)),
    })).filter((c) => c.items.length > 0);
  }, [search]);

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
