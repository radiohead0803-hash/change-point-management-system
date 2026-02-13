import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaClient, Prisma } from '@prisma/client';

@Injectable()
export class InspectionService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  // 템플릿 관리
  async createTemplate(data: Prisma.InspectionTemplateCreateInput) {
    return this.prisma.inspectionTemplate.create({
      data,
      include: {
        items: true,
      },
    });
  }

  async findAllTemplates() {
    return this.prisma.inspectionTemplate.findMany({
      where: {
        deletedAt: null,
      },
      include: {
        items: true,
      },
    });
  }

  async findActiveTemplate() {
    return this.prisma.inspectionTemplate.findFirst({
      where: {
        isActive: true,
        deletedAt: null,
      },
      include: {
        items: {
          orderBy: {
            order: 'asc',
          },
        },
      },
    });
  }

  async updateTemplate(id: string, data: Prisma.InspectionTemplateUpdateInput) {
    return this.prisma.inspectionTemplate.update({
      where: { id },
      data,
      include: {
        items: true,
      },
    });
  }

  async deleteTemplate(id: string) {
    return this.prisma.inspectionTemplate.update({
      where: { id },
      data: {
        deletedAt: new Date(),
      },
    });
  }

  // 점검 항목 관리
  async createItem(data: Prisma.InspectionItemCreateInput) {
    return this.prisma.inspectionItem.create({
      data,
    });
  }

  async updateItem(id: string, data: Prisma.InspectionItemUpdateInput) {
    return this.prisma.inspectionItem.update({
      where: { id },
      data,
    });
  }

  async deleteItem(id: string) {
    return this.prisma.inspectionItem.update({
      where: { id },
      data: {
        deletedAt: new Date(),
      },
    });
  }

  // 점검 결과 관리
  async createResult(data: Prisma.InspectionResultCreateInput) {
    return this.prisma.inspectionResult.create({
      data,
      include: {
        item: true,
      },
    });
  }

  async findResultsByEvent(eventId: string) {
    return this.prisma.inspectionResult.findMany({
      where: {
        eventId,
        deletedAt: null,
      },
      include: {
        item: true,
      },
    });
  }

  async updateResult(id: string, data: Prisma.InspectionResultUpdateInput) {
    return this.prisma.inspectionResult.update({
      where: { id },
      data,
      include: {
        item: true,
      },
    });
  }

  async deleteResult(id: string) {
    return this.prisma.inspectionResult.update({
      where: { id },
      data: {
        deletedAt: new Date(),
      },
    });
  }

  // 점검 결과 일괄 저장
  async saveResults(eventId: string, results: Array<{ itemId: string; value: string }>) {
    const existingResults = await this.findResultsByEvent(eventId);
    const existingMap = new Map(existingResults.map(r => [r.itemId, r]));

    const operations = results.map(result => {
      const existing = existingMap.get(result.itemId);
      if (existing) {
        return this.prisma.inspectionResult.update({
          where: { id: existing.id },
          data: { value: result.value },
        });
      } else {
        return this.prisma.inspectionResult.create({
          data: {
            eventId,
            itemId: result.itemId,
            value: result.value,
          },
        });
      }
    });

    await this.prisma.$transaction(operations);
    return this.findResultsByEvent(eventId);
  }
}
