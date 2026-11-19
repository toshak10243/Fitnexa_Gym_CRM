export * from '../contracts/api-response';
export * from '../constants/index';

export interface BaseEntity {
  id: string;
  createdAt: Date | string;
  updatedAt: Date | string;
}

export interface TenantContext {
  tenantId: string;
  branchId?: string;
  userId: string;
  role: string;
}
