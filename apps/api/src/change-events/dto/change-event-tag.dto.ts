import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString } from 'class-validator';
import { TagType } from '@prisma/client';

export class ChangeEventTagDto {
  @ApiProperty({
    description: '태그 유형 (PRIMARY: 주 분류, TAG: 추가 분류)',
    enum: TagType,
  })
  @IsEnum(TagType)
  tagType: TagType;

  @ApiProperty({ description: '변경 항목 ID' })
  @IsString()
  itemId: string;
}
