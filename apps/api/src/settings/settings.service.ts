import { Injectable } from '@nestjs/common';
import { PrismaClient, ScopeType } from '@prisma/client';

@Injectable()
export class SettingsService {
  private prisma: PrismaClient;

  constructor() {
    this.prisma = new PrismaClient();
  }

  async findAll() {
    return this.prisma.policySetting.findMany({
      where: {
        deletedAt: null,
      },
      orderBy: {
        effectiveFrom: 'desc',
      },
    });
  }

  async findOne(id: string) {
    return this.prisma.policySetting.findUnique({
      where: { id },
    });
  }

  async create(data: {
    key: string;
    value: any;
    scopeType: ScopeType;
    scopeId?: string;
    effectiveFrom?: Date;
    effectiveTo?: Date;
  }) {
    return this.prisma.policySetting.create({
      data: {
        ...data,
        value: JSON.stringify(data.value),
      },
    });
  }

  async update(id: string, data: {
    value?: any;
    scopeType?: ScopeType;
    scopeId?: string;
    effectiveFrom?: Date;
    effectiveTo?: Date;
  }) {
    return this.prisma.policySetting.update({
      where: { id },
      data: {
        ...data,
        value: data.value ? JSON.stringify(data.value) : undefined,
      },
    });
  }

  async remove(id: string) {
    return this.prisma.policySetting.update({
      where: { id },
      data: {
        deletedAt: new Date(),
      },
    });
  }

  async findActiveSetting(key: string, scopeType: ScopeType, scopeId?: string) {
    return this.prisma.policySetting.findFirst({
      where: {
        key,
        scopeType,
        scopeId: scopeId || null,
        effectiveFrom: { lte: new Date() },
        effectiveTo: { gte: new Date() } || null,
        deletedAt: null,
      },
    });
  }
}
