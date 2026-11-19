import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsBoolean,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AttendanceSourceType } from '@fitnexa/shared';

export class CheckInDto {
  @ApiProperty({ example: 'member-uuid-123' })
  @IsString()
  @IsNotEmpty()
  memberId: string;

  @ApiProperty({ example: 'branch-uuid-001' })
  @IsString()
  @IsNotEmpty()
  branchId: string;

  @ApiPropertyOptional({ enum: AttendanceSourceType, default: AttendanceSourceType.MANUAL_FRONT_DESK })
  @IsEnum(AttendanceSourceType)
  @IsOptional()
  source?: AttendanceSourceType = AttendanceSourceType.MANUAL_FRONT_DESK;

  @ApiPropertyOptional({ example: 'device-uuid-456' })
  @IsString()
  @IsOptional()
  deviceId?: string;

  @ApiPropertyOptional({ description: 'Explicit staff override flag' })
  @IsBoolean()
  @IsOptional()
  override?: boolean = false;

  @ApiPropertyOptional({ description: 'Audit justification for override' })
  @IsString()
  @IsOptional()
  overrideReason?: string;
}

export class CheckOutDto {
  @ApiProperty({ example: 'member-uuid-123' })
  @IsString()
  @IsNotEmpty()
  memberId: string;

  @ApiProperty({ example: 'branch-uuid-001' })
  @IsString()
  @IsNotEmpty()
  branchId: string;

  @ApiPropertyOptional({ enum: AttendanceSourceType, default: AttendanceSourceType.MANUAL_FRONT_DESK })
  @IsEnum(AttendanceSourceType)
  @IsOptional()
  source?: AttendanceSourceType = AttendanceSourceType.MANUAL_FRONT_DESK;

  @ApiPropertyOptional({ example: 'device-uuid-456' })
  @IsString()
  @IsOptional()
  deviceId?: string;
}
