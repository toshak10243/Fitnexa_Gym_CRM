import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEmail,
  IsEnum,
  IsBoolean,
  IsNumber,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Gender } from '@fitnexa/shared';

export class MemberAddressDto {
  @ApiProperty({ example: 'Flat 402, Green Heights' })
  @IsString()
  @IsNotEmpty()
  addressLine1: string;

  @ApiPropertyOptional({ example: 'Linking Road, Bandra West' })
  @IsString()
  @IsOptional()
  addressLine2?: string;

  @ApiProperty({ example: 'Mumbai' })
  @IsString()
  @IsNotEmpty()
  city: string;

  @ApiProperty({ example: 'Maharashtra' })
  @IsString()
  @IsNotEmpty()
  state: string;

  @ApiProperty({ example: '400050' })
  @IsString()
  @IsNotEmpty()
  pincode: string;

  @ApiPropertyOptional({ example: 'India' })
  @IsString()
  @IsOptional()
  country?: string;
}

export class MemberEmergencyContactDto {
  @ApiProperty({ example: 'Rajesh Sharma' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'Brother' })
  @IsString()
  @IsNotEmpty()
  relationship: string;

  @ApiProperty({ example: '+919876543210' })
  @IsString()
  @IsNotEmpty()
  phone: string;
}

export class MemberHealthDeclarationDto {
  @ApiProperty({ example: false })
  @IsBoolean()
  hasHealthCondition: boolean;

  @ApiPropertyOptional({ example: 'Mild lower back ache' })
  @IsString()
  @IsOptional()
  medicalHistory?: string;

  @ApiPropertyOptional({ example: 'Avoid heavy deadlifts' })
  @IsString()
  @IsOptional()
  exerciseRestrictions?: string;

  @ApiProperty({ example: true })
  @IsBoolean()
  emergencyConsent: boolean;

  @ApiProperty({ example: true })
  @IsBoolean()
  processingConsent: boolean;
}

export class MemberConsentDto {
  @ApiProperty({ example: true })
  @IsBoolean()
  termsAccepted: boolean;

  @ApiProperty({ example: true })
  @IsBoolean()
  privacyPolicyAccepted: boolean;

  @ApiProperty({ example: true })
  @IsBoolean()
  gymRulesAccepted: boolean;

  @ApiPropertyOptional({ example: false })
  @IsBoolean()
  @IsOptional()
  marketingConsent?: boolean;

  @ApiPropertyOptional({ example: false })
  @IsBoolean()
  @IsOptional()
  guardianConsentGiven?: boolean;
}

export class CreateMemberDto {
  @ApiProperty({ example: 'branch-uuid-123' })
  @IsString()
  @IsNotEmpty()
  branchId: string;

  @ApiProperty({ example: 'Amit Kumar' })
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @ApiPropertyOptional({ example: 'amit.kumar@example.com' })
  @IsEmail()
  @IsOptional()
  email?: string;

  @ApiProperty({ example: '+919876500001' })
  @IsString()
  @IsNotEmpty()
  phone: string;

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

  @ApiPropertyOptional({ enum: Gender, example: Gender.MALE })
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

  @ApiPropertyOptional({ example: 'Muscle Gain & Strength' })
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

  @ApiPropertyOptional({ type: () => MemberConsentDto })
  @ValidateNested()
  @Type(() => MemberConsentDto)
  @IsOptional()
  consent?: MemberConsentDto;
}
