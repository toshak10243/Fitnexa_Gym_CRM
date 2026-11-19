import * as React from 'react';
import { cn } from '../../lib/utils';

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'outline' | 'ghost';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant = 'primary',
      size = 'md',
      isLoading = false,
      disabled,
      children,
      ...props
    },
    ref,
  ) => {
    const baseStyles =
      'inline-flex items-center justify-center font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 disabled:opacity-50 disabled:cursor-not-allowed select-none rounded-sm';

    const variants = {
      primary:
        'bg-[#0A192F] text-[#FBFBF9] hover:bg-[#162E52] active:bg-[#060E1A] focus-visible:outline-[#0A192F]',
      secondary:
        'bg-[#F5F5F0] text-[#111827] border border-[#E5E7EB] hover:bg-[#EFEFEA] active:bg-[#E5E7EB] focus-visible:outline-[#111827]',
      danger:
        'bg-[#B91C1C] text-[#FBFBF9] hover:bg-[#991B1B] active:bg-[#7F1D1D] focus-visible:outline-[#B91C1C]',
      outline:
        'border border-[#0A192F] text-[#0A192F] bg-transparent hover:bg-[#0A192F]/5 active:bg-[#0A192F]/10 focus-visible:outline-[#0A192F]',
      ghost:
        'text-[#374151] hover:bg-[#F5F5F0] active:bg-[#EFEFEA] focus-visible:outline-[#0A192F]',
    };

    const sizes = {
      sm: 'h-8 px-3 text-xs',
      md: 'h-10 px-4 text-sm',
      lg: 'h-11 px-6 text-base',
    };

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={cn(baseStyles, variants[variant], sizes[size], className)}
        {...props}
      >
        {isLoading && (
          <svg
            className="animate-spin -ml-1 mr-2 h-4 w-4"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
        )}
        {children}
      </button>
    );
  },
);

Button.displayName = 'Button';
