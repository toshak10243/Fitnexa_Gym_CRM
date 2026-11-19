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
