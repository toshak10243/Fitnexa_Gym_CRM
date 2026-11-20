import { UserRole, DEFAULT_ROLE_PERMISSIONS } from '@fitnexa/shared';
import { Link, useLocation } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { useAuth } from '../../context/auth-context';
import fitnexaLogo from '../../assets/logo.png';

export function Sidebar() {
  const location = useLocation();
  const { tenant, user } = useAuth();
  const userRole = user?.role;

  const coreNavItems = [
    {
      label: 'Executive Dashboard',
      path: '/',
      roles: ['SUPER_ADMIN', 'GYM_OWNER', 'BRANCH_MANAGER', 'FRONT_DESK', 'TRAINER', 'STAFF'],
      enabled: true,
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <rect x="3" y="3" width="7" height="9" />
          <rect x="14" y="3" width="7" height="5" />
          <rect x="14" y="12" width="7" height="9" />
          <rect x="3" y="16" width="7" height="5" />
        </svg>
      ),
    },
    {
      label: 'Analytics & Reports',
      path: '/reports',
      roles: ['SUPER_ADMIN', 'GYM_OWNER', 'BRANCH_MANAGER'],
      module: 'ANALYTICS',
      permission: 'REPORTS',
      enabled: true,
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <line x1="18" y1="20" x2="18" y2="10" />
          <line x1="12" y1="20" x2="12" y2="4" />
          <line x1="6" y1="20" x2="6" y2="14" />
        </svg>
      ),
    },
    {
      label: 'System Telemetry',
      path: '/telemetry',
      roles: ['SUPER_ADMIN', 'GYM_OWNER'],
      module: 'ANALYTICS',
      permission: 'TELEMETRY',
      enabled: true,
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
        </svg>
      ),
    },
    {
      label: 'Gym Settings & Profile',
      path: '/settings',
      roles: ['SUPER_ADMIN', 'GYM_OWNER'],
      permission: 'SETTINGS',
      enabled: true,
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      ),
    },
    {
      label: 'Staff & Roles',
      path: '/staff',
      roles: ['SUPER_ADMIN', 'GYM_OWNER', 'BRANCH_MANAGER'],
      permission: 'STAFF',
      enabled: true,
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      ),
    },
    {
      label: 'Audit Trail',
      path: '/audit-logs',
      roles: ['SUPER_ADMIN', 'GYM_OWNER'],
      permission: 'AUDIT_LOGS',
      enabled: true,
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <polyline points="10 9 9 9 8 9" />
        </svg>
      ),
    },
  ];

  const memberNavItems = [
    {
      label: 'Members',
      path: '/members',
      roles: ['SUPER_ADMIN', 'GYM_OWNER', 'BRANCH_MANAGER', 'FRONT_DESK', 'TRAINER'],
      module: 'MEMBERS',
      permission: 'MEMBERS',
      enabled: true,
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
        </svg>
      ),
    },
    {
      label: 'Membership Plans',
      path: '/plans',
      roles: ['SUPER_ADMIN', 'GYM_OWNER', 'BRANCH_MANAGER', 'FRONT_DESK'],
      module: 'MEMBERS',
      permission: 'PLANS',
      enabled: true,
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <rect x="2" y="5" width="20" height="14" rx="1" />
          <line x1="2" y1="10" x2="22" y2="10" />
        </svg>
      ),
    },
    {
      label: 'Data Migration',
      path: '/imports',
      roles: ['SUPER_ADMIN', 'GYM_OWNER'],
      module: 'MEMBERS',
      permission: 'DATA_MIGRATION',
      enabled: true,
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
      ),
    },
  ];

  const billingNavItems = [
    {
      label: 'Billing Overview',
      path: '/billing',
      roles: ['SUPER_ADMIN', 'GYM_OWNER', 'BRANCH_MANAGER'],
      module: 'BILLING',
      permission: 'BILLING_OVERVIEW',
      enabled: true,
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <rect x="2" y="3" width="20" height="14" rx="1" />
          <line x1="2" y1="9" x2="22" y2="9" />
          <line x1="6" y1="13" x2="10" y2="13" />
        </svg>
      ),
    },
    {
      label: 'Tax Invoices',
      path: '/billing/invoices',
      roles: ['SUPER_ADMIN', 'GYM_OWNER', 'BRANCH_MANAGER', 'FRONT_DESK'],
      module: 'BILLING',
      permission: 'INVOICES',
      enabled: true,
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="9" y1="13" x2="15" y2="13" />
          <line x1="9" y1="17" x2="15" y2="17" />
        </svg>
      ),
    },
    {
      label: 'Collections & Payments',
      path: '/billing/payments',
      roles: ['SUPER_ADMIN', 'GYM_OWNER', 'BRANCH_MANAGER', 'FRONT_DESK'],
      module: 'BILLING',
      permission: 'PAYMENTS',
      enabled: true,
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="10" />
          <path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8" />
          <path d="M12 6v12" />
        </svg>
      ),
    },
    {
      label: 'Dues & Aging Ledger',
      path: '/billing/dues',
      roles: ['SUPER_ADMIN', 'GYM_OWNER', 'BRANCH_MANAGER', 'FRONT_DESK'],
      module: 'BILLING',
      permission: 'DUES',
      enabled: true,
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      ),
    },
    {
      label: 'Cash Register Drawer',
      path: '/billing/cash-register',
      roles: ['SUPER_ADMIN', 'GYM_OWNER', 'BRANCH_MANAGER', 'FRONT_DESK'],
      module: 'BILLING',
      permission: 'CASH_REGISTER',
      enabled: true,
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <rect x="2" y="7" width="20" height="14" rx="1" />
          <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
        </svg>
      ),
    },
    {
      label: 'Refunds & Adjustments',
      path: '/billing/refunds',
      roles: ['SUPER_ADMIN', 'GYM_OWNER', 'BRANCH_MANAGER'],
      module: 'BILLING',
      permission: 'REFUNDS',
      enabled: true,
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <polyline points="1 4 1 10 7 10" />
          <path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10" />
        </svg>
      ),
    },
  ];

  const attendanceNavItems = [
    {
      label: 'Attendance Telemetry',
      path: '/attendance',
      roles: ['SUPER_ADMIN', 'GYM_OWNER', 'BRANCH_MANAGER'],
      module: 'ATTENDANCE',
      permission: 'ATTENDANCE_POLICIES',
      enabled: true,
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <polyline points="16 11 18 13 22 9" />
        </svg>
      ),
    },
    {
      label: 'Front-Desk Check-in',
      path: '/attendance/check-in',
      roles: ['SUPER_ADMIN', 'GYM_OWNER', 'BRANCH_MANAGER', 'FRONT_DESK'],
      module: 'ATTENDANCE',
      permission: 'ATTENDANCE_CHECKIN',
      enabled: true,
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <rect x="3" y="4" width="18" height="18" rx="0" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
          <path d="m9 16 2 2 4-4" />
        </svg>
      ),
    },
    {
      label: 'Active Gym Floor',
      path: '/attendance/active',
      roles: ['SUPER_ADMIN', 'GYM_OWNER', 'BRANCH_MANAGER', 'FRONT_DESK', 'TRAINER', 'STAFF'],
      module: 'ATTENDANCE',
      permission: 'ATTENDANCE_ACTIVE',
      enabled: true,
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <circle cx="19" cy="11" r="2" />
        </svg>
      ),
    },
    {
      label: 'Event History Ledger',
      path: '/attendance/history',
      roles: ['SUPER_ADMIN', 'GYM_OWNER', 'BRANCH_MANAGER', 'FRONT_DESK', 'TRAINER', 'STAFF'],
      module: 'ATTENDANCE',
      permission: 'ATTENDANCE_HISTORY',
      enabled: true,
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 14 14" />
        </svg>
      ),
    },
    {
      label: 'Correction Requests',
      path: '/attendance/corrections',
      roles: ['SUPER_ADMIN', 'GYM_OWNER', 'BRANCH_MANAGER', 'FRONT_DESK'],
      module: 'ATTENDANCE',
      permission: 'ATTENDANCE_CORRECTIONS',
      enabled: true,
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
      ),
    },
    {
      label: 'Access Policies',
      path: '/attendance/policies',
      roles: ['SUPER_ADMIN', 'GYM_OWNER', 'BRANCH_MANAGER'],
      module: 'ATTENDANCE',
      permission: 'ATTENDANCE_POLICIES',
      enabled: true,
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <rect x="3" y="11" width="18" height="11" rx="0" />
          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
        </svg>
      ),
    },
    {
      label: 'Staff Attendance',
      path: '/staff-attendance',
      roles: ['SUPER_ADMIN', 'GYM_OWNER', 'BRANCH_MANAGER'],
      module: 'ATTENDANCE',
      permission: 'STAFF_ATTENDANCE',
      enabled: true,
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M19 8v6" />
          <path d="M22 11h-6" />
        </svg>
      ),
    },
  ];

  const deviceNavItems = [
    {
      label: 'Biometric Terminals',
      path: '/devices',
      roles: ['SUPER_ADMIN', 'GYM_OWNER', 'BRANCH_MANAGER'],
      module: 'DEVICES',
      permission: 'DEVICES',
      enabled: true,
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <rect x="4" y="2" width="16" height="20" rx="0" />
          <line x1="12" y1="18" x2="12.01" y2="18" />
          <circle cx="12" cy="10" r="3" />
        </svg>
      ),
    },
    {
      label: 'Register Terminal',
      path: '/devices/new',
      roles: ['SUPER_ADMIN', 'GYM_OWNER', 'BRANCH_MANAGER'],
      module: 'DEVICES',
      permission: 'DEVICES',
      enabled: true,
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      ),
    },
  ];

  const inventoryNavItems = [
    {
      label: 'Inventory Overview',
      path: '/inventory',
      roles: ['SUPER_ADMIN', 'GYM_OWNER', 'BRANCH_MANAGER'],
      module: 'INVENTORY',
      permission: 'INVENTORY_OVERVIEW',
      enabled: true,
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
          <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
          <line x1="12" y1="22.08" x2="12" y2="12" />
        </svg>
      ),
    },
    {
      label: 'Retail Catalog',
      path: '/inventory/products',
      roles: ['SUPER_ADMIN', 'GYM_OWNER', 'BRANCH_MANAGER', 'FRONT_DESK'],
      module: 'INVENTORY',
      permission: 'RETAIL_CATALOG',
      enabled: true,
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <line x1="16.5" y1="9.4" x2="7.55" y2="4.24" />
          <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
          <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
        </svg>
      ),
    },
    {
      label: 'POS Counter',
      path: '/pos',
      roles: ['SUPER_ADMIN', 'GYM_OWNER', 'BRANCH_MANAGER', 'FRONT_DESK'],
      module: 'POS',
      permission: 'POS_COUNTER',
      enabled: true,
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="9" cy="21" r="1" />
          <circle cx="20" cy="21" r="1" />
          <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
        </svg>
      ),
    },
    {
      label: 'POS Sales Register',
      path: '/pos/sales',
      roles: ['SUPER_ADMIN', 'GYM_OWNER', 'BRANCH_MANAGER', 'FRONT_DESK'],
      module: 'POS',
      permission: 'POS_SALES',
      enabled: true,
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <rect x="2" y="4" width="20" height="16" rx="2" />
          <line x1="2" y1="10" x2="22" y2="10" />
        </svg>
      ),
    },
    {
      label: 'Stock Ledger',
      path: '/inventory/movements',
      roles: ['SUPER_ADMIN', 'GYM_OWNER', 'BRANCH_MANAGER'],
      module: 'INVENTORY',
      permission: 'STOCK_MOVEMENTS',
      enabled: true,
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
        </svg>
      ),
    },
    {
      label: 'Purchase Orders',
      path: '/inventory/purchases',
      roles: ['SUPER_ADMIN', 'GYM_OWNER', 'BRANCH_MANAGER'],
      module: 'INVENTORY',
      permission: 'PURCHASES',
      enabled: true,
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="12" y1="18" x2="12" y2="12" />
          <line x1="9" y1="15" x2="15" y2="15" />
        </svg>
      ),
    },
    {
      label: 'Suppliers Directory',
      path: '/inventory/suppliers',
      roles: ['SUPER_ADMIN', 'GYM_OWNER', 'BRANCH_MANAGER'],
      module: 'INVENTORY',
      permission: 'SUPPLIERS',
      enabled: true,
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="8.5" cy="7" r="4" />
          <polyline points="17 11 19 13 23 9" />
        </svg>
      ),
    },
  ];

  const crmNavItems = [
    {
      label: 'Leads Pipeline',
      path: '/leads',
      roles: ['SUPER_ADMIN', 'GYM_OWNER', 'BRANCH_MANAGER', 'FRONT_DESK'],
      module: 'CRM',
      permission: 'LEADS',
      enabled: true,
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
        </svg>
      ),
    },
    {
      label: 'CRM Follow-Ups',
      path: '/leads/follow-ups',
      roles: ['SUPER_ADMIN', 'GYM_OWNER', 'BRANCH_MANAGER', 'FRONT_DESK'],
      module: 'CRM',
      permission: 'FOLLOW_UPS',
      enabled: true,
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      ),
    },
    {
      label: 'Trainer Profiles',
      path: '/trainers',
      roles: ['SUPER_ADMIN', 'GYM_OWNER', 'BRANCH_MANAGER', 'FRONT_DESK', 'TRAINER'],
      module: 'TRAINERS',
      permission: 'TRAINERS',
      enabled: true,
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
        </svg>
      ),
    },
    {
      label: 'PT Session Schedule',
      path: '/trainers/schedule',
      roles: ['SUPER_ADMIN', 'GYM_OWNER', 'BRANCH_MANAGER', 'TRAINER'],
      module: 'TRAINERS',
      permission: 'TRAINER_SCHEDULE',
      enabled: true,
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
          <line x1="16" y1="2" x2="16" y2="6" />
          <line x1="8" y1="2" x2="8" y2="6" />
          <line x1="3" y1="10" x2="21" y2="10" />
        </svg>
      ),
    },
  ];

  const operationsNavItems = [
    {
      label: 'Expense Ledger',
      path: '/expenses',
      roles: ['SUPER_ADMIN', 'GYM_OWNER', 'BRANCH_MANAGER'],
      module: 'EXPENSES',
      permission: 'EXPENSES',
      enabled: true,
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <line x1="12" y1="1" x2="12" y2="23" />
          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
      ),
    },
    {
      label: 'Notifications & Alerts',
      path: '/notifications',
      roles: ['SUPER_ADMIN', 'GYM_OWNER', 'BRANCH_MANAGER', 'FRONT_DESK', 'TRAINER', 'STAFF'],
      module: 'NOTIFICATIONS',
      permission: 'NOTIFICATIONS',
      enabled: true,
      icon: (
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
      ),
    },
  ];

  interface NavItem {
    label: string;
    path: string;
    enabled: boolean;
    icon: React.ReactNode;
    roles?: string[];
    module?: string;
    permission?: string;
  }

  const renderNavGroup = (title: string, items: NavItem[], groupModule?: string) => {
    // If the entire group requires a specific module, check tenant.enabledModules
    if (groupModule) {
      const allowedModules = tenant?.enabledModules;
      if (allowedModules && allowedModules.length > 0 && !allowedModules.includes(groupModule)) {
        return null;
      }
    }

    const visibleItems = items.filter((item) => {
      if (!item.enabled) return false;

      // 1. Module Feature Flag check
      if (item.module) {
        const allowedModules = tenant?.enabledModules;
        if (allowedModules && allowedModules.length > 0 && !allowedModules.includes(item.module)) {
          return false;
        }
      }

      // 2. Granular Role Permission Matrix Check (Configured by Super Admin per client)
      if (item.permission && userRole) {
        const rolePerms =
          (tenant?.rolePermissions as any)?.[userRole] ?? DEFAULT_ROLE_PERMISSIONS[userRole];
        if (rolePerms && Array.isArray(rolePerms)) {
          return rolePerms.includes(item.permission);
        }
      }

      // 3. Fallback standard role check
      if (userRole === UserRole.GYM_OWNER) return true;
      if (!item.roles || item.roles.length === 0) return false;
      return userRole ? item.roles.includes(userRole) : false;
    });

    if (visibleItems.length === 0) return null;

    return (
      <div className="space-y-1 mb-4">
        <div className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-[#9CA3AF]">
          {title}
        </div>
        {visibleItems.map((item) => {
          const isActive = location.pathname === item.path;

          return (
            <Link
              key={item.label}
              to={item.path}
              className={cn(
                'flex items-center space-x-3 px-3 py-1.5 text-xs font-medium rounded-none transition-colors',
                isActive
                  ? 'bg-[#B91C1C] text-[#FBFBF9] font-semibold'
                  : 'text-[#E5E7EB] hover:bg-[#162E52] hover:text-[#FBFBF9]',
              )}
            >
              <span>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </div>
    );
  };

  return (
    <aside className="w-64 flex-shrink-0 bg-[#0A192F] text-[#FBFBF9] flex flex-col border-r border-[#162E52] select-none">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-4 border-b border-[#162E52] space-x-3">
        <div className="h-9 w-9 flex-shrink-0 flex items-center justify-center overflow-hidden rounded-sm bg-white/10 p-0.5 border border-[#162E52]">
          {tenant?.logoUrl ? (
            <img
              src={tenant.logoUrl}
              alt={tenant.name}
              className="h-full w-full object-contain"
            />
          ) : (
            <img
              src={fitnexaLogo}
              alt="Fitnexa Logo"
              className="h-full w-full object-contain"
            />
          )}
        </div>
        <div className="flex flex-col min-w-0">
          <span className="font-bold text-sm tracking-wider uppercase text-[#FBFBF9] truncate" title={tenant?.name || 'Fitnexa'}>
            {tenant?.name || 'Fitnexa Gym'}
          </span>
          <span className="text-[10px] text-[#9CA3AF] tracking-tight uppercase">
            Gym Management CRM
          </span>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 py-4 px-3 overflow-y-auto sidebar-scroll">
        {renderNavGroup('Administration', coreNavItems)}
        {renderNavGroup('Member Operations', memberNavItems, 'MEMBERS')}
        {renderNavGroup('Billing & Finance', billingNavItems, 'BILLING')}
        {renderNavGroup('Attendance & Check-in', attendanceNavItems, 'ATTENDANCE')}
        {renderNavGroup('Biometric Terminals', deviceNavItems, 'DEVICES')}
        {renderNavGroup('Inventory & Retail POS', inventoryNavItems, 'INVENTORY')}
        {renderNavGroup('Leads CRM & Trainers', crmNavItems, 'CRM')}
        {renderNavGroup('Expenses & Notifications', operationsNavItems)}
      </div>

      {/* Footer Info */}
      <div className="p-4 border-t border-[#162E52] text-[11px] text-[#9CA3AF]">
        <div className="flex justify-between items-center">
          <span>Release</span>
          <span className="font-mono text-[10px] text-[#E5E7EB]">Phase 6 Enterprise</span>
        </div>
        <div className="flex justify-between items-center mt-1">
          <span>Analytics Engine</span>
          <span className="font-mono text-[10px] text-[#34D399]">Telemetry Active</span>
        </div>
      </div>
    </aside>
  );
}
