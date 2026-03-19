import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  Res,
  UseGuards,
  Request,
} from '@nestjs/common';
import { Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';

const UPLOAD_DIR = process.env.UPLOAD_DIR || path.join(process.cwd(), 'uploads');
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
  @Roles(Role.ADMIN, Role.TIER1_EDITOR, Role.TIER2_EDITOR)
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

  // ── Master Data CRUD (ADMIN only) ──

  @Post('codes/classes')
  @Roles(Role.ADMIN)
  createClass(@Body() body: { code: string; name: string; description?: string }) {
    return this.changeEventsService.createClass(body);
  }

  @Patch('codes/classes/:id')
  @Roles(Role.ADMIN)
  updateClass(@Param('id') id: string, @Body() body: { name?: string; description?: string }) {
    return this.changeEventsService.updateClass(id, body);
  }

  @Delete('codes/classes/:id')
  @Roles(Role.ADMIN)
  deleteClass(@Param('id') id: string) {
    return this.changeEventsService.deleteClass(id);
  }

  @Post('codes/categories')
  @Roles(Role.ADMIN)
  createCategory(@Body() body: { classId: string; code: string; name: string; parentId?: string; depth?: number; description?: string }) {
    return this.changeEventsService.createCategory(body);
  }

  @Patch('codes/categories/:id')
  @Roles(Role.ADMIN)
  updateCategory(@Param('id') id: string, @Body() body: { name?: string; description?: string }) {
    return this.changeEventsService.updateCategory(id, body);
  }

  @Delete('codes/categories/:id')
  @Roles(Role.ADMIN)
  deleteCategory(@Param('id') id: string) {
    return this.changeEventsService.deleteCategory(id);
  }

  @Post('codes/items')
  @Roles(Role.ADMIN)
  createItem(@Body() body: { categoryId: string; code: string; name: string; description?: string }) {
    return this.changeEventsService.createItem(body);
  }

  @Patch('codes/items/:id')
  @Roles(Role.ADMIN)
  updateItem(@Param('id') id: string, @Body() body: { name?: string; description?: string }) {
    return this.changeEventsService.updateItem(id, body);
  }

  @Delete('codes/items/:id')
  @Roles(Role.ADMIN)
  deleteItem(@Param('id') id: string) {
    return this.changeEventsService.deleteItem(id);
  }

  // ── Attachment CRUD ──

  @Post(':eventId/attachments')
  @ApiOperation({ summary: '첨부파일 업로드 (base64)' })
  addAttachment(
    @Param('eventId') eventId: string,
    @Body() body: { filename: string; mimetype: string; size: number; data: string },
  ) {
    return this.changeEventsService.addAttachment(eventId, body);
  }

  @Get(':eventId/attachments')
  @ApiOperation({ summary: '첨부파일 목록 조회' })
  getAttachments(@Param('eventId') eventId: string) {
    return this.changeEventsService.getAttachments(eventId);
  }

  @Get('attachment-data/:attachmentId')
  @ApiOperation({ summary: '첨부파일 데이터 조회 (base64)' })
  getAttachmentData(@Param('attachmentId') attachmentId: string) {
    return this.changeEventsService.getAttachmentData(attachmentId);
  }

  @Get('attachment-file/:attachmentId')
  @ApiOperation({ summary: '첨부파일 직접 다운로드 (파일시스템)' })
  async getAttachmentFile(@Param('attachmentId') attachmentId: string, @Res() res: Response) {
    const att = await this.changeEventsService.getAttachmentMeta(attachmentId);
    if (!att || !att.path) {
      return res.status(404).json({ message: '파일을 찾을 수 없습니다.' });
    }
    const filePath = path.join(UPLOAD_DIR, att.path);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: '파일이 존재하지 않습니다.' });
    }
    res.setHeader('Content-Type', att.mimetype || 'application/octet-stream');
    res.setHeader('Content-Disposition', `inline; filename="${encodeURIComponent(att.filename)}"`);
    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  }

  @Delete('attachments/:attachmentId')
  @ApiOperation({ summary: '첨부파일 삭제' })
  removeAttachment(@Param('attachmentId') attachmentId: string) {
    return this.changeEventsService.removeAttachment(attachmentId);
  }

  // ── Change Event CRUD by ID (must come AFTER all literal routes) ──

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
  remove(@Param('id') id: string, @Request() req: any) {
    return this.changeEventsService.remove(id, req.user.id, req.user.role);
  }
}
