import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { Prisma, ChangeEvent, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';

@Injectable()
export class ChangeEventsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

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

  // ── Master Data CRUD ──

  async createClass(data: { code: string; name: string; description?: string }) {
    return this.prisma.changeClass.create({ data });
  }

  async updateClass(id: string, data: { name?: string; description?: string }) {
    return this.prisma.changeClass.update({ where: { id }, data });
  }

  async deleteClass(id: string) {
    return this.prisma.changeClass.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  async createCategory(data: { classId: string; code: string; name: string; parentId?: string; depth?: number; description?: string }) {
    return this.prisma.changeCategory.create({
      data: { ...data, depth: data.depth || (data.parentId ? 2 : 1) },
      include: { class: true, parent: true },
    });
  }

  async updateCategory(id: string, data: { name?: string; description?: string }) {
    return this.prisma.changeCategory.update({ where: { id }, data, include: { class: true, parent: true } });
  }

  async deleteCategory(id: string) {
    return this.prisma.changeCategory.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  async createItem(data: { categoryId: string; code: string; name: string; description?: string }) {
    return this.prisma.changeItem.create({ data, include: { category: true } });
  }

  async updateItem(id: string, data: { name?: string; description?: string }) {
    return this.prisma.changeItem.update({ where: { id }, data, include: { category: true } });
  }

  async deleteItem(id: string) {
    return this.prisma.changeItem.update({ where: { id }, data: { deletedAt: new Date() } });
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
      const canReview = ([Role.TIER1_REVIEWER, Role.TIER1_EDITOR, Role.ADMIN] as Role[]).includes(userRole);
      const canApprove = ([Role.EXEC_APPROVER, Role.ADMIN] as Role[]).includes(userRole);
      if (
        (newStatus === 'REVIEWED' && !canReview) ||
        (newStatus === 'APPROVED' && !canApprove)
      ) {
        throw new ForbiddenException('해당 상태로 변경할 권한이 없습니다.');
      }
    }

    const { tags, ...updateData } = data;
    const updated = await this.prisma.changeEvent.update({
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
        createdBy: true,
        inspectionResults: {
          include: {
            item: true,
          },
        },
      },
    });

    // 상태 변경시 알림 전송
    if (data.status) {
      const eventTitle = `${updated.customer} - ${updated.project}`;
      try {
        if (data.status === 'SUBMITTED') {
          // 제출시 검토자에게 알림
          await this.notificationsService.notifyApprovalRequest(id, eventTitle, updated.reviewerId || undefined, undefined);
        } else if (data.status === 'REVIEWED') {
          // 검토완료시 전담중역에게 알림
          await this.notificationsService.notifyApprovalRequest(id, eventTitle, undefined, updated.executiveId || undefined);
        } else if (data.status === 'APPROVED') {
          // 승인완료시 등록자에게 알림
          await this.notificationsService.notifyApproved(id, eventTitle, updated.createdById);

          // 직접입력 태그(custom_*) → 기타 카테고리 세부항목 DB 반영
          try {
            const eventTags = await this.prisma.changeEventTag.findMany({
              where: { eventId: id },
              include: { item: true },
            });
            // custom_ prefix를 가진 태그를 찾아서 기타 카테고리에 추가
            // (프론트에서 customName을 description에 저장)
            for (const tag of eventTags) {
              if (tag.itemId.startsWith('custom_') || tag.item === null) {
                // 기타 카테고리 찾기
                const etcCategory = await this.prisma.changeCategory.findFirst({
                  where: { name: '기타', deletedAt: null },
                });
                if (etcCategory) {
                  const code = `ETC_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
                  await this.prisma.changeItem.create({
                    data: { categoryId: etcCategory.id, code, name: tag.itemId.replace('custom_', '') },
                  });
                }
              }
            }
          } catch (e) {
            console.error('Custom tag to DB failed:', e);
          }
        } else if (data.status === 'REVIEW_RETURNED') {
          // 보완요청시 등록자에게 알림
          await this.notificationsService.notifyReturned(id, eventTitle, updated.createdById);
        }
      } catch (e) {
        // 알림 실패해도 상태 변경은 유지
        console.error('Notification send failed:', e);
      }
    }

    return updated;
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

  // ── Attachment CRUD ──

  async addAttachment(eventId: string, data: { filename: string; mimetype: string; size: number; data: string }) {
    return this.prisma.attachment.create({
      data: {
        eventId,
        filename: data.filename,
        mimetype: data.mimetype,
        size: data.size,
        data: data.data,
      },
    });
  }

  async getAttachments(eventId: string) {
    return this.prisma.attachment.findMany({
      where: { eventId, deletedAt: null },
      select: { id: true, filename: true, mimetype: true, size: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async removeAttachment(attachmentId: string) {
    return this.prisma.attachment.update({
      where: { id: attachmentId },
      data: { deletedAt: new Date() },
    });
  }

  async getAttachmentData(attachmentId: string) {
    return this.prisma.attachment.findUnique({
      where: { id: attachmentId },
    });
  }
}
