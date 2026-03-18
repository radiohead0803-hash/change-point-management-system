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
    const admin = await this.prisma.user.findUnique({
      where: { email: 'admin@cams.co.kr' },
    });

    if (!admin) {
      const hashedPassword = await bcrypt.hash('admin1234!', 10);
      await this.prisma.user.create({
        data: {
          email: 'admin@cams.co.kr',
          name: '시스템관리자',
          password: hashedPassword,
          role: 'ADMIN',
        },
      });
      this.logger.log('Admin account created: admin@cams.co.kr');
    } else {
      this.logger.log('Admin account already exists');
    }
  }
}
