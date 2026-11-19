import { useRouteError, useNavigate } from 'react-router-dom';
import { Button } from './button';

export function RouteErrorBoundary() {
  const error = useRouteError() as any;
  const navigate = useNavigate();

  return (
    <div className="min-h-[400px] w-full flex items-center justify-center bg-[#FBFBF9] p-6 text-[#111827]">
      <div className="w-full max-w-md border border-[#E5E7EB] bg-[#F5F5F0] p-6 rounded-none">
        <div className="flex items-center space-x-3 border-b border-[#E5E7EB] pb-3 mb-4">
          <div className="h-4 w-4 bg-[#B91C1C]" />
          <h1 className="text-sm font-bold uppercase tracking-wider text-[#0A192F]">
            Module Error
          </h1>
        </div>
        <p className="text-xs text-[#4B5563] leading-relaxed mb-4">
          An unexpected issue occurred while rendering this module. Your data remains safe and isolated.
        </p>
        {error?.message && (
          <pre className="p-3 bg-[#EFEFEA] text-[11px] font-mono text-[#7F1D1D] overflow-x-auto rounded-none mb-4 border border-[#E5E7EB]">
            {error.message}
          </pre>
        )}
        <div className="flex justify-end space-x-2">
          <Button
            variant="outline"
            size="sm"
            className="text-xs border-[#E5E7EB] rounded-none hover:bg-white"
            onClick={() => navigate('/')}
          >
            Back to Dashboard
          </Button>
          <Button
            variant="primary"
            size="sm"
            className="text-xs bg-[#0A192F] text-[#FBFBF9] rounded-none"
            onClick={() => window.location.reload()}
          >
            Reload Module
          </Button>
        </div>
      </div>
    </div>
  );
}
