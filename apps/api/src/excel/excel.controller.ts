import {
  Controller,
  Get,
  Param,
  Query,
  Request,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { ExcelService } from './excel.service';

@ApiTags('excel')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('excel')
export class ExcelController {
  constructor(private readonly excelService: ExcelService) {}

  @Get('monthly/:year/:month')
  @ApiOperation({ summary: '월별 변동점 엑셀 다운로드' })
  @ApiResponse({ status: 200, description: '월별 변동점 엑셀 파일을 다운로드합니다.' })
  @Roles(Role.ADMIN, Role.TIER1_EDITOR, Role.TIER1_REVIEWER, Role.EXEC_APPROVER)
  async downloadMonthlyReport(
    @Param('year') year: string,
    @Param('month') month: string,
    @Res() res: Response,
  ) {
    const buffer = await this.excelService.generateMonthlyReport(
      parseInt(year, 10),
      parseInt(month, 10),
    );

    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename=change_points_${year}_${month}.xlsx`,
      'Content-Length': buffer.length,
    });
    res.send(buffer);
  }

  @Get('inspection/:year/:month')
  @ApiOperation({ summary: '변동점 담당제 점검결과 엑셀 다운로드' })
  @ApiResponse({ status: 200, description: '변동점 담당제 점검결과 엑셀 파일을 다운로드합니다.' })
  @Roles(Role.ADMIN, Role.TIER1_EDITOR, Role.TIER1_REVIEWER, Role.EXEC_APPROVER)
  async downloadInspectionReport(
    @Param('year') year: string,
    @Param('month') month: string,
    @Query('companyId') companyId: string,
    @Query('dateFrom') dateFrom: string,
    @Query('dateTo') dateTo: string,
    @Query('status') status: string,
    @Query('customer') customer: string,
    @Request() req: any,
    @Res() res: Response,
  ) {
    const y = parseInt(year, 10);
    const m = parseInt(month, 10);
    const buffer = await this.excelService.generateInspectionReport(
      y, m, companyId || undefined, req.user?.id,
      { dateFrom: dateFrom || undefined, dateTo: dateTo || undefined, status: status || undefined, customer: customer || undefined },
    );

    // 파일명: 필터 기준 반영
    let periodLabel: string;
    if (dateFrom && dateTo) {
      periodLabel = `${dateFrom}~${dateTo}`;
    } else if (dateFrom) {
      periodLabel = `${dateFrom}~`;
    } else if (dateTo) {
      periodLabel = `~${dateTo}`;
    } else {
      periodLabel = '전체';
    }
    const filename = encodeURIComponent(`변동점_담당제_${periodLabel}_점검결과.xlsx`);
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename*=UTF-8''${filename}`,
      'Content-Length': buffer.length,
    });
    res.send(buffer);
  }
}
