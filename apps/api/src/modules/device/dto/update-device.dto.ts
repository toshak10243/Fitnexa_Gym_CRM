import {
  IsString,
  IsOptional,
  IsEnum,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  DeviceConnectionType,
  DeviceDirection,
  DeviceStatus,
} from '@fitnexa/shared';

export class UpdateDeviceDto {
  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  name?: string;

  @ApiPropertyOptional({ enum: DeviceStatus })
  @IsEnum(DeviceStatus)
  @IsOptional()
  status?: DeviceStatus;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  ipAddress?: string;

  @ApiPropertyOptional()
  @IsInt()
  @Min(1)
  @Max(65535)
  @IsOptional()
  port?: number;

  @ApiPropertyOptional({ enum: DeviceConnectionType })
  @IsEnum(DeviceConnectionType)
  @IsOptional()
  connectionType?: DeviceConnectionType;

  @ApiPropertyOptional({ enum: DeviceDirection })
  @IsEnum(DeviceDirection)
  @IsOptional()
  direction?: DeviceDirection;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  authToken?: string;

  @ApiPropertyOptional()
  @IsString()
  @IsOptional()
  notes?: string;
}
