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
