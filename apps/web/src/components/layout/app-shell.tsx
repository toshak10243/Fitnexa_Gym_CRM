import React from 'react';
import { Sidebar } from './sidebar';
import { SuperAdminSidebar } from '../../features/super-admin/components/super-admin-sidebar';
import { Header } from './header';
import { useAuth } from '../../context/auth-context';
import { UserRole } from '@fitnexa/shared';
import { Link, useLocation } from 'react-router-dom';

interface AppShellProps {
  children: React.ReactNode;
  status?: 'ok' | 'error' | 'degraded';
}

export function AppShell({ children, status }: AppShellProps) {
  const location = useLocation();
  const { user, isImpersonating, tenant, stopImpersonating } = useAuth();
  const isSuperAdminPlatform = user?.role === UserRole.SUPER_ADMIN && !isImpersonating;

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#FBFBF9] text-[#111827]">
      {/* Impersonation Active Banner */}
      {isImpersonating && (
        <div className="fixed top-0 left-0 right-0 z-[9999] bg-[#B91C1C] text-[#FBFBF9] text-xs font-semibold px-4 py-1.5 flex items-center justify-between print:hidden">
          <div className="flex items-center space-x-2">
            <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
            <span>
              IMPERSONATION ACTIVE: You are viewing the console as client{' '}
              <strong>{tenant?.name}</strong> ({tenant?.slug})
            </span>
          </div>
          <button
            onClick={() => stopImpersonating()}
            className="px-2.5 py-0.5 bg-black/40 hover:bg-black/60 text-[#FBFBF9] rounded-none uppercase text-[10px] font-bold tracking-wider"
          >
            Exit Impersonation & Return to SaaS Console
          </button>
        </div>
      )}

      {/* Dedicated Super Admin Sidebar vs Gym CRM Sidebar (hidden in print) */}
      <div className="print:hidden">
        {isSuperAdminPlatform ? <SuperAdminSidebar /> : <Sidebar />}
      </div>
      
      <div className={`flex-1 flex flex-col min-w-0 overflow-hidden print:overflow-visible print:h-auto print:w-full ${isImpersonating ? 'pt-8' : ''}`}>
        <div className="print:hidden">
          <Header status={status} />
        </div>
        <main className="flex-1 overflow-y-auto p-8 bg-[#FBFBF9] print:p-0 print:m-0 print:overflow-visible print:bg-white print:w-full">
          <div className="max-w-7xl mx-auto space-y-6 print:max-w-none print:w-full print:m-0 print:p-0">
            {location.pathname === '/settings' && <div className="border border-[#E5E7EB] p-4 flex flex-wrap items-center justify-between gap-3"><span className="font-semibold">My Profile & Account Security</span><Link to="/profile" className="border border-[#E5E7EB] px-4 py-2 text-sm focus-visible:outline-2">Change Password</Link></div>}
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}


