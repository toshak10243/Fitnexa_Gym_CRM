import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AttendanceSourceType } from '@fitnexa/shared';

export class StaffCheckInDto {
  @ApiProperty({ example: 'staff-uuid-123' })
  @IsString()
  @IsNotEmpty()
  staffId: string;

  @ApiProperty({ example: 'branch-uuid-001' })
  @IsString()
  @IsNotEmpty()
  branchId: string;

  @ApiPropertyOptional({ enum: AttendanceSourceType, default: AttendanceSourceType.MANUAL_FRONT_DESK })
  @IsEnum(AttendanceSourceType)
  @IsOptional()
  source?: AttendanceSourceType = AttendanceSourceType.MANUAL_FRONT_DESK;

  @ApiPropertyOptional({ example: 'Morning Shift Floor Supervision' })
  @IsString()
  @IsOptional()
  notes?: string;
}

export class StaffCheckOutDto {
  @ApiProperty({ example: 'staff-uuid-123' })
  @IsString()
  @IsNotEmpty()
  staffId: string;

  @ApiProperty({ example: 'branch-uuid-001' })
  @IsString()
  @IsNotEmpty()
  branchId: string;
}
