import { createBrowserRouter, Navigate } from 'react-router-dom';
import { AppShell } from '../components/layout/app-shell';
import { ProtectedRoute } from '../components/layout/protected-route';
import { ProfilePage } from '../features/auth/profile-page';
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
import { InventoryDashboardPage } from '../features/inventory/inventory-dashboard-page';
import { ProductsPage } from '../features/inventory/products-page';
import { CategoriesPage } from '../features/inventory/categories-page';
import { ProductCreatePage } from '../features/inventory/product-create-page';
import { ProductDetailPage } from '../features/inventory/product-detail-page';
import { PublicProductPage } from '../features/inventory/public-product-page';
import { StockMovementsPage } from '../features/inventory/stock-movements-page';
import { PurchasesPage } from '../features/inventory/purchases-page';
import { SuppliersPage } from '../features/inventory/suppliers-page';
import { TransfersPage } from '../features/inventory/transfers-page';
import { PosTerminalPage } from '../features/pos/pos-terminal-page';
import { PosSalesPage } from '../features/pos/pos-sales-page';
import { PosSaleDetailPage } from '../features/pos/pos-sale-detail-page';
import { TrainersPage } from '../features/trainer/trainers-page';
import { TrainerDetailPage } from '../features/trainer/trainer-detail-page';
import { TrainerSchedulePage } from '../features/trainer/trainer-schedule-page';
import { LeadsPage } from '../features/crm/leads-page';
import { LeadCreatePage } from '../features/crm/lead-create-page';
import { LeadDetailPage } from '../features/crm/lead-detail-page';
import { LeadFollowUpsPage } from '../features/crm/lead-follow-ups-page';
import { ExpensesPage } from '../features/expense/expenses-page';
import { ExpenseCreatePage } from '../features/expense/expense-create-page';
import { ExpenseCategoriesPage } from '../features/expense/expense-categories-page';
import { NotificationsPage } from '../features/notification/notifications-page';
import { NotificationSettingsPage } from '../features/notification/notification-settings-page';
import { DashboardPage } from '../features/analytics/dashboard-page';
import { MasterDashboardPage } from '../features/analytics/master-dashboard-page';
import { ReportsPage } from '../features/analytics/reports-page';
import { SuperAdminPage } from '../features/super-admin/super-admin-page';
import { LandingPage } from '../features/landing/landing-page';
import { UserRole } from '@fitnexa/shared';
import { RouteErrorBoundary } from '../components/ui/route-error-boundary';
import { useAuth } from '../context/auth-context';

function RootRoute() {
  const { user, isImpersonating, isLoading } = useAuth();

  // Subdomain detection:
  // e.g. tristara.trifit.space vs trifit.space / localhost
  const hostname = window.location.hostname;
  const isTenantSubdomain =
    hostname.includes('.') &&
    !hostname.startsWith('www.') &&
    hostname !== 'trifit.space' &&
    hostname !== 'localhost' &&
    !hostname.startsWith('127.0.0.1') &&
    !hostname.startsWith('189.31.38.113');

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FBFBF9]">
        <div className="w-8 h-8 border-2 border-[#0A192F] border-t-transparent animate-spin" />
      </div>
    );
  }

  // If on a tenant subdomain (e.g. tristara.trifit.space):
  if (isTenantSubdomain) {
    if (!user) {
      return <Navigate to="/login" replace />;
    }
    return (
      <ProtectedRoute>
        <AppShell>
          <DashboardPage />
        </AppShell>
      </ProtectedRoute>
    );
  }

  // If on root domain (trifit.space, localhost):
  if (user) {
    if (user.role === UserRole.SUPER_ADMIN && !isImpersonating) {
      return <Navigate to="/super-admin" replace />;
    }
    return (
      <ProtectedRoute>
        <AppShell>
          <DashboardPage />
        </AppShell>
      </ProtectedRoute>
    );
  }

  // When not logged in on root domain -> Show the World-Class Landing Page!
  return <LandingPage />;
}

export const router = createBrowserRouter([
  { path: '/profile', element: <ProtectedRoute><AppShell><ProfilePage /></AppShell></ProtectedRoute> },
  { path: '/public/products/:id', element: <PublicProductPage /> },
  {
    path: '/landing',
    element: <LandingPage />,
  },
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
    errorElement: <RouteErrorBoundary />,
    element: <RootRoute />,
  },
  {
    path: '/super-admin',
    errorElement: <RouteErrorBoundary />,
    element: (
      <ProtectedRoute allowedRoles={[UserRole.SUPER_ADMIN]}>
        <AppShell>
          <SuperAdminPage />
        </AppShell>
      </ProtectedRoute>
    ),
  },
  {
    path: '/dashboard',
    errorElement: <RouteErrorBoundary />,
    element: (<ProtectedRoute><AppShell><DashboardPage /></AppShell></ProtectedRoute>),
  },
  {
    path: '/master-dashboard',
    errorElement: <RouteErrorBoundary />,
    element: (
      <ProtectedRoute allowedRoles={[UserRole.GYM_OWNER, UserRole.SUPER_ADMIN, UserRole.BRANCH_MANAGER]}>
        <AppShell>
          <MasterDashboardPage />
        </AppShell>
      </ProtectedRoute>
    ),
  },
  {
    path: '/reports',
    errorElement: <RouteErrorBoundary />,
    element: (
      <ProtectedRoute allowedRoles={[UserRole.GYM_OWNER, UserRole.BRANCH_MANAGER, UserRole.SUPER_ADMIN]}>
        <AppShell>
          <ReportsPage />
        </AppShell>
      </ProtectedRoute>
    ),
  },
  {
    path: '/telemetry',
    element: <Navigate to="/" replace />,
  },
  {
    path: '/members',
    errorElement: <RouteErrorBoundary />,
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
    errorElement: <RouteErrorBoundary />,
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
    errorElement: <RouteErrorBoundary />,
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
    errorElement: <RouteErrorBoundary />,
    element: (
      <ProtectedRoute>
        <MemberPrintPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/plans',
    errorElement: <RouteErrorBoundary />,
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
    errorElement: <RouteErrorBoundary />,
    element: (
      <ProtectedRoute
        allowedRoles={[UserRole.GYM_OWNER, UserRole.SUPER_ADMIN]}
      >
        <AppShell>
          <ImportsPage />
        </AppShell>
      </ProtectedRoute>
    ),
  },
  {
    path: '/settings',
    errorElement: <RouteErrorBoundary />,
    element: (
      <ProtectedRoute
        allowedRoles={[UserRole.GYM_OWNER, UserRole.SUPER_ADMIN]}
      >
        <AppShell>
          <SettingsPage />
        </AppShell>
      </ProtectedRoute>
    ),
  },
  {
    path: '/staff',
    errorElement: <RouteErrorBoundary />,
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
    errorElement: <RouteErrorBoundary />,
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
    errorElement: <RouteErrorBoundary />,
    element: (
      <ProtectedRoute
        allowedRoles={[UserRole.GYM_OWNER, UserRole.BRANCH_MANAGER, UserRole.SUPER_ADMIN]}
      >
        <AppShell>
          <BillingDashboardPage />
        </AppShell>
      </ProtectedRoute>
    ),
  },
  {
    path: '/billing/invoices',
    errorElement: <RouteErrorBoundary />,
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
    errorElement: <RouteErrorBoundary />,
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
    errorElement: <RouteErrorBoundary />,
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
    errorElement: <RouteErrorBoundary />,
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
    errorElement: <RouteErrorBoundary />,
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
    errorElement: <RouteErrorBoundary />,
    element: (
      <ProtectedRoute>
        <ReceiptPrintPage />
      </ProtectedRoute>
    ),
  },
  {
    path: '/billing/cash-register',
    errorElement: <RouteErrorBoundary />,
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
    errorElement: <RouteErrorBoundary />,
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
    errorElement: <RouteErrorBoundary />,
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
    errorElement: <RouteErrorBoundary />,
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
    errorElement: <RouteErrorBoundary />,
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
    errorElement: <RouteErrorBoundary />,
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
    errorElement: <RouteErrorBoundary />,
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
    errorElement: <RouteErrorBoundary />,
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
    errorElement: <RouteErrorBoundary />,
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
    errorElement: <RouteErrorBoundary />,
    element: (
      <ProtectedRoute allowedRoles={[UserRole.GYM_OWNER, UserRole.BRANCH_MANAGER, UserRole.SUPER_ADMIN]}>
        <AppShell>
          <DevicesPage />
        </AppShell>
      </ProtectedRoute>
    ),
  },
  {
    path: '/devices/new',
    errorElement: <RouteErrorBoundary />,
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
    errorElement: <RouteErrorBoundary />,
    element: (
      <ProtectedRoute allowedRoles={[UserRole.GYM_OWNER, UserRole.BRANCH_MANAGER, UserRole.SUPER_ADMIN]}>
        <AppShell>
          <DeviceDetailPage />
        </AppShell>
      </ProtectedRoute>
    ),
  },
  {
    path: '/devices/:id/mappings',
    errorElement: <RouteErrorBoundary />,
    element: (
      <ProtectedRoute allowedRoles={[UserRole.GYM_OWNER, UserRole.BRANCH_MANAGER, UserRole.SUPER_ADMIN]}>
        <AppShell>
          <DeviceMappingsPage />
        </AppShell>
      </ProtectedRoute>
    ),
  },
  // --------------------------------------------------------------------------
  // Phase 5: Inventory, Retail POS & Logistics
  // --------------------------------------------------------------------------
  {
    path: '/inventory',
    errorElement: <RouteErrorBoundary />,
    element: (
      <ProtectedRoute allowedRoles={[UserRole.GYM_OWNER, UserRole.BRANCH_MANAGER, UserRole.SUPER_ADMIN]}>
        <AppShell>
          <InventoryDashboardPage />
        </AppShell>
      </ProtectedRoute>
    ),
  },
  {
    path: '/inventory/products',
    errorElement: <RouteErrorBoundary />,
    element: (
      <ProtectedRoute>
        <AppShell>
          <ProductsPage />
        </AppShell>
      </ProtectedRoute>
    ),
  },
  { path: '/inventory/categories', element: <ProtectedRoute allowedRoles={[UserRole.GYM_OWNER, UserRole.BRANCH_MANAGER, UserRole.SUPER_ADMIN]}><AppShell><CategoriesPage /></AppShell></ProtectedRoute> },
  {
    path: '/inventory/products/new',
    errorElement: <RouteErrorBoundary />,
    element: (
      <ProtectedRoute allowedRoles={[UserRole.GYM_OWNER, UserRole.BRANCH_MANAGER, UserRole.SUPER_ADMIN]}>
        <AppShell>
          <ProductCreatePage />
        </AppShell>
      </ProtectedRoute>
    ),
  },
  {
    path: '/inventory/products/:id',
    errorElement: <RouteErrorBoundary />,
    element: (
      <ProtectedRoute>
        <AppShell>
          <ProductDetailPage />
        </AppShell>
      </ProtectedRoute>
    ),
  },
  {
    path: '/inventory/movements',
    errorElement: <RouteErrorBoundary />,
    element: (
      <ProtectedRoute allowedRoles={[UserRole.GYM_OWNER, UserRole.BRANCH_MANAGER, UserRole.SUPER_ADMIN]}>
        <AppShell>
          <StockMovementsPage />
        </AppShell>
      </ProtectedRoute>
    ),
  },
  {
    path: '/inventory/purchases',
    errorElement: <RouteErrorBoundary />,
    element: (
      <ProtectedRoute allowedRoles={[UserRole.GYM_OWNER, UserRole.BRANCH_MANAGER, UserRole.SUPER_ADMIN]}>
        <AppShell>
          <PurchasesPage />
        </AppShell>
      </ProtectedRoute>
    ),
  },
  {
    path: '/inventory/suppliers',
    errorElement: <RouteErrorBoundary />,
    element: (
      <ProtectedRoute allowedRoles={[UserRole.GYM_OWNER, UserRole.BRANCH_MANAGER, UserRole.SUPER_ADMIN]}>
        <AppShell>
          <SuppliersPage />
        </AppShell>
      </ProtectedRoute>
    ),
  },
  {
    path: '/inventory/transfers',
    errorElement: <RouteErrorBoundary />,
    element: (
      <ProtectedRoute allowedRoles={[UserRole.GYM_OWNER, UserRole.BRANCH_MANAGER, UserRole.SUPER_ADMIN]}>
        <AppShell>
          <TransfersPage />
        </AppShell>
      </ProtectedRoute>
    ),
  },
  {
    path: '/pos',
    errorElement: <RouteErrorBoundary />,
    element: (
      <ProtectedRoute>
        <AppShell>
          <PosTerminalPage />
        </AppShell>
      </ProtectedRoute>
    ),
  },
  {
    path: '/pos/sales',
    errorElement: <RouteErrorBoundary />,
    element: (
      <ProtectedRoute>
        <AppShell>
          <PosSalesPage />
        </AppShell>
      </ProtectedRoute>
    ),
  },
  {
    path: '/pos/sales/:id',
    errorElement: <RouteErrorBoundary />,
    element: (
      <ProtectedRoute>
        <AppShell>
          <PosSaleDetailPage />
        </AppShell>
      </ProtectedRoute>
    ),
  },

  // --------------------------------------------------------------------------
  // Phase 5: Trainer & PT Management
  // --------------------------------------------------------------------------
  {
    path: '/trainers',
    errorElement: <RouteErrorBoundary />,
    element: (
      <ProtectedRoute>
        <AppShell>
          <TrainersPage />
        </AppShell>
      </ProtectedRoute>
    ),
  },
  {
    path: '/trainers/schedule',
    errorElement: <RouteErrorBoundary />,
    element: (
      <ProtectedRoute>
        <AppShell>
          <TrainerSchedulePage />
        </AppShell>
      </ProtectedRoute>
    ),
  },
  {
    path: '/trainers/:id',
    errorElement: <RouteErrorBoundary />,
    element: (
      <ProtectedRoute>
        <AppShell>
          <TrainerDetailPage />
        </AppShell>
      </ProtectedRoute>
    ),
  },

  // --------------------------------------------------------------------------
  // Phase 5: Lead CRM & Follow-Ups
  // --------------------------------------------------------------------------
  {
    path: '/leads',
    errorElement: <RouteErrorBoundary />,
    element: (
      <ProtectedRoute>
        <AppShell>
          <LeadsPage />
        </AppShell>
      </ProtectedRoute>
    ),
  },
  {
    path: '/leads/new',
    errorElement: <RouteErrorBoundary />,
    element: (
      <ProtectedRoute>
        <AppShell>
          <LeadCreatePage />
        </AppShell>
      </ProtectedRoute>
    ),
  },
  {
    path: '/leads/follow-ups',
    errorElement: <RouteErrorBoundary />,
    element: (
      <ProtectedRoute>
        <AppShell>
          <LeadFollowUpsPage />
        </AppShell>
      </ProtectedRoute>
    ),
  },
  {
    path: '/leads/:id',
    errorElement: <RouteErrorBoundary />,
    element: (
      <ProtectedRoute>
        <AppShell>
          <LeadDetailPage />
        </AppShell>
      </ProtectedRoute>
    ),
  },

  // --------------------------------------------------------------------------
  // Phase 5: Expenses & Operational Outflows
  // --------------------------------------------------------------------------
  {
    path: '/expenses',
    errorElement: <RouteErrorBoundary />,
    element: (
      <ProtectedRoute
        allowedRoles={[UserRole.GYM_OWNER, UserRole.BRANCH_MANAGER, UserRole.SUPER_ADMIN]}
      >
        <AppShell>
          <ExpensesPage />
        </AppShell>
      </ProtectedRoute>
    ),
  },
  {
    path: '/expenses/new',
    errorElement: <RouteErrorBoundary />,
    element: (
      <ProtectedRoute
        allowedRoles={[UserRole.GYM_OWNER, UserRole.BRANCH_MANAGER, UserRole.SUPER_ADMIN]}
      >
        <AppShell>
          <ExpenseCreatePage />
        </AppShell>
      </ProtectedRoute>
    ),
  },
  {
    path: '/expenses/categories',
    errorElement: <RouteErrorBoundary />,
    element: (
      <ProtectedRoute
        allowedRoles={[UserRole.GYM_OWNER, UserRole.BRANCH_MANAGER, UserRole.SUPER_ADMIN]}
      >
        <AppShell>
          <ExpenseCategoriesPage />
        </AppShell>
      </ProtectedRoute>
    ),
  },

  // --------------------------------------------------------------------------
  // Phase 5: Notifications & Alerts
  // --------------------------------------------------------------------------
  {
    path: '/notifications',
    errorElement: <RouteErrorBoundary />,
    element: (
      <ProtectedRoute>
        <AppShell>
          <NotificationsPage />
        </AppShell>
      </ProtectedRoute>
    ),
  },
  {
    path: '/notifications/settings',
    errorElement: <RouteErrorBoundary />,
    element: (
      <ProtectedRoute>
        <AppShell>
          <NotificationSettingsPage />
        </AppShell>
      </ProtectedRoute>
    ),
  },
  {
    path: '*',
    errorElement: <RouteErrorBoundary />,
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


