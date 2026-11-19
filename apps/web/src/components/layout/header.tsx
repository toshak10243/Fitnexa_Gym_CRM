import * as React from 'react';
import { useAuth } from '../../context/auth-context';
import { Button } from '../ui/button';

interface HeaderProps {
  status?: 'ok' | 'error' | 'degraded';
}

export function Header({ status = 'ok' }: HeaderProps) {
  const { user, tenant, logout } = useAuth();
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

  return (
    <header className="h-16 bg-[#FBFBF9] border-b border-[#E5E7EB] px-8 flex items-center justify-between select-none">
      <div className="flex items-center space-x-4">
        <div>
          <span className="text-sm font-semibold text-[#0A192F] tracking-wide uppercase">
            {tenant?.name || 'Fitnexa Console'}
          </span>
          {tenant?.city && (
            <span className="text-xs text-[#6B7280] ml-2">
              ({tenant.city}, {tenant.state})
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center space-x-6">
        <div className="flex items-center space-x-2">
          <div
            className={`h-2.5 w-2.5 rounded-full ${
              status === 'ok'
                ? 'bg-[#10B981]'
                : status === 'degraded'
                ? 'bg-[#F59E0B]'
                : 'bg-[#B91C1C]'
            }`}
          />
          <span className="text-xs font-medium text-[#374151]">
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
              className="h-8 text-xs border-[#E5E7EB] hover:bg-[#B91C1C] hover:text-[#FBFBF9] hover:border-[#B91C1C]"
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
