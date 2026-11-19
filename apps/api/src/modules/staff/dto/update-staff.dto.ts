import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { UserRole, UserStatus } from '@fitnexa/shared';

export class UpdateStaffDto {
  @ApiPropertyOptional({ example: 'Arjun Das' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  fullName?: string;

  @ApiPropertyOptional({ example: '9876543220' })
  @IsOptional()
  @IsString()
  @Matches(/^[6-9]\d{9}$/, {
    message: 'Phone must be a valid 10-digit Indian mobile number',
  })
  phone?: string;

  @ApiPropertyOptional({
    enum: [
      UserRole.BRANCH_MANAGER,
      UserRole.FRONT_DESK,
      UserRole.TRAINER,
      UserRole.STAFF,
    ],
  })
  @IsOptional()
  @IsEnum([
    UserRole.BRANCH_MANAGER,
    UserRole.FRONT_DESK,
    UserRole.TRAINER,
    UserRole.STAFF,
  ])
  role?: UserRole;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  branchId?: string;

  @ApiPropertyOptional({
    enum: [UserStatus.ACTIVE, UserStatus.SUSPENDED, UserStatus.DEACTIVATED],
  })
  @IsOptional()
  @IsEnum([UserStatus.ACTIVE, UserStatus.SUSPENDED, UserStatus.DEACTIVATED])
  status?: UserStatus;
}
