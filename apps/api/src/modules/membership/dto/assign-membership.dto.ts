import { IsString, IsNotEmpty, IsOptional, IsInt, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AssignMembershipDto {
  @ApiProperty({ example: 'member-uuid-123' })
  @IsString()
  @IsNotEmpty()
  memberId: string;

  @ApiProperty({ example: 'plan-uuid-456' })
  @IsString()
  @IsNotEmpty()
  planId: string;

  @ApiProperty({ example: 'branch-uuid-789' })
  @IsString()
  @IsNotEmpty()
  branchId: string;

  @ApiPropertyOptional({ example: '2026-01-01' })
  @IsString()
  @IsOptional()
  startDate?: string;

  @ApiPropertyOptional({ example: 2400000, description: 'Custom negotiated price in paise if overriding plan price' })
  @IsInt()
  @Min(0)
  @IsOptional()
  customPriceInPaise?: number;
}
