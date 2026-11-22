import * as React from 'react';
import { cn } from '../../lib/utils';

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = 'text', label, error, helperText, id, ...props }, ref) => {
    const generatedId = React.useId();
    const inputId = id || generatedId;

    return (
      <div className="w-full space-y-1.5">
        {label && (
          <label
            htmlFor={inputId}
            className="block text-xs font-semibold uppercase tracking-wider text-[#374151]"
          >
            {label}
          </label>
        )}
        <input
          id={inputId}
          type={type}
          ref={ref}
          className={cn(
            'flex h-10 w-full rounded-sm border border-[#D1D5DB] bg-[#FBFBF9] px-3 py-2 text-sm text-[#111827] placeholder:text-[#9CA3AF]',
            'focus:border-[#0A192F] focus:outline-none focus:ring-1 focus:ring-[#0A192F]',
            'disabled:cursor-not-allowed disabled:bg-[#EFEFEA] disabled:text-[#6B7280]',
            error && 'border-[#B91C1C] focus:border-[#B91C1C] focus:ring-[#B91C1C]',
            className,
          )}
          {...props}
        />
        {error && <p className="text-xs text-[#B91C1C] font-medium">{error}</p>}
        {helperText && !error && (
          <p className="text-xs text-[#6B7280]">{helperText}</p>
        )}
      </div>
    );
  },
);

Input.displayName = 'Input';


