import {
  Controller,
  Get,
  Param,
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
  @ApiResponse({
    status: 200,
    description: '월별 변동점 엑셀 파일을 다운로드합니다.',
  })
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
}
