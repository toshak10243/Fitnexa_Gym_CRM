import * as React from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../../context/auth-context';
import { Button } from '../ui/button';

interface HeaderProps {
  status?: 'ok' | 'error' | 'degraded';
}

export function Header({ status = 'ok' }: HeaderProps) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [time, setTime] = React.useState<string>('');

  React.useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(
        now.toLocaleTimeString('en-IN', {
          timeZone: 'Asia/Kolkata',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          hour12: false,
        }) + ' IST',
      );
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const getPageTitle = (path: string): string => {
    if (path === '/' || path === '/dashboard') return 'Executive Dashboard';
    if (path.startsWith('/reports')) return 'Analytics & Reports';
    if (path.startsWith('/telemetry')) return 'System Telemetry';
    if (path.startsWith('/settings')) return 'Gym & Facilities';
    if (path.startsWith('/staff')) return 'Staff & Roles';
    if (path.startsWith('/audit-logs')) return 'Audit Trail';
    if (path === '/members/new') return 'New Member Registration';
    if (path.startsWith('/members')) return 'Member Directory';
    if (path.startsWith('/plans')) return 'Membership Plans';
    if (path.startsWith('/imports')) return 'Data Migration';
    if (path.startsWith('/billing/invoices')) return 'Tax Invoices';
    if (path.startsWith('/billing/payments')) return 'Collections & Payments';
    if (path.startsWith('/billing/dues')) return 'Dues & Aging Ledger';
    if (path.startsWith('/billing/cash-register')) return 'Cash Register Drawer';
    if (path.startsWith('/billing/refunds')) return 'Refunds & Adjustments';
    if (path.startsWith('/billing')) return 'Billing Overview';
    if (path.startsWith('/attendance/check-in')) return 'Front-Desk Check-In';
    if (path.startsWith('/attendance/active')) return 'Active Gym Floor';
    if (path.startsWith('/attendance/history')) return 'Attendance History';
    if (path.startsWith('/attendance/policies')) return 'Access Control Policies';
    if (path.startsWith('/attendance/corrections')) return 'Attendance Corrections';
    if (path.startsWith('/attendance')) return 'Attendance Telemetry';
    if (path.startsWith('/devices')) return 'Biometric Terminals';
    if (path.startsWith('/inventory/products')) return 'Retail Catalog';
    if (path.startsWith('/inventory/movements')) return 'Stock Movements';
    if (path.startsWith('/inventory/purchases')) return 'Purchase Orders';
    if (path.startsWith('/inventory/suppliers')) return 'Suppliers Directory';
    if (path.startsWith('/inventory')) return 'Inventory Overview';
    if (path.startsWith('/pos/sales')) return 'POS Sales Register';
    if (path.startsWith('/pos')) return 'Retail POS Counter';
    if (path.startsWith('/leads/follow-ups')) return 'CRM Follow-Ups';
    if (path.startsWith('/leads')) return 'Leads Pipeline';
    if (path.startsWith('/trainers/schedule')) return 'PT Session Schedule';
    if (path.startsWith('/trainers')) return 'Trainer Profiles';
    if (path.startsWith('/expenses')) return 'Expense Ledger';
    if (path.startsWith('/notifications')) return 'Notifications & Alerts';
    return 'Management Console';
  };

  return (
    <header className="h-14 bg-[#FBFBF9] border-b border-[#E5E7EB] px-6 flex items-center justify-between select-none">
      {/* Clean Dynamic Context Breadcrumb */}
      <div className="flex items-center space-x-2 text-xs">
        <span className="text-[#6B7280] font-medium">Console</span>
        <span className="text-[#9CA3AF]">/</span>
        <span className="text-[#0A192F] font-bold tracking-wider uppercase text-xs">
          {getPageTitle(location.pathname)}
        </span>
      </div>

      {/* Right Controls: Telemetry, Clock, User Profile */}
      <div className="flex items-center space-x-5">
        <div className="flex items-center space-x-2">
          <div
            className={`h-2 w-2 rounded-full ${
              status === 'ok'
                ? 'bg-[#10B981]'
                : status === 'degraded'
                ? 'bg-[#F59E0B]'
                : 'bg-[#B91C1C]'
            }`}
          />
          <span className="text-xs font-medium text-[#4B5563]">
            {status === 'ok' ? 'All Systems Operational' : 'Degraded Mode'}
          </span>
        </div>

        <div className="h-4 w-px bg-[#E5E7EB]" />

        <div className="text-xs font-mono text-[#6B7280]">{time}</div>

        <div className="h-4 w-px bg-[#E5E7EB]" />

        {/* User Account / Role & Sign Out */}
        {user ? (
          <div className="flex items-center space-x-3">
            <div className="text-right">
              <div className="text-xs font-bold text-[#0A192F]">{user.fullName}</div>
              <div className="text-[10px] uppercase font-mono font-bold text-[#B91C1C]">
                {user.role.replace('_', ' ')}
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-7 text-xs border-[#E5E7EB] hover:bg-[#B91C1C] hover:text-[#FBFBF9] hover:border-[#B91C1C] rounded-none px-3"
              onClick={() => logout()}
            >
              Sign Out
            </Button>
          </div>
        ) : (
          <a
            href="/login"
            className="text-xs font-medium text-[#0A192F] hover:text-[#B91C1C]"
          >
            Sign In
          </a>
        )}
      </div>
    </header>
  );
}
