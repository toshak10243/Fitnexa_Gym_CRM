import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MinLength,
} from 'class-validator';

export class PublicRegisterTrialDto {
  @ApiProperty({ example: 'Iron Forge Gym' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  name: string;

  @ApiProperty({ example: 'ironforge' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[a-z0-9-]+$/, {
    message: 'Subdomain slug must contain only lowercase letters, numbers, and hyphens',
  })
  slug: string;

  @ApiProperty({ example: 'Vikram Sharma' })
  @IsString()
  @IsNotEmpty()
  ownerName: string;

  @ApiProperty({ example: 'admin@ironforge.in' })
  @IsEmail()
  @IsNotEmpty()
  ownerEmail: string;

  @ApiProperty({ example: '9876543210' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^[6-9]\d{9}$/, { message: 'Mobile number must be a 10-digit Indian phone number' })
  ownerPhone: string;

  @ApiPropertyOptional({ example: 'Tristara@123' })
  @IsOptional()
  @IsString()
  initialPassword?: string;
}
