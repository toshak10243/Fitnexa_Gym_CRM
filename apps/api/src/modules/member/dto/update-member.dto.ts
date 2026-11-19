import {
  IsString,
  IsOptional,
  IsEmail,
  IsEnum,
  IsBoolean,
  IsNumber,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Gender, MemberStatus } from '@fitnexa/shared';
import {
  MemberAddressDto,
  MemberEmergencyContactDto,
  MemberHealthDeclarationDto,
} from './create-member.dto';

export class UpdateMemberDto {
  @ApiPropertyOptional({ example: 'Amit Kumar' })
  @IsString()
  @IsOptional()
  fullName?: string;

  @ApiPropertyOptional({ example: 'amit.kumar@example.com' })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiPropertyOptional({ example: '+919876500001' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiPropertyOptional({ example: '+919876500002' })
  @IsString()
  @IsOptional()
  altPhone?: string;

  @ApiPropertyOptional({ example: 'https://cdn.example.com/photos/amit.jpg' })
  @IsString()
  @IsOptional()
  photoUrl?: string;

  @ApiPropertyOptional({ example: '1995-05-15' })
  @IsString()
  @IsOptional()
  dob?: string;

  @ApiPropertyOptional({ enum: Gender })
  @IsEnum(Gender)
  @IsOptional()
  gender?: Gender;

  @ApiPropertyOptional({ example: 'Software Engineer' })
  @IsString()
  @IsOptional()
  occupation?: string;

  @ApiPropertyOptional({ example: '2026-01-01' })
  @IsString()
  @IsOptional()
  joiningDate?: string;

  @ApiPropertyOptional({ example: 'Muscle Gain' })
  @IsString()
  @IsOptional()
  fitnessGoal?: string;

  @ApiPropertyOptional({ example: '2 years general fitness' })
  @IsString()
  @IsOptional()
  previousExperience?: string;

  @ApiPropertyOptional({ example: 178 })
  @IsNumber()
  @IsOptional()
  heightCm?: number;

  @ApiPropertyOptional({ example: 75.5 })
  @IsNumber()
  @IsOptional()
  weightKg?: number;

  @ApiPropertyOptional({ example: 'Morning 7:00 AM - 9:00 AM' })
  @IsString()
  @IsOptional()
  workoutTiming?: string;

  @ApiPropertyOptional({ example: 'trainer-uuid-456' })
  @IsString()
  @IsOptional()
  assignedTrainerId?: string;

  @ApiPropertyOptional({ enum: MemberStatus })
  @IsEnum(MemberStatus)
  @IsOptional()
  status?: MemberStatus;

  @ApiPropertyOptional({ example: false })
  @IsBoolean()
  @IsOptional()
  isMinor?: boolean;

  @ApiPropertyOptional({ example: 'Suresh Kumar' })
  @IsString()
  @IsOptional()
  guardianName?: string;

  @ApiPropertyOptional({ example: '+919876599999' })
  @IsString()
  @IsOptional()
  guardianPhone?: string;

  @ApiPropertyOptional({ example: 'Father' })
  @IsString()
  @IsOptional()
  guardianRelation?: string;

  @ApiPropertyOptional({ type: () => MemberAddressDto })
  @ValidateNested()
  @Type(() => MemberAddressDto)
  @IsOptional()
  address?: MemberAddressDto;

  @ApiPropertyOptional({ type: () => MemberEmergencyContactDto })
  @ValidateNested()
  @Type(() => MemberEmergencyContactDto)
  @IsOptional()
  emergencyContact?: MemberEmergencyContactDto;

  @ApiPropertyOptional({ type: () => MemberHealthDeclarationDto })
  @ValidateNested()
  @Type(() => MemberHealthDeclarationDto)
  @IsOptional()
  healthDeclaration?: MemberHealthDeclarationDto;
}
