import { QueryClientProvider } from '@tanstack/react-query';
import { RouterProvider } from 'react-router-dom';
import { queryClient } from '../lib/query-client';
import { router } from '../routes';
import { GlobalErrorBoundary } from '../components/ui/global-error-boundary';
import { AuthProvider } from '../context/auth-context';

export function App() {
  return (
    <GlobalErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <RouterProvider router={router} />
        </AuthProvider>
      </QueryClientProvider>
    </GlobalErrorBoundary>
  );
}
