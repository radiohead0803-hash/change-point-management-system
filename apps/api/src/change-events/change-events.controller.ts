import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '@prisma/client';
import { ChangeEventsService } from './change-events.service';
import { CreateChangeEventDto } from './dto/create-change-event.dto';
import { UpdateChangeEventDto } from './dto/update-change-event.dto';

@ApiTags('change-events')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('change-events')
export class ChangeEventsController {
  constructor(private readonly changeEventsService: ChangeEventsService) {}

  @Post()
  @ApiOperation({ summary: '변동점 등록' })
  @ApiResponse({ status: 201, description: '변동점이 등록되었습니다.' })
  @Roles(Role.TIER1_EDITOR, Role.TIER2_EDITOR)
  create(@Body() createChangeEventDto: CreateChangeEventDto, @Request() req) {
    return this.changeEventsService.create(createChangeEventDto, req.user.id);
  }

  @Get()
  @ApiOperation({ summary: '변동점 목록 조회' })
  @ApiResponse({ status: 200, description: '변동점 목록을 반환합니다.' })
  findAll(
    @Request() req: any,
    @Query('skip') skip?: string,
    @Query('take') take?: string,
    @Query('status') status?: string,
    @Query('companyId') companyId?: string,
  ) {
    const where: any = {};
    if (status) where.status = status;
    if (companyId) where.companyId = companyId;

    // 2차사는 본인 회사 데이터만 조회 가능
    if (req.user.role === Role.TIER2_EDITOR) {
      where.companyId = req.user.companyId;
    }

    return this.changeEventsService.findAll({
      skip: skip ? parseInt(skip, 10) : undefined,
      take: take ? parseInt(take, 10) : undefined,
      where,
    });
  }

  @Get(':id')
  @ApiOperation({ summary: '변동점 상세 조회' })
  @ApiResponse({ status: 200, description: '변동점 상세 정보를 반환합니다.' })
  findOne(@Param('id') id: string) {
    return this.changeEventsService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: '변동점 수정' })
  @ApiResponse({ status: 200, description: '변동점이 수정되었습니다.' })
  update(
    @Param('id') id: string,
    @Body() updateChangeEventDto: UpdateChangeEventDto,
    @Request() req: any,
  ) {
    return this.changeEventsService.update(id, updateChangeEventDto as any, req.user.id, req.user.role);
  }

  @Delete(':id')
  @ApiOperation({ summary: '변동점 삭제' })
  @ApiResponse({ status: 200, description: '변동점이 삭제되었습니다.' })
  remove(@Param('id') id: string, @Request() req) {
    return this.changeEventsService.remove(id, req.user.id, req.user.role);
  }

  @Get('monthly/:year/:month')
  @ApiOperation({ summary: '월별 변동점 조회' })
  @ApiResponse({ status: 200, description: '월별 변동점 목록을 반환합니다.' })
  @Roles(Role.ADMIN, Role.TIER1_EDITOR, Role.TIER1_REVIEWER, Role.EXEC_APPROVER)
  findByMonth(@Param('year') year: string, @Param('month') month: string) {
    return this.changeEventsService.findByMonth(parseInt(year, 10), parseInt(month, 10));
  }

  @Get('codes/classes')
  @ApiOperation({ summary: '변경 분류 코드 조회' })
  @ApiResponse({ status: 200, description: '변경 분류 코드 목록을 반환합니다.' })
  findClasses() {
    return this.changeEventsService.findClasses();
  }

  @Get('codes/categories')
  @ApiOperation({ summary: '변경 카테고리 코드 조회' })
  @ApiResponse({ status: 200, description: '변경 카테고리 코드 목록을 반환합니다.' })
  findCategories(@Query('classCode') classCode?: string) {
    return this.changeEventsService.findCategories(classCode);
  }

  @Get('codes/items')
  @ApiOperation({ summary: '변경 항목 코드 조회' })
  @ApiResponse({ status: 200, description: '변경 항목 코드 목록을 반환합니다.' })
  findItems(@Query('categoryId') categoryId?: string) {
    return this.changeEventsService.findItems(categoryId);
  }
}
