import * as React from 'react';
import { cn } from '../../lib/utils';

export interface EmptyStateProps {
  title: string;
  description: string;
  action?: React.ReactNode;
  className?: string;
}

export function EmptyState({
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        'flex min-h-[220px] flex-col items-center justify-center border border-dashed border-[#D1D5DB] bg-[#F8F8F6] p-8 text-center rounded-sm',
        className,
      )}
    >
      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-sm bg-[#EFEFEA] text-[#0A192F]">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <rect x="2" y="3" width="20" height="14" rx="1" />
          <line x1="8" y1="21" x2="16" y2="21" />
          <line x1="12" y1="17" x2="12" y2="21" />
        </svg>
      </div>
      <h3 className="mt-3 text-sm font-semibold text-[#0A192F]">{title}</h3>
      <p className="mt-1 text-xs text-[#6B7280] max-w-sm">{description}</p>
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
