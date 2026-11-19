import {
  InvoiceStatus,
  PaymentMethodType,
  PaymentStatus,
} from '../constants/index';

export interface CreateInvoiceLineItemDto {
  description: string;
  quantity?: number;
  unitPriceInPaise: number;
  discountInPaise?: number;
  taxRateBps?: number;
  itemType: string;
  referenceId?: string;
}

export interface CreateInvoiceDto {
  memberId: string;
  branchId: string;
  membershipId?: string;
  invoiceDate?: string;
  dueDate: string;
  lineItems: CreateInvoiceLineItemDto[];
  notes?: string;
  termsAndConditions?: string;
  isTaxInclusive?: boolean;
}

export interface InvoiceQueryDto {
  page?: number;
  limit?: number;
  status?: InvoiceStatus;
  memberId?: string;
  branchId?: string;
  search?: string;
  startDate?: string;
  endDate?: string;
}

export interface VoidInvoiceDto {
  voidReason: string;
}

export interface PaymentAllocationInput {
  invoiceId: string;
  amountInPaise: number;
}

export interface CreatePaymentDto {
  memberId: string;
  branchId: string;
  amountInPaise: number;
  method: PaymentMethodType;
  referenceNumber?: string;
  paymentDate?: string;
  notes?: string;
  allocations?: PaymentAllocationInput[];
}

export interface PaymentQueryDto {
  page?: number;
  limit?: number;
  memberId?: string;
  branchId?: string;
  method?: PaymentMethodType;
  status?: PaymentStatus;
  startDate?: string;
  endDate?: string;
  search?: string;
}

export interface DuesQueryDto {
  page?: number;
  limit?: number;
  branchId?: string;
  memberId?: string;
  agingBucket?: 'NOT_DUE' | 'OVERDUE_1_7' | 'OVERDUE_8_30' | 'OVERDUE_31_60' | 'OVERDUE_60_PLUS';
  search?: string;
}

export interface UpdateDueDateDto {
  newDueDate: string;
  reason: string;
}

export interface CreateRenewalDto {
  memberId: string;
  currentMembershipId?: string;
  planId: string;
  branchId: string;
  startDate?: string;
  customPriceInPaise?: number;
  downPaymentInPaise?: number;
  downPaymentMethod?: PaymentMethodType;
  downPaymentReference?: string;
  dueDate?: string;
}

export interface RequestRefundDto {
  paymentId: string;
  amountInPaise: number;
  reason: string;
}

export interface ApproveRefundDto {
  approved: boolean;
  notes?: string;
}

export interface ProcessRefundDto {
  payoutReference: string;
}

export interface OpenRegisterSessionDto {
  branchId: string;
  openingFloatInPaise: number;
  notes?: string;
}

export interface CloseRegisterSessionDto {
  actualClosingPaise: number;
  notes?: string;
}
