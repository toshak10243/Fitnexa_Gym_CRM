import { Link, useLocation } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { useAuth } from '../../context/auth-context';

export function Sidebar() {
  const location = useLocation();
  const { tenant } = useAuth();

  const coreNavItems = [
    {
      label: 'System Telemetry',
      path: '/',
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
      label: 'Gym & Facilities',
      path: '/settings',
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
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
          <polyline points="9 22 9 12 15 12 15 22" />
        </svg>
      ),
    },
    {
      label: 'Staff & Roles',
      path: '/staff',
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

  const futureNavItems = [
    {
      label: 'Biometrics & Access',
      path: '#',
      enabled: false,
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
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
      ),
    },
  ];

  const renderNavGroup = (title: string, items: typeof coreNavItems) => (
    <div className="space-y-1 mb-4">
      <div className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-[#9CA3AF]">
        {title}
      </div>
      {items.map((item) => {
        const isActive = location.pathname === item.path;

        if (!item.enabled) {
          return (
            <div
              key={item.label}
              className="flex items-center justify-between px-3 py-1.5 text-xs text-[#6B7280] cursor-not-allowed rounded-none"
            >
              <div className="flex items-center space-x-3">
                <span className="text-[#4B5563]">{item.icon}</span>
                <span>{item.label}</span>
              </div>
              <span className="text-[9px] px-1.5 py-0.2 uppercase tracking-wider bg-[#162E52] text-[#9CA3AF] rounded-none font-medium">
                Soon
              </span>
            </div>
          );
        }

        return (
          <Link
            key={item.label}
            to={item.path}
            className={cn(
              'flex items-center space-x-3 px-3 py-1.5 text-xs font-medium rounded-none transition-colors',
              isActive
                ? 'bg-[#B91C1C] text-[#FBFBF9]'
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

  return (
    <aside className="w-64 flex-shrink-0 bg-[#0A192F] text-[#FBFBF9] flex flex-col border-r border-[#162E52] select-none">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-6 border-b border-[#162E52] space-x-3">
        <div className="h-7 w-7 bg-[#B91C1C] flex items-center justify-center font-bold text-xs tracking-widest text-[#FBFBF9] rounded-none">
          FX
        </div>
        <div className="flex flex-col min-w-0">
          <span className="font-bold text-sm tracking-wider uppercase text-[#FBFBF9] truncate">
            {tenant?.name || 'Fitnexa'}
          </span>
          <span className="text-[10px] text-[#9CA3AF] tracking-tight uppercase">
            Gym Management CRM
          </span>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 py-4 px-3 overflow-y-auto">
        {renderNavGroup('Administration', coreNavItems)}
        {renderNavGroup('Member Operations', memberNavItems)}
        {renderNavGroup('Billing & Finance', billingNavItems)}
        {renderNavGroup('Hardware & Access', futureNavItems)}
      </div>

      {/* Footer Info */}
      <div className="p-4 border-t border-[#162E52] text-[11px] text-[#9CA3AF]">
        <div className="flex justify-between items-center">
          <span>Release</span>
          <span className="font-mono text-[10px] text-[#E5E7EB]">Phase 3 Financial</span>
        </div>
        <div className="flex justify-between items-center mt-1">
          <span>Ledger & Security</span>
          <span className="font-mono text-[10px] text-[#34D399]">Audit Ledger Active</span>
        </div>
      </div>
    </aside>
  );
}
