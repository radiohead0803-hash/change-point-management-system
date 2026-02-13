import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // 변경 분류 생성
  const cp96Class = await prisma.changeClass.create({
    data: {
      code: 'CP_96',
      name: '96항목',
      description: '신기술/집중관리/신규&변동 96항목',
    },
  });

  // 최상위 카테고리 생성
  const [tech, focus, newChange] = await Promise.all([
    prisma.changeCategory.create({
      data: {
        classId: cp96Class.id,
        code: 'TECH',
        name: '신기술',
        depth: 1,
      },
    }),
    prisma.changeCategory.create({
      data: {
        classId: cp96Class.id,
        code: 'FOCUS',
        name: '집중관리',
        depth: 1,
      },
    }),
    prisma.changeCategory.create({
      data: {
        classId: cp96Class.id,
        code: 'NEW',
        name: '신규&변동',
        depth: 1,
      },
    }),
  ]);

  // 신규&변동 하위 카테고리 생성
  const subCategories = await Promise.all([
    prisma.changeCategory.create({
      data: {
        classId: cp96Class.id,
        parentId: newChange.id,
        code: 'PRODUCT',
        name: '품목',
        depth: 2,
      },
    }),
    prisma.changeCategory.create({
      data: {
        classId: cp96Class.id,
        parentId: newChange.id,
        code: 'SUPPLIER',
        name: '협력사',
        depth: 2,
      },
    }),
    prisma.changeCategory.create({
      data: {
        classId: cp96Class.id,
        parentId: newChange.id,
        code: 'MATERIAL',
        name: '소재',
        depth: 2,
      },
    }),
    prisma.changeCategory.create({
      data: {
        classId: cp96Class.id,
        parentId: newChange.id,
        code: 'PROCESS',
        name: '공정',
        depth: 2,
      },
    }),
    prisma.changeCategory.create({
      data: {
        classId: cp96Class.id,
        parentId: newChange.id,
        code: 'SOFTWARE',
        name: '소프트웨어',
        depth: 2,
      },
    }),
    prisma.changeCategory.create({
      data: {
        classId: cp96Class.id,
        parentId: newChange.id,
        code: 'OTHER',
        name: '기타',
        depth: 2,
      },
    }),
  ]);

  // 기본 정책 설정 생성
  await prisma.policySetting.create({
    data: {
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
