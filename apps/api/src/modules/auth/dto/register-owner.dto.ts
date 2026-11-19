import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class RegisterOwnerDto {
  @ApiProperty({ example: 'IronForge Fitness Arena' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(100)
  gymName: string;

  @ApiProperty({ example: 'Vikram Malhotra' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(100)
  ownerName: string;

  @ApiProperty({ example: 'vikram@ironforge.in' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: '9876543210' })
  @IsString()
  @Matches(/^[6-9]\d{9}$/, {
    message: 'Phone must be a valid 10-digit Indian mobile number',
  })
  phone: string;

  @ApiProperty({ example: 'SecurePassword@123' })
  @IsString()
  @MinLength(8)
  @Matches(/[A-Z]/, { message: 'Password must contain at least one uppercase letter' })
  @Matches(/[a-z]/, { message: 'Password must contain at least one lowercase letter' })
  @Matches(/[0-9]/, { message: 'Password must contain at least one number' })
  @Matches(/[^A-Za-z0-9]/, { message: 'Password must contain at least one special character' })
  password: string;

  @ApiPropertyOptional({ example: '29ABCDE1234F1Z5' })
  @IsOptional()
  @IsString()
  gstin?: string;

  @ApiProperty({ example: 'Bengaluru' })
  @IsString()
  @IsNotEmpty()
  city: string;

  @ApiProperty({ example: 'Karnataka' })
  @IsString()
  @IsNotEmpty()
  state: string;

  @ApiProperty({ example: '45/2 100 Feet Road, Indiranagar' })
  @IsString()
  @IsNotEmpty()
  address: string;

  @ApiProperty({ example: '560038' })
  @IsString()
  @Matches(/^\d{6}$/, { message: 'PIN code must be a 6-digit number' })
  pincode: string;
}
