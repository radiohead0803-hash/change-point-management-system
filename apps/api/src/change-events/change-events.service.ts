import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { Prisma, ChangeEvent, Role } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import * as fs from 'fs';
import * as path from 'path';

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');

@Injectable()
export class ChangeEventsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(data: any, userId: string) {
    const { tags, ...rawData } = data;

    // 허용된 필드 (String 타입)
    const stringFields = [
      'receiptMonth', 'customer', 'project', 'productLine',
      'partNumber', 'productName', 'factory', 'productionLine',
      'description', 'department', 'actionPlan', 'actionResult', 'qualityVerification',
    ];
    // 허용된 필드 (관계 ID - 빈 문자열이면 null, 유효한 ID만)
    const idFields = ['companyId', 'primaryItemId', 'managerId', 'executiveId', 'reviewerId'];
    // 날짜 필드 (문자열 → Date 변환 필요)
    const dateFields = ['occurredDate', 'actionDate'];
    // 상태 필드
    const enumFields = ['status'];

    // 데이터 정제
    const eventData: any = {};

    // String 필드: 빈 문자열 → null
    for (const key of stringFields) {
      const val = rawData[key];
      if (val !== undefined) {
        eventData[key] = (val === '' || val === null) ? null : val;
      }
    }

    // ID 필드: 빈 문자열 → undefined (Prisma에 전달 안 함), 유효한 ID만 설정
    for (const key of idFields) {
      const val = rawData[key];
      if (val && val !== '') {
        eventData[key] = val;
      }
      // 빈 문자열이거나 없으면 eventData에 포함하지 않음 → Prisma default/null 사용
    }

    // 날짜 필드: 문자열 → Date 객체 변환
    for (const key of dateFields) {
      const val = rawData[key];
      if (val && val !== '') {
        try {
          eventData[key] = new Date(val);
        } catch {
          eventData[key] = null;
        }
      }
      // 빈 문자열이면 null (nullable) 또는 생략
    }

    // 상태 필드
    for (const key of enumFields) {
      const val = rawData[key];
      if (val && val !== '') {
        eventData[key] = val;
      }
    }

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

    const settingValue = requireTag?.value as any;
    if (settingValue?.enabled && (!tags || tags.length === 0)) {
      throw new ForbiddenException('96항목 태그는 필수항목입니다.');
    }

    // 태그 데이터 정제 (유효한 태그만)
    const validTags = (tags || []).filter((t: any) => t.itemId && t.itemId !== '' && !t.itemId.startsWith('custom_'));

    try {
      return await this.prisma.changeEvent.create({
        data: {
          ...eventData,
          createdById: userId,
          ...(validTags.length > 0 ? {
            tags: {
              create: validTags.map((tag: any) => ({
                itemId: tag.itemId,
                tagType: tag.tagType || 'TAG',
              })),
            },
          } : {}),
        },
        include: {
          tags: {
            include: {
              item: true,
            },
          },
        },
      });
    } catch (error: any) {
      console.error('ChangeEvent create error:', error?.message || error);
      throw error;
    }
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
        createdBy: true,
        primaryItem: {
          include: {
            category: {
              include: { class: true },
            },
          },
        },
        inspectionResults: {
          include: {
            item: true,
          },
        },
        tags: {
          include: {
            item: {
              include: {
                category: {
                  include: { class: true },
                },
              },
            },
          },
        },
        _count: {
          select: { attachments: { where: { deletedAt: null } } },
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
        createdBy: true,
        primaryItem: {
          include: {
            category: {
              include: {
                class: true,
              },
            },
          },
        },
        tags: {
          include: {
            item: {
              include: {
                category: {
                  include: { class: true },
                },
              },
            },
          },
        },
        attachments: {
          where: { deletedAt: null },
          select: { id: true, filename: true, mimetype: true, size: true, createdAt: true },
        },
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

    const { tags, ...rawUpdateData } = data;

    // 데이터 정제 (허용된 필드만, 타입 변환)
    const cleanData: any = {};
    const stringFields = ['receiptMonth', 'customer', 'project', 'productLine', 'partNumber', 'productName', 'factory', 'productionLine', 'description', 'department', 'actionPlan', 'actionResult', 'qualityVerification'];
    const idFields = ['companyId', 'primaryItemId', 'managerId', 'executiveId', 'reviewerId'];
    const dateFields = ['occurredDate', 'actionDate'];
    const enumFields = ['status'];

    for (const key of stringFields) {
      if (rawUpdateData[key] !== undefined) {
        cleanData[key] = (rawUpdateData[key] === '' || rawUpdateData[key] === null) ? null : rawUpdateData[key];
      }
    }
    for (const key of idFields) {
      if (rawUpdateData[key] !== undefined) {
        if (rawUpdateData[key] && rawUpdateData[key] !== '') {
          cleanData[key] = rawUpdateData[key];
        } else {
          cleanData[key] = null;
        }
      }
    }
    for (const key of dateFields) {
      if (rawUpdateData[key] !== undefined) {
        if (rawUpdateData[key] && rawUpdateData[key] !== '') {
          try { cleanData[key] = new Date(rawUpdateData[key]); } catch { cleanData[key] = null; }
        } else {
          cleanData[key] = null;
        }
      }
    }
    for (const key of enumFields) {
      if (rawUpdateData[key] !== undefined && rawUpdateData[key] !== '') {
        cleanData[key] = rawUpdateData[key];
      }
    }

    const updated = await this.prisma.changeEvent.update({
      where: { id },
      data: {
        ...cleanData,
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
        primaryItem: {
          include: { category: { include: { class: true } } },
        },
        tags: {
          include: { item: { include: { category: { include: { class: true } } } } },
        },
        attachments: {
          where: { deletedAt: null },
          select: { id: true, filename: true, mimetype: true, size: true, createdAt: true },
        },
        inspectionResults: {
          include: { item: true },
        },
      },
    });

    // 상태 변경시 알림 전송
    if (data.status) {
      const eventTitle = `${updated.customer || '미지정'} - ${updated.project || '-'}`;
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

  // ── Attachment CRUD (파일시스템 저장) ──

  private ensureUploadDir(eventId: string): string {
    const dir = path.join(UPLOAD_DIR, eventId);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    return dir;
  }

  async addAttachment(eventId: string, data: { filename: string; mimetype: string; size: number; data: string }) {
    // base64 데이터를 파일로 저장
    const dir = this.ensureUploadDir(eventId);
    const ext = path.extname(data.filename) || '';
    const uniqueName = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}${ext}`;
    const filePath = path.join(dir, uniqueName);

    // base64 데이터 디코딩 (data:image/png;base64,xxx 형식 처리)
    let base64Data = data.data;
    if (base64Data.includes(',')) {
      base64Data = base64Data.split(',')[1];
    }
    const buffer = Buffer.from(base64Data, 'base64');
    fs.writeFileSync(filePath, buffer);

    // DB에는 경로만 저장 (base64 데이터 X)
    return this.prisma.attachment.create({
      data: {
        eventId,
        filename: data.filename,
        mimetype: data.mimetype,
        size: buffer.length,
        path: path.join(eventId, uniqueName), // 상대경로 저장
      },
    });
  }

  async getAttachments(eventId: string) {
    return this.prisma.attachment.findMany({
      where: { eventId, deletedAt: null },
      select: { id: true, filename: true, mimetype: true, size: true, path: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async removeAttachment(attachmentId: string) {
    const att = await this.prisma.attachment.findUnique({ where: { id: attachmentId } });
    // 파일시스템에서 파일 삭제
    if (att?.path) {
      const filePath = path.join(UPLOAD_DIR, att.path);
      if (fs.existsSync(filePath)) {
        try { fs.unlinkSync(filePath); } catch { /* ignore */ }
      }
    }
    return this.prisma.attachment.update({
      where: { id: attachmentId },
      data: { deletedAt: new Date() },
    });
  }

  async getAttachmentMeta(attachmentId: string) {
    return this.prisma.attachment.findUnique({
      where: { id: attachmentId },
      select: { id: true, filename: true, mimetype: true, size: true, path: true },
    });
  }

  async getAttachmentData(attachmentId: string) {
    const att = await this.prisma.attachment.findUnique({
      where: { id: attachmentId },
    });
    if (!att) throw new NotFoundException('첨부파일을 찾을 수 없습니다.');

    // 파일시스템에서 파일 읽기
    if (att.path) {
      const filePath = path.join(UPLOAD_DIR, att.path);
      if (fs.existsSync(filePath)) {
        const buffer = fs.readFileSync(filePath);
        const base64 = `data:${att.mimetype};base64,${buffer.toString('base64')}`;
        return { ...att, data: base64 };
      }
    }

    // 기존 DB 저장 데이터 호환 (마이그레이션 전 데이터)
    if (att.data) {
      return att;
    }

    throw new NotFoundException('파일이 존재하지 않습니다.');
  }
}
