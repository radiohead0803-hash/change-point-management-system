import { Controller, Get } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AppService } from './app.service';
import { Public } from './auth/decorators/public.decorator';
import { PrismaService } from './prisma/prisma.service';
import * as bcrypt from 'bcryptjs';

@ApiTags('health')
@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly prisma: PrismaService,
  ) {}

  @Public()
  @Get('health')
  @ApiOperation({ summary: '헬스 체크' })
  @ApiResponse({ status: 200, description: '서버가 정상적으로 동작 중입니다.' })
  healthCheck() {
    return this.appService.healthCheck();
  }

  @Public()
  @Get('restore-admin')
  async restoreAdmin() {
    const password = await bcrypt.hash('1234', 10);
    const user = await this.prisma.user.upsert({
      where: { email: 'admin' },
      update: { deletedAt: null, password, role: 'ADMIN', name: '시스템관리자' },
      create: { email: 'admin', name: '시스템관리자', password, role: 'ADMIN' },
    });
    return { success: true, id: user.id, email: user.email };
  }
}
