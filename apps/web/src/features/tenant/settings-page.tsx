import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { apiClient } from '../../lib/api-client';
import {
  CreateBranchInput,
  CreateBranchSchema,
  TenantDetailResponse,
  UpdateTenantProfileInput,
  UpdateTenantProfileSchema,
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
  return data.data;
}

export function SettingsPage() {
  const queryClient = useQueryClient();
  const [isBranchModalOpen, setIsBranchModalOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const { data: tenant, isLoading, error } = useQuery({
    queryKey: ['tenant-profile'],
    queryFn: fetchTenantProfile,
  });

  const {
    register: registerProfile,
    handleSubmit: handleProfileSubmit,
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
          currency: tenant.currency,
          timezone: tenant.timezone,
        }
      : undefined,
  });

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
      const { data } = await apiClient.patch('/tenant/profile', input);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-profile'] });
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

      {/* Gym Profile Form */}
      <div className="border border-[#E5E7EB] bg-[#F5F5F0] p-6 rounded-sm space-y-4">
        <h3 className="text-sm font-bold text-[#0A192F] uppercase tracking-wider border-b border-[#E5E7EB] pb-2">
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Operating Currency"
              value="INR (Indian Rupee ₹)"
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
