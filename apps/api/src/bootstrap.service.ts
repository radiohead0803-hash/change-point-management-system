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
    // 관리자 계정이 없을 때만 생성 (기존 계정은 변경하지 않음)
    const adminExists = await this.prisma.user.findFirst({
      where: { role: 'ADMIN', deletedAt: null },
    });
    if (!adminExists) {
      const hashedPassword = await bcrypt.hash('cams@2002', 10);
      await this.prisma.user.create({
        data: {
          email: 'ku67000',
          name: '시스템관리자',
          password: hashedPassword,
          role: 'ADMIN',
        },
      });
      this.logger.log('Admin account created: ku67000');
    } else {
      this.logger.log('Admin account exists: ' + adminExists.email);
    }
  }
}
