import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty } from 'class-validator';

export class CreateInspectionResultDto {
  @ApiProperty({ description: '변동점 ID' })
  @IsString()
  @IsNotEmpty()
  eventId: string;

  @ApiProperty({ description: '점검 항목 ID' })
  @IsString()
  @IsNotEmpty()
  itemId: string;

  @ApiProperty({ description: '점검 결과 값' })
  @IsString()
  @IsNotEmpty()
  value: string;
}
