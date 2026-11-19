import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/auth-context';
import { UserRole } from '@fitnexa/shared';
import { Skeleton } from '../ui/skeleton';

interface ProtectedRouteProps {
  children: React.ReactNode;
  allowedRoles?: UserRole[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-[#FBFBF9] p-8">
        <div className="w-full max-w-md space-y-4">
          <Skeleton className="h-8 w-48" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role as UserRole)) {
    return (
      <div className="min-h-[400px] flex flex-col items-center justify-center p-8 text-center bg-[#FBFBF9]">
        <div className="h-10 w-10 bg-[#B91C1C] flex items-center justify-center text-[#FBFBF9] rounded-sm font-bold text-xs mb-3">
          FX
        </div>
        <h2 className="text-base font-bold text-[#0A192F]">Access Restricted</h2>
        <p className="text-xs text-[#6B7280] max-w-md mt-1">
          Your account role ({user.role}) does not have permission to access this module.
          Contact your gym administrator if you believe this is an error.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
