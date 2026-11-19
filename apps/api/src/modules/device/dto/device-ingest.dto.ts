import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsArray,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AttendanceDirection } from '@fitnexa/shared';

export class DeviceEventPayloadDto {
  @ApiProperty({ example: '1042', description: 'Enrolled card or biometric ID on machine' })
  @IsString()
  @IsNotEmpty()
  deviceUserId: string;

  @ApiProperty({ example: '2026-11-20T08:30:00Z', description: 'Timestamp from device clock' })
  @IsString()
  @IsNotEmpty()
  timestamp: string;

  @ApiPropertyOptional({ enum: AttendanceDirection, default: AttendanceDirection.CHECK_IN })
  @IsEnum(AttendanceDirection)
  @IsOptional()
  direction?: AttendanceDirection = AttendanceDirection.CHECK_IN;

  @ApiPropertyOptional({ example: 'EVT-98234-01' })
  @IsString()
  @IsOptional()
  idempotencyKey?: string;

  @ApiPropertyOptional()
  @IsOptional()
  rawPayload?: Record<string, any>;
}

export class DeviceIngestWebhookDto {
  @ApiProperty({ type: [DeviceEventPayloadDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DeviceEventPayloadDto)
  events: DeviceEventPayloadDto[];
}
