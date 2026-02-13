import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { PrismaClient, Prisma, ChangeEvent, Role } from '@prisma/client';

@Injectable()
export class ChangeEventsService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  async create(data: any, userId: string) {
    const { tags, ...eventData } = data;

    // 정책 설정 확인
    const requireTag = await this.prisma.policySetting.findFirst({
      where: {
        key: 'REQUIRE_96_TAG',
        scopeType: 'GLOBAL',
        effectiveFrom: { lte: new Date() },
        OR: [
          { effectiveTo: { gte: new Date() } },
          { effectiveTo: null },
        ],
      },
    });

    // 정책이 활성화되어 있는데 96태그가 없는 경우
    const settingValue = requireTag?.value as any;
    if (settingValue?.enabled && (!tags || tags.length === 0)) {
      throw new ForbiddenException('96항목 태그는 필수항목입니다.');
    }

    return this.prisma.changeEvent.create({
      data: {
        ...eventData,
        createdById: userId,
        tags: {
          create: tags?.map((tag) => ({
            itemId: tag.itemId,
            tagType: tag.tagType,
          })),
        },
      },
      include: {
        tags: {
          include: {
            item: true,
          },
        },
      },
    });
  }

  async findAll(params: {
    skip?: number;
    take?: number;
    where?: Prisma.ChangeEventWhereInput;
    orderBy?: Prisma.ChangeEventOrderByWithRelationInput;
  }) {
    const { skip, take, where, orderBy } = params;
    return this.prisma.changeEvent.findMany({
      skip,
      take,
      where,
      orderBy,
      include: {
        company: true,
        manager: true,
        executive: true,
        reviewer: true,
        inspectionResults: {
          include: {
            item: true,
          },
        },
        tags: {
          include: {
            item: true,
          },
        },
      },
    });
  }

  async findClasses() {
    return this.prisma.changeClass.findMany({
      where: {
        deletedAt: null,
      },
    });
  }

  async findCategories(classCode?: string) {
    return this.prisma.changeCategory.findMany({
      where: {
        deletedAt: null,
        class: classCode ? {
          code: classCode,
        } : undefined,
      },
      include: {
        class: true,
        parent: true,
      },
    });
  }

  async findItems(categoryId?: string) {
    return this.prisma.changeItem.findMany({
      where: {
        deletedAt: null,
        categoryId: categoryId || undefined,
      },
      include: {
        category: true,
      },
    });
  }

  async findOne(id: string) {
    const event = await this.prisma.changeEvent.findUnique({
      where: { id },
      include: {
        company: true,
        manager: true,
        executive: true,
        reviewer: true,
        inspectionResults: {
          include: {
            item: true,
          },
        },
      },
    });

    if (!event) {
      throw new NotFoundException(`변동점 ID ${id}를 찾을 수 없습니다.`);
    }

    return event;
  }

  async update(id: string, data: any, userId: string, userRole: Role) {
    const event = await this.findOne(id);

    // 권한 체크
    if (userRole === Role.TIER2_EDITOR && event.createdById !== userId) {
      throw new ForbiddenException('본인이 등록한 변동점만 수정할 수 있습니다.');
    }

    // 상태 변경 권한 체크
    if (data.status) {
      const newStatus = data.status as string;
      if (
        (newStatus === 'REVIEWED' && userRole !== Role.TIER1_REVIEWER) ||
        (newStatus === 'APPROVED' && userRole !== Role.EXEC_APPROVER)
      ) {
        throw new ForbiddenException('해당 상태로 변경할 권한이 없습니다.');
      }
    }

    const { tags, ...updateData } = data;
    return this.prisma.changeEvent.update({
      where: { id },
      data: {
        ...updateData,
        updatedById: userId,
        ...(tags ? {
          tags: {
            deleteMany: {},
            create: tags.map((tag: any) => ({
              itemId: tag.itemId,
              tagType: tag.tagType,
            })),
          },
        } : {}),
      },
      include: {
        company: true,
        manager: true,
        executive: true,
        reviewer: true,
        inspectionResults: {
          include: {
            item: true,
          },
        },
      },
    });
  }

  async remove(id: string, userId: string, userRole: Role) {
    const event = await this.findOne(id);

    // 권한 체크
    if (userRole === Role.TIER2_EDITOR && event.createdById !== userId) {
      throw new ForbiddenException('본인이 등록한 변동점만 삭제할 수 있습니다.');
    }

    return this.prisma.changeEvent.update({
      where: { id },
      data: {
        deletedAt: new Date(),
      },
    });
  }

  async findByMonth(year: number, month: number) {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);

    return this.prisma.changeEvent.findMany({
      where: {
        status: 'APPROVED',
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
        deletedAt: null,
      },
      include: {
        company: true,
        manager: true,
        executive: true,
        reviewer: true,
        inspectionResults: {
          include: {
            item: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }
}
