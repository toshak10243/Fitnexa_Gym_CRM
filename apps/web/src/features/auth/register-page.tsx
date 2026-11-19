import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from 'react-router-dom';
import { RegisterOwnerInput, RegisterOwnerSchema } from '@fitnexa/shared';
import { useAuth } from '../../context/auth-context';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { ErrorState } from '../../components/ui/error-state';
import fitnexaLogo from '../../assets/logo.png';

export function RegisterPage() {
  const { registerOwner } = useAuth();
  const navigate = useNavigate();
  const [registerError, setRegisterError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterOwnerInput>({
    resolver: zodResolver(RegisterOwnerSchema),
    defaultValues: {
      gymName: '',
      ownerName: '',
      email: '',
      phone: '',
      password: '',
      gstin: '',
      city: '',
      state: '',
      address: '',
      pincode: '',
    },
  });

  const onSubmit = async (data: RegisterOwnerInput) => {
    try {
      setRegisterError(null);
      await registerOwner(data);
      navigate('/');
    } catch (err: any) {
      setRegisterError(err.message || 'Registration failed. Please check the provided information.');
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col justify-center items-center bg-[#FBFBF9] p-6 text-[#111827]">
      <div className="w-full max-w-2xl border border-[#E5E7EB] bg-[#F5F5F0] p-8 rounded-sm">
        {/* Brand Header */}
        <div className="flex items-center space-x-3 border-b border-[#E5E7EB] pb-4 mb-6">
          <div className="h-10 w-10 flex-shrink-0 flex items-center justify-center overflow-hidden rounded-sm bg-white p-1 border border-[#E5E7EB]">
            <img src={fitnexaLogo} alt="Fitnexa Logo" className="h-full w-full object-contain" />
          </div>
          <div>
            <h1 className="text-base font-bold text-[#0A192F] tracking-wide uppercase">
              Fitnexa Gym Onboarding
            </h1>
            <p className="text-[11px] text-[#6B7280]">
              Register Your Commercial Fitness Enterprise & Primary Owner Account
            </p>
          </div>
        </div>

        {registerError && (
          <div className="mb-4">
            <ErrorState title="Registration Failed" message={registerError} />
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Gym Organization Name"
              placeholder="e.g. IronPulse Fitness Arena"
              error={errors.gymName?.message}
              {...register('gymName')}
            />

            <Input
              label="Owner Full Name"
              placeholder="e.g. Vikram Malhotra"
              error={errors.ownerName?.message}
              {...register('ownerName')}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Work Email Address"
              type="email"
              placeholder="owner@yourgym.in"
              error={errors.email?.message}
              {...register('email')}
            />

            <Input
              label="Mobile Number (10 Digits)"
              placeholder="e.g. 9876543210"
              error={errors.phone?.message}
              {...register('phone')}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Secure Master Password"
              type="password"
              placeholder="Min 8 chars, uppercase, number, symbol"
              error={errors.password?.message}
              {...register('password')}
            />

            <Input
              label="GSTIN (Optional)"
              placeholder="e.g. 29ABCDE1234F1Z5"
              error={errors.gstin?.message}
              {...register('gstin')}
            />
          </div>

          <Input
            label="Facility Street Address"
            placeholder="Plot / Road / Locality details"
            error={errors.address?.message}
            {...register('address')}
          />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="City"
              placeholder="e.g. Bengaluru"
              error={errors.city?.message}
              {...register('city')}
            />

            <Input
              label="State"
              placeholder="e.g. Karnataka"
              error={errors.state?.message}
              {...register('state')}
            />

            <Input
              label="PIN Code"
              placeholder="6 digits"
              error={errors.pincode?.message}
              {...register('pincode')}
            />
          </div>

          <div className="pt-4">
            <Button
              type="submit"
              variant="primary"
              className="w-full"
              isLoading={isSubmitting}
            >
              Complete Onboarding & Access Console
            </Button>
          </div>
        </form>

        <div className="mt-6 pt-4 border-t border-[#E5E7EB] flex justify-between items-center text-xs">
          <span className="text-[#6B7280]">Already onboarded?</span>
          <Link
            to="/login"
            className="font-medium text-[#0A192F] hover:text-[#B91C1C] underline-offset-4 hover:underline"
          >
            Sign In to Existing Account
          </Link>
        </div>
      </div>
    </div>
  );
}
