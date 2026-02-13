import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsDateString, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { EventStatus } from '@prisma/client';
import { ChangeEventTagDto } from './change-event-tag.dto';

export class UpdateChangeEventDto {
  @ApiProperty({ description: '접수월 (YYYY-MM)', required: false })
  @IsString()
  @IsOptional()
  receiptMonth?: string;

  @ApiProperty({ description: '발생일', required: false })
  @IsDateString()
  @IsOptional()
  occurredDate?: string;

  @ApiProperty({ description: '고객사', required: false })
  @IsString()
  @IsOptional()
  customer?: string;

  @ApiProperty({ description: '프로젝트', required: false })
  @IsString()
  @IsOptional()
  project?: string;

  @ApiProperty({ description: '제품군', required: false })
  @IsString()
  @IsOptional()
  productLine?: string;

  @ApiProperty({ description: '부품번호', required: false })
  @IsString()
  @IsOptional()
  partNumber?: string;

  @ApiProperty({ description: '공장', required: false })
  @IsString()
  @IsOptional()
  factory?: string;

  @ApiProperty({ description: '라인', required: false })
  @IsString()
  @IsOptional()
  productionLine?: string;

  @ApiProperty({ description: '협력사 ID', required: false })
  @IsString()
  @IsOptional()
  companyId?: string;

  @ApiProperty({ description: '주 분류 항목 ID', required: false })
  @IsString()
  @IsOptional()
  primaryItemId?: string;

  @ApiProperty({ description: '추가 분류 태그', type: [ChangeEventTagDto], required: false })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChangeEventTagDto)
  @IsOptional()
  tags?: ChangeEventTagDto[];

  @ApiProperty({ description: '변경 상세내용', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ description: '발생부서', required: false })
  @IsString()
  @IsOptional()
  department?: string;

  @ApiProperty({ description: '실무담당자 ID', required: false })
  @IsString()
  @IsOptional()
  managerId?: string;

  @ApiProperty({ description: '전담중역 ID', required: false })
  @IsString()
  @IsOptional()
  executiveId?: string;

  @ApiProperty({ description: '검토자 ID', required: false })
  @IsString()
  @IsOptional()
  reviewerId?: string;

  @ApiProperty({ description: '상태', enum: EventStatus, required: false })
  @IsEnum(EventStatus)
  @IsOptional()
  status?: EventStatus;
}
