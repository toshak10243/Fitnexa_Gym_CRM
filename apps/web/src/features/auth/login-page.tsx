import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from 'react-router-dom';
import { LoginInput, LoginSchema } from '@fitnexa/shared';
import { useAuth } from '../../context/auth-context';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { ErrorState } from '../../components/ui/error-state';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [authError, setAuthError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(LoginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginInput) => {
    try {
      setAuthError(null);
      await login(data);
      navigate('/');
    } catch (err: any) {
      setAuthError(err.message || 'Failed to authenticate. Please check your credentials.');
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col justify-center items-center bg-[#FBFBF9] p-6 text-[#111827]">
      <div className="w-full max-w-md border border-[#E5E7EB] bg-[#F5F5F0] p-8 rounded-sm">
        {/* Brand Header */}
        <div className="flex items-center space-x-3 border-b border-[#E5E7EB] pb-4 mb-6">
          <div className="h-8 w-8 bg-[#B91C1C] flex items-center justify-center font-bold text-xs tracking-widest text-[#FBFBF9] rounded-sm">
            FX
          </div>
          <div>
            <h1 className="text-base font-bold text-[#0A192F] tracking-wide uppercase">
              Fitnexa Console
            </h1>
            <p className="text-[11px] text-[#6B7280]">
              Commercial Gym Management Authentication
            </p>
          </div>
        </div>

        {authError && (
          <div className="mb-4">
            <ErrorState title="Authentication Failed" message={authError} />
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            label="Email Address"
            type="email"
            placeholder="owner@yourgym.in"
            error={errors.email?.message}
            {...register('email')}
          />

          <Input
            label="Password"
            type="password"
            placeholder="Enter secure password"
            error={errors.password?.message}
            {...register('password')}
          />

          <div className="pt-2">
            <Button
              type="submit"
              variant="primary"
              className="w-full"
              isLoading={isSubmitting}
            >
              Sign In to Management Console
            </Button>
          </div>
        </form>

        <div className="mt-6 pt-4 border-t border-[#E5E7EB] flex justify-between items-center text-xs">
          <span className="text-[#6B7280]">New gym business?</span>
          <Link
            to="/register"
            className="font-medium text-[#0A192F] hover:text-[#B91C1C] underline-offset-4 hover:underline"
          >
            Onboard Your Gym
          </Link>
        </div>
      </div>

      <div className="mt-6 text-[11px] text-[#9CA3AF] text-center font-mono">
        Secured with distributed rate limiting and enterprise audit trails
      </div>
    </div>
  );
}
