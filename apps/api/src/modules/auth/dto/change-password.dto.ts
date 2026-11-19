import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, Matches, MinLength } from 'class-validator';

export class ChangePasswordDto {
  @ApiProperty({ example: 'OldPassword@123' })
  @IsString()
  @IsNotEmpty()
  currentPassword: string;

  @ApiProperty({ example: 'NewSecurePassword@2026' })
  @IsString()
  @MinLength(8)
  @Matches(/[A-Z]/, { message: 'New password must contain at least one uppercase letter' })
  @Matches(/[a-z]/, { message: 'New password must contain at least one lowercase letter' })
  @Matches(/[0-9]/, { message: 'New password must contain at least one number' })
  @Matches(/[^A-Za-z0-9]/, { message: 'New password must contain at least one special character' })
  newPassword: string;
}
