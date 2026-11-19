import * as React from 'react';

interface HeaderProps {
  status?: 'ok' | 'error' | 'degraded';
}

export function Header({ status = 'ok' }: HeaderProps) {
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
        <h1 className="text-sm font-semibold text-[#0A192F] tracking-wide uppercase">
          Fitnexa Infrastructure Console
        </h1>
        <span className="text-xs px-2 py-0.5 border border-[#D1D5DB] bg-[#F5F5F0] text-[#374151] font-mono rounded-sm">
          Phase 0 Foundation
        </span>
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
            {status === 'ok'
              ? 'Backend Online'
              : status === 'degraded'
              ? 'Degraded (Redis Optional)'
              : 'Service Unavailable'}
          </span>
        </div>

        <div className="h-4 w-px bg-[#E5E7EB]" />

        <div className="text-xs font-mono text-[#6B7280]">{time}</div>

        <div className="h-4 w-px bg-[#E5E7EB]" />

        <a
          href="http://localhost:3000/api/docs"
          target="_blank"
          rel="noreferrer"
          className="text-xs font-medium text-[#0A192F] hover:text-[#B91C1C] underline-offset-4 hover:underline"
        >
          API Swagger
        </a>
      </div>
    </header>
  );
}
