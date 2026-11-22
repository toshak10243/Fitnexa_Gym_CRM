import { cn } from '../../lib/utils';
import { Button } from './button';

export interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  title = 'System Error Encountered',
  message,
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        'border border-[#B91C1C]/30 bg-[#FEF2F2] p-6 text-left rounded-sm',
        className,
      )}
      role="alert"
    >
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0 text-[#B91C1C]">
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
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-semibold text-[#991B1B]">{title}</h3>
          <p className="mt-1 text-xs text-[#7F1D1D] leading-relaxed">{message}</p>
          {onRetry && (
            <div className="mt-3">
              <Button
                variant="danger"
                size="sm"
                onClick={onRetry}
                className="bg-[#B91C1C] hover:bg-[#991B1B]"
              >
                Retry Request
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


