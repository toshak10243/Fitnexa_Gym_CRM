import React from 'react';
import { Sidebar } from './sidebar';

interface AppShellProps {
  children: React.ReactNode;
  status?: 'ok' | 'error' | 'degraded';
}

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#FBFBF9] text-[#111827]">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <main className="flex-1 overflow-y-auto p-8 bg-[#FBFBF9]">
          <div className="max-w-7xl mx-auto space-y-6">{children}</div>
        </main>
      </div>
    </div>
  );
}
