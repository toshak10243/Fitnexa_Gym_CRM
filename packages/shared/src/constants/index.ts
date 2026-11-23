export const APP_NAME = 'Fitnexa';
export const API_VERSION = 'v1';
export const DEFAULT_CURRENCY = 'INR';
export const DEFAULT_TIMEZONE = 'Asia/Kolkata';

export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  GYM_OWNER = 'GYM_OWNER',
  BRANCH_MANAGER = 'BRANCH_MANAGER',
  FRONT_DESK = 'FRONT_DESK',
  TRAINER = 'TRAINER',
  STAFF = 'STAFF',
  MEMBER = 'MEMBER',
}

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  INVITED = 'INVITED',
  DEACTIVATED = 'DEACTIVATED',
}

export enum TenantStatus {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  PENDING = 'PENDING',
}

export enum SaaSSubscriptionPlan {
  TRIAL_7_DAYS = 'TRIAL_7_DAYS',
  MONTH_1 = 'MONTH_1',
  MONTH_3 = 'MONTH_3',
  MONTH_6 = 'MONTH_6',
  MONTH_12 = 'MONTH_12',
  LIFETIME = 'LIFETIME',
}

export interface SaaSPlanConfig {
  id: SaaSSubscriptionPlan;
  name: string;
  price: number;
  durationDays: number;
  durationLabel: string;
  isLifetime: boolean;
  features: string[];
}

export const SAAS_PLANS: Record<SaaSSubscriptionPlan, SaaSPlanConfig> = {
  [SaaSSubscriptionPlan.TRIAL_7_DAYS]: {
    id: SaaSSubscriptionPlan.TRIAL_7_DAYS,
    name: '7-Day Free Trial',
    price: 0,
    durationDays: 7,
    durationLabel: '7 Days',
    isLifetime: false,
    features: [
      'Full platform access across all modules',
      'Direct biometric turnstile integration',
      'GST compliant digital invoicing',
      'WhatsApp payment reminder workflows',
      'Member registration & photo capture',
      'No credit card or upfront deposit',
    ],
  },
  [SaaSSubscriptionPlan.MONTH_1]: {
    id: SaaSSubscriptionPlan.MONTH_1,
    name: '1-Month Standard Plan',
    price: 1800,
    durationDays: 30,
    durationLabel: '1 Month',
    isLifetime: false,
    features: [
      'Single branch operation',
      'Up to 500 active member profiles',
      'Biometric attendance sync',
      'Standard GST invoice generation',
      'POS register & inventory tracking',
      'Role-based staff permissions',
    ],
  },
  [SaaSSubscriptionPlan.MONTH_3]: {
    id: SaaSSubscriptionPlan.MONTH_3,
    name: '3-Month Quarterly Plan',
    price: 5200,
    durationDays: 90,
    durationLabel: '3 Months',
    isLifetime: false,
    features: [
      'Single or dual branch management',
      'Up to 1,000 active member profiles',
      'Automated WhatsApp fee receipts',
      'PT package trainer commission splits',
      'Expense tracker & ledger export',
      'Priority email & ticket support',
    ],
  },
  [SaaSSubscriptionPlan.MONTH_6]: {
    id: SaaSSubscriptionPlan.MONTH_6,
    name: '6-Month Semi-Annual Plan',
    price: 9500,
    durationDays: 180,
    durationLabel: '6 Months',
    isLifetime: false,
    features: [
      'Up to 2,000 active members',
      'Multi-device turnstile support',
      'Automated daily cloud backup snapshots',
      'Staff biometric punch-in tracking',
      'Advanced financial cash register audits',
      'Dedicated onboarding engineer support',
    ],
  },
  [SaaSSubscriptionPlan.MONTH_12]: {
    id: SaaSSubscriptionPlan.MONTH_12,
    name: '12-Month Annual Enterprise Plan',
    price: 18000,
    durationDays: 365,
    durationLabel: '12 Months',
    isLifetime: false,
    features: [
      'Unlimited active member profiles',
      'Multi-branch master executive telemetry',
      'Custom domain / subdomain mapping',
      'Zero-fee legacy data migration from Excel',
      'Unlimited staff & trainer logins',
      '24/7 Priority WhatsApp & phone hotline',
    ],
  },
  [SaaSSubscriptionPlan.LIFETIME]: {
    id: SaaSSubscriptionPlan.LIFETIME,
    name: 'Lifetime License + Free AMC',
    price: 125000,
    durationDays: 36500,
    durationLabel: 'Lifetime',
    isLifetime: true,
    features: [
      'Perpetual software license',
      'Zero monthly or annual recurring SaaS fees',
      'Includes 1 year free AMC & hardware updates',
      'Complete white-label branding customization',
      'Dedicated server isolation available',
      'Senior technical account manager assigned',
    ],
  },
};

export enum SaaSModule {
  MEMBERS = 'MEMBERS',
  BILLING = 'BILLING',
  ATTENDANCE = 'ATTENDANCE',
  DEVICES = 'DEVICES',
  INVENTORY = 'INVENTORY',
  POS = 'POS',
  CRM = 'CRM',
  TRAINERS = 'TRAINERS',
  EXPENSES = 'EXPENSES',
  NOTIFICATIONS = 'NOTIFICATIONS',
  ANALYTICS = 'ANALYTICS',
}

export const SAAS_MODULES_LIST: Array<{ id: SaaSModule; label: string; description: string }> = [
  { id: SaaSModule.MEMBERS, label: 'Members & Admissions', description: 'Member directory, A4 admission forms, profile KYC & plans' },
  { id: SaaSModule.BILLING, label: 'Billing & Invoicing', description: 'Tax invoices, fee collections, payment dues ledger & cash drawer' },
  { id: SaaSModule.ATTENDANCE, label: 'Attendance & Check-Ins', description: 'Front-desk check-in, active gym floor telemetry & attendance logs' },
  { id: SaaSModule.DEVICES, label: 'Biometric Terminals', description: 'ZKTeco / Essl biometric turnstiles, face & fingerprint integration' },
  { id: SaaSModule.INVENTORY, label: 'Retail & Stock Inventory', description: 'Supplements, merchandise stock ledger, purchases & POs' },
  { id: SaaSModule.POS, label: 'Point of Sale (POS)', description: 'Fast retail checkout register with barcode and thermal receipt printing' },
  { id: SaaSModule.CRM, label: 'Leads Pipeline & CRM', description: 'Enquiry capture, stage conversions, follow-up call schedules' },
  { id: SaaSModule.TRAINERS, label: 'Trainers & PT Sessions', description: 'Trainer profiles, client assignments, PT calendar schedules' },
  { id: SaaSModule.EXPENSES, label: 'Gym Expense Ledger', description: 'Operating expenses, utilities, maintenance, petty cash tracking' },
  { id: SaaSModule.NOTIFICATIONS, label: 'Alerts & Notifications', description: 'Automated SMS, email, and in-app member broadcast alerts' },
  { id: SaaSModule.ANALYTICS, label: 'Analytics & Telemetry', description: 'Executive business intelligence, revenue analytics & system telemetry' },
];

export interface RolePermissionDefinition {
  id: string;
  label: string;
  category: 'Administration' | 'Members' | 'Billing' | 'Attendance' | 'Biometrics' | 'Inventory' | 'CRM' | 'Trainers' | 'Operations';
  description: string;
}

export const ALL_PERMISSIONS: RolePermissionDefinition[] = [
  // Administration
  { id: 'SETTINGS', label: 'Gym Settings & Profile', category: 'Administration', description: 'Logo, legal GST/PAN, contact info, and facility branches' },
  { id: 'STAFF', label: 'Staff & Roles Management', category: 'Administration', description: 'Create, edit, and deactivate employee accounts' },
  { id: 'AUDIT_LOGS', label: 'Audit Trail Ledger', category: 'Administration', description: 'Immutable security and financial change logs' },
  { id: 'TELEMETRY', label: 'System Telemetry', category: 'Administration', description: 'Service health, latencies, and platform metrics' },
  { id: 'REPORTS', label: 'Analytics & Reports Center', category: 'Administration', description: 'Business KPIs, retention, and collection charts' },

  // Members & Plans
  { id: 'MEMBERS', label: 'Member Directory & Roster', category: 'Members', description: 'View, search, and manage member profiles' },
  { id: 'MEMBERS_REGISTER', label: 'New Member Registration', category: 'Members', description: 'Admit new gym members and collect KYC' },
  { id: 'PLANS', label: 'Membership Plans', category: 'Members', description: 'View and manage pricing tiers and duration plans' },
  { id: 'DATA_MIGRATION', label: 'Data Migration Import', category: 'Members', description: 'Bulk CSV / Excel import tool for members' },

  // Billing & Finance
  { id: 'BILLING_OVERVIEW', label: 'Billing Overview & P&L', category: 'Billing', description: 'High-level financial summaries and cash movement' },
  { id: 'INVOICES', label: 'Tax Invoices Register', category: 'Billing', description: 'Generate and view GST compliant tax invoices' },
  { id: 'PAYMENTS', label: 'Collections & Payments', category: 'Billing', description: 'Record member cash, UPI, card, and bank payments' },
  { id: 'DUES', label: 'Dues & Aging Ledger', category: 'Billing', description: 'Track overdue receivables and fee balances' },
  { id: 'CASH_REGISTER', label: 'Cash Drawer Register', category: 'Billing', description: 'Front-desk daily cash balance and shift reconciliation' },
  { id: 'REFUNDS', label: 'Refunds & Adjustments', category: 'Billing', description: 'Process fee reversals and member refunds' },

  // Attendance
  { id: 'ATTENDANCE_CHECKIN', label: 'Front-Desk Check-In', category: 'Attendance', description: 'Manual and barcode check-in terminal' },
  { id: 'ATTENDANCE_ACTIVE', label: 'Active Gym Floor Roster', category: 'Attendance', description: 'Real-time live gym occupancy list' },
  { id: 'ATTENDANCE_HISTORY', label: 'Event History Ledger', category: 'Attendance', description: 'Complete chronological check-in/out audit log' },
  { id: 'ATTENDANCE_CORRECTIONS', label: 'Correction Requests', category: 'Attendance', description: 'Request or approve manual punch corrections' },
  { id: 'ATTENDANCE_POLICIES', label: 'Access Control Policies', category: 'Attendance', description: 'Facility entry hours, grace periods, and rules' },
  { id: 'STAFF_ATTENDANCE', label: 'Staff Attendance', category: 'Attendance', description: 'Employee clock-in and work shift tracking' },

  // Biometrics & Devices
  { id: 'DEVICES', label: 'Biometric Terminals', category: 'Biometrics', description: 'Register and monitor hardware terminals and biometric locks' },

  // Retail & Inventory
  { id: 'INVENTORY_OVERVIEW', label: 'Inventory Stock Overview', category: 'Inventory', description: 'Warehouse stock balance and reorder telemetry' },
  { id: 'RETAIL_CATALOG', label: 'Retail Products Catalog', category: 'Inventory', description: 'Supplements, merchandise, and retail SKU list' },
  { id: 'POS_COUNTER', label: 'POS Sales Counter', category: 'Inventory', description: 'Point of Sale register to sell retail items' },
  { id: 'POS_SALES', label: 'POS Sales Register', category: 'Inventory', description: 'Receipt history and retail sales logs' },
  { id: 'STOCK_MOVEMENTS', label: 'Stock Movements & Adjustments', category: 'Inventory', description: 'Inward/outward stock ledger and shrinkage audit' },
  { id: 'PURCHASES', label: 'Purchase Orders', category: 'Inventory', description: 'Create and receive supplier purchase orders' },
  { id: 'SUPPLIERS', label: 'Suppliers Directory', category: 'Inventory', description: 'Vendor contact information and ledger' },

  // CRM & Trainers
  { id: 'LEADS', label: 'Leads Pipeline', category: 'CRM', description: 'Prospective member inquiries and conversion funnel' },
  { id: 'FOLLOW_UPS', label: 'CRM Follow-Ups', category: 'CRM', description: 'Scheduled inquiry reminders and outreach logs' },
  { id: 'TRAINERS', label: 'Trainer Profiles', category: 'Trainers', description: 'Gym trainers roster, specialty, and commission' },
  { id: 'TRAINER_SCHEDULE', label: 'PT Session Schedule', category: 'Trainers', description: 'Book and manage personal training time slots' },

  // Operations
  { id: 'EXPENSES', label: 'Expense Ledger', category: 'Operations', description: 'Record facility maintenance, rent, and utility expenses' },
  { id: 'NOTIFICATIONS', label: 'Notifications & Alerts', category: 'Operations', description: 'System announcements and operational alerts' },
];

export const DEFAULT_ROLE_PERMISSIONS: Record<string, string[]> = {
  GYM_OWNER: ALL_PERMISSIONS.map((p) => p.id),
  BRANCH_MANAGER: [
    'REPORTS',
    'STAFF',
    'MEMBERS',
    'MEMBERS_REGISTER',
    'PLANS',
    'BILLING_OVERVIEW',
    'INVOICES',
    'PAYMENTS',
    'DUES',
    'CASH_REGISTER',
    'REFUNDS',
    'ATTENDANCE_CHECKIN',
    'ATTENDANCE_ACTIVE',
    'ATTENDANCE_HISTORY',
    'ATTENDANCE_CORRECTIONS',
    'ATTENDANCE_POLICIES',
    'STAFF_ATTENDANCE',
    'DEVICES',
    'INVENTORY_OVERVIEW',
    'RETAIL_CATALOG',
    'POS_COUNTER',
    'POS_SALES',
    'STOCK_MOVEMENTS',
    'PURCHASES',
    'SUPPLIERS',
    'LEADS',
    'FOLLOW_UPS',
    'TRAINERS',
    'TRAINER_SCHEDULE',
    'EXPENSES',
    'NOTIFICATIONS',
  ],
  FRONT_DESK: [
    'MEMBERS',
    'MEMBERS_REGISTER',
    'PLANS',
    'INVOICES',
    'PAYMENTS',
    'DUES',
    'CASH_REGISTER',
    'ATTENDANCE_CHECKIN',
    'ATTENDANCE_ACTIVE',
    'ATTENDANCE_HISTORY',
    'ATTENDANCE_CORRECTIONS',
    'RETAIL_CATALOG',
    'POS_COUNTER',
    'POS_SALES',
    'LEADS',
    'FOLLOW_UPS',
    'TRAINERS',
    'NOTIFICATIONS',
  ],
  TRAINER: [
    'MEMBERS',
    'ATTENDANCE_ACTIVE',
    'ATTENDANCE_HISTORY',
    'TRAINERS',
    'TRAINER_SCHEDULE',
    'NOTIFICATIONS',
  ],
  STAFF: [
    'ATTENDANCE_ACTIVE',
    'ATTENDANCE_HISTORY',
    'NOTIFICATIONS',
  ],
};

export enum BranchStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
}

export enum MemberStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  PENDING = 'PENDING',
  SUSPENDED = 'SUSPENDED',
  ARCHIVED = 'ARCHIVED',
}

export enum Gender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
  OTHER = 'OTHER',
  PREFER_NOT_TO_SAY = 'PREFER_NOT_TO_SAY',
}

export enum DocumentType {
  ID_PROOF = 'ID_PROOF',
  ADDRESS_PROOF = 'ADDRESS_PROOF',
  FITNESS_CERTIFICATE = 'FITNESS_CERTIFICATE',
  MEDICAL_DECLARATION = 'MEDICAL_DECLARATION',
  OTHER = 'OTHER',
}

export enum PlanDurationType {
  DAYS = 'DAYS',
  MONTHS = 'MONTHS',
  YEARS = 'YEARS',
}

export enum MembershipStatus {
  PENDING = 'PENDING',
  ACTIVE = 'ACTIVE',
  FROZEN = 'FROZEN',
  EXPIRED = 'EXPIRED',
  CANCELLED = 'CANCELLED',
}

export enum ImportStatus {
  PENDING = 'PENDING',
  PROCESSING = 'PROCESSING',
  COMPLETED = 'COMPLETED',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
}

export enum ImportRowStatus {
  VALID = 'VALID',
  INVALID = 'INVALID',
  IMPORTED = 'IMPORTED',
  SKIPPED = 'SKIPPED',
}

export enum AttendanceSource {
  BIOMETRIC = 'BIOMETRIC',
  RFID = 'RFID',
  QR_CODE = 'QR_CODE',
  MANUAL = 'MANUAL',
}

export enum DeviceType {
  BIOMETRIC_FINGERPRINT = 'BIOMETRIC_FINGERPRINT',
  FACIAL_RECOGNITION = 'FACIAL_RECOGNITION',
  RFID_CARD = 'RFID_CARD',
  BARCODE_QR = 'BARCODE_QR',
  HYBRID = 'HYBRID',
}

export enum DeviceConnectionType {
  LAN_ETHERNET = 'LAN_ETHERNET',
  WIFI = 'WIFI',
  USB = 'USB',
  CLOUD_PUSH_HTTP = 'CLOUD_PUSH_HTTP',
  GATEWAY_DAEMON = 'GATEWAY_DAEMON',
}

export enum DeviceDirection {
  ENTRY_ONLY = 'ENTRY_ONLY',
  EXIT_ONLY = 'EXIT_ONLY',
  BIDIRECTIONAL = 'BIDIRECTIONAL',
}

export enum DeviceStatus {
  ONLINE = 'ONLINE',
  OFFLINE = 'OFFLINE',
  UNCONFIGURED = 'UNCONFIGURED',
  DISABLED = 'DISABLED',
}

export enum EventIngestionStatus {
  PENDING = 'PENDING',
  PROCESSED = 'PROCESSED',
  DUPLICATE = 'DUPLICATE',
  UNMAPPED_USER = 'UNMAPPED_USER',
  QUARANTINED = 'QUARANTINED',
  FAILED = 'FAILED',
}

export enum AccessDecisionType {
  ALLOWED = 'ALLOWED',
  DENIED = 'DENIED',
  OVERRIDDEN = 'OVERRIDDEN',
}

export enum AccessReasonCode {
  VALID_ACTIVE_MEMBERSHIP = 'VALID_ACTIVE_MEMBERSHIP',
  VALID_WITH_PENDING_DUES = 'VALID_WITH_PENDING_DUES',
  GRACE_PERIOD_ACTIVE = 'GRACE_PERIOD_ACTIVE',
  MEMBERSHIP_EXPIRED = 'MEMBERSHIP_EXPIRED',
  MEMBERSHIP_FROZEN = 'MEMBERSHIP_FROZEN',
  MEMBERSHIP_PENDING_PAYMENT = 'MEMBERSHIP_PENDING_PAYMENT',
  OUTSTANDING_DUES_BLOCK = 'OUTSTANDING_DUES_BLOCK',
  MEMBER_ACCOUNT_SUSPENDED = 'MEMBER_ACCOUNT_SUSPENDED',
  BRANCH_ACCESS_RESTRICTED = 'BRANCH_ACCESS_RESTRICTED',
  OUTSIDE_ALLOWED_TIME_WINDOW = 'OUTSIDE_ALLOWED_TIME_WINDOW',
  DUPLICATE_TAP_IGNORED = 'DUPLICATE_TAP_IGNORED',
  UNMAPPED_DEVICE_USER = 'UNMAPPED_DEVICE_USER',
  MANUAL_OVERRIDE = 'MANUAL_OVERRIDE',
}

export enum AttendanceDirection {
  CHECK_IN = 'CHECK_IN',
  CHECK_OUT = 'CHECK_OUT',
}

export enum AttendanceSourceType {
  MANUAL_FRONT_DESK = 'MANUAL_FRONT_DESK',
  BIOMETRIC_DEVICE = 'BIOMETRIC_DEVICE',
  RFID_SCAN = 'RFID_SCAN',
  QR_CODE = 'QR_CODE',
  SYSTEM_CORRECTION = 'SYSTEM_CORRECTION',
}

export enum SessionStatus {
  ACTIVE = 'ACTIVE',
  COMPLETED = 'COMPLETED',
  AUTO_CLOSED = 'AUTO_CLOSED',
  DISCARDED = 'DISCARDED',
}

export enum AttendanceCorrectionType {
  INSERT_CHECKOUT = 'INSERT_CHECKOUT',
  MODIFY_TIMESTAMP = 'MODIFY_TIMESTAMP',
  VOID_SESSION = 'VOID_SESSION',
  MANUAL_SESSION_CREATE = 'MANUAL_SESSION_CREATE',
}

export enum CorrectionStatus {
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export enum InvoiceStatus {
  DRAFT = 'DRAFT',
  ISSUED = 'ISSUED',
  PARTIALLY_PAID = 'PARTIALLY_PAID',
  PAID = 'PAID',
  OVERDUE = 'OVERDUE',
  VOID = 'VOID',
  CANCELLED = 'CANCELLED',
}

export enum PaymentStatus {
  RECORDED = 'RECORDED',
  VERIFIED = 'VERIFIED',
  REJECTED = 'REJECTED',
  REVERSED = 'REVERSED',
}

export enum PaymentMethodType {
  CASH = 'CASH',
  UPI = 'UPI',
  BANK_TRANSFER = 'BANK_TRANSFER',
  CARD_MANUAL = 'CARD_MANUAL',
  CHEQUE = 'CHEQUE',
  OTHER = 'OTHER',
}

export enum RefundStatus {
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  PROCESSED = 'PROCESSED',
}

export enum RegisterSessionStatus {
  OPEN = 'OPEN',
  CLOSED = 'CLOSED',
  RECONCILED = 'RECONCILED',
}

export enum LedgerEntryType {
  INVOICE_CHARGE = 'INVOICE_CHARGE',
  PAYMENT_CREDIT = 'PAYMENT_CREDIT',
  REFUND_DEBIT = 'REFUND_DEBIT',
  CREDIT_NOTE = 'CREDIT_NOTE',
  MANUAL_ADJUSTMENT = 'MANUAL_ADJUSTMENT',
}

export enum ProductUnit {
  PIECES = 'PIECES',
  BOXES = 'BOXES',
  SCOOPS = 'SCOOPS',
  KGS = 'KGS',
  BOTTLES = 'BOTTLES',
  PACKS = 'PACKS',
}

export enum StockMovementType {
  OPENING_STOCK = 'OPENING_STOCK',
  PURCHASE_RECEIPT = 'PURCHASE_RECEIPT',
  POS_SALE = 'POS_SALE',
  ADJUSTMENT_WRITE_OFF = 'ADJUSTMENT_WRITE_OFF',
  ADJUSTMENT_FOUND = 'ADJUSTMENT_FOUND',
  INTERNAL_TRANSFER_IN = 'INTERNAL_TRANSFER_IN',
  INTERNAL_TRANSFER_OUT = 'INTERNAL_TRANSFER_OUT',
  SALE_RETURN = 'SALE_RETURN',
}

export enum PurchaseOrderStatus {
  DRAFT = 'DRAFT',
  ORDERED = 'ORDERED',
  PARTIALLY_RECEIVED = 'PARTIALLY_RECEIVED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum InventoryTransferStatus {
  PENDING = 'PENDING',
  IN_TRANSIT = 'IN_TRANSIT',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
}

export enum TrainerSessionStatus {
  SCHEDULED = 'SCHEDULED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  NO_SHOW = 'NO_SHOW',
}

export enum LeadSource {
  WALK_IN = 'WALK_IN',
  WEBSITE = 'WEBSITE',
  PHONE_CALL = 'PHONE_CALL',
  REFERRAL = 'REFERRAL',
  SOCIAL_MEDIA = 'SOCIAL_MEDIA',
  CAMPAIGN = 'CAMPAIGN',
  OTHER = 'OTHER',
}

export enum LeadStage {
  NEW = 'NEW',
  CONTACTED = 'CONTACTED',
  FOLLOW_UP = 'FOLLOW_UP',
  TRIAL_SCHEDULED = 'TRIAL_SCHEDULED',
  TRIAL_COMPLETED = 'TRIAL_COMPLETED',
  CONVERTED = 'CONVERTED',
  LOST = 'LOST',
}

export enum LeadLostReason {
  TOO_EXPENSIVE = 'TOO_EXPENSIVE',
  DISTANCE_TOO_FAR = 'DISTANCE_TOO_FAR',
  JOINED_COMPETITOR = 'JOINED_COMPETITOR',
  NOT_INTERESTED = 'NOT_INTERESTED',
  SCHEDULE_MISMATCH = 'SCHEDULE_MISMATCH',
  OTHER = 'OTHER',
}

export enum ExpenseStatus {
  PENDING_APPROVAL = 'PENDING_APPROVAL',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  PAID = 'PAID',
}

export enum ExpensePaymentMethod {
  CASH = 'CASH',
  UPI = 'UPI',
  BANK_TRANSFER = 'BANK_TRANSFER',
  CHEQUE = 'CHEQUE',
  CARD = 'CARD',
}

export enum RecurringExpenseFrequency {
  MONTHLY = 'MONTHLY',
  QUARTERLY = 'QUARTERLY',
  ANNUAL = 'ANNUAL',
}

export enum NotificationChannel {
  IN_APP = 'IN_APP',
  SMS = 'SMS',
  EMAIL = 'EMAIL',
  WHATSAPP = 'WHATSAPP',
}

export enum NotificationType {
  MEMBERSHIP_EXPIRY = 'MEMBERSHIP_EXPIRY',
  DUES_REMINDER = 'DUES_REMINDER',
  TRIAL_APPOINTMENT = 'TRIAL_APPOINTMENT',
  LEAD_FOLLOW_UP = 'LEAD_FOLLOW_UP',
  LOW_STOCK_ALERT = 'LOW_STOCK_ALERT',
  TRAINER_SESSION = 'TRAINER_SESSION',
  SECURITY_ALERT = 'SECURITY_ALERT',
  GENERAL_ANNOUNCEMENT = 'GENERAL_ANNOUNCEMENT',
}

export enum NotificationStatus {
  QUEUED = 'QUEUED',
  PROCESSING = 'PROCESSING',
  SENT = 'SENT',
  FAILED = 'FAILED',
  READ = 'READ',
}

export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  ACCEPTED: 202,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_SERVER_ERROR: 500,
} as const;
