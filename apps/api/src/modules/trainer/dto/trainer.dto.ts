import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsArray,
  IsInt,
  Min,
  Max,
  IsBoolean,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class CreateTrainerDto {
  @IsString()
  @IsNotEmpty()
  fullName: string;

  @IsString()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  phone: string;

  @IsString()
  @IsOptional()
  password?: string;

  @IsString()
  @IsOptional()
  branchId?: string;

  @IsString()
  @IsOptional()
  photoUrl?: string;

  @IsString()
  @IsOptional()
  gender?: string;

  @IsString()
  @IsOptional()
  dob?: string;

  @IsString()
  @IsOptional()
  bloodGroup?: string;

  @IsString()
  @IsOptional()
  emergencyContactName?: string;

  @IsString()
  @IsOptional()
  emergencyContactPhone?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  city?: string;

  @IsString()
  @IsOptional()
  state?: string;

  @IsString()
  @IsOptional()
  pincode?: string;

  @IsString()
  @IsOptional()
  dateOfJoining?: string;

  @IsInt()
  @IsOptional()
  baseSalaryInPaise?: number;

  @IsInt()
  @IsOptional()
  commissionPercentage?: number;

  @IsString()
  @IsOptional()
  employmentType?: string;

  @IsString()
  @IsOptional()
  shift?: string;

  @IsArray()
  @IsOptional()
  specializations?: string[];

  @IsString()
  @IsOptional()
  certifications?: string;

  @IsInt()
  @IsOptional()
  experienceYears?: number;

  @IsString()
  @IsOptional()
  idProofType?: string;

  @IsString()
  @IsOptional()
  idProofNumber?: string;

  @IsString()
  @IsOptional()
  bio?: string;

  @IsOptional()
  documents?: any;
}

export class UpsertTrainerProfileDto {
  @IsString()
  @IsNotEmpty()
  userId: string;

  @IsString()
  @IsOptional()
  branchId?: string;

  @IsString()
  @IsOptional()
  bio?: string;

  @IsArray()
  @IsOptional()
  specializations?: string[];

  @IsString()
  @IsOptional()
  certifications?: string;

  @IsInt()
  @Min(0)
  @Max(10000)
  @IsOptional()
  commissionPercentage?: number;

  @IsString()
  @IsOptional()
  photoUrl?: string;

  @IsString()
  @IsOptional()
  gender?: string;

  @IsString()
  @IsOptional()
  dob?: string;

  @IsString()
  @IsOptional()
  bloodGroup?: string;

  @IsString()
  @IsOptional()
  emergencyContactName?: string;

  @IsString()
  @IsOptional()
  emergencyContactPhone?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  city?: string;

  @IsString()
  @IsOptional()
  state?: string;

  @IsString()
  @IsOptional()
  pincode?: string;

  @IsString()
  @IsOptional()
  dateOfJoining?: string;

  @IsInt()
  @IsOptional()
  baseSalaryInPaise?: number;

  @IsString()
  @IsOptional()
  employmentType?: string;

  @IsString()
  @IsOptional()
  shift?: string;

  @IsInt()
  @IsOptional()
  experienceYears?: number;

  @IsString()
  @IsOptional()
  idProofType?: string;

  @IsString()
  @IsOptional()
  idProofNumber?: string;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

export class AvailabilitySlotDto {
  @IsInt()
  @Min(0)
  @Max(6)
  dayOfWeek: number;

  @IsString()
  @IsNotEmpty()
  startTime: string; // HH:MM

  @IsString()
  @IsNotEmpty()
  endTime: string; // HH:MM

  @IsBoolean()
  @IsOptional()
  isAvailable?: boolean = true;
}

export class SetTrainerAvailabilityDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AvailabilitySlotDto)
  availabilities: AvailabilitySlotDto[];
}

export class CreateTrainingPackageDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsInt()
  @Min(1)
  sessionCount: number;

  @IsInt()
  @Min(1)
  validityDays: number;

  @IsInt()
  @Min(0)
  priceInPaise: number;
}

export class AssignTrainerPackageDto {
  @IsString()
  @IsNotEmpty()
  branchId: string;

  @IsString()
  @IsNotEmpty()
  trainerProfileId: string;

  @IsString()
  @IsNotEmpty()
  memberId: string;

  @IsString()
  @IsNotEmpty()
  packageId: string;

  @IsString()
  @IsNotEmpty()
  startDate: string;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class BookTrainingSessionDto {
  @IsString()
  @IsNotEmpty()
  branchId: string;

  @IsString()
  @IsNotEmpty()
  trainerProfileId: string;

  @IsString()
  @IsNotEmpty()
  memberId: string;

  @IsString()
  @IsOptional()
  assignmentId?: string;

  @IsString()
  @IsNotEmpty()
  scheduledAt: string;

  @IsInt()
  @Min(15)
  @Max(240)
  @IsOptional()
  durationMinutes?: number = 60;

  @IsString()
  @IsOptional()
  notes?: string;
}
