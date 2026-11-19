import { z } from 'zod';
import { BranchStatus, TenantStatus } from '../constants';

export const UpdateTenantProfileSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  phone: z.string().regex(/^[6-9]\d{9}$/).optional(),
  email: z.string().email().optional(),
  gstin: z
    .string()
    .regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/)
    .optional()
    .or(z.literal('')),
  pan: z
    .string()
    .regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/)
    .optional()
    .or(z.literal('')),
  address: z.string().max(255).optional(),
  city: z.string().max(50).optional(),
  state: z.string().max(50).optional(),
  pincode: z.string().regex(/^\d{6}$/).optional(),
  currency: z.string().default('INR'),
  timezone: z.string().default('Asia/Kolkata'),
});

export type UpdateTenantProfileInput = z.infer<typeof UpdateTenantProfileSchema>;

export const CreateBranchSchema = z.object({
  name: z.string().min(2, 'Branch name must be at least 2 characters').max(100),
  code: z.string().min(2, 'Branch code is required').max(20).toUpperCase(),
  address: z.string().min(5, 'Address is required').max(255),
  city: z.string().min(2, 'City is required').max(50),
  state: z.string().min(2, 'State is required').max(50),
  pincode: z.string().regex(/^\d{6}$/, 'Enter a valid 6-digit PIN code'),
  phone: z.string().regex(/^[6-9]\d{9}$/, 'Enter a valid 10-digit mobile number'),
  isMainBranch: z.boolean().default(false),
});

export type CreateBranchInput = z.infer<typeof CreateBranchSchema>;

export const UpdateBranchSchema = CreateBranchSchema.partial();
export type UpdateBranchInput = z.infer<typeof UpdateBranchSchema>;

export interface BranchResponse {
  id: string;
  tenantId: string;
  name: string;
  code: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
  isMainBranch: boolean;
  status: BranchStatus;
  createdAt: string;
  updatedAt: string;
}

export interface TenantDetailResponse {
  id: string;
  name: string;
  slug: string;
  gstin?: string | null;
  pan?: string | null;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  currency: string;
  timezone: string;
  status: TenantStatus;
  branches: BranchResponse[];
  createdAt: string;
  updatedAt: string;
}
