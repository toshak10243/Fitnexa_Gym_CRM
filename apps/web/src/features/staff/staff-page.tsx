import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { apiClient } from '../../lib/api-client';
import {
  ALL_PERMISSIONS,
  CreateStaffInput,
  CreateStaffSchema,
  DEFAULT_ROLE_PERMISSIONS,
  PaginatedResult,
  StaffResponse,
  TenantDetailResponse,
  UserRole,
  UserStatus,
} from '@fitnexa/shared';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Skeleton } from '../../components/ui/skeleton';
import { ErrorState } from '../../components/ui/error-state';
import { RolePermissionsModal } from '../../components/role-permissions-modal';
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

async function fetchStaffList(search?: string, role?: string): Promise<PaginatedResult<StaffResponse>> {
  const params: Record<string, string> = { limit: '50' };
  if (search) params.search = search;
  if (role) params.role = role;
  const { data } = await apiClient.get('/staff', { params });
  return data?.data || data;
}

async function fetchBranches(): Promise<TenantDetailResponse> {
  const { data } = await apiClient.get('/tenant/profile');
  return data?.data || data;
}

export function StaffPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [isAddStaffOpen, setIsAddStaffOpen] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const { data: staffData, isLoading, error } = useQuery({
    queryKey: ['staff-list', searchTerm, selectedRole],
    queryFn: () => fetchStaffList(searchTerm, selectedRole),
  });

  const { data: tenant } = useQuery({
    queryKey: ['tenant-profile'],
    queryFn: fetchBranches,
  });

  const {
    register,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<CreateStaffInput>({
    resolver: zodResolver(CreateStaffSchema),
    defaultValues: {
      fullName: '',
      email: '',
      phone: '',
      password: '',
      role: UserRole.FRONT_DESK,
      branchId: '',
    },
  });

  const [isPermissionsModalOpen, setIsPermissionsModalOpen] = useState(false);
  const selectedFormRole = watch('role') || UserRole.TRAINER;

  // Active permissions for the selected role in the form
  const configuredRolePerms = tenant?.rolePermissions?.[selectedFormRole];
  const defaultRolePerms = DEFAULT_ROLE_PERMISSIONS[selectedFormRole];
  const activeRolePerms: string[] = Array.isArray(configuredRolePerms)
    ? configuredRolePerms
    : Array.isArray(defaultRolePerms)
      ? defaultRolePerms
      : [];

  const savePermissionsMutation = useMutation({
    mutationFn: async (updatedPermissions: Record<string, string[]>) => {
      const { data } = await apiClient.patch('/tenant/role-permissions', {
        rolePermissions: updatedPermissions,
      });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenant-profile'] });
      setSuccessMessage('Role access control matrix saved successfully.');
      setTimeout(() => setSuccessMessage(null), 4000);
    },
  });

  const createStaffMutation = useMutation({
    mutationFn: async (input: CreateStaffInput) => {
      const payload = {
        ...input,
        branchId: input.branchId || undefined,
      };
      const { data } = await apiClient.post('/staff', payload);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-list'] });
      setIsAddStaffOpen(false);
      reset();
      setSuccessMessage('Staff account created successfully.');
      setTimeout(() => setSuccessMessage(null), 4000);
    },
  });

  const toggleStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: UserStatus }) => {
      const { data } = await apiClient.patch(`/staff/${id}/status`, { status });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff-list'] });
      setSuccessMessage('Staff account status updated.');
      setTimeout(() => setSuccessMessage(null), 4000);
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-12 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <ErrorState
        title="Failed to load staff accounts"
        message="Could not retrieve the staff roster from the server."
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[#E5E7EB] pb-4">
        <div>
          <h2 className="text-xl font-bold tracking-tight text-[#0A192F]">
            Staff & Personnel Management
          </h2>
          <p className="text-xs text-[#6B7280] mt-1">
            Configure accounts, roles, and branch assignments for managers, front desk, and trainers.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsPermissionsModalOpen(true)}
            className="border-[#0A192F] text-[#0A192F] hover:bg-[#0A192F] hover:text-[#FBFBF9] font-semibold gap-1.5 inline-flex items-center h-8"
          >
            <span className="text-emerald-700 font-bold">Allowed</span>
            <span className="text-red-700 font-bold">Blocked</span>
            <span>Role Permissions Matrix</span>
          </Button>

          <Dialog open={isAddStaffOpen} onOpenChange={setIsAddStaffOpen}>
            <DialogTrigger asChild>
              <Button variant="primary" size="sm" className="h-8">
                Add Staff Member
              </Button>
            </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Staff Member</DialogTitle>
              <DialogDescription>
                Create credentials and assign an organizational role.
              </DialogDescription>
            </DialogHeader>

            <form
              onSubmit={handleSubmit((data) => createStaffMutation.mutate(data))}
              className="space-y-3"
            >
              <Input
                label="Full Name"
                placeholder="e.g. Arjun Das"
                error={errors.fullName?.message}
                {...register('fullName')}
              />

              <div className="grid grid-cols-2 gap-3">
                <Input
                  label="Email Address"
                  type="email"
                  placeholder="staff@yourgym.in"
                  error={errors.email?.message}
                  {...register('email')}
                />
                <Input
                  label="Mobile (10 Digits)"
                  placeholder="9876543210"
                  error={errors.phone?.message}
                  {...register('phone')}
                />
              </div>

              <Input
                label="Initial Password"
                type="password"
                placeholder="Min 8 chars, uppercase, number"
                error={errors.password?.message}
                {...register('password')}
              />

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#374151]">
                    Organizational Role
                  </label>
                  <select
                    className="flex h-10 w-full rounded-sm border border-[#D1D5DB] bg-[#FBFBF9] px-3 py-2 text-sm text-[#111827] focus:border-[#0A192F] focus:outline-none"
                    {...register('role')}
                  >
                    <option value={UserRole.FRONT_DESK}>Front Desk</option>
                    <option value={UserRole.TRAINER}>Trainer</option>
                    <option value={UserRole.STAFF}>Staff</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-[#374151]">
                    Assigned Branch
                  </label>
                  <select
                    className="flex h-10 w-full rounded-sm border border-[#D1D5DB] bg-[#FBFBF9] px-3 py-2 text-sm text-[#111827] focus:border-[#0A192F] focus:outline-none"
                    {...register('branchId')}
                  >
                    <option value="">All / Primary Hub</option>
                    {tenant?.branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name} ({b.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Role Permissions Live Summary */}
              <div className="p-3 bg-[#F0F0EA] border border-[#E5E7EB] rounded-none space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-[#0A192F]">
                      Permissions for {selectedFormRole.replace('_', ' ')}
                    </span>
                    <span className="text-[10px] font-mono text-[#0A192F] bg-white px-1.5 py-0.5 border border-[#D1D5DB] font-semibold">
                      {activeRolePerms.length} of {ALL_PERMISSIONS.length} allowed
                    </span>
                  </div>
                </div>
                <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto sidebar-scroll">
                  {activeRolePerms.length === 0 ? (
                    <span className="text-[11px] text-[#991B1B]">No permissions granted to this role.</span>
                  ) : (
                    activeRolePerms.slice(0, 10).map((pId) => {
                      const def = ALL_PERMISSIONS.find((p) => p.id === pId);
                      return (
                        <span
                          key={pId}
                          className="text-[10px] font-medium bg-white border border-[#D1D5DB] px-1.5 py-0.5 text-[#374151]"
                        >
                           {def?.label || pId}
                        </span>
                      );
                    })
                  )}
                  {activeRolePerms.length > 10 && (
                    <span className="text-[10px] font-mono text-[#6B7280] self-center">
                      +{activeRolePerms.length - 10} more
                    </span>
                  )}
                </div>
              </div>

              <div className="flex justify-end space-x-2 pt-3">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAddStaffOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  isLoading={isSubmitting || createStaffMutation.isPending}
                >
                  Create Account
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>

      {successMessage && (
        <div className="border border-[#10B981]/30 bg-[#ECFDF5] text-[#065F46] p-3 text-xs rounded-sm">
          {successMessage}
        </div>
      )}

      {/* Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <Input
            placeholder="Search by name, email, or phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="w-full sm:w-48">
          <select
            className="flex h-10 w-full rounded-sm border border-[#D1D5DB] bg-[#FBFBF9] px-3 py-2 text-sm text-[#111827] focus:border-[#0A192F] focus:outline-none"
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
          >
            <option value="">All Roles</option>
            <option value={UserRole.FRONT_DESK}>Front Desk</option>
            <option value={UserRole.TRAINER}>Trainer</option>
            <option value={UserRole.STAFF}>Staff</option>
          </select>
        </div>
      </div>

      {/* Staff Table */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Staff Member</TableHead>
            <TableHead>Role</TableHead>
            <TableHead>Contact</TableHead>
            <TableHead>Assigned Facility</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {staffData?.items.map((staff) => (
            <TableRow key={staff.id}>
              <TableCell>
                <div className="font-semibold text-[#0A192F]">{staff.fullName}</div>
                <div className="text-xs text-[#6B7280]">{staff.email}</div>
              </TableCell>
              <TableCell>
                <span className="px-2 py-0.5 text-[11px] font-bold uppercase tracking-wider bg-[#F5F5F0] border border-[#E5E7EB] text-[#0A192F] rounded-sm">
                  {staff.role.replace('_', ' ')}
                </span>
              </TableCell>
              <TableCell className="text-xs text-[#4B5563]">
                {staff.phone}
              </TableCell>
              <TableCell className="text-xs text-[#4B5563]">
                {staff.branchName || 'Primary Hub'}
              </TableCell>
              <TableCell>
                <span
                  className={`px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-sm ${
                    staff.status === UserStatus.ACTIVE
                      ? 'bg-[#ECFDF5] text-[#065F46] border border-[#A7F3D0]'
                      : 'bg-[#FEF2F2] text-[#991B1B] border border-[#FECACA]'
                  }`}
                >
                  {staff.status}
                </span>
              </TableCell>
              <TableCell>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsPermissionsModalOpen(true)}
                    className="text-[11px] px-2.5 py-1 font-semibold rounded-none border border-blue-300 bg-blue-50 text-blue-800 hover:bg-blue-100 transition-colors whitespace-nowrap"
                    title={`Inspect and configure permissions matrix`}
                  >
                    Permissions
                  </button>
                  {staff.role !== UserRole.GYM_OWNER && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs h-7 px-2"
                      onClick={() =>
                        toggleStatusMutation.mutate({
                          id: staff.id,
                          status:
                            staff.status === UserStatus.ACTIVE
                              ? UserStatus.SUSPENDED
                              : UserStatus.ACTIVE,
                        })
                      }
                    >
                      {staff.status === UserStatus.ACTIVE ? 'Suspend' : 'Reactivate'}
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      {/* Role Permissions Matrix Modal */}
      <RolePermissionsModal
        isOpen={isPermissionsModalOpen}
        onClose={() => setIsPermissionsModalOpen(false)}
        title={tenant ? `Role Permissions Matrix: ${tenant.name}` : 'Role Permissions Matrix'}
        subtitle={tenant?.slug ? `Facility: ${tenant.slug}.trifit.in` : undefined}
        initialPermissions={tenant?.rolePermissions}
        onSave={async (updatedPermissions) => {
          await savePermissionsMutation.mutateAsync(updatedPermissions);
        }}
        isLoading={savePermissionsMutation.isPending}
      />
    </div>
  );
}


