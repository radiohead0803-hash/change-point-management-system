import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as bcrypt from 'bcryptjs';
import { Role } from '@prisma/client';

const USER_SELECT = {
  id: true,
  email: true,
  name: true,
  role: true,
  team: true,
  position: true,
  phone: true,
  mustChangePassword: true,
  companyId: true,
  company: { select: { id: true, name: true, type: true, code: true } },
  createdAt: true,
  updatedAt: true,
};

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.user.findMany({
      where: { deletedAt: null },
      select: USER_SELECT,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
      select: USER_SELECT,
    });
    if (!user) throw new NotFoundException('사용자를 찾을 수 없습니다');
    return user;
  }

  async create(data: {
    email: string;
    password: string;
    name: string;
    role: Role;
    companyId?: string;
    team?: string;
    position?: string;
    phone?: string;
  }) {
    const existing = await this.prisma.user.findUnique({
      where: { email: data.email },
    });
    if (existing) throw new ConflictException('이미 존재하는 아이디입니다');

    const hashedPassword = await bcrypt.hash(data.password, 10);
    return this.prisma.user.create({
      data: {
        email: data.email,
        password: hashedPassword,
        name: data.name,
        role: data.role,
        companyId: data.companyId || null,
        team: data.team || null,
        position: data.position || null,
        phone: data.phone || null,
        mustChangePassword: true,
      },
      select: USER_SELECT,
    });
  }

  async update(id: string, data: {
    email?: string;
    name?: string;
    role?: Role;
    companyId?: string;
    password?: string;
    team?: string;
    position?: string;
    phone?: string;
    mustChangePassword?: boolean;
  }) {
    const user = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
    });
    if (!user) throw new NotFoundException('사용자를 찾을 수 없습니다');

    const updateData: any = {};
    if (data.email !== undefined) updateData.email = data.email;
    if (data.name !== undefined) updateData.name = data.name;
    if (data.role !== undefined) updateData.role = data.role;
    if (data.companyId !== undefined) updateData.companyId = data.companyId || null;
    if (data.password) {
      updateData.password = await bcrypt.hash(data.password, 10);
      updateData.mustChangePassword = false;
    }
    if (data.team !== undefined) updateData.team = data.team || null;
    if (data.position !== undefined) updateData.position = data.position || null;
    if (data.phone !== undefined) updateData.phone = data.phone || null;
    if (data.mustChangePassword !== undefined) updateData.mustChangePassword = data.mustChangePassword;

    return this.prisma.user.update({
      where: { id },
      data: updateData,
      select: USER_SELECT,
    });
  }

  async remove(id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, deletedAt: null },
    });
    if (!user) throw new NotFoundException('사용자를 찾을 수 없습니다');

    return this.prisma.user.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }

  async findCompanies() {
    return this.prisma.company.findMany({
      where: { deletedAt: null },
      include: {
        _count: { select: { users: true, events: true } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async createCompany(data: { name: string; code: string; type: string }) {
    return this.prisma.company.create({
      data: data as any,
      include: { _count: { select: { users: true, events: true } } },
    });
  }

  async updateCompany(id: string, data: { name?: string; code?: string; type?: string }) {
    return this.prisma.company.update({
      where: { id },
      data: data as any,
      include: { _count: { select: { users: true, events: true } } },
    });
  }

  async deleteCompany(id: string) {
    return this.prisma.company.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  }
}
