import { Gender, MemberStatus } from '../constants/index';

export interface CreateMemberAddressDto {
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  pincode: string;
  country?: string;
}

export interface CreateMemberEmergencyContactDto {
  name: string;
  relationship: string;
  phone: string;
}

export interface CreateMemberHealthDeclarationDto {
  hasHealthCondition: boolean;
  medicalHistory?: string;
  exerciseRestrictions?: string;
  emergencyConsent: boolean;
  processingConsent: boolean;
}

export interface CreateMemberConsentDto {
  termsAccepted: boolean;
  privacyPolicyAccepted: boolean;
  gymRulesAccepted: boolean;
  marketingConsent?: boolean;
  guardianConsentGiven?: boolean;
}

export interface CreateMemberDto {
  branchId: string;
  fullName: string;
  email?: string;
  phone: string;
  altPhone?: string;
  photoUrl?: string;
  dob?: string;
  gender?: Gender;
  occupation?: string;
  joiningDate?: string;
  fitnessGoal?: string;
  previousExperience?: string;
  heightCm?: number;
  weightKg?: number;
  workoutTiming?: string;
  assignedTrainerId?: string;
  isMinor?: boolean;
  guardianName?: string;
  guardianPhone?: string;
  guardianRelation?: string;
  address?: CreateMemberAddressDto;
  emergencyContact?: CreateMemberEmergencyContactDto;
  healthDeclaration?: CreateMemberHealthDeclarationDto;
  consent?: CreateMemberConsentDto;
}

export interface UpdateMemberDto {
  fullName?: string;
  email?: string;
  phone?: string;
  altPhone?: string;
  photoUrl?: string;
  dob?: string;
  gender?: Gender;
  occupation?: string;
  joiningDate?: string;
  fitnessGoal?: string;
  previousExperience?: string;
  heightCm?: number;
  weightKg?: number;
  workoutTiming?: string;
  assignedTrainerId?: string;
  status?: MemberStatus;
  isMinor?: boolean;
  guardianName?: string;
  guardianPhone?: string;
  guardianRelation?: string;
  address?: Partial<CreateMemberAddressDto>;
  emergencyContact?: Partial<CreateMemberEmergencyContactDto>;
  healthDeclaration?: Partial<CreateMemberHealthDeclarationDto>;
}

export interface MemberQueryDto {
  page?: number;
  limit?: number;
  search?: string;
  status?: MemberStatus;
  branchId?: string;
  assignedTrainerId?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface CreateMemberNoteDto {
  note: string;
  isPinned?: boolean;
}
