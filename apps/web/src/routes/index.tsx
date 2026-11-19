import { createBrowserRouter } from 'react-router-dom';
import { AppShell } from '../components/layout/app-shell';
import { VerificationPage } from '../features/verification/verification-page';

export const router = createBrowserRouter([
  {
    path: '/',
    element: (
      <AppShell>
        <VerificationPage />
      </AppShell>
    ),
  },
  {
    path: '*',
    element: (
      <AppShell>
        <div className="p-12 text-center">
          <h2 className="text-lg font-bold text-[#0A192F]">404 — Page Not Found</h2>
          <p className="text-xs text-[#6B7280] mt-1">
            The requested module does not exist in the Phase 0 foundation.
          </p>
        </div>
      </AppShell>
    ),
  },
]);
