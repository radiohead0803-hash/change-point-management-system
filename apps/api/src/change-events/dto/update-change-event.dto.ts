import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsOptional, IsEnum, IsDateString } from 'class-validator';
import { ChangeType, EventStatus } from '@prisma/client';

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

  @ApiProperty({ description: '4M/4M외 구분', enum: ChangeType, required: false })
  @IsEnum(ChangeType)
  @IsOptional()
  changeType?: ChangeType;

  @ApiProperty({ description: '대분류', required: false })
  @IsString()
  @IsOptional()
  category?: string;

  @ApiProperty({ description: '세부항목', required: false })
  @IsString()
  @IsOptional()
  subCategory?: string;

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
