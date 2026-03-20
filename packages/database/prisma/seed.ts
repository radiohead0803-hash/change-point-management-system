import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // 관리자 계정 생성
  const adminPassword = await bcrypt.hash('1234', 10);
  await prisma.user.upsert({
    where: { email: 'admin' },
    update: { password: adminPassword, deletedAt: null },
    create: {
      email: 'admin',
      name: '시스템관리자',
      password: adminPassword,
      role: 'ADMIN',
    },
  });
  console.log('Admin account ready: admin / 1234');

  // ==========================================
  // 4M 변경 필수 신고 변동점 (17항목)
  // 4M 신고대상 - VAATZ 신고 시스템 통해 신고 필수
  // ==========================================
  const fourMClass = await prisma.changeClass.upsert({
    where: { code: 'FOUR_M' },
    update: { name: '4M 변경 필수 신고 변동점', description: '4M 신고대상 - 상기 17항목은 4M 변경 필수 신고 대상이며 발생시 VAATZ - 4M 신고 시스템을 통해 신고 필수' },
    create: {
      code: 'FOUR_M',
      name: '4M 변경 필수 신고 변동점',
      description: '4M 신고대상 - 상기 17항목은 4M 변경 필수 신고 대상이며 발생시 VAATZ - 4M 신고 시스템을 통해 신고 필수',
    },
  });

  const fourMCategories = [
    {
      code: 'MAN', name: 'MAN (인원)', items: [
        { code: 'MAN_01', name: '작업자변경 (실명제 및 주요/보안 공정)' },
        { code: 'MAN_02', name: '작업자변경 (일반 공정)' },
      ],
    },
    {
      code: 'MACHINE', name: 'MACHINE (설비)', items: [
        { code: 'MCH_01', name: '금형, 지그 신작' },
        { code: 'MCH_02', name: '생산설비 조건변경' },
      ],
    },
    {
      code: 'MATERIAL', name: 'MATERIAL (자재)', items: [
        { code: 'MAT_01', name: '재질변경 (원재료)' },
        { code: 'MAT_02', name: '재질변경 (부자재)' },
        { code: 'MAT_03', name: '재질변경 (부품)' },
        { code: 'MAT_04', name: '사급형태 변경' },
        { code: 'MAT_05', name: '공급업체 변경' },
      ],
    },
    {
      code: 'METHOD', name: 'METHOD (방법)', items: [
        { code: 'MTD_01', name: '생산 위치 변경 (공장)' },
        { code: 'MTD_02', name: '생산 위치 변경 (라인)' },
        { code: 'MTD_03', name: '작업조건 변경 (공정 파라미터)' },
        { code: 'MTD_04', name: '작업조건 변경 (작업 방법)' },
        { code: 'MTD_05', name: '소재가공관련 관리기준 변경' },
        { code: 'MTD_06', name: '공정관리 및 검사기준 변경 (공정)' },
        { code: 'MTD_07', name: '공정관리 및 검사기준 변경 (검사)' },
        { code: 'MTD_08', name: '도면 관리기준 변경' },
      ],
    },
  ];

  for (const cat of fourMCategories) {
    const category = await prisma.changeCategory.upsert({
      where: { classId_code: { classId: fourMClass.id, code: cat.code } },
      update: { name: cat.name },
      create: { classId: fourMClass.id, code: cat.code, name: cat.name, depth: 1 },
    });
    for (const item of cat.items) {
      await prisma.changeItem.upsert({
        where: { categoryId_code: { categoryId: category.id, code: item.code } },
        update: { name: item.name },
        create: { categoryId: category.id, code: item.code, name: item.name },
      });
    }
  }
  console.log('4M 17항목 seed complete');

  // ==========================================
  // 4M 기준 외 관리대상 변동점 (17항목)
  // 4M 미신고대상 - 변동점 담당제
  // ==========================================
  const nonFourMClass = await prisma.changeClass.upsert({
    where: { code: 'NON_FOUR_M' },
    update: { name: '4M 기준 외 관리대상 변동점 (17항목)', description: '4M 미신고대상 - 협력사 담당 중역 주관하에 변동점 담당제 시행을 통한 일관성 확보 및 문제 최소화 필요' },
    create: {
      code: 'NON_FOUR_M',
      name: '4M 기준 외 관리대상 변동점 (17항목)',
      description: '4M 미신고대상 - 협력사 담당 중역 주관하에 변동점 담당제 시행을 통한 일관성 확보 및 문제 최소화 필요',
    },
  });

  const nonFourMCategories = [
    {
      code: 'NF_WORKER', name: '작업자', items: [
        { code: 'NF_W01', name: '작업자 임시 대체' },
        { code: 'NF_W02', name: '작업자 근무 교대시간 변경' },
        { code: 'NF_W03', name: '작업자 역할 분담 변경' },
      ],
    },
    {
      code: 'NF_EQUIP', name: '설비/공구', items: [
        { code: 'NF_E01', name: '툴(공구) 변경' },
        { code: 'NF_E02', name: '동일 조건의 설비/라인 변경' },
      ],
    },
    {
      code: 'NF_FACTORY', name: '공장 조건', items: [
        { code: 'NF_F01', name: '도장/토출 조건 변경' },
        { code: 'NF_F02', name: '작업 속도/주기 변경' },
        { code: 'NF_F03', name: '설비 온도/압력 변경' },
        { code: 'NF_F04', name: '작업 각도/방식 변경' },
      ],
    },
    {
      code: 'NF_CONSUMABLE', name: '소모품/윤활관리', items: [
        { code: 'NF_C01', name: '그리스/윤활유 정기보충(교체)' },
        { code: 'NF_C02', name: '냉각수/워터호스 정기보충(교체)' },
        { code: 'NF_C03', name: '설비 부자재 정기교체' },
      ],
    },
    {
      code: 'NF_EXTERNAL', name: '공정 외', items: [
        { code: 'NF_X01', name: '단전/단수 발생' },
        { code: 'NF_X02', name: '파업 발생' },
        { code: 'NF_X03', name: '물류/파렛트 변경' },
      ],
    },
    {
      code: 'NF_TIER23', name: '2/3차사 관련', items: [
        { code: 'NF_T01', name: '2/3차사 입고품 변경' },
      ],
    },
    {
      code: 'NF_OTHER', name: '기타', items: [
        { code: 'NF_O01', name: '상기 16항목 외' },
      ],
    },
  ];

  for (const cat of nonFourMCategories) {
    const category = await prisma.changeCategory.upsert({
      where: { classId_code: { classId: nonFourMClass.id, code: cat.code } },
      update: { name: cat.name },
      create: { classId: nonFourMClass.id, code: cat.code, name: cat.name, depth: 1 },
    });
    for (const item of cat.items) {
      await prisma.changeItem.upsert({
        where: { categoryId_code: { categoryId: category.id, code: item.code } },
        update: { name: item.name },
        create: { categoryId: category.id, code: item.code, name: item.name },
      });
    }
  }
  console.log('4M외 17항목 seed complete');

  // ==========================================
  // 96항목 - 신기술/집중관리/신규&변동 선정 기준
  // ==========================================
  const cp96Class = await prisma.changeClass.upsert({
    where: { code: 'CP_96' },
    update: { name: '신기술/집중관리/신규&변동 (96항목)', description: '신기술(3) + 집중관리(9) + 신규&변동(84) = 96항목 선정 기준' },
    create: {
      code: 'CP_96',
      name: '신기술/집중관리/신규&변동 (96항목)',
      description: '신기술(3) + 집중관리(9) + 신규&변동(84) = 96항목 선정 기준',
    },
  });

  // --- 신기술 (3항목) ---
  const techCat = await prisma.changeCategory.upsert({
    where: { classId_code: { classId: cp96Class.id, code: 'TECH' } },
    update: { name: '신기술 (3)' },
    create: { classId: cp96Class.id, code: 'TECH', name: '신기술 (3)', depth: 1 },
  });
  const techItems = [
    { code: 'T01', name: '세계 최초' },
    { code: 'T02', name: '국내 최초' },
    { code: 'T03', name: 'HKMC 최초' },
  ];
  for (const item of techItems) {
    await prisma.changeItem.upsert({
      where: { categoryId_code: { categoryId: techCat.id, code: item.code } },
      update: { name: item.name },
      create: { categoryId: techCat.id, code: item.code, name: item.name },
    });
  }

  // --- 집중관리 (9항목) ---
  const focusCat = await prisma.changeCategory.upsert({
    where: { classId_code: { classId: cp96Class.id, code: 'FOCUS' } },
    update: { name: '집중관리 (9)' },
    create: { classId: cp96Class.id, code: 'FOCUS', name: '집중관리 (9)', depth: 1 },
  });
  const focusItems = [
    { code: 'F01', name: '최초 거래 1차 2차 협력사' },
    { code: 'F02', name: '최근 5년 신차개발 이력부재 협력사' },
    { code: 'F03', name: '다사양 및 조립 복잡도 높은 품목' },
    { code: 'F04', name: '기존차 및 신차 혼류생산 불가 품목' },
    { code: 'F05', name: '주요부품 및 핵심공정 외주화 품목' },
    { code: 'F06', name: '신규 공장 설비라인' },
    { code: 'F07', name: '변동단계 품질이슈 다발' },
    { code: 'F08', name: '신차 개발로드 집중' },
    { code: 'F09', name: '개발능력 부족 및 관리부실' },
  ];
  for (const item of focusItems) {
    await prisma.changeItem.upsert({
      where: { categoryId_code: { categoryId: focusCat.id, code: item.code } },
      update: { name: item.name },
      create: { categoryId: focusCat.id, code: item.code, name: item.name },
    });
  }

  // --- 신규&변동 (84항목) - 11개 대분류별 점검항목 대상 ---
  const newChangeCat = await prisma.changeCategory.upsert({
    where: { classId_code: { classId: cp96Class.id, code: 'NEW' } },
    update: { name: '신규&변동 (84)' },
    create: { classId: cp96Class.id, code: 'NEW', name: '신규&변동 (84)', depth: 1 },
  });

  const newChangeSubCategories = [
    {
      code: 'NC_PRODUCT', name: '품목 (6)', depth: 2, items: [
        { code: 'NC_P01', name: '협력사최초 개발 (1차사, 2/3차사)' },
        { code: 'NC_P02', name: '이관차 개발 (품질문제)' },
        { code: 'NC_P03', name: '외주화 개발 (MP→협력사)' },
        { code: 'NC_P04', name: '일정단축 요청' },
        { code: 'NC_P05', name: '수입 신규품목' },
        { code: 'NC_P06', name: '기능 관련 글로벌/현지사 품목' },
      ],
    },
    {
      code: 'NC_SUPPLIER', name: '협력사 (9)', depth: 2, items: [
        { code: 'NC_S01', name: '신규 거래 (1차사, 2/3차사)' },
        { code: 'NC_S02', name: '신규 지역 (1차사, 2/3차사)' },
        { code: 'NC_S03', name: '협력사 변경 (1차사, 2/3차사)' },
        { code: 'NC_S04', name: '생산공장 변경 [생산지 변경] (1차사, 2/3차사)' },
        { code: 'NC_S05', name: '소싱변경에 따른 관리주체변경 (통합→스플릿)' },
      ],
    },
    {
      code: 'NC_SPEC', name: '사양/기능 (3)', depth: 2, items: [
        { code: 'NC_SF01', name: '신규사양 (차종별 최초적용 사양)' },
        { code: 'NC_SF02', name: '신규 기능 (차종별 최초적용 기능)' },
        { code: 'NC_SF03', name: '기능 보완 (충전자 대비)' },
      ],
    },
    {
      code: 'NC_METHOD', name: '공법 (5)', depth: 2, items: [
        { code: 'NC_M01', name: '협력사최초 적용 (1차사, 2/3차사)' },
        { code: 'NC_M02', name: '신규 공법 (1차사, 2/3차사)' },
        { code: 'NC_M03', name: '공법 변경 (개발단계 품질개선)' },
      ],
    },
    {
      code: 'NC_MATERIAL', name: '소재 (16)', depth: 2, items: [
        { code: 'NC_MT01', name: '신규 재질 (세계/국내/당사/협력사 최초)' },
        { code: 'NC_MT02', name: '신규 원단 (세계/국내/당사/협력사 최초)' },
        { code: 'NC_MT03', name: '신규 소재 (세계/국내/당사/협력사 최초)' },
        { code: 'NC_MT04', name: '소재 관련 클레임 발생이력 (= 통보)' },
        { code: 'NC_MT05', name: '대체소재 (CAPA)' },
        { code: 'NC_MT06', name: '재질 변경 (품질개선)' },
        { code: 'NC_MT07', name: '원단 소재/패턴 변경 (고급화, 품질개선)' },
      ],
    },
    {
      code: 'NC_STRUCTURE', name: '구조 (7)', depth: 2, items: [
        { code: 'NC_ST01', name: '신규 구조 (Sub부품간)' },
        { code: 'NC_ST02', name: '신규 구조 (연관부품간)' },
        { code: 'NC_ST03', name: '신규 디자인 (성형성, 양산성)' },
        { code: 'NC_ST04', name: '조립구조 변경 (조립성개선)' },
        { code: 'NC_ST05', name: '서브부품수 과다 증대' },
        { code: 'NC_ST06', name: '부품 융합' },
        { code: 'NC_ST07', name: '특허침해 관련 구조변경' },
      ],
    },
    {
      code: 'NC_PROCESS', name: '공정 (7)', depth: 2, items: [
        { code: 'NC_PR01', name: '신규 라인 (1차사, 2/3차사)' },
        { code: 'NC_PR02', name: '신규 설비 (1차사, 2/3차사)' },
        { code: 'NC_PR03', name: '라인 개조 (신차, 품질개선, CAPA)' },
        { code: 'NC_PR04', name: '설비 개조 (신차, 품질개선, CAPA)' },
        { code: 'NC_PR05', name: '공정 추가/삭제 (품질, CAPA)' },
      ],
    },
    {
      code: 'NC_COLOR', name: '칼라/표면처리 (4)', depth: 2, items: [
        { code: 'NC_CL01', name: '신규 칼라' },
        { code: 'NC_CL02', name: '신규 표면처리' },
        { code: 'NC_CL03', name: '칼라 변경 (고급화, 품질개선)' },
        { code: 'NC_CL04', name: '표면처리 변경 (고급화, 품질개선, 원가절감)' },
      ],
    },
    {
      code: 'NC_REGULATION', name: '스펙/법규 (4)', depth: 2, items: [
        { code: 'NC_RG01', name: '신규스펙 제정' },
        { code: 'NC_RG02', name: '신법규 대응' },
        { code: 'NC_RG03', name: '개정법규 대응' },
        { code: 'NC_RG04', name: '스펙 변경 (MS/ES)' },
      ],
    },
    {
      code: 'NC_SOFTWARE', name: '소프트웨어 (20)', depth: 2, items: [
        // 신규 (10항목)
        { code: 'NC_SW01', name: '신규 O/S' },
        { code: 'NC_SW02', name: '신규 플랫폼 (HKMC)' },
        { code: 'NC_SW03', name: '신규 플랫폼 (협력사)' },
        { code: 'NC_SW04', name: '신규 통신방식' },
        { code: 'NC_SW05', name: '신규 진단로직' },
        { code: 'NC_SW06', name: '신규 사양/기능/로직' },
        { code: 'NC_SW07', name: '신규 UX/그래픽' },
        { code: 'NC_SW08', name: '신규 교정업체 (외주)' },
        { code: 'NC_SW09', name: '신규 디자인TOOL (외주)' },
        { code: 'NC_SW10', name: '변경(차세대) O/S' },
        // 변경 (10항목)
        { code: 'NC_SW11', name: '변경(차세대) 플랫폼 (HKMC)' },
        { code: 'NC_SW12', name: '변경(차세대) 플랫폼 (협력사)' },
        { code: 'NC_SW13', name: '변경(차세대) 통신방식' },
        { code: 'NC_SW14', name: '변경(차세대) 진단로직' },
        { code: 'NC_SW15', name: '변경(차세대) 사양/기능/로직' },
        { code: 'NC_SW16', name: '변경(차세대) UX/그래픽' },
        { code: 'NC_SW17', name: '변경(차세대) 디자인TOOL' },
        { code: 'NC_SW18', name: '타시스템 변동에 의한 동시변경' },
        { code: 'NC_SW19', name: '타시스템 요청에 의한 대체변경' },
        { code: 'NC_SW20', name: '로직 변경 (개발단계 품질개선)' },
      ],
    },
    {
      code: 'NC_ETC', name: '기타 (3)', depth: 2, items: [
        { code: 'NC_ET01', name: '직거래품 설계변경' },
        { code: 'NC_ET02', name: '물류/포장방법 변경 (설계사양 변경)' },
        { code: 'NC_ET03', name: '작업자 변경 (신규채용/변경 관리)' },
      ],
    },
  ];

  for (const sub of newChangeSubCategories) {
    const subCat = await prisma.changeCategory.upsert({
      where: { classId_code: { classId: cp96Class.id, code: sub.code } },
      update: { name: sub.name },
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
        update: { name: item.name },
        create: { categoryId: subCat.id, code: item.code, name: item.name },
      });
    }
  }
  console.log('96항목 seed complete');

  // ==========================================
  // 변동점 발생현황 시드 데이터 (50건)
  // DB에 이미 있는 사용자, 회사, 공통코드를 활용
  // ==========================================

  const existingCount = await prisma.changeEvent.count();
  if (existingCount < 10) {
    // DB에서 기존 데이터 조회
    const dbUsers = await prisma.user.findMany({ where: { deletedAt: null }, select: { id: true, role: true } });
    const dbCompanies = await prisma.company.findMany({ select: { id: true } });
    const allItems = await prisma.changeItem.findMany({ take: 50, select: { id: true } });
    const itemIds = allItems.map(i => i.id);

    // 역할별 사용자 분류
    const editorIds = dbUsers.filter(u => ['TIER1_EDITOR', 'ADMIN'].includes(u.role)).map(u => u.id);
    const reviewerIds = dbUsers.filter(u => ['TIER1_REVIEWER', 'ADMIN'].includes(u.role)).map(u => u.id);
    const executiveIds = dbUsers.filter(u => ['EXEC_APPROVER', 'ADMIN'].includes(u.role)).map(u => u.id);
    const companyIds = dbCompanies.map(c => c.id);

    // 데이터 부족시 admin을 fallback
    const adminUser = dbUsers.find(u => u.role === 'ADMIN');
    if (!adminUser || companyIds.length === 0) {
      console.log('사용자 또는 회사 데이터 부족 - 변동점 시드 스킵');
    } else {
      const fallbackId = adminUser.id;
      if (editorIds.length === 0) editorIds.push(fallbackId);
      if (reviewerIds.length === 0) reviewerIds.push(fallbackId);
      if (executiveIds.length === 0) executiveIds.push(fallbackId);

      // DB 공통코드 조회 (settings에 저장된 값 활용)
      const codeGroups = ['CUSTOMER', 'PROJECT', 'PRODUCT_LINE', 'FACTORY', 'LINE', 'DEPARTMENT'];
      const commonCodes: Record<string, string[]> = {};
      for (const group of codeGroups) {
        const setting = await prisma.policySetting.findFirst({
          where: { key: `COMMON_CODE_${group}` },
        });
        if (setting && setting.value) {
          try {
            const val = typeof setting.value === 'string' ? JSON.parse(setting.value as string) : setting.value;
            commonCodes[group] = Array.isArray(val) ? val : ((val as any)?.items || []);
          } catch { commonCodes[group] = []; }
        } else {
          commonCodes[group] = [];
        }
      }

      // fallback 값 (공통코드가 비어있을 경우)
      const customers = commonCodes['CUSTOMER'].length > 0 ? commonCodes['CUSTOMER'] : ['현대자동차', '기아자동차'];
      const projects = commonCodes['PROJECT'].length > 0 ? commonCodes['PROJECT'] : ['MX5 (싼타페)', 'SP3(셀토스)'];
      const productLines = commonCodes['PRODUCT_LINE'].length > 0 ? commonCodes['PRODUCT_LINE'] : ['샤시', '트림'];
      const factories = commonCodes['FACTORY'].length > 0 ? commonCodes['FACTORY'] : ['본사 1공장', '본사 2공장'];
      const lines = commonCodes['LINE'].length > 0 ? commonCodes['LINE'] : ['A라인', 'B라인'];
      const departments = commonCodes['DEPARTMENT'].length > 0 ? commonCodes['DEPARTMENT'] : ['생산기술팀', '품질관리팀'];

      const pick = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];
      const pickId = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];

      const statuses = ['DRAFT', 'SUBMITTED', 'CONFIRMED', 'REVIEWED', 'APPROVED', 'CLOSED', 'REVIEW_RETURNED'] as const;
      const statusWeights = [5, 8, 6, 10, 12, 5, 4];
      function wRandom(weights: number[]) {
        const total = weights.reduce((a, b) => a + b, 0);
        let r = Math.random() * total;
        for (let i = 0; i < weights.length; i++) { r -= weights[i]; if (r <= 0) return i; }
        return weights.length - 1;
      }

      const actionPlans = ['금형 보정 후 재생산', '작업 표준서 개정', '원자재 LOT 변경', '설비 파라미터 재설정', '검사기준 강화', '공정 조건 최적화', '재교육 실시'];
      const actionResults = ['조치 완료 - 양산 적용', '시험 생산 진행중', '개선 완료 확인', '후속 모니터링 중', '양품 확인 완료'];
      const qualityChecks = ['초도품 검사 합격', 'SPC 관리 정상', '치수검사 OK', '외관검사 합격', '기능검사 PASS'];
      const descriptions = [
        '금형 수명 도달로 인한 신규 금형 투입', '원자재 공급업체 변경에 따른 소재 물성 확인',
        '작업자 교대 근무 변경으로 인한 공정 관리', '설비 노후화에 따른 신규 설비 도입',
        '고객사 요청에 의한 사양 변경 대응', '계절 변화에 따른 도장 조건 변경',
        '품질 클레임 발생에 따른 검사 기준 강화', '2차사 변경에 따른 입고품 품질 확인',
        '생산 라인 레이아웃 변경', '포장 방법 변경 (고객사 요청)',
      ];

      for (let i = 0; i < 50; i++) {
        const month = Math.floor(Math.random() * 3);
        const day = Math.floor(Math.random() * 28) + 1;
        const occurredDate = new Date(2026, month, day);
        const receiptMonth = `2026-${String(month + 1).padStart(2, '0')}`;
        const status = statuses[wRandom(statusWeights)];
        const isAdvanced = ['CONFIRMED', 'REVIEWED', 'APPROVED', 'CLOSED'].includes(status);
        const editorId = pickId(editorIds);

        await prisma.changeEvent.create({
          data: {
            receiptMonth, occurredDate,
            customer: pick(customers), project: pick(projects),
            productLine: pick(productLines), factory: pick(factories),
            productionLine: pick(lines), department: pick(departments),
            description: pick(descriptions),
            partNumber: `P${String(1000 + Math.floor(Math.random() * 9000))}`,
            productName: `부품-${String.fromCharCode(65 + Math.floor(Math.random() * 26))}${Math.floor(Math.random() * 100)}`,
            status,
            companyId: pickId(companyIds),
            primaryItemId: itemIds.length > 0 ? pickId(itemIds) : undefined,
            managerId: editorId,
            createdById: editorId,
            reviewerId: pickId(reviewerIds),
            executiveId: isAdvanced ? pickId(executiveIds) : undefined,
            actionDate: isAdvanced ? new Date(2026, month, Math.min(day + 7, 28)) : undefined,
            actionPlan: isAdvanced ? pick(actionPlans) : undefined,
            actionResult: ['APPROVED', 'CLOSED'].includes(status) ? pick(actionResults) : undefined,
            qualityVerification: ['APPROVED', 'CLOSED'].includes(status) ? pick(qualityChecks) : undefined,
          },
        });
      }
      console.log('50건 변동점 시드 데이터 생성 완료 (DB 기존 데이터 활용)');
    }
  } else {
    console.log(`이미 ${existingCount}건 존재 - 변동점 시드 스킵`);
  }

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
