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
import { Role } from '@prisma/client';
import { InspectionService } from './inspection.service';
import { CreateTemplateDto } from './dto/create-template.dto';
import { CreateInspectionItemDto } from './dto/create-inspection-item.dto';
import { CreateInspectionResultDto } from './dto/create-inspection-result.dto';

@ApiTags('inspection')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('inspection')
export class InspectionController {
  constructor(private readonly inspectionService: InspectionService) {}

  // 템플릿 관리
  @Post('templates')
  @ApiOperation({ summary: '점검 템플릿 생성' })
  @ApiResponse({ status: 201, description: '점검 템플릿이 생성되었습니다.' })
  @Roles(Role.ADMIN)
  createTemplate(@Body() createTemplateDto: CreateTemplateDto) {
    return this.inspectionService.createTemplate(createTemplateDto as any);
  }

  @Get('templates')
  @ApiOperation({ summary: '점검 템플릿 목록 조회' })
  @ApiResponse({ status: 200, description: '점검 템플릿 목록을 반환합니다.' })
  findAllTemplates() {
    return this.inspectionService.findAllTemplates();
  }

  @Get('templates/active')
  @ApiOperation({ summary: '활성 점검 템플릿 조회' })
  @ApiResponse({ status: 200, description: '활성 점검 템플릿을 반환합니다.' })
  findActiveTemplate() {
    return this.inspectionService.findActiveTemplate();
  }

  @Patch('templates/:id')
  @ApiOperation({ summary: '점검 템플릿 수정' })
  @ApiResponse({ status: 200, description: '점검 템플릿이 수정되었습니다.' })
  @Roles(Role.ADMIN)
  updateTemplate(@Param('id') id: string, @Body() updateTemplateDto: any) {
    return this.inspectionService.updateTemplate(id, updateTemplateDto);
  }

  @Delete('templates/:id')
  @ApiOperation({ summary: '점검 템플릿 삭제' })
  @ApiResponse({ status: 200, description: '점검 템플릿이 삭제되었습니다.' })
  @Roles(Role.ADMIN)
  deleteTemplate(@Param('id') id: string) {
    return this.inspectionService.deleteTemplate(id);
  }

  // 점검 항목 관리
  @Post('items')
  @ApiOperation({ summary: '점검 항목 생성' })
  @ApiResponse({ status: 201, description: '점검 항목이 생성되었습니다.' })
  @Roles(Role.ADMIN)
  createItem(@Body() createItemDto: CreateInspectionItemDto) {
    return this.inspectionService.createItem(createItemDto as any);
  }

  @Patch('items/:id')
  @ApiOperation({ summary: '점검 항목 수정' })
  @ApiResponse({ status: 200, description: '점검 항목이 수정되었습니다.' })
  @Roles(Role.ADMIN)
  updateItem(@Param('id') id: string, @Body() updateItemDto: any) {
    return this.inspectionService.updateItem(id, updateItemDto);
  }

  @Delete('items/:id')
  @ApiOperation({ summary: '점검 항목 삭제' })
  @ApiResponse({ status: 200, description: '점검 항목이 삭제되었습니다.' })
  @Roles(Role.ADMIN)
  deleteItem(@Param('id') id: string) {
    return this.inspectionService.deleteItem(id);
  }

  // 점검 결과 관리
  @Post('results')
  @ApiOperation({ summary: '점검 결과 생성' })
  @ApiResponse({ status: 201, description: '점검 결과가 생성되었습니다.' })
  createResult(@Body() createResultDto: CreateInspectionResultDto) {
    return this.inspectionService.createResult(createResultDto as any);
  }

  @Get('results/event/:eventId')
  @ApiOperation({ summary: '변동점별 점검 결과 조회' })
  @ApiResponse({ status: 200, description: '변동점별 점검 결과를 반환합니다.' })
  findResultsByEvent(@Param('eventId') eventId: string) {
    return this.inspectionService.findResultsByEvent(eventId);
  }

  @Patch('results/:id')
  @ApiOperation({ summary: '점검 결과 수정' })
  @ApiResponse({ status: 200, description: '점검 결과가 수정되었습니다.' })
  updateResult(@Param('id') id: string, @Body() updateResultDto: any) {
    return this.inspectionService.updateResult(id, updateResultDto);
  }

  @Delete('results/:id')
  @ApiOperation({ summary: '점검 결과 삭제' })
  @ApiResponse({ status: 200, description: '점검 결과가 삭제되었습니다.' })
  deleteResult(@Param('id') id: string) {
    return this.inspectionService.deleteResult(id);
  }

  @Post('results/bulk/:eventId')
  @ApiOperation({ summary: '점검 결과 일괄 저장' })
  @ApiResponse({ status: 201, description: '점검 결과가 일괄 저장되었습니다.' })
  saveResults(
    @Param('eventId') eventId: string,
    @Body() results: Array<{ itemId: string; value: string }>,
  ) {
    return this.inspectionService.saveResults(eventId, results);
  }
}
