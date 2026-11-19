import { createBrowserRouter } from 'react-router-dom';
import { AppShell } from '../components/layout/app-shell';
import { ProtectedRoute } from '../components/layout/protected-route';
import { VerificationPage } from '../features/verification/verification-page';
import { LoginPage } from '../features/auth/login-page';
import { RegisterPage } from '../features/auth/register-page';
import { SettingsPage } from '../features/tenant/settings-page';
import { StaffPage } from '../features/staff/staff-page';
import { AuditPage } from '../features/audit/audit-page';
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
    path: '/settings',
    element: (
      <ProtectedRoute allowedRoles={[UserRole.GYM_OWNER, UserRole.BRANCH_MANAGER, UserRole.SUPER_ADMIN]}>
        <AppShell>
          <SettingsPage />
        </AppShell>
      </ProtectedRoute>
    ),
  },
  {
    path: '/staff',
    element: (
      <ProtectedRoute allowedRoles={[UserRole.GYM_OWNER, UserRole.BRANCH_MANAGER, UserRole.SUPER_ADMIN]}>
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
      <AppShell>
        <div className="p-12 text-center">
          <h2 className="text-lg font-bold text-[#0A192F]">404 - Module Not Found</h2>
          <p className="text-xs text-[#6B7280] mt-1">
            The requested screen is not part of the active Phase 1 release.
          </p>
        </div>
      </AppShell>
    ),
  },
]);
