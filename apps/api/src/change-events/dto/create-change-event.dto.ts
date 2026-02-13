import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsEnum, IsOptional, IsDateString } from 'class-validator';
import { ChangeType } from '@prisma/client';

export class CreateChangeEventDto {
  @ApiProperty({ description: '접수월 (YYYY-MM)' })
  @IsString()
  @IsNotEmpty()
  receiptMonth: string;

  @ApiProperty({ description: '발생일' })
  @IsDateString()
  @IsNotEmpty()
  occurredDate: string;

  @ApiProperty({ description: '고객사' })
  @IsString()
  @IsNotEmpty()
  customer: string;

  @ApiProperty({ description: '프로젝트' })
  @IsString()
  @IsNotEmpty()
  project: string;

  @ApiProperty({ description: '제품군' })
  @IsString()
  @IsNotEmpty()
  productLine: string;

  @ApiProperty({ description: '부품번호' })
  @IsString()
  @IsNotEmpty()
  partNumber: string;

  @ApiProperty({ description: '공장' })
  @IsString()
  @IsNotEmpty()
  factory: string;

  @ApiProperty({ description: '라인' })
  @IsString()
  @IsNotEmpty()
  productionLine: string;

  @ApiProperty({ description: '협력사 ID' })
  @IsString()
  @IsNotEmpty()
  companyId: string;

  @ApiProperty({ description: '4M/4M외 구분', enum: ChangeType })
  @IsEnum(ChangeType)
  @IsNotEmpty()
  changeType: ChangeType;

  @ApiProperty({ description: '대분류' })
  @IsString()
  @IsNotEmpty()
  category: string;

  @ApiProperty({ description: '세부항목' })
  @IsString()
  @IsNotEmpty()
  subCategory: string;

  @ApiProperty({ description: '변경 상세내용' })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiProperty({ description: '발생부서' })
  @IsString()
  @IsNotEmpty()
  department: string;

  @ApiProperty({ description: '실무담당자 ID' })
  @IsString()
  @IsNotEmpty()
  managerId: string;

  @ApiProperty({ description: '전담중역 ID' })
  @IsString()
  @IsOptional()
  executiveId?: string;
}
