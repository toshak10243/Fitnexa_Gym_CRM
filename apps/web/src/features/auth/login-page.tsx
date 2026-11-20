import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from 'react-router-dom';
import { LoginInput, LoginSchema } from '@fitnexa/shared';
import { useAuth } from '../../context/auth-context';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { ErrorState } from '../../components/ui/error-state';
import fitnexaLogo from '../../assets/logo.png';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [authError, setAuthError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
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
      const res = await login(data);
      if (res?.user?.role === 'SUPER_ADMIN') {
        navigate('/super-admin');
      } else {
        navigate('/');
      }
    } catch (err: any) {
      setAuthError(err.message || 'Failed to authenticate. Please check your credentials.');
    }
  };

  const setCredentials = (email: string) => {
    setValue('email', email, { shouldValidate: true });
    setValue('password', 'Password@2026', { shouldValidate: true });
    setAuthError(null);
  };

  return (
    <div className="min-h-screen w-full flex flex-col justify-center items-center bg-[#FBFBF9] p-6 text-[#111827]">
      <div className="w-full max-w-md border border-[#E5E7EB] bg-[#F5F5F0] p-8 rounded-sm">
        {/* Brand Header */}
        <div className="flex items-center space-x-3 border-b border-[#E5E7EB] pb-4 mb-6">
          <div className="h-10 w-10 flex-shrink-0 flex items-center justify-center overflow-hidden rounded-sm bg-white p-1 border border-[#E5E7EB]">
            <img src={fitnexaLogo} alt="Fitnexa Logo" className="h-full w-full object-contain" />
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

          <div className="relative">
            <Input
              label="Password"
              type={showPassword ? 'text' : 'password'}
              placeholder="Enter secure password"
              error={errors.password?.message}
              {...register('password')}
            />
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-3 top-8 text-xs font-semibold text-[#6B7280] hover:text-[#0A192F] select-none"
            >
              {showPassword ? 'HIDE' : 'SHOW'}
            </button>
          </div>

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

        {/* Quick Demo Fill Credentials */}
        <div className="mt-6 p-3 bg-[#EFEFEA] border border-[#E5E7EB] rounded-sm text-xs">
          <div className="font-semibold text-[#0A192F] mb-1.5 uppercase tracking-wider text-[10px]">
            Quick Test Accounts (Click to Auto-Fill):
          </div>
          <div className="flex flex-col space-y-1.5">
            <button
              type="button"
              onClick={() => {
                setValue('email', 'superadmin@fitnexa.com', { shouldValidate: true });
                setValue('password', 'SuperAdmin@2026', { shouldValidate: true });
                setAuthError(null);
              }}
              className="text-left px-2 py-1 bg-[#0A192F] text-[#FBFBF9] border border-[#0A192F] rounded-sm hover:bg-[#162E52] text-[11px] font-mono flex justify-between items-center"
            >
              <span><strong>Super Admin (SaaS Owner):</strong> superadmin@fitnexa.com</span>
              <span className="text-[10px] text-[#34D399] font-bold">Fill</span>
            </button>
            <button
              type="button"
              onClick={() => setCredentials('toshak10243@gmail.com')}
              className="text-left px-2 py-1 bg-[#FBFBF9] border border-[#D1D5DB] rounded-sm hover:border-[#0A192F] hover:bg-white text-[11px] font-mono text-[#0A192F] flex justify-between items-center"
            >
              <span><strong>Owner:</strong> toshak10243@gmail.com</span>
              <span className="text-[10px] text-[#6B7280]">Fill</span>
            </button>
            <button
              type="button"
              onClick={() => setCredentials('manager@fitnexa.com')}
              className="text-left px-2 py-1 bg-[#FBFBF9] border border-[#D1D5DB] rounded-sm hover:border-[#0A192F] hover:bg-white text-[11px] font-mono text-[#0A192F] flex justify-between items-center"
            >
              <span><strong>Manager:</strong> manager@fitnexa.com</span>
              <span className="text-[10px] text-[#6B7280]">Fill</span>
            </button>
            <button
              type="button"
              onClick={() => setCredentials('frontdesk@fitnexa.com')}
              className="text-left px-2 py-1 bg-[#FBFBF9] border border-[#D1D5DB] rounded-sm hover:border-[#0A192F] hover:bg-white text-[11px] font-mono text-[#0A192F] flex justify-between items-center"
            >
              <span><strong>Front Desk:</strong> frontdesk@fitnexa.com</span>
              <span className="text-[10px] text-[#6B7280]">Fill</span>
            </button>
          </div>
          <div className="mt-2 text-[10px] text-[#6B7280] font-mono">
            Default Password: <code className="font-bold text-[#0A192F]">Password@2026</code>
          </div>
        </div>

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
