import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { UserRole } from '@fitnexa/shared';

export class CreateStaffDto {
  @ApiProperty({ example: 'Arjun Das' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(100)
  fullName: string;

  @ApiProperty({ example: 'arjun@ironforge.in' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: '9876543220' })
  @IsString()
  @Matches(/^[6-9]\d{9}$/, {
    message: 'Phone must be a valid 10-digit Indian mobile number',
  })
  phone: string;

  @ApiProperty({ example: 'StaffPass@123' })
  @IsString()
  @MinLength(8)
  @Matches(/[A-Z]/, { message: 'Password must contain at least one uppercase letter' })
  @Matches(/[0-9]/, { message: 'Password must contain at least one number' })
  password: string;

  @ApiProperty({
    enum: [
      UserRole.BRANCH_MANAGER,
      UserRole.FRONT_DESK,
      UserRole.TRAINER,
      UserRole.STAFF,
    ],
    example: UserRole.TRAINER,
  })
  @IsEnum([
    UserRole.BRANCH_MANAGER,
    UserRole.FRONT_DESK,
    UserRole.TRAINER,
    UserRole.STAFF,
  ])
  role: UserRole;

  @ApiPropertyOptional({ example: '123e4567-e89b-12d3-a456-426614174000' })
  @IsOptional()
  @IsUUID()
  branchId?: string;
}
