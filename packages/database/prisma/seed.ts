import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // 관리자 계정 생성
  const adminPassword = await bcrypt.hash('1234', 10);
  await prisma.user.upsert({
    where: { email: 'admin' },
    update: { password: adminPassword },
    create: {
      email: 'admin',
      name: '시스템관리자',
      password: adminPassword,
      role: 'ADMIN',
    },
  });
  console.log('Admin account ready: admin / 1234');

  // ==========================================
  // 4M 필수 신고 변동점 (17항목)
  // ==========================================
  const fourMClass = await prisma.changeClass.upsert({
    where: { code: 'FOUR_M' },
    update: {},
    create: {
      code: 'FOUR_M',
      name: '4M 변경 필수 신고',
      description: '4M 변경 필수 신고 변동점 17항목 (VAATZ 신고 대상)',
    },
  });

  const fourMCategories = [
    { code: 'MAN', name: 'MAN (인원)', items: [
      { code: 'MAN_01', name: '작업자변경 (실명제 및 주요/보안 공정)' },
      { code: 'MAN_02', name: '작업자변경 (일반 공정)' },
    ]},
    { code: 'MACHINE', name: 'MACHINE (설비)', items: [
      { code: 'MCH_01', name: '금형, 지그 신작' },
      { code: 'MCH_02', name: '생산설비 조건변경' },
    ]},
    { code: 'MATERIAL', name: 'MATERIAL (자재)', items: [
      { code: 'MAT_01', name: '재질변경 (원재료)' },
      { code: 'MAT_02', name: '재질변경 (부자재)' },
      { code: 'MAT_03', name: '재질변경 (부품)' },
      { code: 'MAT_04', name: '사급형태 변경' },
      { code: 'MAT_05', name: '공급업체 변경' },
    ]},
    { code: 'METHOD', name: 'METHOD (방법)', items: [
      { code: 'MTD_01', name: '생산 위치 변경 (공장)' },
      { code: 'MTD_02', name: '생산 위치 변경 (라인)' },
      { code: 'MTD_03', name: '작업조건 변경 (공정 파라미터)' },
      { code: 'MTD_04', name: '작업조건 변경 (작업 방법)' },
      { code: 'MTD_05', name: '소재가공관련 관리기준 변경' },
      { code: 'MTD_06', name: '공정관리 및 검사기준 변경 (공정)' },
      { code: 'MTD_07', name: '공정관리 및 검사기준 변경 (검사)' },
      { code: 'MTD_08', name: '도면 관리기준 변경' },
    ]},
  ];

  for (const cat of fourMCategories) {
    const category = await prisma.changeCategory.upsert({
      where: { classId_code: { classId: fourMClass.id, code: cat.code } },
      update: {},
      create: { classId: fourMClass.id, code: cat.code, name: cat.name, depth: 1 },
    });
    for (const item of cat.items) {
      await prisma.changeItem.upsert({
        where: { categoryId_code: { categoryId: category.id, code: item.code } },
        update: {},
        create: { categoryId: category.id, code: item.code, name: item.name },
      });
    }
  }
  console.log('4M 17항목 seed complete');

  // ==========================================
  // 4M외 관리대상 변동점 (17항목)
  // ==========================================
  const nonFourMClass = await prisma.changeClass.upsert({
    where: { code: 'NON_FOUR_M' },
    update: {},
    create: {
      code: 'NON_FOUR_M',
      name: '4M외 관리대상',
      description: '4M 기준 외 관리대상 변동점 (변동점 담당제)',
    },
  });

  const nonFourMCategories = [
    { code: 'NF_WORKER', name: '작업자', items: [
      { code: 'NF_W01', name: '작업자 임시 대체' },
      { code: 'NF_W02', name: '작업자 근무 교대시간 변경' },
      { code: 'NF_W03', name: '작업자 역할 분담 변경' },
    ]},
    { code: 'NF_EQUIP', name: '설비/공구', items: [
      { code: 'NF_E01', name: '툴(공구) 변경' },
      { code: 'NF_E02', name: '동일 조건의 설비/라인 변경' },
    ]},
    { code: 'NF_FACTORY', name: '공장 조건', items: [
      { code: 'NF_F01', name: '도장/토출 조건 변경' },
      { code: 'NF_F02', name: '작업 속도/주기 변경' },
      { code: 'NF_F03', name: '설비 온도/압력 변경' },
      { code: 'NF_F04', name: '작업 각도/방식 변경' },
    ]},
    { code: 'NF_CONSUMABLE', name: '소모품/윤활관리', items: [
      { code: 'NF_C01', name: '그리스/윤활유 정기보충(교체)' },
      { code: 'NF_C02', name: '냉각수/워터호스 정기보충(교체)' },
      { code: 'NF_C03', name: '설비 부자재 정기교체' },
    ]},
    { code: 'NF_EXTERNAL', name: '공정 외', items: [
      { code: 'NF_X01', name: '단전/단수 발생' },
      { code: 'NF_X02', name: '파업 발생' },
      { code: 'NF_X03', name: '물류/파렛트 변경' },
    ]},
    { code: 'NF_TIER23', name: '2/3차사 관련', items: [
      { code: 'NF_T01', name: '2/3차사 입고품 변경' },
    ]},
    { code: 'NF_OTHER', name: '기타', items: [
      { code: 'NF_O01', name: '상기 16항목 외' },
    ]},
  ];

  for (const cat of nonFourMCategories) {
    const category = await prisma.changeCategory.upsert({
      where: { classId_code: { classId: nonFourMClass.id, code: cat.code } },
      update: {},
      create: { classId: nonFourMClass.id, code: cat.code, name: cat.name, depth: 1 },
    });
    for (const item of cat.items) {
      await prisma.changeItem.upsert({
        where: { categoryId_code: { categoryId: category.id, code: item.code } },
        update: {},
        create: { categoryId: category.id, code: item.code, name: item.name },
      });
    }
  }
  console.log('4M외 17항목 seed complete');

  // ==========================================
  // 96항목 (신기술 3 + 집중관리 9 + 신규&변동 84)
  // ==========================================
  const cp96Class = await prisma.changeClass.upsert({
    where: { code: 'CP_96' },
    update: {},
    create: {
      code: 'CP_96',
      name: '96항목',
      description: '신기술/집중관리/신규&변동 세부 96항목',
    },
  });

  // --- 신기술 (3항목) ---
  const techCat = await prisma.changeCategory.upsert({
    where: { classId_code: { classId: cp96Class.id, code: 'TECH' } },
    update: {},
    create: { classId: cp96Class.id, code: 'TECH', name: '신기술', depth: 1 },
  });
  const techItems = [
    { code: 'T01', name: '세계 최초' },
    { code: 'T02', name: '국내 최초' },
    { code: 'T03', name: 'HKMC 최초' },
  ];
  for (const item of techItems) {
    await prisma.changeItem.upsert({
      where: { categoryId_code: { categoryId: techCat.id, code: item.code } },
      update: {},
      create: { categoryId: techCat.id, code: item.code, name: item.name },
    });
  }

  // --- 집중관리 (9항목) ---
  const focusCat = await prisma.changeCategory.upsert({
    where: { classId_code: { classId: cp96Class.id, code: 'FOCUS' } },
    update: {},
    create: { classId: cp96Class.id, code: 'FOCUS', name: '집중관리', depth: 1 },
  });
  const focusItems = [
    { code: 'F01', name: '최초 거래 1차 2차 협력사' },
    { code: 'F02', name: '최근 5년 신차개발 이력부재 협력사' },
    { code: 'F03', name: '다사양 및 조립 복잡도 높은 품목' },
    { code: 'F04', name: '기존차 및 신차 혼류생산 품목' },
    { code: 'F05', name: '주요부품 및 핵심공정 외주화 분류 품목' },
    { code: 'F06', name: '신규 공장 설비라인' },
    { code: 'F07', name: '변동단계 품질이슈 다발' },
    { code: 'F08', name: '신차 개발로드 집중' },
    { code: 'F09', name: '개발능력 부족 및 관리부실' },
  ];
  for (const item of focusItems) {
    await prisma.changeItem.upsert({
      where: { categoryId_code: { categoryId: focusCat.id, code: item.code } },
      update: {},
      create: { categoryId: focusCat.id, code: item.code, name: item.name },
    });
  }

  // --- 신규&변동 (84항목) - 11개 대분류 ---
  const newChangeCat = await prisma.changeCategory.upsert({
    where: { classId_code: { classId: cp96Class.id, code: 'NEW' } },
    update: {},
    create: { classId: cp96Class.id, code: 'NEW', name: '신규&변동', depth: 1 },
  });

  const newChangeSubCategories = [
    { code: 'NC_PRODUCT', name: '품목', depth: 2, items: [
      { code: 'NC_P01', name: '완제품조립 가능' }, { code: 'NC_P02', name: '이동적재 가능' },
      { code: 'NC_P03', name: '취급주의 가능' }, { code: 'NC_P04', name: '수입검사 편집' },
      { code: 'NC_P05', name: '기능검사 편집(결과서)' }, { code: 'NC_P06', name: '수입검사 편집(포장/라벨)' },
    ]},
    { code: 'NC_SUPPLIER', name: '협력사', depth: 2, items: [
      { code: 'NC_S01', name: '신규 거래' }, { code: 'NC_S02', name: '신규 지역' },
      { code: 'NC_S03', name: '거래중지' }, { code: 'NC_S04', name: '공장이전' },
      { code: 'NC_S05', name: '인수합병' }, { code: 'NC_S06', name: '하도급 변경' },
      { code: 'NC_S07', name: '사업장 변경' }, { code: 'NC_S08', name: '경영변경 편집(대표)' },
      { code: 'NC_S09', name: '경영변경 편집(조직)' },
    ]},
    { code: 'NC_SPEC', name: '사양/기능', depth: 2, items: [
      { code: 'NC_SF01', name: '신규모델' }, { code: 'NC_SF02', name: '신규 기능' },
      { code: 'NC_SF03', name: '차종별변경 프로세스 사양' },
    ]},
    { code: 'NC_METHOD', name: '공법', depth: 2, items: [
      { code: 'NC_M01', name: '현재도면 득특' }, { code: 'NC_M02', name: '공법변경' },
      { code: 'NC_M03', name: '신규 공정' }, { code: 'NC_M04', name: '공법변경' },
      { code: 'NC_M05', name: '개발단계 편집(산업/S3)' },
    ]},
    { code: 'NC_MATERIAL', name: '소재', depth: 2, items: [
      { code: 'NC_MT01', name: '신규재질' }, { code: 'NC_MT02', name: '신규 원료' },
      { code: 'NC_MT03', name: '사내/국내/국외/아시아(M/P조합)' },
      { code: 'NC_MT04', name: '사양국내/국외(아시아)' },
      { code: 'NC_MT05', name: '소재 규격변경(이종원료)' },
      { code: 'NC_MT06', name: '소재 규격변경(CAPA)' },
      { code: 'NC_MT07', name: '수입검사 규격' }, { code: 'NC_MT08', name: '시험인증(UL)' },
      { code: 'NC_MT09', name: '경도/강도/분석 신뢰성' },
      { code: 'NC_MT10', name: '내열/내한 편집' }, { code: 'NC_MT11', name: '내광 편집' },
      { code: 'NC_MT12', name: '내약품 편집' }, { code: 'NC_MT13', name: '전기적 편집' },
      { code: 'NC_MT14', name: '기타 편집' }, { code: 'NC_MT15', name: '5대 유해물질(IMDS)' },
      { code: 'NC_MT16', name: '환경규제 물질(SVHC, REACH)' },
    ]},
    { code: 'NC_STRUCTURE', name: '구조', depth: 2, items: [
      { code: 'NC_ST01', name: '구조 조건' }, { code: 'NC_ST02', name: '다금형 구조' },
      { code: 'NC_ST03', name: '구조부 조건변경' }, { code: 'NC_ST04', name: '이종변경' },
      { code: 'NC_ST05', name: '배면변경 편집' }, { code: 'NC_ST06', name: '조립안(조합)' },
      { code: 'NC_ST07', name: '보강 편집(E/C)' },
    ]},
    { code: 'NC_PROCESS', name: '공정', depth: 2, items: [
      { code: 'NC_PR01', name: '공정/시간' }, { code: 'NC_PR02', name: '공정관리' },
      { code: 'NC_PR03', name: '설비 조건' }, { code: 'NC_PR04', name: '작업방법' },
      { code: 'NC_PR05', name: '치공구 편집' }, { code: 'NC_PR06', name: '공정변경 편집(CAPA)' },
      { code: 'NC_PR07', name: '검사 규격/기준' },
    ]},
    { code: 'NC_COLOR', name: '칼라/표면처리', depth: 2, items: [
      { code: 'NC_CL01', name: '신규 칼라' }, { code: 'NC_CL02', name: '칼라 편집' },
      { code: 'NC_CL03', name: '표면처리 조건변경' }, { code: 'NC_CL04', name: '표면 편집' },
    ]},
    { code: 'NC_REGULATION', name: '스펙/법규', depth: 2, items: [
      { code: 'NC_RG01', name: '신규스펙' }, { code: 'NC_RG02', name: '스펙 편집' },
      { code: 'NC_RG03', name: '법규 편집' }, { code: 'NC_RG04', name: '규격 편집' },
    ]},
    { code: 'NC_SOFTWARE', name: '소프트웨어', depth: 2, items: [
      { code: 'NC_SW01', name: '신규 O/S' }, { code: 'NC_SW02', name: '소프트웨어 편집(로직)' },
      { code: 'NC_SW03', name: '보안 편집' }, { code: 'NC_SW04', name: '신규 기능' },
      { code: 'NC_SW05', name: '사양/기능 편집' }, { code: 'NC_SW06', name: 'UX/2 편집' },
      { code: 'NC_SW07', name: '클라우드/OTA' }, { code: 'NC_SW08', name: '표시장치 편집(HW)' },
      { code: 'NC_SW09', name: '변경(DW/SW)' }, { code: 'NC_SW10', name: '커넥터/배선 편집' },
      { code: 'NC_SW11', name: '통신(CAN/LIN)' }, { code: 'NC_SW12', name: '진단 편집(DTC/TOOL)' },
      { code: 'NC_SW13', name: '센서 S/W 편집' }, { code: 'NC_SW14', name: '파워 S/W' },
      { code: 'NC_SW15', name: '신규 OS(O/S)' }, { code: 'NC_SW16', name: '변경(자료/소스코드)' },
      { code: 'NC_SW17', name: '연동(다기능/연계)' }, { code: 'NC_SW18', name: '신규 디바이스' },
      { code: 'NC_SW19', name: '오류/디버깅 편집' }, { code: 'NC_SW20', name: '기타 S/W' },
    ]},
    { code: 'NC_ETC', name: '기타', depth: 2, items: [
      { code: 'NC_ET01', name: '포장 편집' }, { code: 'NC_ET02', name: '운송/물류 편집' },
      { code: 'NC_ET03', name: '신규류/편집(기타)' },
    ]},
  ];

  for (const sub of newChangeSubCategories) {
    const subCat = await prisma.changeCategory.upsert({
      where: { classId_code: { classId: cp96Class.id, code: sub.code } },
      update: {},
      create: {
        classId: cp96Class.id,
        parentId: newChangeCat.id,
        code: sub.code,
        name: sub.name,
        depth: sub.depth,
      },
    });
    for (const item of sub.items) {
      await prisma.changeItem.upsert({
        where: { categoryId_code: { categoryId: subCat.id, code: item.code } },
        update: {},
        create: { categoryId: subCat.id, code: item.code, name: item.name },
      });
    }
  }
  console.log('96항목 seed complete');

  // 기본 정책 설정
  await prisma.policySetting.upsert({
    where: {
      key_scopeType_scopeId: {
        key: 'REQUIRE_96_TAG',
        scopeType: 'GLOBAL',
        scopeId: '',
      },
    },
    update: {},
    create: {
      key: 'REQUIRE_96_TAG',
      value: { enabled: false },
      scopeType: 'GLOBAL',
    },
  });

  console.log('Seed data created successfully');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
