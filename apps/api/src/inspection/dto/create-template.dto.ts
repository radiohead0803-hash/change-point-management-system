import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, IsArray, ValidateNested, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateInspectionItemDto } from './create-inspection-item.dto';

export class CreateTemplateDto {
  @ApiProperty({ description: '템플릿 이름' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ description: '템플릿 버전' })
  @IsString()
  @IsNotEmpty()
  version: string;

  @ApiProperty({ description: '활성화 여부' })
  @IsBoolean()
  isActive: boolean;

  @ApiProperty({ description: '점검 항목 목록', type: [CreateInspectionItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateInspectionItemDto)
  items: CreateInspectionItemDto[];
}
