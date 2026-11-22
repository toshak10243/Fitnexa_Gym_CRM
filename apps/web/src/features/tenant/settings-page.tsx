import { useState, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { apiClient } from '../../lib/api-client';
import { useAuth } from '../../context/auth-context';
import {
  CreateBranchInput,
  CreateBranchSchema,
  TenantDetailResponse,
  UpdateTenantProfileInput,
  UpdateTenantProfileSchema,
  SAAS_PLANS,
  SaaSSubscriptionPlan,
} from '@fitnexa/shared';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Skeleton } from '../../components/ui/skeleton';
import { ErrorState } from '../../components/ui/error-state';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '../../components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../../components/ui/table';

async function fetchTenantProfile(): Promise<TenantDetailResponse> {
  const { data } = await apiClient.get('/tenant/profile');
  return data?.data || data;
}

export function SettingsPage() {
  const queryClient = useQueryClient();
  const { reloadProfile } = useAuth();
  const [isBranchModalOpen, setIsBranchModalOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [logoUploading, setLogoUploading] = useState(false);
  const logoInputRef = useRef<HTMLInputElement | null>(null);

  const { data: tenant, isLoading, error } = useQuery({
    queryKey: ['tenant-profile'],
    queryFn: fetchTenantProfile,
  });

  const {
    register: registerProfile,
    handleSubmit: handleProfileSubmit,
    setValue,
    formState: { isSubmitting: isProfileSubmitting },
  } = useForm<UpdateTenantProfileInput>({
    resolver: zodResolver(UpdateTenantProfileSchema),
    values: tenant
      ? {
          name: tenant.name,
          phone: tenant.phone,
          email: tenant.email,
          gstin: tenant.gstin || '',
          pan: tenant.pan || '',
          address: tenant.address,
          city: tenant.city,
          state: tenant.state,
          pincode: tenant.pincode,
          logoUrl: tenant.logoUrl || '',
          website: tenant.website || '',
          instagram: tenant.instagram || '',
          whatsapp: tenant.whatsapp || '',
          currency: tenant.currency,
          timezone: tenant.timezone,
        }
      : undefined,
  });

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 3 * 1024 * 1024) {
      alert('Logo size exceeds 3MB limit.');
      return;
    }

    setLogoUploading(true);
    try {
      const uploadData = new FormData();
      uploadData.append('logo', file);

      const res = await apiClient.post('/tenant/upload-logo', uploadData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const newLogoUrl = res.data?.data?.logoUrl;
      if (newLogoUrl) {
        setValue('logoUrl', newLogoUrl);
        await apiClient.patch('/tenant/profile', { logoUrl: newLogoUrl });
        await queryClient.invalidateQueries({ queryKey: ['tenant-profile'] });
        reloadProfile();
        setSuccessMessage('Brand logo updated successfully.');
        setTimeout(() => setSuccessMessage(null), 4000);
      }
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to upload logo.');
    } finally {
      setLogoUploading(false);
      if (logoInputRef.current) logoInputRef.current.value = '';
    }
  };

  const {
    register: registerBranch,
    handleSubmit: handleBranchSubmit,
    reset: resetBranchForm,
    formState: { errors: branchErrors, isSubmitting: isBranchSubmitting },
  } = useForm<CreateBranchInput>({
    resolver: zodResolver(CreateBranchSchema),
    defaultValues: {
      name: '',
      code: '',
      address: '',
      city: '',
      state: '',
      pincode: '',
      phone: '',
      isMainBranch: false,
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (input: UpdateTenantProfileInput) => {
      const cleanInput: Record<string, any> = { ...input };
      Object.keys(cleanInput).forEach((key) => {
        if (cleanInput[key] === '') {
          cleanInput[key] = null;
        }
      });
      const { data } = await apiClient.patch('/tenant/profile', cleanInput);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-profile'] });
      reloadProfile();
      setSuccessMessage('Gym profile updated successfully.');
      setTimeout(() => setSuccessMessage(null), 4000);
    },
  });

  const createBranchMutation = useMutation({
    mutationFn: async (input: CreateBranchInput) => {
      const { data } = await apiClient.post('/tenant/branches', input);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-profile'] });
      setIsBranchModalOpen(false);
      resetBranchForm();
      setSuccessMessage('New facility branch created successfully.');
      setTimeout(() => setSuccessMessage(null), 4000);
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error || !tenant) {
    return (
      <ErrorState
        title="Failed to load settings"
        message="Could not retrieve gym profile details from the server."
      />
    );
  }

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="border-b border-[#E5E7EB] pb-4">
        <h2 className="text-xl font-bold tracking-tight text-[#0A192F]">
          Gym Profile & Enterprise Settings
        </h2>
        <p className="text-xs text-[#6B7280] mt-1">
          Manage corporate registration, GST compliance, and multi-location facilities.
        </p>
      </div>

      {successMessage && (
        <div className="border border-[#10B981]/30 bg-[#ECFDF5] text-[#065F46] p-3 text-xs rounded-sm">
          {successMessage}
        </div>
      )}

      {/* Active SaaS Subscription Status Banner */}
      <div className="border border-[#E5E7EB] bg-[#0A192F] text-[#FBFBF9] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-mono uppercase font-bold text-[#34D399] tracking-wider">
            Active Multi-Tenant License
          </span>
          <h3 className="text-lg font-bold text-[#FBFBF9] mt-0.5">
            {tenant.subscriptionPlan
              ? SAAS_PLANS[tenant.subscriptionPlan as SaaSSubscriptionPlan]?.name || tenant.subscriptionPlan
              : 'Standard Enterprise License'}
          </h3>
          <p className="text-xs text-[#9CA3AF] mt-0.5">
            Company Subdomain: <span className="font-mono text-[#FBFBF9]">{tenant.slug}.trifit.in</span>
          </p>
        </div>

        <div className="flex items-center space-x-3 text-xs">
          <div className="sm:text-right">
            <div className="font-mono text-[#34D399] font-bold">
              {tenant.isLifetime
                ? 'LIFETIME AMC INCLUDED'
                : tenant.planExpiresAt
                ? `Expires: ${tenant.planExpiresAt.split('T')[0]}`
                : 'ACTIVE'}
            </div>
            <div className="text-[11px] text-[#9CA3AF]">
              Unlimited Staff & Members Provisioned
            </div>
          </div>
        </div>
      </div>

      {/* Brand Identity & Logo Card */}
      <div className="border border-[#E5E7EB] bg-[#F5F5F0] p-6 rounded-sm space-y-4">
        <h3 className="text-sm font-bold text-[#0A192F] uppercase tracking-wider pb-1">
          Brand Logo & Custom Identity
        </h3>
        <p className="text-xs text-[#6B7280]">
          Upload your official gym logo. This logo automatically appears on printed member admission forms, invoice receipts, and system navigation.
        </p>

        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5 p-4 bg-[#FBFBF9] border border-[#E5E7EB]">
          <div className="h-20 w-20 flex-shrink-0 border border-[#E5E7EB] bg-white flex items-center justify-center p-1 overflow-hidden">
            {tenant.logoUrl ? (
              <img src={tenant.logoUrl} alt="Gym Logo" className="h-full w-full object-contain" />
            ) : (
              <div className="text-center p-2 text-[#9CA3AF]">
                <span className="text-[10px] font-bold uppercase">No Logo</span>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <input
              type="file"
              ref={logoInputRef}
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              className="hidden"
              onChange={handleLogoUpload}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={logoUploading}
              onClick={() => logoInputRef.current?.click()}
              className="rounded-none text-xs h-8 border-[#0A192F] text-[#0A192F] hover:bg-[#0A192F] hover:text-[#FBFBF9]"
            >
              {logoUploading ? 'Uploading Logo...' : tenant.logoUrl ? 'Change Gym Logo' : 'Upload Brand Logo'}
            </Button>
            <span className="text-[11px] text-[#6B7280] block">
              PNG, JPG, or SVG up to 3MB (Square format recommended)
            </span>
          </div>
        </div>
      </div>

      {/* Gym Profile Form */}
      <div className="border border-[#E5E7EB] bg-[#F5F5F0] p-6 rounded-sm space-y-4">
        <h3 className="text-sm font-bold text-[#0A192F] uppercase tracking-wider pb-1">
          Business Identity & Tax Compliance
        </h3>

        <form
          onSubmit={handleProfileSubmit((data) => updateProfileMutation.mutate(data))}
          className="space-y-4"
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Organization Name"
              {...registerProfile('name')}
            />
            <Input
              label="Contact Mobile (10 Digits)"
              {...registerProfile('phone')}
            />
            <Input
              label="Official Email"
              type="email"
              {...registerProfile('email')}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="GSTIN (Goods and Services Tax)"
              placeholder="e.g. 29ABCDE1234F1Z5"
              {...registerProfile('gstin')}
            />
            <Input
              label="Permanent Account Number (PAN)"
              placeholder="e.g. ABCDE1234F"
              {...registerProfile('pan')}
            />
          </div>

          <Input
            label="Registered Address"
            {...registerProfile('address')}
          />

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input label="City" {...registerProfile('city')} />
            <Input label="State" {...registerProfile('state')} />
            <Input label="PIN Code" {...registerProfile('pincode')} />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-[#E5E7EB] pt-4">
            <Input
              label="Official Website URL"
              placeholder="e.g. https://cultfit.in"
              {...registerProfile('website')}
            />
            <Input
              label="Instagram Profile / Handle"
              placeholder="e.g. @cultfit_official"
              {...registerProfile('instagram')}
            />
            <Input
              label="WhatsApp Business Number"
              placeholder="e.g. 9876543210"
              {...registerProfile('whatsapp')}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Operating Currency"
              value="INR (Indian Rupee â‚¹)"
              disabled
            />
            <Input
              label="System Timezone"
              value="Asia/Kolkata (IST)"
              disabled
            />
          </div>

          <div className="flex justify-end pt-2">
            <Button
              type="submit"
              variant="primary"
              size="sm"
              isLoading={isProfileSubmitting || updateProfileMutation.isPending}
            >
              Save Profile Changes
            </Button>
          </div>
        </form>
      </div>

      {/* Facilities & Branches Section */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-sm font-bold text-[#0A192F] uppercase tracking-wider">
              Gym Facilities & Locations ({tenant.branches.length})
            </h3>
            <p className="text-xs text-[#6B7280]">
              Multi-branch locations managed under this gym enterprise license.
            </p>
          </div>

          <Dialog open={isBranchModalOpen} onOpenChange={setIsBranchModalOpen}>
            <DialogTrigger asChild>
              <Button variant="primary" size="sm">
                Add Facility Branch
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Gym Facility</DialogTitle>
                <DialogDescription>
                  Register an additional commercial gym facility under your account.
                </DialogDescription>
              </DialogHeader>

              <form
                onSubmit={handleBranchSubmit((data) =>
                  createBranchMutation.mutate(data),
                )}
                className="space-y-3"
              >
                <Input
                  label="Branch Facility Name"
                  placeholder="e.g. Koramangala 4th Block"
                  error={branchErrors.name?.message}
                  {...registerBranch('name')}
                />

                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Facility Code"
                    placeholder="e.g. KRM-01"
                    error={branchErrors.code?.message}
                    {...registerBranch('code')}
                  />
                  <Input
                    label="Branch Phone"
                    placeholder="10-digit number"
                    error={branchErrors.phone?.message}
                    {...registerBranch('phone')}
                  />
                </div>

                <Input
                  label="Branch Address"
                  placeholder="Street and building details"
                  error={branchErrors.address?.message}
                  {...registerBranch('address')}
                />

                <div className="grid grid-cols-3 gap-2">
                  <Input
                    label="City"
                    error={branchErrors.city?.message}
                    {...registerBranch('city')}
                  />
                  <Input
                    label="State"
                    error={branchErrors.state?.message}
                    {...registerBranch('state')}
                  />
                  <Input
                    label="PIN"
                    error={branchErrors.pincode?.message}
                    {...registerBranch('pincode')}
                  />
                </div>

                <div className="flex justify-end space-x-2 pt-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setIsBranchModalOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    isLoading={isBranchSubmitting || createBranchMutation.isPending}
                  >
                    Create Facility
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Facility Name</TableHead>
              <TableHead>Code</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead>Type</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {tenant.branches.map((b) => (
              <TableRow key={b.id}>
                <TableCell className="font-semibold text-[#0A192F]">
                  {b.name}
                </TableCell>
                <TableCell className="font-mono text-xs text-[#374151]">
                  {b.code}
                </TableCell>
                <TableCell className="text-xs text-[#4B5563]">
                  {b.address}, {b.city}, {b.state} - {b.pincode}
                </TableCell>
                <TableCell className="text-xs text-[#4B5563]">
                  {b.phone}
                </TableCell>
                <TableCell>
                  {b.isMainBranch ? (
                    <span className="px-2 py-0.5 text-[10px] uppercase font-bold tracking-wider bg-[#0A192F] text-[#FBFBF9] rounded-sm">
                      Main Hub
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 text-[10px] uppercase font-medium bg-[#EFEFEA] text-[#4B5563] rounded-sm">
                      Branch
                    </span>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}


