import { Component, ErrorInfo, ReactNode } from 'react';
import { Button } from './button';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class GlobalErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Fitnexa Global Error Boundary caught exception:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full flex items-center justify-center bg-[#FBFBF9] p-6 text-[#111827]">
          <div className="w-full max-w-md border border-[#D1D5DB] bg-[#F5F5F0] p-6 rounded-sm">
            <div className="flex items-center space-x-3 border-b border-[#E5E7EB] pb-3 mb-4">
              <div className="h-4 w-4 bg-[#B91C1C]" />
              <h1 className="text-base font-semibold text-[#0A192F]">
                Application Exception
              </h1>
            </div>
            <p className="text-xs text-[#4B5563] leading-relaxed mb-4">
              An unexpected client error occurred in the Fitnexa management console.
              The error state has been isolated to prevent corruption of unsaved data.
            </p>
            {this.state.error && (
              <pre className="p-3 bg-[#EFEFEA] text-[11px] font-mono text-[#7F1D1D] overflow-x-auto rounded-sm mb-4 border border-[#E5E7EB]">
                {this.state.error.message}
              </pre>
            )}
            <div className="flex justify-end space-x-2">
              <Button variant="primary" size="sm" onClick={this.handleReset}>
                Reload Application
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
