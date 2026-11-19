import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateBranchDto {
  @ApiProperty({ example: 'Koramangala Branch' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @ApiProperty({ example: 'KRM-01' })
  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(20)
  code: string;

  @ApiProperty({ example: '80 Feet Road, 4th Block, Koramangala' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  address: string;

  @ApiProperty({ example: 'Bengaluru' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  city: string;

  @ApiProperty({ example: 'Karnataka' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  state: string;

  @ApiProperty({ example: '560034' })
  @IsString()
  @Matches(/^\d{6}$/, { message: 'PIN code must be a 6-digit number' })
  pincode: string;

  @ApiProperty({ example: '9876543211' })
  @IsString()
  @Matches(/^[6-9]\d{9}$/, {
    message: 'Phone must be a valid 10-digit Indian mobile number',
  })
  phone: string;

  @ApiPropertyOptional({ example: false })
  @IsOptional()
  @IsBoolean()
  isMainBranch?: boolean;
}
