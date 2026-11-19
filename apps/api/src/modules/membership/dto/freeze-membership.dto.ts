import { IsString, IsNotEmpty, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class FreezeMembershipDto {
  @ApiProperty({ example: '2026-06-01' })
  @IsString()
  @IsNotEmpty()
  freezeStartDate: string;

  @ApiProperty({ example: '2026-06-15' })
  @IsString()
  @IsNotEmpty()
  freezeEndDate: string;

  @ApiPropertyOptional({ example: 'Traveling out of state for exams' })
  @IsString()
  @IsOptional()
  reason?: string;
}
