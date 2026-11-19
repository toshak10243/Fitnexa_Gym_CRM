import { z } from 'zod';
import { UserRole, UserStatus } from '../constants';

export const CreateStaffSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters').max(100),
  email: z.string().email('Valid email address is required').toLowerCase().trim(),
  phone: z
    .string()
    .regex(/^[6-9]\d{9}$/, 'Please enter a valid 10-digit Indian mobile number')
    .trim(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Must contain at least one number'),
  role: z.enum([
    UserRole.BRANCH_MANAGER,
    UserRole.FRONT_DESK,
    UserRole.TRAINER,
    UserRole.STAFF,
  ]),
  branchId: z.string().uuid('Please select a valid branch').optional().nullable(),
});

export type CreateStaffInput = z.infer<typeof CreateStaffSchema>;

export const UpdateStaffSchema = z.object({
  fullName: z.string().min(2).max(100).optional(),
  phone: z.string().regex(/^[6-9]\d{9}$/).optional(),
  role: z
    .enum([
      UserRole.BRANCH_MANAGER,
      UserRole.FRONT_DESK,
      UserRole.TRAINER,
      UserRole.STAFF,
    ])
    .optional(),
  branchId: z.string().uuid().optional().nullable(),
  status: z
    .enum([
      UserStatus.ACTIVE,
      UserStatus.SUSPENDED,
      UserStatus.DEACTIVATED,
    ])
    .optional(),
});

export type UpdateStaffInput = z.infer<typeof UpdateStaffSchema>;

export interface StaffResponse {
  id: string;
  tenantId: string;
  branchId?: string | null;
  branchName?: string | null;
  fullName: string;
  email: string;
  phone: string;
  role: UserRole;
  status: UserStatus;
  lastLoginAt?: string | null;
  createdAt: string;
  updatedAt: string;
}
