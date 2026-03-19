/**
 * 공통코드 관리 (localStorage 기반)
 * 고객사, 제품군, 공장, 라인, 발생부서 등 드롭다운 옵션 관리
 */

export interface CodeGroup {
  key: string;
  label: string;
  items: string[];
}

const STORAGE_KEY = 'cpms_common_codes';

// PROJECT는 기초정보 → 차종현황에서 관리 (cpms_vehicles localStorage)
const DEFAULT_CODES: CodeGroup[] = [
  { key: 'CUSTOMER', label: '고객사', items: ['현대자동차', '기아', '제네시스', 'HMG'] },
  { key: 'PRODUCT_LINE', label: '제품군', items: ['전장', '내장', '외장', '샤시', '파워트레인', 'BMS', '모터', '배터리'] },
  { key: 'FACTORY', label: '공장', items: ['아산공장', '울산공장', '광주공장', '화성공장'] },
  { key: 'LINE', label: '라인', items: ['1라인', '2라인', '3라인', 'A라인', 'B라인'] },
  { key: 'DEPARTMENT', label: '발생부서', items: ['품질관리팀', '품질보증팀', '생산기술팀', '구매팀', '설계팀', '공정기술팀'] },
];

export function getCommonCodes(): CodeGroup[] {
  if (typeof window === 'undefined') return DEFAULT_CODES;
  const stored = localStorage.getItem(STORAGE_KEY);
  if (!stored) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_CODES));
    return DEFAULT_CODES;
  }
  // PROJECT는 차종현황에서 관리하므로 제외
  const codes = JSON.parse(stored) as CodeGroup[];
  return codes.filter((c) => c.key !== 'PROJECT');
}

export function saveCommonCodes(codes: CodeGroup[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(codes));
}

export function getCodeOptions(key: string): string[] {
  const codes = getCommonCodes();
  const group = codes.find((c) => c.key === key);
  return group?.items || [];
}

export function addCodeItem(key: string, item: string) {
  const codes = getCommonCodes();
  const group = codes.find((c) => c.key === key);
  if (group && !group.items.includes(item)) {
    group.items.push(item);
    saveCommonCodes(codes);
  }
}

export function removeCodeItem(key: string, item: string) {
  const codes = getCommonCodes();
  const group = codes.find((c) => c.key === key);
  if (group) {
    group.items = group.items.filter((i) => i !== item);
    saveCommonCodes(codes);
  }
}

export function updateCodeItem(key: string, oldItem: string, newItem: string) {
  const codes = getCommonCodes();
  const group = codes.find((c) => c.key === key);
  if (group) {
    const idx = group.items.indexOf(oldItem);
    if (idx !== -1) group.items[idx] = newItem;
    saveCommonCodes(codes);
  }
}
