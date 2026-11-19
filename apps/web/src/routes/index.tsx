import { createBrowserRouter } from 'react-router-dom';
import { AppShell } from '../components/layout/app-shell';
import { ProtectedRoute } from '../components/layout/protected-route';
import { VerificationPage } from '../features/verification/verification-page';
import { LoginPage } from '../features/auth/login-page';
import { RegisterPage } from '../features/auth/register-page';
import { SettingsPage } from '../features/tenant/settings-page';
import { StaffPage } from '../features/staff/staff-page';
import { AuditPage } from '../features/audit/audit-page';
import { MemberListPage } from '../features/member/member-list-page';
import { MemberRegistrationPage } from '../features/member/member-registration-page';
import { MemberProfilePage } from '../features/member/member-profile-page';
import { MemberPrintPage } from '../features/member/member-print-page';
import { PlansPage } from '../features/plan/plans-page';
import { ImportsPage } from '../features/import/imports-page';
import { BillingDashboardPage } from '../features/billing/billing-dashboard-page';
import { InvoicesPage } from '../features/billing/invoices-page';
import { InvoiceCreatePage } from '../features/billing/invoice-create-page';
import { InvoiceDetailPage } from '../features/billing/invoice-detail-page';
import { PaymentsPage } from '../features/billing/payments-page';
import { DuesPage } from '../features/billing/dues-page';
import { ReceiptPrintPage } from '../features/billing/receipt-print-page';
import { CashRegisterPage } from '../features/billing/cash-register-page';
import { RefundsPage } from '../features/billing/refunds-page';
import { AttendanceDashboardPage } from '../features/attendance/attendance-dashboard-page';
import { CheckInPage } from '../features/attendance/check-in-page';
import { ActiveSessionsPage } from '../features/attendance/active-sessions-page';
import { AttendanceHistoryPage } from '../features/attendance/attendance-history-page';
import { AttendanceCorrectionsPage } from '../features/attendance/attendance-corrections-page';
import { AttendancePoliciesPage } from '../features/attendance/attendance-policies-page';
import { StaffAttendancePage } from '../features/attendance/staff-attendance-page';
import { DevicesPage } from '../features/device/devices-page';
import { DeviceCreatePage } from '../features/device/device-create-page';
import { DeviceDetailPage } from '../features/device/device-detail-page';
import { DeviceMappingsPage } from '../features/device/device-mappings-page';
import { UserRole } from '@fitnexa/shared';

export const router = createBrowserRouter([
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/register',
    element: <RegisterPage />,
  },
  {
    path: '/',
    element: (
      <ProtectedRoute>
        <AppShell>
          <VerificationPage />
        </AppShell>
      </ProtectedRoute>
    ),
  },
  {
    path: '/members',
    element: (
      <ProtectedRoute>
        <AppShell>
          <MemberListPage />
        </AppShell>
      </ProtectedRoute>
    ),
  },
  {
    path: '/members/new',
    element: (
      <ProtectedRoute
        allowedRoles={[
          UserRole.GYM_OWNER,
          UserRole.BRANCH_MANAGER,
          UserRole.FRONT_DESK,
          UserRole.SUPER_ADMIN,
        ]}
      >
        <AppShell>
          <MemberRegistrationPage />
        </AppShell>
      </ProtectedRoute>
    ),
  },
  {
    path: '/members/:id',
    element: (
      <ProtectedRoute>
        <AppShell>
          <MemberProfilePage />
        </AppShell>
      </ProtectedRoute>
    ),
  },
  {
    path: '/members/:id/print',
    element: (
      <ProtectedRoute>
        <MemberPrintPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/plans',
    element: (
      <ProtectedRoute>
        <AppShell>
          <PlansPage />
        </AppShell>
      </ProtectedRoute>
    ),
  },
  {
    path: '/imports',
    element: (
      <ProtectedRoute
        allowedRoles={[UserRole.GYM_OWNER, UserRole.BRANCH_MANAGER, UserRole.SUPER_ADMIN]}
      >
        <AppShell>
          <ImportsPage />
        </AppShell>
      </ProtectedRoute>
    ),
  },
  {
    path: '/settings',
    element: (
      <ProtectedRoute
        allowedRoles={[UserRole.GYM_OWNER, UserRole.BRANCH_MANAGER, UserRole.SUPER_ADMIN]}
      >
        <AppShell>
          <SettingsPage />
        </AppShell>
      </ProtectedRoute>
    ),
  },
  {
    path: '/staff',
    element: (
      <ProtectedRoute
        allowedRoles={[UserRole.GYM_OWNER, UserRole.BRANCH_MANAGER, UserRole.SUPER_ADMIN]}
      >
        <AppShell>
          <StaffPage />
        </AppShell>
      </ProtectedRoute>
    ),
  },
  {
    path: '/audit-logs',
    element: (
      <ProtectedRoute allowedRoles={[UserRole.GYM_OWNER, UserRole.SUPER_ADMIN]}>
        <AppShell>
          <AuditPage />
        </AppShell>
      </ProtectedRoute>
    ),
  },
  {
    path: '/billing',
    element: (
      <ProtectedRoute>
        <AppShell>
          <BillingDashboardPage />
        </AppShell>
      </ProtectedRoute>
    ),
  },
  {
    path: '/billing/invoices',
    element: (
      <ProtectedRoute>
        <AppShell>
          <InvoicesPage />
        </AppShell>
      </ProtectedRoute>
    ),
  },
  {
    path: '/billing/invoices/new',
    element: (
      <ProtectedRoute
        allowedRoles={[
          UserRole.GYM_OWNER,
          UserRole.BRANCH_MANAGER,
          UserRole.FRONT_DESK,
          UserRole.SUPER_ADMIN,
        ]}
      >
        <AppShell>
          <InvoiceCreatePage />
        </AppShell>
      </ProtectedRoute>
    ),
  },
  {
    path: '/billing/invoices/:id',
    element: (
      <ProtectedRoute>
        <AppShell>
          <InvoiceDetailPage />
        </AppShell>
      </ProtectedRoute>
    ),
  },
  {
    path: '/billing/payments',
    element: (
      <ProtectedRoute>
        <AppShell>
          <PaymentsPage />
        </AppShell>
      </ProtectedRoute>
    ),
  },
  {
    path: '/billing/dues',
    element: (
      <ProtectedRoute>
        <AppShell>
          <DuesPage />
        </AppShell>
      </ProtectedRoute>
    ),
  },
  {
    path: '/billing/receipts/:id',
    element: (
      <ProtectedRoute>
        <ReceiptPrintPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/billing/cash-register',
    element: (
      <ProtectedRoute
        allowedRoles={[
          UserRole.GYM_OWNER,
          UserRole.BRANCH_MANAGER,
          UserRole.FRONT_DESK,
          UserRole.SUPER_ADMIN,
        ]}
      >
        <AppShell>
          <CashRegisterPage />
        </AppShell>
      </ProtectedRoute>
    ),
  },
  {
    path: '/billing/refunds',
    element: (
      <ProtectedRoute
        allowedRoles={[
          UserRole.GYM_OWNER,
          UserRole.BRANCH_MANAGER,
          UserRole.FRONT_DESK,
          UserRole.SUPER_ADMIN,
        ]}
      >
        <AppShell>
          <RefundsPage />
        </AppShell>
      </ProtectedRoute>
    ),
  },
  {
    path: '/attendance',
    element: (
      <ProtectedRoute>
        <AppShell>
          <AttendanceDashboardPage />
        </AppShell>
      </ProtectedRoute>
    ),
  },
  {
    path: '/attendance/check-in',
    element: (
      <ProtectedRoute>
        <AppShell>
          <CheckInPage />
        </AppShell>
      </ProtectedRoute>
    ),
  },
  {
    path: '/attendance/active',
    element: (
      <ProtectedRoute>
        <AppShell>
          <ActiveSessionsPage />
        </AppShell>
      </ProtectedRoute>
    ),
  },
  {
    path: '/attendance/history',
    element: (
      <ProtectedRoute>
        <AppShell>
          <AttendanceHistoryPage />
        </AppShell>
      </ProtectedRoute>
    ),
  },
  {
    path: '/attendance/corrections',
    element: (
      <ProtectedRoute>
        <AppShell>
          <AttendanceCorrectionsPage />
        </AppShell>
      </ProtectedRoute>
    ),
  },
  {
    path: '/attendance/policies',
    element: (
      <ProtectedRoute
        allowedRoles={[
          UserRole.GYM_OWNER,
          UserRole.BRANCH_MANAGER,
          UserRole.SUPER_ADMIN,
        ]}
      >
        <AppShell>
          <AttendancePoliciesPage />
        </AppShell>
      </ProtectedRoute>
    ),
  },
  {
    path: '/staff-attendance',
    element: (
      <ProtectedRoute>
        <AppShell>
          <StaffAttendancePage />
        </AppShell>
      </ProtectedRoute>
    ),
  },
  {
    path: '/devices',
    element: (
      <ProtectedRoute>
        <AppShell>
          <DevicesPage />
        </AppShell>
      </ProtectedRoute>
    ),
  },
  {
    path: '/devices/new',
    element: (
      <ProtectedRoute
        allowedRoles={[
          UserRole.GYM_OWNER,
          UserRole.BRANCH_MANAGER,
          UserRole.SUPER_ADMIN,
        ]}
      >
        <AppShell>
          <DeviceCreatePage />
        </AppShell>
      </ProtectedRoute>
    ),
  },
  {
    path: '/devices/:id',
    element: (
      <ProtectedRoute>
        <AppShell>
          <DeviceDetailPage />
        </AppShell>
      </ProtectedRoute>
    ),
  },
  {
    path: '/devices/:id/mappings',
    element: (
      <ProtectedRoute>
        <AppShell>
          <DeviceMappingsPage />
        </AppShell>
      </ProtectedRoute>
    ),
  },
  {
    path: '*',
    element: (
      <ProtectedRoute>
        <AppShell>
          <div className="p-8 text-center text-xs text-[#6B7280]">
            Requested page does not exist.
          </div>
        </AppShell>
      </ProtectedRoute>
    ),
  },
]);
