import { Link, useLocation } from 'react-router-dom';
import { cn } from '../../lib/utils';

export function Sidebar() {
  const location = useLocation();

  const navItems = [
    {
      label: 'System Verification',
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
      label: 'Members (Phase 1)',
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
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
        </svg>
      ),
    },
    {
      label: 'Memberships (Phase 2)',
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
          <rect x="2" y="5" width="20" height="14" rx="1" />
          <line x1="2" y1="10" x2="22" y2="10" />
        </svg>
      ),
    },
    {
      label: 'Attendance & Biometrics',
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
          <polyline points="12 6 12 12 16 14" />
        </svg>
      ),
    },
  ];

  return (
    <aside className="w-64 flex-shrink-0 bg-[#0A192F] text-[#FBFBF9] flex flex-col border-r border-[#162E52] select-none">
      {/* Brand Header */}
      <div className="h-16 flex items-center px-6 border-b border-[#162E52] space-x-3">
        <div className="h-7 w-7 bg-[#B91C1C] flex items-center justify-center font-bold text-xs tracking-widest text-[#FBFBF9] rounded-sm">
          FX
        </div>
        <div className="flex flex-col">
          <span className="font-bold text-sm tracking-wider uppercase text-[#FBFBF9]">
            Fitnexa
          </span>
          <span className="text-[10px] text-[#9CA3AF] tracking-tight uppercase">
            Gym Management CRM
          </span>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 py-4 px-3 space-y-1">
        <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-[#9CA3AF]">
          Core Navigation
        </div>
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;

          if (!item.enabled) {
            return (
              <div
                key={item.label}
                className="flex items-center justify-between px-3 py-2 text-xs text-[#6B7280] cursor-not-allowed rounded-sm"
              >
                <div className="flex items-center space-x-3">
                  <span className="text-[#4B5563]">{item.icon}</span>
                  <span>{item.label}</span>
                </div>
                <span className="text-[9px] px-1.5 py-0.5 uppercase tracking-wider bg-[#162E52] text-[#9CA3AF] rounded-sm font-medium">
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
                'flex items-center space-x-3 px-3 py-2 text-xs font-medium rounded-sm transition-colors',
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

      {/* Footer Info */}
      <div className="p-4 border-t border-[#162E52] text-[11px] text-[#9CA3AF]">
        <div className="flex justify-between items-center">
          <span>Release</span>
          <span className="font-mono text-[10px] text-[#E5E7EB]">v0.1.0-alpha</span>
        </div>
        <div className="flex justify-between items-center mt-1">
          <span>Environment</span>
          <span className="font-mono text-[10px] text-[#34D399]">Development</span>
        </div>
      </div>
    </aside>
  );
}
