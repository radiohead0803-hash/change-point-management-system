import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role, ScopeType } from '@prisma/client';
import { SettingsService } from './settings.service';

@ApiTags('settings')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('settings')
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  // ── 공통코드 (DB 기반) ──
  // 그룹: CUSTOMER, PROJECT, PRODUCT_LINE, FACTORY, LINE, DEPARTMENT

  @Get('common-codes/:group')
  @ApiOperation({ summary: '공통코드 조회 (모든 사용자)' })
  async getCommonCodes(@Param('group') group: string) {
    const setting = await this.settingsService.findActiveSetting(
      `COMMON_CODE_${group.toUpperCase()}`, 'GLOBAL' as any,
    );
    if (!setting) return [];
    try {
      const val = typeof setting.value === 'string' ? JSON.parse(setting.value as string) : setting.value;
      return Array.isArray(val) ? val : (val?.items || []);
    } catch { return []; }
  }

  @Get('common-codes-all')
  @ApiOperation({ summary: '모든 공통코드 조회' })
  async getAllCommonCodes() {
    const groups = ['CUSTOMER', 'PROJECT', 'PRODUCT_LINE', 'FACTORY', 'LINE', 'DEPARTMENT'];
    const result: Record<string, string[]> = {};
    for (const g of groups) {
      const setting = await this.settingsService.findActiveSetting(`COMMON_CODE_${g}`, 'GLOBAL' as any);
      if (setting) {
        try {
          const val = typeof setting.value === 'string' ? JSON.parse(setting.value as string) : setting.value;
          result[g] = Array.isArray(val) ? val : (val?.items || []);
        } catch { result[g] = []; }
      } else { result[g] = []; }
    }
    return result;
  }

  @Post('common-codes/:group')
  @ApiOperation({ summary: '공통코드 저장 (관리자)' })
  @Roles(Role.ADMIN)
  async saveCommonCodes(@Param('group') group: string, @Body() body: { items: string[] }) {
    const key = `COMMON_CODE_${group.toUpperCase()}`;
    const existing = await this.settingsService.findActiveSetting(key, 'GLOBAL' as any);
    if (existing) {
      return this.settingsService.update(existing.id, { value: body.items });
    }
    return this.settingsService.create({
      key, value: body.items, scopeType: 'GLOBAL' as any,
    });
  }

  @Post()
  @ApiOperation({ summary: '정책 설정 생성' })
  @ApiResponse({ status: 201, description: '정책 설정이 생성되었습니다.' })
  @Roles(Role.ADMIN)
  create(
    @Body()
    data: {
      key: string;
      value: any;
      scopeType: ScopeType;
      scopeId?: string;
      effectiveFrom?: Date;
      effectiveTo?: Date;
    },
  ) {
    return this.settingsService.create(data);
  }

  @Get()
  @ApiOperation({ summary: '정책 설정 목록 조회' })
  @ApiResponse({ status: 200, description: '정책 설정 목록을 반환합니다.' })
  @Roles(Role.ADMIN)
  findAll() {
    return this.settingsService.findAll();
  }

  @Get(':id')
  @ApiOperation({ summary: '정책 설정 상세 조회' })
  @ApiResponse({ status: 200, description: '정책 설정 상세 정보를 반환합니다.' })
  @Roles(Role.ADMIN)
  findOne(@Param('id') id: string) {
    return this.settingsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: '정책 설정 수정' })
  @ApiResponse({ status: 200, description: '정책 설정이 수정되었습니다.' })
  @Roles(Role.ADMIN)
  update(
    @Param('id') id: string,
    @Body()
    data: {
      value?: any;
      scopeType?: ScopeType;
      scopeId?: string;
      effectiveFrom?: Date;
      effectiveTo?: Date;
    },
  ) {
    return this.settingsService.update(id, data);
  }

  @Delete(':id')
  @ApiOperation({ summary: '정책 설정 삭제' })
  @ApiResponse({ status: 200, description: '정책 설정이 삭제되었습니다.' })
  @Roles(Role.ADMIN)
  remove(@Param('id') id: string) {
    return this.settingsService.remove(id);
  }
}
