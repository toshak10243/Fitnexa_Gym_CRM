import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsObject,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AttendanceCorrectionType } from '@fitnexa/shared';

export class CreateAttendanceCorrectionDto {
  @ApiPropertyOptional({ example: 'member-attendance-uuid' })
  @IsString()
  @IsOptional()
  memberAttendanceId?: string;

  @ApiPropertyOptional({ example: 'session-uuid' })
  @IsString()
  @IsOptional()
  attendanceSessionId?: string;

  @ApiProperty({ enum: AttendanceCorrectionType })
  @IsEnum(AttendanceCorrectionType)
  @IsNotEmpty()
  correctionType: AttendanceCorrectionType;

  @ApiProperty({ example: { checkOutTime: '2026-11-20T10:30:00Z' } })
  @IsObject()
  @IsNotEmpty()
  correctedValue: Record<string, any>;

  @ApiProperty({ example: 'Member forgot to tap out at exit turnstile' })
  @IsString()
  @IsNotEmpty()
  reason: string;
}
