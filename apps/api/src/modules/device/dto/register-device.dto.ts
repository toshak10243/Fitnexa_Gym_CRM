import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  DeviceType,
  DeviceConnectionType,
  DeviceDirection,
} from '@fitnexa/shared';

export class RegisterDeviceDto {
  @ApiProperty({ example: 'branch-uuid-001' })
  @IsString()
  @IsNotEmpty()
  branchId: string;

  @ApiProperty({ example: 'Main Turnstile Entry 01' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'BIO-DEL-01' })
  @IsString()
  @IsNotEmpty()
  deviceCode: string;

  @ApiPropertyOptional({ enum: DeviceType, default: DeviceType.BIOMETRIC_FINGERPRINT })
  @IsEnum(DeviceType)
  @IsOptional()
  deviceType?: DeviceType = DeviceType.BIOMETRIC_FINGERPRINT;

  @ApiPropertyOptional({ example: 'ZKTeco / eSSL' })
  @IsString()
  @IsOptional()
  manufacturer?: string;

  @ApiPropertyOptional({ example: 'BioPad Pro' })
  @IsString()
  @IsOptional()
  modelName?: string;

  @ApiPropertyOptional({ example: 'SN-98234-ZK' })
  @IsString()
  @IsOptional()
  serialNumber?: string;

  @ApiPropertyOptional({ example: 'v3.2.1' })
  @IsString()
  @IsOptional()
  firmwareVersion?: string;

  @ApiPropertyOptional({ example: '192.168.1.201' })
  @IsString()
  @IsOptional()
  ipAddress?: string;

  @ApiPropertyOptional({ example: 4370 })
  @IsInt()
  @Min(1)
  @Max(65535)
  @IsOptional()
  port?: number;

  @ApiPropertyOptional({ enum: DeviceConnectionType, default: DeviceConnectionType.CLOUD_PUSH_HTTP })
  @IsEnum(DeviceConnectionType)
  @IsOptional()
  connectionType?: DeviceConnectionType = DeviceConnectionType.CLOUD_PUSH_HTTP;

  @ApiPropertyOptional({ enum: DeviceDirection, default: DeviceDirection.BIDIRECTIONAL })
  @IsEnum(DeviceDirection)
  @IsOptional()
  direction?: DeviceDirection = DeviceDirection.BIDIRECTIONAL;

  @ApiPropertyOptional({ description: 'Secret token for validating push events from gateway/terminal' })
  @IsString()
  @IsOptional()
  authToken?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  notes?: string;
}
