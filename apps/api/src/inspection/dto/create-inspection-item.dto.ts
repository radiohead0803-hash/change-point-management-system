import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsEnum, IsBoolean, IsNumber, IsArray, IsOptional } from 'class-validator';
import { ItemType } from '@prisma/client';

export class CreateInspectionItemDto {
  @ApiProperty({ description: '템플릿 ID' })
  @IsString()
  @IsNotEmpty()
  templateId: string;

  @ApiProperty({ description: '순서' })
  @IsNumber()
  order: number;

  @ApiProperty({ description: '카테고리' })
  @IsString()
  @IsNotEmpty()
  category: string;

  @ApiProperty({ description: '질문/점검항목' })
  @IsString()
  @IsNotEmpty()
  question: string;

  @ApiProperty({ description: '입력 타입', enum: ItemType })
  @IsEnum(ItemType)
  type: ItemType;

  @ApiProperty({ description: '필수 여부' })
  @IsBoolean()
  required: boolean;

  @ApiProperty({ description: '선택 옵션 (SELECT, RADIO, CHECKBOX 타입인 경우)', type: [String], required: false })
  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  options: string[];
}
