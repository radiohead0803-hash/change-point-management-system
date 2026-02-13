import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsEnum, IsOptional, IsDateString, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ChangeEventTagDto } from './change-event-tag.dto';

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

  @ApiProperty({ description: '주 분류 항목 ID' })
  @IsString()
  @IsNotEmpty()
  primaryItemId: string;

  @ApiProperty({ description: '추가 분류 태그', type: [ChangeEventTagDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ChangeEventTagDto)
  @IsOptional()
  tags?: ChangeEventTagDto[];

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
