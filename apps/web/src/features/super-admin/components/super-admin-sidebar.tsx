import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../../context/auth-context';
import { cn } from '../../../lib/utils';
import fitnexaLogo from '../../../assets/logo.png';

interface SuperAdminNavItem {
  title: string;
  path: string;
  description: string;
  icon: React.ReactNode;
}

export function SuperAdminSidebar() {
  const location = useLocation();
  const { user, logout } = useAuth();

  const coreManagementItems: SuperAdminNavItem[] = [
    {
      title: 'SaaS Clients & Revenue',
      path: '/super-admin',
      description: 'Tenants, Subscriptions & Provisioning',
      icon: (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3v11.25A2.25 2.25 0 006 16.5h2.25M3.75 3h-1.5m1.5 0h16.5m0 0h1.5m-1.5 0v11.25A2.25 2.25 0 0118 16.5h-2.25m-7.5 0h7.5m-7.5 0l-1 3m8.5-3l1 3m0 0l.5 1.5m-.5-1.5h-9.5m0 0l-.5 1.5" />
        </svg>
      ),
    },
  ];

  const infrastructureItems: SuperAdminNavItem[] = [
    {
      title: 'System Telemetry',
      path: '/telemetry',
      description: 'Service Health, Latencies & Resources',
      icon: (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18L9 11.25l4.306 4.307a11.95 11.95 0 015.814-5.519l2.74-1.22m0 0l-5.94-2.28m5.94 2.28l-2.28 5.941" />
        </svg>
      ),
    },
    {
      title: 'Audit Trail Ledger',
      path: '/audit-logs',
      description: 'Immutable Admin Mutation Logs',
      icon: (
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
        </svg>
      ),
    },
  ];

  const renderNavGroup = (title: string, items: SuperAdminNavItem[]) => (
    <div className="space-y-1 mb-5">
      <div className="px-3 pb-1 text-[10px] font-bold uppercase tracking-wider text-[#9CA3AF]">
        {title}
      </div>
      {items.map((item) => {
        const isActive = location.pathname === item.path;
        return (
          <Link
            key={item.path}
            to={item.path}
            className={cn(
              'flex items-center space-x-3 px-3 py-2 text-xs font-semibold rounded-none transition-colors group',
              isActive
                ? 'bg-[#B91C1C] text-[#FBFBF9]'
                : 'text-[#E5E7EB] hover:bg-[#162E52] hover:text-[#FBFBF9]',
            )}
          >
            <span className={cn('shrink-0', isActive ? 'text-[#FBFBF9]' : 'text-[#9CA3AF] group-hover:text-[#FBFBF9]')}>
              {item.icon}
            </span>
            <div className="min-w-0 flex-1">
              <div className="truncate leading-tight">{item.title}</div>
              <div className={cn('text-[10px] font-normal truncate mt-0.5', isActive ? 'text-blue-100' : 'text-[#6B7280]')}>
                {item.description}
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );

  return (
    <aside className="w-64 bg-[#0A192F] text-[#FBFBF9] flex flex-col h-full border-r border-[#162E52] select-none shrink-0">
      {/* SaaS Platform Brand Header */}
      <Link
        to="/super-admin"
        className="h-16 flex items-center px-4 border-b border-[#162E52] space-x-3 bg-[#071324] hover:bg-[#0c1e38] transition-colors cursor-pointer"
        title="Trifit Platform Master Console"
      >
        <div className="h-9 w-9 rounded-none bg-[#0A192F] border border-[#162E52] p-1 flex items-center justify-center shrink-0">
          <img src={fitnexaLogo} alt="Trifit Logo" className="h-full w-full object-contain" />
        </div>
        <div className="flex flex-col min-w-0">
          <span className="font-bold text-sm tracking-wider uppercase text-[#FBFBF9] truncate">
            TRIFIT SAAS
          </span>
          <span className="text-[9px] font-mono font-bold text-[#B91C1C] tracking-widest uppercase">
            Platform Master Console
          </span>
        </div>
      </Link>

      {/* Navigation (Only Essential SaaS Platform Controls) */}
      <div className="flex-1 py-4 px-3 overflow-y-auto sidebar-scroll">
        {renderNavGroup('Platform SaaS Control', coreManagementItems)}
        {renderNavGroup('Platform Health & Audit', infrastructureItems)}
      </div>

      {/* Platform Owner Profile & Sign Out Footer */}
      <div className="p-3 border-t border-[#162E52] bg-[#071324] space-y-2">
        {user && (
          <div className="flex items-center justify-between">
            <div className="min-w-0 pr-2">
              <div className="text-xs font-bold text-[#FBFBF9] truncate">{user.fullName}</div>
              <div className="text-[10px] uppercase font-mono font-bold text-[#B91C1C]">
                SaaS Super Admin
              </div>
            </div>
            <button
              type="button"
              onClick={() => logout()}
              className="text-[10px] px-2 py-1 text-[#E5E7EB] hover:text-white bg-[#162E52] hover:bg-[#B91C1C] rounded-none font-medium transition-colors uppercase tracking-wider"
            >
              Sign Out
            </button>
          </div>
        )}
      </div>
    </aside>
  );
}


