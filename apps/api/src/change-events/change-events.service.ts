import { Injectable, NotFoundException, ForbiddenException, BadRequestException, InternalServerErrorException } from '@nestjs/common';
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
    const { tags, ...rawData } = data;

    // 허용된 필드 (String 타입)
    const stringFields = [
      'receiptMonth', 'customer', 'project', 'productLine',
      'partNumber', 'productName', 'factory', 'productionLine',
      'description', 'department', 'actionPlan', 'actionResult', 'qualityVerification', 'returnComment',
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
      if (val && val !== '' && !val.startsWith('custom_')) {
        eventData[key] = val;
      }
      // 빈 문자열, custom_ prefix, 없으면 eventData에 포함하지 않음 → Prisma default/null 사용
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

    // 태그 데이터 정제: 커스텀 태그는 기타 카테고리에 ChangeItem으로 생성 후 실제 ID로 변환
    const processedTags: { itemId: string; tagType: string }[] = [];
    for (const tag of (tags || [])) {
      if (!tag.itemId || tag.itemId === '') continue;
      if (tag.itemId.startsWith('custom_')) {
        // 커스텀 태그 → 기타 카테고리에 ChangeItem 생성
        const customName = tag.customName || tag.itemId.replace('custom_', '');
        if (!customName) continue;
        const etcCategory = await this.prisma.changeCategory.findFirst({
          where: { name: '기타', deletedAt: null },
        });
        if (etcCategory) {
          const code = `ETC_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
          const newItem = await this.prisma.changeItem.create({
            data: { categoryId: etcCategory.id, code, name: customName },
          });
          processedTags.push({ itemId: newItem.id, tagType: tag.tagType || 'TAG' });
        }
      } else {
        processedTags.push({ itemId: tag.itemId, tagType: tag.tagType || 'TAG' });
      }
    }

    // 커스텀 태그가 PRIMARY인 경우 primaryItemId 자동 설정
    if (!eventData.primaryItemId) {
      const primaryProcessed = processedTags.find(t => t.tagType === 'PRIMARY');
      if (primaryProcessed) eventData.primaryItemId = primaryProcessed.itemId;
    }

    // 필수 필드 검증
    if (!eventData.receiptMonth) throw new BadRequestException('접수월(receiptMonth)은 필수입니다.');
    if (!eventData.occurredDate) throw new BadRequestException('발생일(occurredDate)은 필수입니다.');
    if (!eventData.companyId) throw new BadRequestException('협력사(companyId)는 필수입니다.');
    if (!eventData.managerId) throw new BadRequestException('담당자(managerId)는 필수입니다.');

    try {
      return await this.prisma.changeEvent.create({
        data: {
          ...eventData,
          createdById: userId,
          ...(processedTags.length > 0 ? {
            tags: {
              create: processedTags.map((tag: any) => ({
                itemId: tag.itemId,
                tagType: tag.tagType || 'TAG',
              })),
            },
          } : {}),
        },
        include: {
          tags: { include: { item: true } },
        },
      });
    } catch (error: any) {
      const msg = error?.meta?.cause || error?.message || '알 수 없는 오류';
      throw new InternalServerErrorException(`변동점 등록 실패: ${msg}`);
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
      where: { ...where, deletedAt: null },
      orderBy: orderBy || { createdAt: 'desc' },
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
        attachments: {
          where: { deletedAt: null },
          select: { id: true },
        },
      },
    });
  }

  async findClasses(activeOnly = false) {
    return this.prisma.changeClass.findMany({
      where: {
        deletedAt: null,
        ...(activeOnly ? { isActive: true } : {}),
      },
    });
  }

  async findCategories(classCode?: string, activeOnly = false) {
    return this.prisma.changeCategory.findMany({
      where: {
        deletedAt: null,
        ...(activeOnly ? { isActive: true } : {}),
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

  async findItems(categoryId?: string, activeOnly = false) {
    return this.prisma.changeItem.findMany({
      where: {
        deletedAt: null,
        ...(activeOnly ? { isActive: true } : {}),
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

  async updateClass(id: string, data: { name?: string; description?: string; isActive?: boolean }) {
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

  async updateCategory(id: string, data: { name?: string; description?: string; isActive?: boolean }) {
    return this.prisma.changeCategory.update({ where: { id }, data, include: { class: true, parent: true } });
  }

  async deleteCategory(id: string) {
    return this.prisma.changeCategory.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  async createItem(data: { categoryId: string; code: string; name: string; description?: string }) {
    return this.prisma.changeItem.create({ data, include: { category: true } });
  }

  async updateItem(id: string, data: { name?: string; description?: string; isActive?: boolean }) {
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

    // 상태 변경 검증
    if (data.status && data.status !== event.status) {
      const newStatus = data.status as string;
      const currentStatus = event.status;

      // 허용된 상태 전이 규칙
      const allowedTransitions: Record<string, string[]> = {
        'DRAFT': ['CONFIRMED', 'DRAFT'],
        'CONFIRMED': ['REVIEWED', 'REVIEW_RETURNED'],
        'REVIEW_RETURNED': ['CONFIRMED', 'DRAFT'],
        'REVIEWED': ['APPROVED', 'REJECTED'],
        'APPROVED': ['CLOSED'],
        'CLOSED': [],
        'REJECTED': ['DRAFT'],
      };

      const allowed = allowedTransitions[currentStatus] || [];
      if (!allowed.includes(newStatus)) {
        throw new ForbiddenException(`${currentStatus}에서 ${newStatus}로 변경할 수 없습니다.`);
      }

      // 역할 권한 체크
      const canConfirm = ([Role.TIER1_EDITOR, Role.ADMIN] as Role[]).includes(userRole);
      const canReview = ([Role.TIER1_REVIEWER, Role.ADMIN] as Role[]).includes(userRole);
      const canApprove = ([Role.EXEC_APPROVER, Role.ADMIN] as Role[]).includes(userRole);
      const isOwnerOrEditor = event.createdById === userId || ([Role.TIER1_EDITOR, Role.ADMIN] as Role[]).includes(userRole);

      if (newStatus === 'CONFIRMED' && !isOwnerOrEditor) {
        throw new ForbiddenException('제출 권한이 없습니다.');
      }
      if ((newStatus === 'REVIEWED' || newStatus === 'REVIEW_RETURNED') && currentStatus === 'CONFIRMED' && !canReview) {
        throw new ForbiddenException('검토 권한이 없습니다.');
      }
      if ((newStatus === 'APPROVED' || newStatus === 'REJECTED') && !canApprove) {
        throw new ForbiddenException('승인 권한이 없습니다.');
      }

      // 결재선 필수 검증
      if (newStatus === 'CONFIRMED' && !event.reviewerId && !data.reviewerId) {
        throw new BadRequestException('제출하려면 1차 검토자를 지정해야 합니다.');
      }
      if (newStatus === 'APPROVED' && !event.executiveId && !data.executiveId) {
        throw new BadRequestException('최종승인하려면 전담중역을 지정해야 합니다.');
      }
    }

    const { tags, ...rawUpdateData } = data;

    // 데이터 정제 (허용된 필드만, 타입 변환)
    const cleanData: any = {};
    const stringFields = ['receiptMonth', 'customer', 'project', 'productLine', 'partNumber', 'productName', 'factory', 'productionLine', 'description', 'department', 'actionPlan', 'actionResult', 'qualityVerification', 'returnComment'];
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
        if (rawUpdateData[key] && rawUpdateData[key] !== '' && !rawUpdateData[key].startsWith('custom_')) {
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

    // 보완요청 시 자동 설정
    if (cleanData.status === 'REVIEW_RETURNED') {
      cleanData.returnedAt = new Date();
      cleanData.returnedById = userId;
    }
    // 재제출 시 보완요청 코멘트 초기화
    if (cleanData.status === 'CONFIRMED' && event.status === 'REVIEW_RETURNED') {
      cleanData.returnComment = null;
      cleanData.returnedAt = null;
      cleanData.returnedById = null;
    }

    // 태그에 커스텀 태그가 있으면 ChangeItem으로 생성
    let processedUpdateTags: { itemId: string; tagType: string }[] | null = null;
    if (tags) {
      processedUpdateTags = [];
      for (const tag of tags) {
        if (!tag.itemId || tag.itemId === '') continue;
        if (tag.itemId.startsWith('custom_')) {
          const customName = tag.customName || tag.itemId.replace('custom_', '');
          if (!customName) continue;
          const etcCategory = await this.prisma.changeCategory.findFirst({ where: { name: '기타', deletedAt: null } });
          if (etcCategory) {
            const code = `ETC_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
            const newItem = await this.prisma.changeItem.create({ data: { categoryId: etcCategory.id, code, name: customName } });
            processedUpdateTags.push({ itemId: newItem.id, tagType: tag.tagType || 'TAG' });
          }
        } else {
          processedUpdateTags.push({ itemId: tag.itemId, tagType: tag.tagType || 'TAG' });
        }
      }
      // 커스텀 PRIMARY 태그 → primaryItemId 자동 설정
      if (!cleanData.primaryItemId) {
        const primaryTag = processedUpdateTags.find(t => t.tagType === 'PRIMARY');
        if (primaryTag) cleanData.primaryItemId = primaryTag.itemId;
      }
    }

    const updated = await this.prisma.changeEvent.update({
      where: { id },
      data: {
        ...cleanData,
        updatedById: userId,
        ...(processedUpdateTags ? {
          tags: {
            deleteMany: {},
            create: processedUpdateTags.map((tag) => ({
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
        if (data.status === 'CONFIRMED') {
          // 제출(승인요청)시 1차 검토자에게 알림
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
          await this.notificationsService.notifyReturned(id, eventTitle, updated.createdById, updated.returnComment || undefined);
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

  // ── Attachment CRUD (DB base64 저장 - Railway 영속성 보장) ──

  async addAttachment(eventId: string, data: { filename: string; mimetype: string; size: number; data: string }) {
    return this.prisma.attachment.create({
      data: {
        eventId,
        filename: data.filename,
        mimetype: data.mimetype,
        size: data.size,
        data: data.data, // base64 데이터를 DB TEXT 컬럼에 저장
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
    if (!att.data) throw new NotFoundException('파일 데이터가 없습니다.');
    return att;
  }

  // ── 테스트 시드 데이터 생성 ──
  async seedTestData(adminUserId: string) {
    const dbUsers = await this.prisma.user.findMany({ where: { deletedAt: null }, select: { id: true, role: true } });
    const dbCompanies = await this.prisma.company.findMany({ select: { id: true } });
    const allItems = await this.prisma.changeItem.findMany({ take: 50, select: { id: true } });
    const itemIds = allItems.map(i => i.id);

    const editorIds = dbUsers.filter(u => ['TIER1_EDITOR', 'ADMIN'].includes(u.role)).map(u => u.id);
    const reviewerIds = dbUsers.filter(u => ['TIER1_REVIEWER', 'ADMIN'].includes(u.role)).map(u => u.id);
    const executiveIds = dbUsers.filter(u => ['EXEC_APPROVER', 'ADMIN'].includes(u.role)).map(u => u.id);
    const companyIds = dbCompanies.map(c => c.id);

    if (companyIds.length === 0) throw new BadRequestException('회사 데이터가 없습니다. 먼저 회사를 등록해주세요.');
    if (editorIds.length === 0) editorIds.push(adminUserId);
    if (reviewerIds.length === 0) reviewerIds.push(adminUserId);
    if (executiveIds.length === 0) executiveIds.push(adminUserId);

    // DB 공통코드 조회
    const codeGroups = ['CUSTOMER', 'PROJECT', 'PRODUCT_LINE', 'FACTORY', 'LINE', 'DEPARTMENT'];
    const cc: Record<string, string[]> = {};
    for (const g of codeGroups) {
      const s = await this.prisma.policySetting.findFirst({ where: { key: `COMMON_CODE_${g}` } });
      if (s?.value) {
        try {
          const v = typeof s.value === 'string' ? JSON.parse(s.value as string) : s.value;
          cc[g] = Array.isArray(v) ? v : ((v as any)?.items || []);
        } catch { cc[g] = []; }
      } else { cc[g] = []; }
    }

    const customers = cc['CUSTOMER'].length > 0 ? cc['CUSTOMER'] : ['현대자동차', '기아자동차'];
    const projects = cc['PROJECT'].length > 0 ? cc['PROJECT'] : ['MX5 (싼타페)', 'SP3(셀토스)', 'NQ5(투싼)'];
    const productLines = cc['PRODUCT_LINE'].length > 0 ? cc['PRODUCT_LINE'] : ['샤시', '트림', '바디'];
    const factories = cc['FACTORY'].length > 0 ? cc['FACTORY'] : ['본사 1공장', '본사 2공장'];
    const lines = cc['LINE'].length > 0 ? cc['LINE'] : ['A라인', 'B라인', 'C라인'];
    const departments = cc['DEPARTMENT'].length > 0 ? cc['DEPARTMENT'] : ['생산기술팀', '품질관리팀', '생산1팀'];

    const pick = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];
    const statuses = ['DRAFT', 'CONFIRMED', 'REVIEWED', 'APPROVED', 'CLOSED', 'REVIEW_RETURNED'] as const;
    const weights = [4, 10, 8, 15, 8, 5];
    const wRandom = () => { const t = weights.reduce((a, b) => a + b, 0); let r = Math.random() * t; for (let i = 0; i < weights.length; i++) { r -= weights[i]; if (r <= 0) return i; } return weights.length - 1; };

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

    let created = 0;
    for (let i = 0; i < 50; i++) {
      const month = Math.floor(Math.random() * 3); // 1~3월
      const day = Math.floor(Math.random() * 28) + 1;
      const occurredDate = new Date(2026, month, day);
      const receiptMonth = `2026-${String(month + 1).padStart(2, '0')}`;
      const status = statuses[wRandom()];
      const isAdvanced = ['CONFIRMED', 'REVIEWED', 'APPROVED', 'CLOSED'].includes(status);
      const editorId = pick(editorIds);

      try {
        await this.prisma.changeEvent.create({
          data: {
            receiptMonth, occurredDate,
            customer: pick(customers), project: pick(projects),
            productLine: pick(productLines), factory: pick(factories),
            productionLine: pick(lines), department: pick(departments),
            description: pick(descriptions),
            partNumber: `P${String(1000 + Math.floor(Math.random() * 9000))}`,
            productName: `부품-${String.fromCharCode(65 + Math.floor(Math.random() * 26))}${Math.floor(Math.random() * 100)}`,
            status, companyId: pick(companyIds),
            primaryItemId: itemIds.length > 0 ? pick(itemIds) : undefined,
            managerId: editorId, createdById: editorId,
            reviewerId: pick(reviewerIds),
            executiveId: isAdvanced ? pick(executiveIds) : undefined,
            actionDate: isAdvanced ? new Date(2026, month, Math.min(day + 7, 28)) : undefined,
            actionPlan: isAdvanced ? pick(actionPlans) : undefined,
            actionResult: ['APPROVED', 'CLOSED'].includes(status) ? pick(actionResults) : undefined,
            qualityVerification: ['APPROVED', 'CLOSED'].includes(status) ? pick(qualityChecks) : undefined,
          },
        });
        created++;
      } catch (e) { /* skip failed entries */ }
    }
    return { message: `${created}건 시드 데이터 생성 완료`, created };
  }
}
