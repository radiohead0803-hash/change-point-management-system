'use client';

import {
  BookOpen, Users, ArrowDownUp, ClipboardCheck, FileSpreadsheet,
  Shield, ChevronRight, ChevronDown, Search, Info,
} from 'lucide-react';
import { useState, useMemo } from 'react';

/* ── 4M 항목 상세 설명 ── */
const FOUR_M_ITEMS = [
  {
    category: 'MAN (인원)', code: 'MAN', items: [
      { code: 'MAN_01', name: '작업자변경 (실명제 및 주요/보안 공정)', desc: '보안공정 또는 주요공정에서 작업자가 변경된 경우. 실명제 관리 대상 공정의 인원 교체 시 반드시 신고' },
      { code: 'MAN_02', name: '작업자변경 (일반 공정)', desc: '일반 공정에서의 작업자 변경. 숙련도에 따른 품질 영향을 고려하여 관리' },
    ],
  },
  {
    category: 'MACHINE (설비)', code: 'MACHINE', items: [
      { code: 'MCH_01', name: '금형, 지그 신작', desc: '신규 금형 또는 지그 제작 시. 초도품 검사 및 치수 측정이 필수' },
      { code: 'MCH_02', name: '생산설비 조건변경', desc: '기존 설비의 가공조건, 온도, 압력, 속도 등 파라미터 변경 시' },
    ],
  },
  {
    category: 'MATERIAL (자재)', code: 'MATERIAL', items: [
      { code: 'MAT_01', name: '재질변경 (원재료)', desc: '원재료의 재질(성분, 물성) 변경. 시험성적서 재발급 필요' },
      { code: 'MAT_02', name: '재질변경 (부자재)', desc: '접착제, 코팅제 등 부자재의 재질 변경' },
      { code: 'MAT_03', name: '재질변경 (부품)', desc: '조립용 서브부품의 재질 변경' },
      { code: 'MAT_04', name: '사급형태 변경', desc: '사급(무상사급/유상사급) 형태의 변경. 수입검사 기준 재설정 필요' },
      { code: 'MAT_05', name: '공급업체 변경', desc: '원재료 또는 부품 공급업체 변경 시. 신규 업체 품질감사 필수' },
    ],
  },
  {
    category: 'METHOD (방법)', code: 'METHOD', items: [
      { code: 'MTD_01', name: '생산 위치 변경 (공장)', desc: '생산 공장을 다른 위치로 이전하는 경우. 환경조건 변화에 따른 품질 검증 필요' },
      { code: 'MTD_02', name: '생산 위치 변경 (라인)', desc: '동일 공장 내 생산 라인 변경. 설비 조건 동일성 확인 필요' },
      { code: 'MTD_03', name: '작업조건 변경 (공정 파라미터)', desc: '온도, 압력, 시간 등 공정 파라미터의 변경' },
      { code: 'MTD_04', name: '작업조건 변경 (작업 방법)', desc: '작업 순서, 방법, 도구 사용법 등의 변경' },
      { code: 'MTD_05', name: '소재가공관련 관리기준 변경', desc: '소재 가공 시 적용되는 관리기준(스펙, 허용치) 변경' },
      { code: 'MTD_06', name: '공정관리 및 검사기준 변경 (공정)', desc: '제조 공정의 관리계획서(CP) 또는 관리기준 변경' },
      { code: 'MTD_07', name: '공정관리 및 검사기준 변경 (검사)', desc: '검사 기준, 검사 방법, 검사 빈도의 변경' },
      { code: 'MTD_08', name: '도면 관리기준 변경', desc: '제품 도면 또는 도면 관리기준의 변경. 치수 검사 강화 필요' },
    ],
  },
];

/* ── 4M외 항목 상세 설명 ── */
const NON_FOUR_M_ITEMS = [
  {
    category: '작업자', code: 'NF_WORKER', items: [
      { code: 'NF_W01', name: '작업자 임시 대체', desc: '질병, 휴가 등으로 인한 임시 작업자 대체. 교육 이수 확인 필요' },
      { code: 'NF_W02', name: '작업자 근무 교대시간 변경', desc: '교대 근무 시간 변경에 따른 인수인계 품질 관리' },
      { code: 'NF_W03', name: '작업자 역할 분담 변경', desc: '동일 라인 내 작업자 간 역할/담당 공정 재배치' },
    ],
  },
  {
    category: '설비/공구', code: 'NF_EQUIP', items: [
      { code: 'NF_E01', name: '툴(공구) 변경', desc: '드릴, 탭, 리머 등 공구 교체. 동일 규격 확인 필요' },
      { code: 'NF_E02', name: '동일 조건의 설비/라인 변경', desc: '동일 조건의 예비설비 또는 예비라인으로 변경' },
    ],
  },
  {
    category: '공장 조건', code: 'NF_FACTORY', items: [
      { code: 'NF_F01', name: '도장/토출 조건 변경', desc: '도장 두께, 토출량, 건조 조건 등의 변경' },
      { code: 'NF_F02', name: '작업 속도/주기 변경', desc: '컨베이어 속도, 사이클 타임 등의 변경' },
      { code: 'NF_F03', name: '설비 온도/압력 변경', desc: '사출기, 프레스 등 설비의 온도·압력 미세 조정' },
      { code: 'NF_F04', name: '작업 각도/방식 변경', desc: '작업자 자세, 각도, 방식 등의 변경' },
    ],
  },
  {
    category: '소모품/윤활관리', code: 'NF_CONSUMABLE', items: [
      { code: 'NF_C01', name: '그리스/윤활유 정기보충(교체)', desc: '그리스, 윤활유의 정기적 보충 또는 교체. 규격 확인 필수' },
      { code: 'NF_C02', name: '냉각수/워터호스 정기보충(교체)', desc: '냉각수 보충 및 워터호스 정기 교체' },
      { code: 'NF_C03', name: '설비 부자재 정기교체', desc: '필터, 패킹, 벨트 등 설비 소모성 부자재의 정기 교체' },
    ],
  },
  {
    category: '공정 외', code: 'NF_EXTERNAL', items: [
      { code: 'NF_X01', name: '단전/단수 발생', desc: '정전 또는 단수 발생 시 공정 재가동 품질 확인' },
      { code: 'NF_X02', name: '파업 발생', desc: '노사 분규에 따른 생산 중단 후 재가동 시 품질 점검' },
      { code: 'NF_X03', name: '물류/파렛트 변경', desc: '제품 운송 방법 또는 파렛트/포장 규격 변경' },
    ],
  },
  {
    category: '2/3차사 관련', code: 'NF_TIER23', items: [
      { code: 'NF_T01', name: '2/3차사 입고품 변경', desc: '2차/3차 협력사로부터 입고되는 부품의 사양·규격 변경' },
    ],
  },
  {
    category: '기타', code: 'NF_OTHER', items: [
      { code: 'NF_O01', name: '상기 16항목 외', desc: '위 16개 항목에 해당하지 않는 기타 변동 사항' },
    ],
  },
];

/* ── 96항목 상세 설명 ── */
const CP96_TECH = {
  category: '신기술 (3)', code: 'TECH', items: [
    { code: 'T01', name: '세계 최초', desc: '세계 최초 적용 기술. 선행 검증 및 양산성 확인 필수' },
    { code: 'T02', name: '국내 최초', desc: '국내 최초 적용 기술. 해외 양산 실적 확인 및 국내 적용성 검증' },
    { code: 'T03', name: 'HKMC 최초', desc: '현대·기아차 최초 적용 기술. 사내 기준 적합성 검증' },
  ],
};

const CP96_FOCUS = {
  category: '집중관리 (9)', code: 'FOCUS', items: [
    { code: 'F01', name: '최초 거래 1차 2차 협력사', desc: '거래 이력이 없는 신규 협력사. 품질 시스템 감사 필수' },
    { code: 'F02', name: '최근 5년 신차개발 이력부재 협력사', desc: '최근 5년간 신차 개발 경험이 없는 협력사. 역량 재검증' },
    { code: 'F03', name: '다사양 및 조립 복잡도 높은 품목', desc: '다양한 사양이 존재하거나 조립 난이도가 높은 품목' },
    { code: 'F04', name: '기존차 및 신차 혼류생산 불가 품목', desc: '기존 차종과 신차 혼류 생산이 어려운 품목. 전용 라인 필요' },
    { code: 'F05', name: '주요부품 및 핵심공정 외주화 품목', desc: '핵심 공정을 외부에 위탁하는 품목. 외주 품질 관리 강화' },
    { code: 'F06', name: '신규 공장 설비라인', desc: '신규 공장 또는 신규 설비라인에서 생산되는 품목' },
    { code: 'F07', name: '변동단계 품질이슈 다발', desc: '변동(양산 초기) 단계에서 품질 이슈가 빈번한 품목' },
    { code: 'F08', name: '신차 개발로드 집중', desc: '동시 다수 신차 개발로 관리 자원이 분산되는 경우' },
    { code: 'F09', name: '개발능력 부족 및 관리부실', desc: '협력사 개발 역량 부족 또는 품질 관리 미흡 이력' },
  ],
};

const CP96_NEW_CHANGE = [
  {
    category: '품목 (6)', code: 'NC_PRODUCT', items: [
      { code: 'NC_P01', name: '협력사최초 개발', desc: '해당 협력사에서 처음 개발하는 품목 (1차사/2·3차사)' },
      { code: 'NC_P02', name: '이관차 개발', desc: '품질문제로 인한 타 협력사로의 이관 개발' },
      { code: 'NC_P03', name: '외주화 개발', desc: '사내(MP) 생산에서 협력사로 외주 전환' },
      { code: 'NC_P04', name: '일정단축 요청', desc: '개발 일정 단축 요청에 따른 리스크 관리' },
      { code: 'NC_P05', name: '수입 신규품목', desc: '해외에서 수입되는 신규 품목' },
      { code: 'NC_P06', name: '기능 관련 글로벌/현지사 품목', desc: '글로벌 또는 현지법인 관련 기능 품목' },
    ],
  },
  {
    category: '협력사 (9)', code: 'NC_SUPPLIER', items: [
      { code: 'NC_S01', name: '신규 거래', desc: '처음 거래를 시작하는 협력사 (1차사/2·3차사)' },
      { code: 'NC_S02', name: '신규 지역', desc: '기존에 없던 새로운 지역의 협력사 (1차사/2·3차사)' },
      { code: 'NC_S03', name: '협력사 변경', desc: '기존 협력사에서 다른 협력사로 변경 (1차사/2·3차사)' },
      { code: 'NC_S04', name: '생산공장 변경', desc: '협력사 생산 공장(생산지) 변경 (1차사/2·3차사)' },
      { code: 'NC_S05', name: '소싱변경에 따른 관리주체변경', desc: '통합→스플릿 등 소싱 구조 변경에 따른 관리 주체 변경' },
    ],
  },
  {
    category: '사양/기능 (3)', code: 'NC_SPEC', items: [
      { code: 'NC_SF01', name: '신규사양', desc: '차종별 최초 적용 사양' },
      { code: 'NC_SF02', name: '신규 기능', desc: '차종별 최초 적용 기능' },
      { code: 'NC_SF03', name: '기능 보완', desc: '전차 대비 기능 보완·개선' },
    ],
  },
  {
    category: '공법 (5)', code: 'NC_METHOD', items: [
      { code: 'NC_M01', name: '협력사최초 적용', desc: '해당 협력사에서 처음 적용하는 공법 (1차사/2·3차사)' },
      { code: 'NC_M02', name: '신규 공법', desc: '새로운 가공/제조 공법 적용 (1차사/2·3차사)' },
      { code: 'NC_M03', name: '공법 변경', desc: '개발단계 품질개선을 위한 공법 변경' },
    ],
  },
  {
    category: '소재 (16)', code: 'NC_MATERIAL', items: [
      { code: 'NC_MT01', name: '신규 재질', desc: '세계/국내/당사/협력사 최초 적용 재질' },
      { code: 'NC_MT02', name: '신규 원단', desc: '세계/국내/당사/협력사 최초 적용 원단' },
      { code: 'NC_MT03', name: '신규 소재', desc: '세계/국내/당사/협력사 최초 적용 소재' },
      { code: 'NC_MT04', name: '소재 관련 클레임 발생이력', desc: '과거 소재 관련 클레임이 발생한 이력이 있는 경우 (통보)' },
      { code: 'NC_MT05', name: '대체소재', desc: '생산능력(CAPA) 이유로 대체 소재 적용' },
      { code: 'NC_MT06', name: '재질 변경', desc: '품질개선을 위한 재질 변경' },
      { code: 'NC_MT07', name: '원단 소재/패턴 변경', desc: '고급화 또는 품질개선을 위한 원단 소재·패턴 변경' },
    ],
  },
  {
    category: '구조 (7)', code: 'NC_STRUCTURE', items: [
      { code: 'NC_ST01', name: '신규 구조 (Sub부품간)', desc: '서브부품 간 새로운 결합/조립 구조' },
      { code: 'NC_ST02', name: '신규 구조 (연관부품간)', desc: '연관 부품 간 새로운 인터페이스 구조' },
      { code: 'NC_ST03', name: '신규 디자인', desc: '성형성·양산성을 고려한 신규 디자인' },
      { code: 'NC_ST04', name: '조립구조 변경', desc: '조립성 개선을 위한 구조 변경' },
      { code: 'NC_ST05', name: '서브부품수 과다 증대', desc: '서브부품 수가 크게 증가하는 경우' },
      { code: 'NC_ST06', name: '부품 융합', desc: '기존 별도 부품을 하나로 통합·융합' },
      { code: 'NC_ST07', name: '특허침해 관련 구조변경', desc: '특허 침해 회피를 위한 구조 변경' },
    ],
  },
  {
    category: '공정 (7)', code: 'NC_PROCESS', items: [
      { code: 'NC_PR01', name: '신규 라인', desc: '새로운 생산 라인 구축 (1차사/2·3차사)' },
      { code: 'NC_PR02', name: '신규 설비', desc: '새로운 생산 설비 도입 (1차사/2·3차사)' },
      { code: 'NC_PR03', name: '라인 개조', desc: '신차·품질개선·CAPA 목적의 라인 개조' },
      { code: 'NC_PR04', name: '설비 개조', desc: '신차·품질개선·CAPA 목적의 설비 개조' },
      { code: 'NC_PR05', name: '공정 추가/삭제', desc: '품질 또는 CAPA 목적의 공정 추가·삭제' },
    ],
  },
  {
    category: '칼라/표면처리 (4)', code: 'NC_COLOR', items: [
      { code: 'NC_CL01', name: '신규 칼라', desc: '새로운 색상 적용' },
      { code: 'NC_CL02', name: '신규 표면처리', desc: '새로운 표면처리 공법 적용' },
      { code: 'NC_CL03', name: '칼라 변경', desc: '고급화 또는 품질개선을 위한 색상 변경' },
      { code: 'NC_CL04', name: '표면처리 변경', desc: '고급화·품질개선·원가절감 목적의 표면처리 변경' },
    ],
  },
  {
    category: '스펙/법규 (4)', code: 'NC_REGULATION', items: [
      { code: 'NC_RG01', name: '신규스펙 제정', desc: '새로운 사내 스펙(MS/ES) 제정' },
      { code: 'NC_RG02', name: '신법규 대응', desc: '새로 시행되는 법규에 대한 대응' },
      { code: 'NC_RG03', name: '개정법규 대응', desc: '기존 법규 개정에 따른 대응' },
      { code: 'NC_RG04', name: '스펙 변경', desc: 'MS/ES 등 사내 스펙 변경' },
    ],
  },
  {
    category: '소프트웨어 (20)', code: 'NC_SOFTWARE', items: [
      { code: 'NC_SW01', name: '신규 O/S', desc: '새로운 운영체제 적용' },
      { code: 'NC_SW02', name: '신규 플랫폼 (HKMC)', desc: '현대·기아 신규 플랫폼 적용' },
      { code: 'NC_SW03', name: '신규 플랫폼 (협력사)', desc: '협력사 자체 신규 플랫폼 적용' },
      { code: 'NC_SW04', name: '신규 통신방식', desc: '새로운 차량 통신 프로토콜 적용' },
      { code: 'NC_SW05', name: '신규 진단로직', desc: '새로운 차량 진단 로직 적용' },
      { code: 'NC_SW06', name: '신규 사양/기능/로직', desc: '새로운 소프트웨어 사양·기능·로직 개발' },
      { code: 'NC_SW07', name: '신규 UX/그래픽', desc: '새로운 사용자 인터페이스·그래픽 적용' },
      { code: 'NC_SW08', name: '신규 교정업체 (외주)', desc: '새로운 소프트웨어 교정(캘리브레이션) 외주업체' },
      { code: 'NC_SW09', name: '신규 디자인TOOL (외주)', desc: '새로운 디자인 개발 도구 외주 적용' },
      { code: 'NC_SW10', name: '변경(차세대) O/S', desc: '차세대 운영체제로 변경' },
      { code: 'NC_SW11', name: '변경(차세대) 플랫폼 (HKMC)', desc: '차세대 HKMC 플랫폼으로 변경' },
      { code: 'NC_SW12', name: '변경(차세대) 플랫폼 (협력사)', desc: '차세대 협력사 플랫폼으로 변경' },
      { code: 'NC_SW13', name: '변경(차세대) 통신방식', desc: '차세대 통신방식으로 변경' },
      { code: 'NC_SW14', name: '변경(차세대) 진단로직', desc: '차세대 진단로직으로 변경' },
      { code: 'NC_SW15', name: '변경(차세대) 사양/기능/로직', desc: '차세대 사양·기능·로직으로 변경' },
      { code: 'NC_SW16', name: '변경(차세대) UX/그래픽', desc: '차세대 UX·그래픽으로 변경' },
      { code: 'NC_SW17', name: '변경(차세대) 디자인TOOL', desc: '차세대 디자인 도구로 변경' },
      { code: 'NC_SW18', name: '타시스템 변동에 의한 동시변경', desc: '타 시스템 변동에 따라 동시에 변경이 필요한 경우' },
      { code: 'NC_SW19', name: '타시스템 요청에 의한 대체변경', desc: '타 시스템의 요청에 의해 대체·변경하는 경우' },
      { code: 'NC_SW20', name: '로직 변경', desc: '개발단계 품질개선을 위한 로직 변경' },
    ],
  },
  {
    category: '기타 (3)', code: 'NC_ETC', items: [
      { code: 'NC_ET01', name: '직거래품 설계변경', desc: '직거래 품목의 설계 변경' },
      { code: 'NC_ET02', name: '물류/포장방법 변경', desc: '설계사양 변경에 따른 물류·포장 방법 변경' },
      { code: 'NC_ET03', name: '작업자 변경', desc: '신규채용 또는 변경 관리 대상 작업자 변경' },
    ],
  },
];

/* ── 기본 섹션 ── */
const basicSections = [
  {
    id: 'overview',
    icon: BookOpen,
    title: '시스템 개요',
    content: [
      '변동점 관리시스템은 부품 품질 일관성 확보를 위한 신차개발-양산 연속적인 변동점 관리 방안을 제공합니다.',
      '기존 4M(Man, Machine, Material, Method)뿐만 아니라 신차개발 및 양산단계에서 발생할 수 있는 모든 일상 제조공정 변동사항을 포괄하는 개념으로 관리합니다.',
      '4M/ISIR 신고 범위 외에도 모든 변동점이 품질문제를 초래할 수 있으므로, 변동점 담당제 시행을 통한 관리/점검이 필요합니다.',
    ],
  },
  {
    id: 'roles',
    icon: Users,
    title: '역할 및 권한',
    content: [
      '관리자 (ADMIN): 시스템 전체 관리, 기초정보 편집, 모든 변동점 승인/반려, 사용자 관리',
      '담당자 (TIER1_EDITOR/REVIEWER): 변동점 등록 및 1차 검토, 주단위 점검결과 종합',
      '협력사 (TIER2_EDITOR): 변동점 등록 및 수정, 일일 점검 실시',
      '전담중역 (EXEC_APPROVER): 최종 승인, 사장님 보고용 매주 점검',
      '고객사 뷰어 (CUSTOMER_VIEWER): 승인된 변동점 조회 전용',
    ],
  },
  {
    id: 'process',
    icon: ArrowDownUp,
    title: '프로세스 흐름',
    steps: [
      { step: '1', title: '변동점 등록', desc: '협력사 또는 담당자가 변동점 발생 내용을 등록합니다.' },
      { step: '2', title: '일일 점검', desc: '변동점 관리 실무부서(관리자)가 매일 점검합니다.' },
      { step: '3', title: '주 단위 종합', desc: '주 단위 점검결과를 종합하여 전담 중역에게 보고합니다.' },
      { step: '4', title: '매주 점검', desc: '변동점 전담 중역(사장님 보고)이 매주 점검합니다.' },
      { step: '5', title: '월 단위 제출', desc: '월 단위 점검결과를 HMC/KIA 개발에 제출합니다 (매월 5일).' },
      { step: '6', title: '피드백', desc: '고객사 개발담당 피드백을 반영합니다.' },
    ],
  },
  {
    id: 'required-fields',
    icon: FileSpreadsheet,
    title: '필수 작성 항목 (발생 & 조치결과)',
    columns: [
      { header: '발생내역', fields: ['발생일', '발생항목', '발생부서', '담당자'] },
      { header: '조치결과', fields: ['조치시점', '조치방안', '조치결과', '품질검증'] },
    ],
  },
  {
    id: 'guidelines',
    icon: Shield,
    title: '관리 기준',
    content: [
      '점검 대상: 모든 사내 + 2차사의 양산 제조공정의 변동점',
      '점검 주기: 양산 후 2회 (SOP+6M / 12M)',
      '점검 방식: 전 품목 대상 서류점검 후 선별 현장점검',
      '제출처/기한: 부품개발혁신추진팀 + 담당 개발, 구매 담당 / 매월 5일',
      '',
      '협력사 당부사항:',
      '1. 양산 후 품질관리 연속성 확보 및 유명무실 항목의 재점검을 통한 경각심 제고',
      '2. 형식적인 점검이 아닌, 실질적인 제조공정 점검을 통한 변동점 최소화',
    ],
  },
];

/* ── 분류항목 카드 컴포넌트 ── */
function ClassificationCard({ category, items, color }: {
  category: string;
  items: { code: string; name: string; desc: string }[];
  color: 'blue' | 'emerald' | 'purple';
}) {
  const [open, setOpen] = useState(false);
  const colorClasses = {
    blue: { bg: 'bg-blue-50 dark:bg-blue-900/20', border: 'border-blue-100 dark:border-blue-900/30', text: 'text-blue-700 dark:text-blue-400', badge: 'bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300' },
    emerald: { bg: 'bg-emerald-50 dark:bg-emerald-900/20', border: 'border-emerald-100 dark:border-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-400', badge: 'bg-emerald-100 dark:bg-emerald-900/40 text-emerald-800 dark:text-emerald-300' },
    purple: { bg: 'bg-purple-50 dark:bg-purple-900/20', border: 'border-purple-100 dark:border-purple-900/30', text: 'text-purple-700 dark:text-purple-400', badge: 'bg-purple-100 dark:bg-purple-900/40 text-purple-800 dark:text-purple-300' },
  };
  const c = colorClasses[color];

  return (
    <div className={`rounded-xl border ${c.border} ${c.bg} overflow-hidden`}>
      <button onClick={() => setOpen(!open)} className="flex w-full items-center gap-2 px-3 py-2.5 text-left hover:opacity-80 transition-opacity">
        <span className={`rounded-md px-2 py-0.5 text-[11px] font-bold ${c.badge}`}>{items.length}</span>
        <span className={`flex-1 text-sm font-semibold ${c.text}`}>{category}</span>
        {open ? <ChevronDown className={`h-4 w-4 ${c.text}`} /> : <ChevronRight className={`h-4 w-4 ${c.text}`} />}
      </button>
      {open && (
        <div className="border-t border-white/40 px-3 pb-3">
          <div className="mt-2 space-y-1.5">
            {items.map((item) => (
              <div key={item.code} className="rounded-lg bg-white/70 px-3 py-2 dark:bg-gray-800/40">
                <div className="flex items-center gap-2">
                  <span className="flex-shrink-0 rounded bg-gray-100 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground dark:bg-gray-700">{item.code}</span>
                  <span className="text-sm font-medium">{item.name}</span>
                </div>
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function HelpPage() {
  const [expandedId, setExpandedId] = useState<string | null>('overview');
  const [search, setSearch] = useState('');

  // 검색 기능
  const filteredFourM = useMemo(() => {
    if (!search) return FOUR_M_ITEMS;
    const s = search.toLowerCase();
    return FOUR_M_ITEMS.map((cat) => ({
      ...cat,
      items: cat.items.filter((i) => i.name.toLowerCase().includes(s) || i.desc.toLowerCase().includes(s) || i.code.toLowerCase().includes(s)),
    })).filter((cat) => cat.items.length > 0);
  }, [search]);

  const filteredNonFourM = useMemo(() => {
    if (!search) return NON_FOUR_M_ITEMS;
    const s = search.toLowerCase();
    return NON_FOUR_M_ITEMS.map((cat) => ({
      ...cat,
      items: cat.items.filter((i) => i.name.toLowerCase().includes(s) || i.desc.toLowerCase().includes(s) || i.code.toLowerCase().includes(s)),
    })).filter((cat) => cat.items.length > 0);
  }, [search]);

  const filtered96 = useMemo(() => {
    if (!search) return CP96_NEW_CHANGE;
    const s = search.toLowerCase();
    return CP96_NEW_CHANGE.map((cat) => ({
      ...cat,
      items: cat.items.filter((i) => i.name.toLowerCase().includes(s) || i.desc.toLowerCase().includes(s) || i.code.toLowerCase().includes(s)),
    })).filter((cat) => cat.items.length > 0);
  }, [search]);

  const filteredTech = useMemo(() => {
    if (!search) return CP96_TECH;
    const s = search.toLowerCase();
    return { ...CP96_TECH, items: CP96_TECH.items.filter((i) => i.name.toLowerCase().includes(s) || i.desc.toLowerCase().includes(s)) };
  }, [search]);

  const filteredFocus = useMemo(() => {
    if (!search) return CP96_FOCUS;
    const s = search.toLowerCase();
    return { ...CP96_FOCUS, items: CP96_FOCUS.items.filter((i) => i.name.toLowerCase().includes(s) || i.desc.toLowerCase().includes(s)) };
  }, [search]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight sm:text-2xl">도움말 / 관리 기준</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          변동점 담당제 운영 가이드 및 시스템 사용 안내
        </p>
      </div>

      {/* 기본 섹션 */}
      <div className="space-y-3">
        {basicSections.map((section) => {
          const Icon = section.icon;
          const isExpanded = expandedId === section.id;

          return (
            <div
              key={section.id}
              className="overflow-hidden rounded-2xl border border-white/60 bg-white/70 shadow-sm backdrop-blur-xl dark:border-gray-800/60 dark:bg-gray-900/70"
            >
              <button
                onClick={() => setExpandedId(isExpanded ? null : section.id)}
                className="flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-gray-50/80 sm:p-5 dark:hover:bg-gray-800/40"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                  <Icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="flex-1 text-sm font-semibold">{section.title}</h3>
                <ChevronRight
                  className={`h-5 w-5 text-muted-foreground transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`}
                />
              </button>

              {isExpanded && (
                <div className="border-t border-gray-100 p-5 dark:border-gray-800">
                  {section.content && (
                    <div className="space-y-2">
                      {section.content.map((line, i) =>
                        line === '' ? (
                          <div key={i} className="h-2" />
                        ) : (
                          <p key={i} className="text-sm leading-relaxed text-muted-foreground">
                            {line.startsWith('→') ? (
                              <span className="ml-4 text-xs text-primary">{line}</span>
                            ) : (
                              line
                            )}
                          </p>
                        ),
                      )}
                    </div>
                  )}

                  {section.steps && (
                    <div className="space-y-3">
                      {section.steps.map((step, i) => (
                        <div key={i} className="flex gap-3">
                          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                            {step.step}
                          </div>
                          <div>
                            <p className="text-sm font-medium">{step.title}</p>
                            <p className="mt-0.5 text-xs text-muted-foreground">{step.desc}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {section.columns && (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-gray-100 dark:border-gray-800">
                            <th className="px-3 py-2 text-left text-xs font-semibold text-muted-foreground">NO</th>
                            {section.columns.map((col) => (
                              <th key={col.header} colSpan={col.fields.length} className="px-3 py-2 text-center text-xs font-semibold">
                                {col.header}
                              </th>
                            ))}
                          </tr>
                          <tr className="border-b border-gray-100 dark:border-gray-800">
                            <th className="px-3 py-2"></th>
                            {section.columns.flatMap((col) =>
                              col.fields.map((f) => (
                                <th key={f} className="px-3 py-2 text-center text-xs font-medium text-muted-foreground">{f}</th>
                              )),
                            )}
                          </tr>
                        </thead>
                        <tbody>
                          <tr>
                            <td className="px-3 py-3 text-center text-xs text-muted-foreground">1</td>
                            {section.columns.flatMap((col) =>
                              col.fields.map((f) => (
                                <td key={f} className="px-3 py-3 text-center">
                                  <div className="mx-auto h-6 w-16 rounded border border-dashed border-gray-200 dark:border-gray-700" />
                                </td>
                              )),
                            )}
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* ── 변동점 분류 항목 상세 도움말 ── */}
      <div className="rounded-2xl border border-white/60 bg-white/70 shadow-sm backdrop-blur-xl dark:border-gray-800/60 dark:bg-gray-900/70">
        <div className="p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
                <ClipboardCheck className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h2 className="text-sm font-semibold">변동점 분류 항목 상세 도움말</h2>
                <p className="text-xs text-muted-foreground">4M (17항목) + 4M외 (17항목) + 96항목 = 총 130항목</p>
              </div>
            </div>
            <div className="relative w-full sm:w-64">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/50" />
              <input
                type="text"
                placeholder="항목 검색..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-9 w-full rounded-lg border border-gray-200 bg-white/60 pl-9 pr-3 text-sm placeholder:text-muted-foreground/40 focus:outline-none focus:ring-2 focus:ring-primary/30 dark:border-gray-700 dark:bg-gray-800/40"
              />
            </div>
          </div>
        </div>

        <div className="border-t border-gray-100 p-4 sm:p-5 dark:border-gray-800">
          {/* 4M 변경 필수 신고 변동점 */}
          <div className="mb-6">
            <div className="mb-3 flex items-center gap-2">
              <div className="h-6 w-1.5 rounded-full bg-blue-500" />
              <h3 className="text-sm font-bold text-blue-700 dark:text-blue-400">4M 변경 필수 신고 변동점 (17항목)</h3>
            </div>
            <div className="mb-3 flex items-start gap-2 rounded-lg bg-blue-50/80 px-3 py-2 dark:bg-blue-900/20">
              <Info className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-blue-500" />
              <p className="text-xs text-blue-700 dark:text-blue-400">VAATZ - 4M 신고 시스템을 통해 신고 필수</p>
            </div>
            <div className="space-y-2">
              {filteredFourM.map((cat) => (
                <ClassificationCard key={cat.code} category={cat.category} items={cat.items} color="blue" />
              ))}
              {filteredFourM.length === 0 && <p className="py-4 text-center text-xs text-muted-foreground">검색 결과 없음</p>}
            </div>
          </div>

          {/* 4M외 관리대상 변동점 */}
          <div className="mb-6">
            <div className="mb-3 flex items-center gap-2">
              <div className="h-6 w-1.5 rounded-full bg-emerald-500" />
              <h3 className="text-sm font-bold text-emerald-700 dark:text-emerald-400">4M 기준 외 관리대상 변동점 (17항목)</h3>
            </div>
            <div className="mb-3 flex items-start gap-2 rounded-lg bg-emerald-50/80 px-3 py-2 dark:bg-emerald-900/20">
              <Info className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-emerald-500" />
              <p className="text-xs text-emerald-700 dark:text-emerald-400">변동점 담당제를 통한 일관성 확보 및 문제 최소화</p>
            </div>
            <div className="space-y-2">
              {filteredNonFourM.map((cat) => (
                <ClassificationCard key={cat.code} category={cat.category} items={cat.items} color="emerald" />
              ))}
              {filteredNonFourM.length === 0 && <p className="py-4 text-center text-xs text-muted-foreground">검색 결과 없음</p>}
            </div>
          </div>

          {/* 96항목 */}
          <div>
            <div className="mb-3 flex items-center gap-2">
              <div className="h-6 w-1.5 rounded-full bg-purple-500" />
              <h3 className="text-sm font-bold text-purple-700 dark:text-purple-400">신기술/집중관리/신규&변동 (96항목)</h3>
            </div>
            <div className="mb-3 flex items-start gap-2 rounded-lg bg-purple-50/80 px-3 py-2 dark:bg-purple-900/20">
              <Info className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-purple-500" />
              <p className="text-xs text-purple-700 dark:text-purple-400">신기술(3) + 집중관리(9) + 신규&변동(84) = 96항목 선정 기준</p>
            </div>

            <div className="space-y-2">
              {filteredTech.items.length > 0 && (
                <ClassificationCard category={filteredTech.category} items={filteredTech.items} color="purple" />
              )}
              {filteredFocus.items.length > 0 && (
                <ClassificationCard category={filteredFocus.category} items={filteredFocus.items} color="purple" />
              )}
              {/* 신규&변동 하위 */}
              {filtered96.length > 0 && (
                <div className="ml-2 space-y-2 border-l-2 border-purple-200 pl-3 dark:border-purple-800">
                  <p className="text-xs font-semibold text-purple-600 dark:text-purple-400">신규&변동 (84항목)</p>
                  {filtered96.map((cat) => (
                    <ClassificationCard key={cat.code} category={cat.category} items={cat.items} color="purple" />
                  ))}
                </div>
              )}
              {filteredTech.items.length === 0 && filteredFocus.items.length === 0 && filtered96.length === 0 && (
                <p className="py-4 text-center text-xs text-muted-foreground">검색 결과 없음</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
