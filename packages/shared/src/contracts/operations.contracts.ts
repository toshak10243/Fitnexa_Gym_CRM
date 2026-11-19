import {
  ProductUnit,
  LeadSource,
  LeadStage,
  LeadLostReason,
  ExpensePaymentMethod,
  NotificationChannel,
  NotificationType,
  PaymentMethodType,
} from '../constants';

// ============================================================================
// INVENTORY CONTRACTS
// ============================================================================

export interface CreateProductDto {
  categoryId: string;
  sku: string;
  barcode?: string;
  name: string;
  description?: string;
  unit?: ProductUnit;
  costPriceInPaise: number;
  sellingPriceInPaise: number;
  taxRatePercentage?: number;
  hsnCode?: string;
  reorderThreshold?: number;
}

export interface UpdateProductDto extends Partial<CreateProductDto> {
  isActive?: boolean;
}

export interface ProductQueryDto {
  categoryId?: string;
  search?: string;
  isLowStock?: boolean;
  isActive?: boolean;
  page?: number;
  limit?: number;
}

export interface CreateStockAdjustmentDto {
  branchId: string;
  productId: string;
  locationId: string;
  physicalQuantity: number;
  reason: string;
}

export interface CreateInventoryTransferDto {
  sourceBranchId: string;
  sourceLocationId: string;
  destBranchId: string;
  destLocationId: string;
  notes?: string;
  items: Array<{
    productId: string;
    quantity: number;
  }>;
}

export interface CreateSupplierDto {
  name: string;
  contactPerson?: string;
  phone: string;
  email?: string;
  gstin?: string;
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
}

export interface CreatePurchaseOrderDto {
  branchId: string;
  supplierId: string;
  expectedDate?: string;
  notes?: string;
  items: Array<{
    productId: string;
    quantityOrdered: number;
    unitCostInPaise: number;
  }>;
}

export interface ReceiveGoodsDto {
  branchId: string;
  invoiceNumber?: string;
  notes?: string;
  receivedItems: Array<{
    poItemId: string;
    quantityReceived: number;
  }>;
}

// ============================================================================
// POS CONTRACTS
// ============================================================================

export interface PosCartItemDto {
  productId: string;
  quantity: number;
  unitPriceInPaise: number;
  discountInPaise?: number;
  taxRatePercentage?: number;
}

export interface PosCheckoutDto {
  branchId: string;
  memberId?: string; // Optional: member-linked or walk-in sale
  walkInCustomerName?: string;
  walkInCustomerPhone?: string;
  items: PosCartItemDto[];
  paymentMethod: PaymentMethodType;
  paymentReference?: string; // UTR for UPI, Auth code for Card
  notes?: string;
  idempotencyKey?: string;
}

export interface PosSaleReturnDto {
  items: Array<{
    invoiceLineItemId: string;
    quantity: number;
    reason: string;
  }>;
  refundMethod: PaymentMethodType;
  notes?: string;
}

// ============================================================================
// TRAINER MANAGEMENT CONTRACTS
// ============================================================================

export interface UpsertTrainerProfileDto {
  userId: string;
  branchId?: string;
  bio?: string;
  specializations?: string[];
  certifications?: string;
  commissionPercentage?: number; // Basis points (e.g. 1500 = 15%)
  isActive?: boolean;
}

export interface SetTrainerAvailabilityDto {
  availabilities: Array<{
    dayOfWeek: number;
    startTime: string; // HH:MM
    endTime: string;   // HH:MM
    isAvailable: boolean;
  }>;
}

export interface CreateTrainingPackageDto {
  name: string;
  description?: string;
  sessionCount: number;
  validityDays: number;
  priceInPaise: number;
}

export interface AssignTrainerPackageDto {
  branchId: string;
  trainerProfileId: string;
  memberId: string;
  packageId: string;
  startDate: string;
  notes?: string;
}

export interface BookTrainingSessionDto {
  branchId: string;
  trainerProfileId: string;
  memberId: string;
  assignmentId?: string;
  scheduledAt: string;
  durationMinutes?: number;
  notes?: string;
}

// ============================================================================
// LEAD CRM CONTRACTS
// ============================================================================

export interface CreateLeadDto {
  branchId: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  gender?: string;
  fitnessGoal?: string;
  source?: LeadSource;
  assignedStaffId?: string;
  notes?: string;
}

export interface UpdateLeadStageDto {
  stage: LeadStage;
  lostReason?: LeadLostReason;
  lostNotes?: string;
  notes?: string;
}

export interface ScheduleLeadFollowUpDto {
  staffId: string;
  scheduledAt: string;
  callType?: string;
  notes?: string;
}

export interface ConvertLeadDto {
  planId?: string;
  joiningDate?: string;
  addressLine1?: string;
  city?: string;
  state?: string;
  pincode?: string;
}

// ============================================================================
// EXPENSE CONTRACTS
// ============================================================================

export interface CreateExpenseCategoryDto {
  name: string;
  code: string;
  description?: string;
}

export interface CreateExpenseDto {
  branchId: string;
  categoryId: string;
  supplierId?: string;
  expenseDate: string;
  amountInPaise: number;
  paymentMethod: ExpensePaymentMethod;
  payeeName: string;
  description: string;
  receiptDocumentUrl?: string;
  notes?: string;
}

export interface ApproveExpenseDto {
  approved: boolean;
  notes?: string;
}

// ============================================================================
// NOTIFICATION CONTRACTS
// ============================================================================

export interface SendNotificationDto {
  recipientType: 'MEMBER' | 'STAFF';
  recipientId: string;
  type: NotificationType;
  channel?: NotificationChannel;
  title: string;
  message: string;
  idempotencyKey?: string;
  metadata?: Record<string, any>;
}

export interface UpsertNotificationPreferenceDto {
  optOutSms?: boolean;
  optOutEmail?: boolean;
  optOutWhatsApp?: boolean;
}
