import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';
import * as bcrypt from 'bcryptjs';

@Injectable()
export class BootstrapService implements OnApplicationBootstrap {
  private readonly logger = new Logger(BootstrapService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onApplicationBootstrap() {
    await this.ensureAdminAccount();
  }

  private async ensureAdminAccount() {
    const hashedPassword = await bcrypt.hash('1234', 10);
    await this.prisma.user.upsert({
      where: { email: 'admin' },
      update: {
        password: hashedPassword,
      },
      create: {
        email: 'admin',
        name: '시스템관리자',
        password: hashedPassword,
        role: 'ADMIN',
      },
    });
    this.logger.log('Admin account ready: admin / 1234');
  }
}
