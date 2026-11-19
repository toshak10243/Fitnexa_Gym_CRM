import { z } from 'zod';
import { UserRole, UserStatus } from '../constants';

export const RegisterOwnerSchema = z.object({
  gymName: z.string().min(2, 'Gym name must be at least 2 characters').max(100),
  ownerName: z.string().min(2, 'Owner name must be at least 2 characters').max(100),
  email: z.string().email('Valid email address is required').toLowerCase().trim(),
  phone: z
    .string()
    .regex(/^[6-9]\d{9}$/, 'Please enter a valid 10-digit Indian mobile number')
    .trim(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
  gstin: z
    .string()
    .regex(
      /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/,
      'Invalid GSTIN format (e.g. 29ABCDE1234F1Z5)',
    )
    .optional()
    .or(z.literal('')),
  city: z.string().min(2, 'City is required').max(50),
  state: z.string().min(2, 'State is required').max(50),
  address: z.string().min(5, 'Address is required').max(255),
  pincode: z.string().regex(/^\d{6}$/, 'Enter a valid 6-digit PIN code'),
});

export type RegisterOwnerInput = z.infer<typeof RegisterOwnerSchema>;

export const LoginSchema = z.object({
  email: z.string().email('Valid email address is required').toLowerCase().trim(),
  password: z.string().min(1, 'Password is required'),
});

export type LoginInput = z.infer<typeof LoginSchema>;

export const ChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z
    .string()
    .min(8, 'New password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
});

export type ChangePasswordInput = z.infer<typeof ChangePasswordSchema>;

export interface AuthUserResponse {
  id: string;
  email: string;
  fullName: string;
  phone: string;
  role: UserRole;
  status: UserStatus;
  tenantId: string;
  branchId?: string | null;
  lastLoginAt?: string | null;
}

export interface AuthTenantResponse {
  id: string;
  name: string;
  slug: string;
  currency: string;
  timezone: string;
  gstin?: string | null;
  city?: string | null;
  state?: string | null;
}

export interface AuthTokensResponse {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  user: AuthUserResponse;
  tenant: AuthTenantResponse;
}
