import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useNavigate } from 'react-router-dom';
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

  return (
    <div className="min-h-screen w-full overflow-y-auto lg:h-screen lg:overflow-hidden flex items-stretch bg-[#FBFBF9] text-[#111827]">
      <div className="w-full min-h-screen lg:h-full overflow-visible grid grid-cols-1 lg:grid-cols-[1.15fr_0.85fr] bg-[#FBFBF9]">
        <section className="order-2 lg:order-1 relative overflow-hidden bg-[#0F223D] p-7 md:p-10 text-[#FBFBF9] flex flex-col justify-between min-h-[330px] lg:min-h-0">
          <div className="relative z-10">
            <div className="flex items-center gap-4">
              <div className="h-16 w-16 flex items-center justify-center bg-[#FBFBF9] p-2 border border-[#CBD5E1]"><img src={fitnexaLogo} alt="Trifit" className="h-full w-full object-contain" /></div>
              <div><p className="text-xs uppercase tracking-[0.2em] text-[#CBD5E1]">Trifit platform</p><h2 className="mt-1 text-2xl font-bold">Run your gym with clarity.</h2></div>
            </div>
            <p className="mt-10 max-w-md text-3xl md:text-4xl font-bold leading-tight">One command centre for members, payments, coaches and daily operations.</p>
            <p className="mt-5 max-w-lg text-sm leading-6 text-[#CBD5E1]">Built for modern fitness businesses that need reliable control from the front desk to the finance ledger.</p>
          </div>
          <div className="relative z-10 mt-10 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            {['Member lifecycle', 'POS & invoicing', 'Reports & controls'].map((feature) => <div key={feature} className="border border-[#334E70] bg-[#0A192F] p-4"><span className="mb-3 block h-1 w-8 bg-[#B91C1C]" /><span className="font-semibold text-[#FBFBF9]">{feature}</span></div>)}
          </div>
        </section>
        <section className="order-1 lg:order-2 p-6 md:p-10 lg:p-12 flex items-center">
          <div className="w-full max-w-md mx-auto">
        {/* Brand Header */}
        <div className="flex items-center space-x-3 border-b border-[#E5E7EB] pb-4 mb-6">
          <div className="h-10 w-10 flex-shrink-0 flex items-center justify-center overflow-hidden rounded-sm bg-white p-1 border border-[#E5E7EB]">
            <img src={fitnexaLogo} alt="Trifit Logo" className="h-full w-full object-contain" />
          </div>
          <div>
            <h1 className="text-base font-bold text-[#0A192F] tracking-wide uppercase">
              Trifit Console
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

        <div className="mt-6 pt-4 border-t border-[#E5E7EB] flex justify-between items-center text-xs">
          <span className="text-[#6B7280]">New gym business?</span>
          <a href="https://trifit.space" target="_blank" rel="noreferrer" className="font-bold text-[#B91C1C] hover:text-[#0A192F] underline-offset-4 hover:underline">Book your free 7-day trial</a>
        </div>
          </div>
        </section>
      </div>

    </div>
  );
}


