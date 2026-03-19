import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsOptional, IsDateString, IsEnum, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { EventStatus } from '@prisma/client';
import { ChangeEventTagDto } from './change-event-tag.dto';

export class CreateChangeEventDto {
  @ApiProperty({ description: '접수월 (YYYY-MM)' })
  @IsString()
  @IsNotEmpty()
  receiptMonth: string;

  @ApiProperty({ description: '발생일' })
  @IsString()
  @IsNotEmpty()
  occurredDate: string;

  @ApiProperty({ description: '상태', enum: EventStatus, required: false })
  @IsEnum(EventStatus)
  @IsOptional()
  status?: EventStatus;

  @ApiProperty({ description: '고객사' })
  @IsString()
  @IsOptional()
  customer?: string;

  @ApiProperty({ description: '프로젝트' })
  @IsString()
  @IsOptional()
  project?: string;

  @ApiProperty({ description: '제품군' })
  @IsString()
  @IsOptional()
  productLine?: string;

  @ApiProperty({ description: '품번' })
  @IsString()
  @IsOptional()
  partNumber?: string;

  @ApiProperty({ description: '품명' })
  @IsString()
  @IsOptional()
  productName?: string;

  @ApiProperty({ description: '공장' })
  @IsString()
  @IsOptional()
  factory?: string;

  @ApiProperty({ description: '라인' })
  @IsString()
  @IsOptional()
  productionLine?: string;

  @ApiProperty({ description: '협력사 ID' })
  @IsString()
  @IsNotEmpty()
  companyId: string;

  @ApiProperty({ description: '주 분류 항목 ID' })
  @IsString()
  @IsOptional()
  primaryItemId?: string;

  @ApiProperty({ description: '추가 분류 태그', type: [ChangeEventTagDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChangeEventTagDto)
  @IsOptional()
  tags?: ChangeEventTagDto[];

  @ApiProperty({ description: '변경 상세내용' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: '발생부서' })
  @IsString()
  @IsOptional()
  department?: string;

  @ApiProperty({ description: '실무담당자 ID' })
  @IsString()
  @IsNotEmpty()
  managerId: string;

  @ApiProperty({ description: '검토자 ID' })
  @IsString()
  @IsOptional()
  reviewerId?: string;

  @ApiProperty({ description: '전담중역 ID' })
  @IsString()
  @IsOptional()
  executiveId?: string;

  // 조치결과
  @ApiProperty({ description: '조치시점' })
  @IsOptional()
  actionDate?: string;

  @ApiProperty({ description: '조치방안' })
  @IsString()
  @IsOptional()
  actionPlan?: string;

  @ApiProperty({ description: '조치결과' })
  @IsString()
  @IsOptional()
  actionResult?: string;

  @ApiProperty({ description: '품질검증' })
  @IsString()
  @IsOptional()
  qualityVerification?: string;
}
