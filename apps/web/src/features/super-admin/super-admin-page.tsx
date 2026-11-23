import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../lib/api-client';
import { useAuth } from '../../context/auth-context';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import {
  SAAS_PLANS,
  SAAS_MODULES_LIST,
  SaaSSubscriptionPlan,
  SaaSModule,
  ALL_PERMISSIONS,
  DEFAULT_ROLE_PERMISSIONS,
} from '@fitnexa/shared';

interface TenantClient {
  id: string;
  name: string;
  slug: string;
  logoUrl?: string | null;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  status: string;
  subscriptionPlan: SaaSSubscriptionPlan;
  subscriptionPrice: number;
  subscriptionStatus: string;
  planStartedAt: string;
  planExpiresAt: string | null;
  isLifetime: boolean;
  paymentStatus: string;
  paymentMode: string | null;
  paymentReference: string | null;
  enabledModules: string[];
  rolePermissions?: Record<string, string[]> | null;
  createdAt: string;
  owner: {
    id: string;
    fullName: string;
    email: string;
    phone: string;
    lastLoginAt: string | null;
    mustChangePassword: boolean;
  } | null;
  stats: {
    totalMembers: number;
    totalBranches: number;
    totalUsers: number;
  };
}

interface StatsData {
  totalTenants: number;
  activeTenants: number;
  trialCount: number;
  expiredCount: number;
  totalRevenue: number;
  plansSummary: Record<string, number>;
}

export function SuperAdminPage() {
  const navigate = useNavigate();
  const { impersonateTenant } = useAuth();

  const [stats, setStats] = useState<StatsData | null>(null);
  const [tenants, setTenants] = useState<TenantClient[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [planFilter, setPlanFilter] = useState('ALL');
  const [pageError, setPageError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState<boolean>(false);
  const [selectedTenant, setSelectedTenant] = useState<TenantClient | null>(null);

  // New Client Success Dialog (showing temporary credentials)
  const [createdClientInfo, setCreatedClientInfo] = useState<{
    gymName: string;
    email: string;
    tempPassword: string;
    slug: string;
  } | null>(null);

  // Reset Password Result Dialog
  const [resetPasswordResult, setResetPasswordResult] = useState<{
    email: string;
    tempPassword: string;
  } | null>(null);

  // GitHub-style Delete Confirmation Modal State
  const [tenantToDelete, setTenantToDelete] = useState<TenantClient | null>(null);
  const [confirmSlugInput, setConfirmSlugInput] = useState<string>('');
  const [isDeletingTenant, setIsDeletingTenant] = useState<boolean>(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Form State for New Client
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
    ownerName: '',
    ownerEmail: '',
    ownerPhone: '',
    initialPassword: '',
    plan: SaaSSubscriptionPlan.MONTH_1,
    paymentStatus: 'PAID',
    paymentMode: 'UPI',
    paymentReference: '',
    address: '',
    city: 'Mumbai',
    state: 'Maharashtra',
    pincode: '400050',
    enabledModules: Object.values(SaaSModule) as string[],
  });

  // Form State for Edit Client
  const [editFormData, setEditFormData] = useState({
    plan: SaaSSubscriptionPlan.MONTH_1,
    price: 800,
    paymentStatus: 'PAID',
    paymentReference: '',
    status: 'ACTIVE',
    enabledModules: [] as string[],
  });

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);

  // State for Role Permissions Matrix Modal
  const [isPermissionsModalOpen, setIsPermissionsModalOpen] = useState<boolean>(false);
  const [permissionsTenant, setPermissionsTenant] = useState<TenantClient | null>(null);
  const [currentPermissions, setCurrentPermissions] = useState<Record<string, string[]>>({});
  const [permissionCategoryFilter, setPermissionCategoryFilter] = useState<string>('ALL');
  const [permissionSearch, setPermissionSearch] = useState<string>('');
  const [isSavingPermissions, setIsSavingPermissions] = useState<boolean>(false);

  const fetchDashboardData = async () => {
    setIsLoading(true);
    try {
      setPageError(null);
      const [statsRes, tenantsRes] = await Promise.all([
        apiClient.get('/super-admin/stats'),
        apiClient.get('/super-admin/tenants'),
      ]);
      setStats(statsRes.data?.data || statsRes.data);
      setTenants(tenantsRes.data?.data || tenantsRes.data || []);
    } catch (err: any) {
      setPageError(err?.response?.data?.message || err?.message || 'Unable to load SaaS platform data.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const nameVal = e.target.value;
    const autoSlug = nameVal
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    setFormData((prev) => ({
      ...prev,
      name: nameVal,
      slug: prev.slug === '' || prev.slug === autoSlug.slice(0, -1) ? autoSlug : prev.slug,
    }));
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSubmitting(true);

    try {
      const res = await apiClient.post('/super-admin/tenants', formData);
      const data = res.data?.data || res.data;

      setCreatedClientInfo({
        gymName: formData.name,
        email: formData.ownerEmail,
        tempPassword: data.temporaryPassword,
        slug: formData.slug,
      });
      setFeedback({ type: 'success', message: `Tenant ${formData.name} onboarded successfully.` });

      setIsCreateModalOpen(false);
      // Reset form
      setFormData({
        name: '',
        slug: '',
        ownerName: '',
        ownerEmail: '',
        ownerPhone: '',
        initialPassword: '',
        plan: SaaSSubscriptionPlan.MONTH_1,
        paymentStatus: 'PAID',
        paymentMode: 'UPI',
        paymentReference: '',
        address: '',
        city: 'Mumbai',
        state: 'Maharashtra',
        pincode: '400050',
        enabledModules: Object.values(SaaSModule),
      });

      fetchDashboardData();
    } catch (err: unknown) {
      const msg = (err as any)?.response?.data?.message || (err instanceof Error ? err.message : 'Failed to onboard client');
      setFormError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenEdit = (tenant: TenantClient) => {
    setSelectedTenant(tenant);
    setEditFormData({
      plan: tenant.subscriptionPlan,
      price: tenant.subscriptionPrice,
      paymentStatus: tenant.paymentStatus,
      paymentReference: tenant.paymentReference || '',
      status: tenant.status,
      enabledModules: tenant.enabledModules || Object.values(SaaSModule),
    });
    setIsEditModalOpen(true);
  };

  const handleEditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTenant) return;

    setIsSubmitting(true);
    setFormError(null);
    try {
      await apiClient.patch(`/super-admin/tenants/${selectedTenant.id}`, editFormData);
      setIsEditModalOpen(false);
      fetchDashboardData();
    } catch (err: unknown) {
      const msg = (err as any)?.response?.data?.message || (err instanceof Error ? err.message : 'Failed to update subscription');
      setFormError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleImpersonate = async (tenantId: string) => {
    try {
      const res = await apiClient.post(`/super-admin/impersonate/${tenantId}`);
      const data = res.data?.data || res.data;
      impersonateTenant(data.accessToken, data.tenant, data.user);
      navigate('/');
    } catch {
      alert('Unable to impersonate client at this time.');
    }
  };

  const handleResetPassword = async (tenant: TenantClient) => {
    if (!confirm(`Are you sure you want to reset password for ${tenant.name} (${tenant.owner?.email})?`)) {
      return;
    }
    try {
      const res = await apiClient.post(`/super-admin/tenants/${tenant.id}/reset-password`);
      const data = res.data?.data || res.data;
      setResetPasswordResult({
        email: data.email,
        tempPassword: data.temporaryPassword,
      });
    } catch {
      alert('Failed to reset password.');
    }
  };

  const handleSendReminder = async (tenant: TenantClient) => {
    try {
      await apiClient.post(`/super-admin/tenants/${tenant.id}/send-reminder`);
      alert(`Renewal reminder email successfully dispatched to ${tenant.owner?.email || tenant.email}!`);
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to send renewal reminder email.');
    }
  };

  const handleOpenDelete = (tenant: TenantClient) => {
    setTenantToDelete(tenant);
    setConfirmSlugInput('');
    setDeleteError(null);
  };

  const handleConfirmDelete = async () => {
    if (!tenantToDelete) return;
    if (confirmSlugInput.trim().toLowerCase() !== tenantToDelete.slug.toLowerCase().trim()) {
      setDeleteError(`Please type "${tenantToDelete.slug}" exactly to confirm.`);
      return;
    }

    setIsDeletingTenant(true);
    setDeleteError(null);
    try {
      await apiClient.delete(`/super-admin/tenants/${tenantToDelete.id}`, {
        data: { confirmSlug: confirmSlugInput },
      });
      alert(`Tenant "${tenantToDelete.name}" (${tenantToDelete.slug}) and all related data have been permanently deleted.`);
      setTenantToDelete(null);
      fetchDashboardData();
    } catch (err: any) {
      setDeleteError(err?.response?.data?.message || 'Failed to delete client tenant.');
    } finally {
      setIsDeletingTenant(false);
    }
  };

  const toggleModuleSelection = (mod: string) => {
    setFormData((prev) => {
      const exists = prev.enabledModules.includes(mod);
      return {
        ...prev,
        enabledModules: exists
          ? prev.enabledModules.filter((m) => m !== mod)
          : [...prev.enabledModules, mod],
      };
    });
  };

  const toggleEditModuleSelection = (mod: string) => {
    setEditFormData((prev) => {
      const exists = prev.enabledModules.includes(mod);
      return {
        ...prev,
        enabledModules: exists
          ? prev.enabledModules.filter((m) => m !== mod)
          : [...prev.enabledModules, mod],
      };
    });
  };

  const handleOpenPermissionsModal = (client: TenantClient) => {
    setPermissionsTenant(client);
    const initial =
      client.rolePermissions && Object.keys(client.rolePermissions).length > 0
        ? JSON.parse(JSON.stringify(client.rolePermissions))
        : JSON.parse(JSON.stringify(DEFAULT_ROLE_PERMISSIONS));
    setCurrentPermissions(initial);
    setPermissionCategoryFilter('ALL');
    setPermissionSearch('');
    setIsPermissionsModalOpen(true);
  };

  const togglePermission = (role: string, permId: string) => {
    setCurrentPermissions((prev) => {
      const roleList = prev[role] || [];
      const exists = roleList.includes(permId);
      return {
        ...prev,
        [role]: exists ? roleList.filter((p) => p !== permId) : [...roleList, permId],
      };
    });
  };

  const handleResetToDefaults = () => {
    if (confirm('Reset role permissions to system standard defaults for this client?')) {
      setCurrentPermissions(JSON.parse(JSON.stringify(DEFAULT_ROLE_PERMISSIONS)));
    }
  };

  const handleGrantAllForRole = (role: string) => {
    setCurrentPermissions((prev) => ({
      ...prev,
      [role]: ALL_PERMISSIONS.map((p) => p.id),
    }));
  };

  const handleRevokeAllForRole = (role: string) => {
    setCurrentPermissions((prev) => ({
      ...prev,
      [role]: [],
    }));
  };

  const handleSavePermissions = async () => {
    if (!permissionsTenant) return;
    setIsSavingPermissions(true);
    try {
      await apiClient.patch(`/super-admin/tenants/${permissionsTenant.id}/permissions`, {
        rolePermissions: currentPermissions,
      });
      alert(`Role permissions matrix updated successfully for ${permissionsTenant.name}.`);
      setIsPermissionsModalOpen(false);
      fetchDashboardData();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to update role permissions.');
    } finally {
      setIsSavingPermissions(false);
    }
  };

  const filteredTenants = tenants.filter((t) => {
    const q = searchQuery.toLowerCase();
    return (
      (statusFilter === 'ALL' || t.status === statusFilter) &&
      (planFilter === 'ALL' || t.subscriptionPlan === planFilter) &&
      (t.name.toLowerCase().includes(q) ||
        t.slug.toLowerCase().includes(q) ||
        t.owner?.email.toLowerCase().includes(q) ||
        t.owner?.fullName.toLowerCase().includes(q) ||
        t.phone.includes(q))
    );
  });

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#E5E7EB] pb-5">
        <div>
          <span className="text-[11px] font-mono uppercase font-bold text-[#B91C1C] tracking-wider">
            Platform Master Console
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-[#0A192F]">
            SaaS Clients & Revenue Management
          </h1>
          <p className="text-xs text-[#6B7280]">
            Multi-tenant subscription manager, company subdomain provisioning, and feature delegation.
          </p>
        </div>

        <Button
          onClick={() => {
            setFormError(null);
            setIsCreateModalOpen(true);
          }}
          className="rounded-none text-xs h-9 bg-[#0A192F] text-[#FBFBF9] hover:bg-[#162E52] uppercase font-bold tracking-wider px-4 flex items-center space-x-2"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
          </svg>
          <span>Onboard New Gym Client</span>
        </Button>
      </div>

      {/* KPI Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 border border-[#E5E7EB] bg-[#FBFBF9]">
          <div className="text-[11px] font-bold uppercase tracking-wider text-[#6B7280]">
            Total Gym Clients
          </div>
          <div className="text-2xl font-bold text-[#0A192F] mt-1 font-mono">
            {stats?.totalTenants ?? ''}
          </div>
          <div className="text-[11px] text-[#10B981] mt-1 font-medium">
            {stats?.activeTenants ?? 0} active subscriptions
          </div>
        </div>

        <div className="p-4 border border-[#E5E7EB] bg-[#FBFBF9]">
          <div className="text-[11px] font-bold uppercase tracking-wider text-[#6B7280]">
            Active Trial Gyms
          </div>
          <div className="text-2xl font-bold text-[#0A192F] mt-1 font-mono">
            {stats?.trialCount ?? ''}
          </div>
          <div className="text-[11px] text-[#6B7280] mt-1">
            7-day evaluation period
          </div>
        </div>

        <div className="p-4 border border-[#E5E7EB] bg-[#FBFBF9]">
          <div className="text-[11px] font-bold uppercase tracking-wider text-[#6B7280]">
            Expired / Overdue
          </div>
          <div className="text-2xl font-bold text-[#B91C1C] mt-1 font-mono">
            {stats?.expiredCount ?? ''}
          </div>
          <div className="text-[11px] text-[#B91C1C] mt-1">
            Pending renewal / follow-up
          </div>
        </div>

        <div className="p-4 border border-[#E5E7EB] bg-[#0A192F] text-[#FBFBF9]">
          <div className="text-[11px] font-bold uppercase tracking-wider text-[#9CA3AF]">
            Total SaaS Revenue
          </div>
          <div className="text-2xl font-bold text-[#FBFBF9] mt-1 font-mono">
            {stats?.totalRevenue?.toLocaleString('en-IN') ?? '0'}
          </div>
          <div className="text-[11px] text-[#34D399] mt-1">
            Collected via client subscriptions
          </div>
        </div>
      </div>

      {feedback && <div className={`p-3 border text-xs ${feedback.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-red-50 border-red-200 text-red-800'}`}>{feedback.message}</div>}
      {pageError && <div className="p-3 border border-red-200 bg-red-50 text-red-800 text-xs flex items-center justify-between"><span>{pageError}</span><Button variant="outline" className="rounded-none text-xs h-7" onClick={fetchDashboardData}>Retry</Button></div>}

      {/* Client Search & Filter */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Input
            placeholder="Search gym by name, slug, email, or mobile..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="rounded-none text-xs h-9 border-[#E5E7EB] bg-[#FBFBF9] pl-9"
          />
          <svg
            className="absolute left-3 top-2.5 h-4 w-4 text-[#9CA3AF]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
          </svg>
        </div>

        <div className="flex items-center gap-2">
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="h-9 border border-[#E5E7EB] bg-[#FBFBF9] px-2 text-xs">
            <option value="ALL">All statuses</option><option value="ACTIVE">Active</option><option value="SUSPENDED">Suspended</option>
          </select>
          <select value={planFilter} onChange={(e) => setPlanFilter(e.target.value)} className="h-9 border border-[#E5E7EB] bg-[#FBFBF9] px-2 text-xs">
            <option value="ALL">All plans</option>
            {Object.values(SaaSSubscriptionPlan).map((plan) => <option key={plan} value={plan}>{plan.replace(/_/g, ' ')}</option>)}
          </select>
        </div>

        <div className="text-xs text-[#6B7280]">
          Showing <strong>{filteredTenants.length}</strong> of {tenants.length} clients
        </div>
      </div>

      {/* Clients Directory Table */}
      <div className="border border-[#E5E7EB] bg-[#FBFBF9] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[#111827]">
            <thead className="bg-[#0A192F] text-[#FBFBF9] uppercase tracking-wider text-[11px] font-semibold">
              <tr>
                <th className="py-3 px-4 whitespace-nowrap">Gym Client & Subdomain</th>
                <th className="py-3 px-4 whitespace-nowrap">Owner & Contact</th>
                <th className="py-3 px-4 whitespace-nowrap">SaaS Subscription</th>
                <th className="py-3 px-4 whitespace-nowrap">Payment Status</th>
                <th className="py-3 px-4 whitespace-nowrap">Validity / Expiry</th>
                <th className="py-3 px-4 whitespace-nowrap">Active Modules</th>
                <th className="py-3 px-4 text-right whitespace-nowrap min-w-[400px]">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB]">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#6B7280]">
                    Loading SaaS platform data...
                  </td>
                </tr>
              ) : filteredTenants.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#6B7280]">
                    No gym clients found matching query. Click &quot;Onboard New Gym Client&quot; to provision a new tenant.
                  </td>
                </tr>
              ) : (
                filteredTenants.map((client) => {
                  const planInfo = SAAS_PLANS[client.subscriptionPlan];
                  return (
                    <tr key={client.id} className="hover:bg-[#F5F5F0] transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center space-x-2.5">
                          {client.logoUrl ? (
                            <img
                              src={client.logoUrl}
                              alt={client.name}
                              className="h-8 w-8 object-contain rounded-none border border-[#E5E7EB] p-0.5"
                            />
                          ) : (
                            <div className="h-8 w-8 bg-[#0A192F] text-[#FBFBF9] flex items-center justify-center font-bold text-xs rounded-none">
                              {client.name.charAt(0)}
                            </div>
                          )}
                          <div>
                            <div className="font-bold text-[#0A192F]">{client.name}</div>
                            <div className="font-mono text-[11px] text-[#6B7280]">
                              {client.slug}.trifit.space
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="font-semibold text-[#111827]">
                          {client.owner?.fullName || 'No Owner'}
                        </div>
                        <div className="text-[11px] text-[#4B5563]">{client.email}</div>
                        <div className="text-[10px] text-[#6B7280] font-mono">{client.phone}</div>
                      </td>

                      <td className="py-3 px-4">
                        <span className="font-semibold text-[#0A192F] block">
                          {planInfo?.name || client.subscriptionPlan}
                        </span>
                        <span className="text-[11px] font-mono font-bold text-[#B91C1C]">
                          ₹{client.subscriptionPrice.toLocaleString('en-IN')}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-2 py-0.5 text-[10px] font-mono font-bold uppercase rounded-none ${
                            client.paymentStatus === 'PAID'
                              ? 'bg-emerald-100 text-emerald-800'
                              : client.paymentStatus === 'TRIAL'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-red-100 text-red-800'
                          }`}
                        >
                          {client.paymentStatus}
                        </span>
                        {client.paymentReference && (
                          <div className="text-[10px] font-mono text-[#6B7280] truncate max-w-[120px]" title={client.paymentReference}>
                            Ref: {client.paymentReference}
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4 text-[#4B5563]">
                        {client.isLifetime ? (
                          <span className="text-emerald-700 font-bold uppercase text-[10px]">
                            Lifetime Free AMC
                          </span>
                        ) : client.planExpiresAt ? (
                          <div>
                            <div>{client.planExpiresAt.split('T')[0]}</div>
                            <div className="text-[10px] text-[#6B7280]">
                              Started {client.planStartedAt.split('T')[0]}
                            </div>
                          </div>
                        ) : (
                          'Active'
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1 max-w-[200px]">
                          {(client.enabledModules || []).slice(0, 4).map((mod) => (
                            <span
                              key={mod}
                              className="px-1.5 py-0.5 text-[9px] font-mono font-bold bg-[#E5E7EB] text-[#0A192F]"
                            >
                              {mod}
                            </span>
                          ))}
                          {(client.enabledModules || []).length > 4 && (
                            <span className="px-1.5 py-0.5 text-[9px] font-mono bg-gray-200 text-gray-700">
                              +{(client.enabledModules || []).length - 4} more
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-3 px-4 text-right whitespace-nowrap min-w-[400px]">
                        <div className="inline-flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleImpersonate(client.id)}
                            className="whitespace-nowrap px-3 py-1.5 text-xs font-semibold rounded-none bg-[#0A192F] text-[#FBFBF9] hover:bg-[#162E52] transition-colors"
                            title="Login directly into this client's console"
                          >
                            Login as Client
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenEdit(client)}
                            className="whitespace-nowrap px-3 py-1.5 text-xs font-semibold rounded-none border border-[#D1D5DB] bg-white text-[#111827] hover:bg-[#F3F4F6] transition-colors"
                          >
                            Edit Plan
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenPermissionsModal(client)}
                            className="whitespace-nowrap px-3 py-1.5 text-xs font-semibold rounded-none border border-blue-300 bg-blue-50 text-blue-800 hover:bg-blue-100 transition-colors"
                            title="Manage Granular Role Permissions Matrix"
                          >
                            Permissions
                          </button>

                          <button
                            type="button"
                            onClick={() => handleResetPassword(client)}
                            className="whitespace-nowrap px-3 py-1.5 text-xs font-semibold rounded-none border border-red-300 bg-red-50 text-[#B91C1C] hover:bg-red-100 transition-colors"
                            title="Reset gym owner password"
                          >
                            Reset Pass
                          </button>

                          {!client.isLifetime && client.planExpiresAt && (
                            <button
                              type="button"
                              onClick={() => handleSendReminder(client)}
                              className="whitespace-nowrap px-3 py-1.5 text-xs font-semibold rounded-none border border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 transition-colors"
                              title="Send subscription renewal reminder email"
                            >
                              Send Reminder
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={() => handleOpenDelete(client)}
                            className="whitespace-nowrap px-3 py-1.5 text-xs font-semibold rounded-none border border-red-300 bg-red-100/70 text-[#991B1B] hover:bg-red-200 transition-colors"
                            title="Delete gym client tenant and purge all records"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL: ONBOARD NEW CLIENT */}
      {isCreateModalOpen && createPortal(
        <div className="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-[#FBFBF9] border border-[#E5E7EB] w-full max-w-2xl max-h-[92vh] overflow-y-auto p-6 space-y-4 my-auto">
            <div className="border-b border-[#E5E7EB] pb-3 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-[#0A192F]">
                  Onboard New Gym Client (Enterprise Tenant)
                </h3>
                <p className="text-xs text-[#6B7280]">
                  Creates the client tenant, subdomain slug, gym owner credentials, and delegates enabled features.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateModalOpen(false)}
                className="text-[#6B7280] hover:text-[#0A192F] p-1 transition-colors"
                aria-label="Close"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {formError && (
              <div className="p-3 text-xs bg-red-50 text-[#B91C1C] border border-red-200">
                {formError}
              </div>
            )}

            <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
              {/* Gym Enterprise Details */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold mb-1 text-[#111827]">
                    Gym Company Name *
                  </label>
                  <Input
                    required
                    placeholder="e.g. Iron Forge Gym"
                    value={formData.name}
                    onChange={handleNameChange}
                    className="rounded-none text-xs h-9 border-[#E5E7EB]"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-[#111827]">
                    Subdomain / Slug Identifier *
                  </label>
                  <div className="flex">
                    <Input
                      required
                      placeholder="e.g. ironforge"
                      value={formData.slug}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''),
                        })
                      }
                      className="rounded-none text-xs h-9 border-[#E5E7EB] font-mono"
                    />
                    <span className="inline-flex items-center px-3 border border-l-0 border-[#E5E7EB] bg-[#F5F5F0] text-[11px] font-mono text-[#6B7280]">
                      .trifit.space
                    </span>
                  </div>
                </div>
              </div>

              {/* Gym Owner Admin Details */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-[#E5E7EB] pt-3">
                <div>
                  <label className="block font-semibold mb-1 text-[#111827]">
                    Gym Owner / Admin Name *
                  </label>
                  <Input
                    required
                    placeholder="e.g. Vikram Sharma"
                    value={formData.ownerName}
                    onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
                    className="rounded-none text-xs h-9 border-[#E5E7EB]"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-[#111827]">
                    Admin Email (Login ID) *
                  </label>
                  <Input
                    required
                    type="email"
                    placeholder="admin@ironforge.in"
                    value={formData.ownerEmail}
                    onChange={(e) => setFormData({ ...formData, ownerEmail: e.target.value })}
                    className="rounded-none text-xs h-9 border-[#E5E7EB]"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-[#111827]">
                    Admin Mobile Number *
                  </label>
                  <Input
                    required
                    placeholder="10-digit mobile"
                    value={formData.ownerPhone}
                    onChange={(e) => setFormData({ ...formData, ownerPhone: e.target.value })}
                    className="rounded-none text-xs h-9 border-[#E5E7EB]"
                  />
                </div>

                <div className="sm:col-span-3">
                  <label className="block font-semibold mb-1 text-[#111827]">
                    Admin Login Password (Optional)
                  </label>
                  <Input
                    type="text"
                    placeholder="e.g. Tristara@123 (Leave blank to auto-generate a secure password)"
                    value={formData.initialPassword || ''}
                    onChange={(e) => setFormData({ ...formData, initialPassword: e.target.value })}
                    className="rounded-none text-xs h-9 border-[#E5E7EB]"
                  />
                  <span className="text-[10px] text-[#6B7280]">
                    If left blank, a secure password is generated automatically and shown on screen + emailed to client.
                  </span>
                </div>
              </div>

              {/* SaaS Plan & Payment Details */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-[#E5E7EB] pt-3">
                <div>
                  <label className="block font-semibold mb-1 text-[#111827]">
                    SaaS Subscription Plan *
                  </label>
                  <select
                    value={formData.plan}
                    onChange={(e) =>
                      setFormData({ ...formData, plan: e.target.value as SaaSSubscriptionPlan })
                    }
                    className="w-full h-9 border border-[#E5E7EB] bg-[#FBFBF9] px-2 rounded-none text-xs font-semibold"
                  >
                    {Object.values(SAAS_PLANS).map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} - ₹{p.price.toLocaleString('en-IN')} ({p.durationLabel})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-[#111827]">
                    Payment Status
                  </label>
                  <select
                    value={formData.paymentStatus}
                    onChange={(e) => setFormData({ ...formData, paymentStatus: e.target.value })}
                    className="w-full h-9 border border-[#E5E7EB] bg-[#FBFBF9] px-2 rounded-none text-xs"
                  >
                    <option value="PAID">PAID</option>
                    <option value="TRIAL">TRIAL</option>
                    <option value="PENDING">PENDING</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-[#111827]">
                    Payment Mode & Ref (Optional)
                  </label>
                  <Input
                    placeholder="e.g. UPI / HDFC-REF-88910"
                    value={formData.paymentReference}
                    onChange={(e) => setFormData({ ...formData, paymentReference: e.target.value })}
                    className="rounded-none text-xs h-9 border-[#E5E7EB]"
                  />
                </div>
              </div>

              {/* Modular Feature Flags Delegation */}
              <div className="border-t border-[#E5E7EB] pt-3">
                <div className="flex items-center justify-between mb-2">
                  <label className="block font-bold text-[#0A192F] uppercase text-[11px] tracking-wider">
                    Permitted Feature Modules (Client Sidebars & Routing)
                  </label>
                  <div className="space-x-2">
                    <button
                      type="button"
                      onClick={() =>
                        setFormData({
                          ...formData,
                          enabledModules: Object.values(SaaSModule),
                        })
                      }
                      className="text-[10px] text-[#0A192F] underline hover:text-[#B91C1C]"
                    >
                      Select All
                    </button>
                    <span className="text-[#9CA3AF]">|</span>
                    <button
                      type="button"
                      onClick={() =>
                        setFormData({
                          ...formData,
                          enabledModules: ['MEMBERS', 'BILLING'],
                        })
                      }
                      className="text-[10px] text-[#0A192F] underline hover:text-[#B91C1C]"
                    >
                      Core Only
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-2 border border-[#E5E7EB] bg-[#F5F5F0]">
                  {SAAS_MODULES_LIST.map((mod) => {
                    const isChecked = formData.enabledModules.includes(mod.id);
                    return (
                      <label
                        key={mod.id}
                        className={`flex items-start space-x-2 p-2 border cursor-pointer select-none ${
                          isChecked
                            ? 'bg-[#FBFBF9] border-[#0A192F]/40'
                            : 'bg-transparent border-transparent opacity-60'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleModuleSelection(mod.id)}
                          className="mt-0.5 rounded-none"
                        />
                        <div>
                          <div className="font-bold text-[#0A192F] leading-tight">
                            {mod.label}
                          </div>
                          <div className="text-[10px] text-[#6B7280] leading-tight">
                            {mod.description}
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
                <p className="text-[10px] text-[#6B7280] mt-1">
                  Unchecked modules will be completely hidden from the gym owner and their staff members.
                </p>
              </div>

              {/* Form Buttons */}
              <div className="flex justify-end space-x-3 pt-3 border-t border-[#E5E7EB]">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="rounded-none text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-none text-xs bg-[#0A192F] text-[#FBFBF9] hover:bg-[#162E52] uppercase font-bold px-5"
                >
                  {isSubmitting ? 'Provisioning Client...' : 'Provision Tenant & Generate Admin'}
                </Button>
              </div>
            </form>
          </div>
        </div>,
        document.body,
      )}

      {/* MODAL: EDIT SUBSCRIPTION & MODULES */}
      {isEditModalOpen && selectedTenant && createPortal(
        <div className="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-[#FBFBF9] border border-[#E5E7EB] w-full max-w-xl max-h-[92vh] overflow-y-auto p-6 space-y-4 my-auto">
            <div className="border-b border-[#E5E7EB] pb-3 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold uppercase tracking-wider text-[#0A192F]">
                  Edit Subscription: {selectedTenant.name}
                </h3>
                <p className="text-xs text-[#6B7280]">
                  Modify SaaS plan, extend subscription validity, or update module delegation.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                className="text-[#6B7280] hover:text-[#0A192F] p-1 transition-colors"
                aria-label="Close"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {formError && (
              <div className="p-3 text-xs bg-red-50 text-[#B91C1C] border border-red-200">
                {formError}
              </div>
            )}

            <form onSubmit={handleEditSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block font-semibold mb-1 text-[#111827]">
                    Select Plan
                  </label>
                  <select
                    value={editFormData.plan}
                    onChange={(e) => {
                      const p = e.target.value as SaaSSubscriptionPlan;
                      setEditFormData({
                        ...editFormData,
                        plan: p,
                        price: SAAS_PLANS[p]?.price ?? editFormData.price,
                      });
                    }}
                    className="w-full h-9 border border-[#E5E7EB] bg-[#FBFBF9] px-2 rounded-none text-xs font-semibold"
                  >
                    {Object.values(SAAS_PLANS).map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} - ₹{p.price.toLocaleString('en-IN')}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-[#111827]">
                    Agreed Fee (₹)
                  </label>
                  <Input
                    type="number"
                    value={editFormData.price}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, price: parseInt(e.target.value, 10) || 0 })
                    }
                    className="rounded-none text-xs h-9 border-[#E5E7EB]"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-[#111827]">
                    Payment Status
                  </label>
                  <select
                    value={editFormData.paymentStatus}
                    onChange={(e) =>
                      setEditFormData({ ...editFormData, paymentStatus: e.target.value })
                    }
                    className="w-full h-9 border border-[#E5E7EB] bg-[#FBFBF9] px-2 rounded-none text-xs"
                  >
                    <option value="PAID">PAID</option>
                    <option value="TRIAL">TRIAL</option>
                    <option value="PENDING">PENDING</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold mb-1 text-[#111827]">
                    Client Tenant Status
                  </label>
                  <select
                    value={editFormData.status}
                    onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}
                    className="w-full h-9 border border-[#E5E7EB] bg-[#FBFBF9] px-2 rounded-none text-xs"
                  >
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="SUSPENDED">SUSPENDED</option>
                  </select>
                </div>
              </div>

              {/* Module Toggles */}
              <div className="border-t border-[#E5E7EB] pt-3">
                <label className="block font-bold text-[#0A192F] uppercase text-[11px] tracking-wider mb-2">
                  Active Modules Delegation
                </label>
                <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto p-2 border border-[#E5E7EB] bg-[#F5F5F0]">
                  {SAAS_MODULES_LIST.map((mod) => {
                    const isChecked = editFormData.enabledModules.includes(mod.id);
                    return (
                      <label
                        key={mod.id}
                        className={`flex items-center space-x-2 p-1.5 border cursor-pointer select-none ${
                          isChecked ? 'bg-[#FBFBF9] border-[#0A192F]/40' : 'bg-transparent border-transparent opacity-60'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleEditModuleSelection(mod.id)}
                          className="rounded-none"
                        />
                        <span className="font-semibold text-[11px] text-[#0A192F]">{mod.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end space-x-3 pt-3 border-t border-[#E5E7EB]">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsEditModalOpen(false)}
                  className="rounded-none text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-none text-xs bg-[#0A192F] text-[#FBFBF9] hover:bg-[#162E52] uppercase font-bold px-5"
                >
                  {isSubmitting ? 'Saving...' : 'Save Subscription Changes'}
                </Button>
              </div>
            </form>
          </div>
        </div>,
        document.body,
      )}

      {/* MODAL: NEW CLIENT CREDENTIALS CREATED */}
      {createdClientInfo && createPortal(
        <div className="fixed inset-0 z-[99999] bg-black/70 flex items-center justify-center p-4">
          <div className="bg-[#FBFBF9] border border-[#E5E7EB] w-full max-w-md p-6 space-y-4">
            <div className="border-b border-[#E5E7EB] pb-2">
              <span className="text-[10px] font-mono uppercase font-bold text-emerald-700 tracking-wider">
                ✓ Onboarding Successful
              </span>
              <h3 className="text-base font-bold text-[#0A192F] mt-1">
                Client Credentials Provisioned
              </h3>
            </div>

            <p className="text-xs text-[#6B7280]">
              The gym tenant <strong>{createdClientInfo.gymName}</strong> is now live. Share these credentials with the client:
            </p>

            <div className="p-3 bg-[#F5F5F0] border border-[#E5E7EB] space-y-2 font-mono text-xs">
              <div className="flex justify-between">
                <span className="text-[#6B7280]">Subdomain URL:</span>
                <span className="font-bold text-[#0A192F]">{createdClientInfo.slug}.trifit.space</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6B7280]">Login Email:</span>
                <span className="font-bold text-[#0A192F]">{createdClientInfo.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6B7280]">Temporary Password:</span>
                <span className="font-bold text-[#B91C1C] bg-red-50 px-2 py-0.5 border border-red-200">
                  {createdClientInfo.tempPassword}
                </span>
              </div>
            </div>

            <div className="bg-emerald-50 border border-emerald-200 p-2.5 text-[11px] text-emerald-900 flex items-center space-x-2">
              <span className="font-bold">Email Service:</span>
              <span>Welcome notification & temporary login credentials dispatched to <strong>{createdClientInfo.email}</strong>.</span>
            </div>

            <p className="text-[11px] text-[#6B7280]">
              The client will be required to set their permanent password on their first login.
            </p>

            <div className="pt-2">
              <Button
                onClick={() => setCreatedClientInfo(null)}
                className="w-full rounded-none text-xs bg-[#0A192F] text-[#FBFBF9] hover:bg-[#162E52] uppercase font-bold"
              >
                Close & Copy Details
              </Button>
            </div>
          </div>
        </div>,
        document.body,
      )}

      {/* MODAL: RESET PASSWORD RESULT */}
      {resetPasswordResult && createPortal(
        <div className="fixed inset-0 z-[99999] bg-black/70 flex items-center justify-center p-4">
          <div className="bg-[#FBFBF9] border border-[#E5E7EB] w-full max-w-md p-6 space-y-4">
            <div className="border-b border-[#E5E7EB] pb-2">
              <span className="text-[10px] font-mono uppercase font-bold text-amber-700 tracking-wider">
                ✓ Temporary Password Generated
              </span>
              <h3 className="text-base font-bold text-[#0A192F] mt-1">
                Password Reset Complete
              </h3>
            </div>

            <div className="p-3 bg-[#F5F5F0] border border-[#E5E7EB] space-y-2 font-mono text-xs">
              <div className="flex justify-between">
                <span className="text-[#6B7280]">Account:</span>
                <span className="font-bold text-[#0A192F]">{resetPasswordResult.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#6B7280]">New Temporary Password:</span>
                <span className="font-bold text-[#B91C1C] bg-red-50 px-2 py-0.5 border border-red-200">
                  {resetPasswordResult.tempPassword}
                </span>
              </div>
            </div>

            <div className="bg-emerald-50 border border-emerald-200 p-2.5 text-[11px] text-emerald-900 flex items-center space-x-2">
              <span className="font-bold">Email Service:</span>
              <span>New password and login URL dispatched to <strong>{resetPasswordResult.email}</strong>.</span>
            </div>

            <Button
              onClick={() => setResetPasswordResult(null)}
              className="w-full rounded-none text-xs bg-[#0A192F] text-[#FBFBF9] hover:bg-[#162E52] uppercase font-bold"
            >
              Done
            </Button>
          </div>
        </div>,
        document.body,
      )}

      {/* GITHUB-STYLE DELETE CONFIRMATION MODAL */}
      {tenantToDelete && createPortal(
        <div className="fixed inset-0 z-[99999] bg-black/75 flex items-center justify-center p-4">
          <div className="bg-[#FBFBF9] border-2 border-[#B91C1C] w-full max-w-lg p-6 space-y-4">
            <div className="border-b border-[#E5E7EB] pb-3 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="h-3 w-3 bg-[#B91C1C] inline-block" />
                <h3 className="text-sm font-bold text-[#0A192F] uppercase tracking-wider">
                  Permanently Delete Gym Client Tenant
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setTenantToDelete(null)}
                className="text-[#6B7280] hover:text-[#0A192F] p-1 transition-colors"
                aria-label="Close"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-3.5 bg-red-50 border border-red-200 text-xs text-red-900 space-y-2">
              <div className="font-bold text-xs uppercase tracking-wide text-[#B91C1C]">
                Critical Warning: This action cannot be undone!
              </div>
              <p className="leading-relaxed">
                This will permanently delete the <strong>{tenantToDelete.name}</strong> tenant, its database schema records, all member registrations, membership subscriptions, financial invoices, staff users, attendance telemetry, and inventory stock.
              </p>
            </div>

            <div className="space-y-2 text-xs">
              <label className="block text-[#111827]">
                To confirm permanent deletion, please type <strong className="font-mono text-[#B91C1C] bg-red-100/70 px-1 py-0.5 border border-red-200 select-all">{tenantToDelete.slug}</strong> in the field below:
              </label>
              <Input
                autoFocus
                value={confirmSlugInput}
                onChange={(e) => {
                  setConfirmSlugInput(e.target.value);
                  setDeleteError(null);
                }}
                placeholder={tenantToDelete.slug}
                className="rounded-none border-[#D1D5DB] bg-white h-9 text-xs font-mono"
              />
              {deleteError && (
                <div className="text-xs text-red-700 font-semibold">{deleteError}</div>
              )}
            </div>

            <div className="pt-2 flex items-center justify-end space-x-3 border-t border-[#E5E7EB]">
              <Button
                variant="outline"
                type="button"
                onClick={() => setTenantToDelete(null)}
                disabled={isDeletingTenant}
                className="rounded-none text-xs border-[#D1D5DB] text-[#111827] hover:bg-[#F3F4F6]"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={handleConfirmDelete}
                disabled={confirmSlugInput.trim().toLowerCase() !== tenantToDelete.slug.toLowerCase().trim() || isDeletingTenant}
                className="rounded-none text-xs bg-[#B91C1C] text-[#FBFBF9] hover:bg-[#991B1B] disabled:opacity-40 disabled:cursor-not-allowed font-bold uppercase tracking-wider"
              >
                {isDeletingTenant ? 'Permanently Deleting...' : 'I understand the consequences, delete this tenant'}
              </Button>
            </div>
          </div>
        </div>,
        document.body,
      )}

      {/* MODAL: ROLE PERMISSIONS MATRIX */}
      {isPermissionsModalOpen && permissionsTenant && createPortal(
        <div className="fixed inset-0 z-[9999] bg-black/75 flex items-center justify-center p-3 sm:p-6">
          <div className="bg-[#FBFBF9] border border-[#E5E7EB] w-full max-w-6xl h-[88vh] max-h-[840px] flex flex-col overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="p-5 pb-3.5 border-b border-[#E5E7EB] flex items-center justify-between shrink-0 bg-[#FBFBF9]">
              <div>
                <div className="flex items-center gap-2">
                  <span className="bg-[#0A192F] text-[#FBFBF9] text-[10px] font-mono px-2 py-0.5 font-bold uppercase tracking-wider">
                    Role Access Control Matrix
                  </span>
                  <span className="text-xs font-mono text-[#6B7280]">
                    Subdomain: {permissionsTenant.slug}.trifit.space
                  </span>
                </div>
                <h3 className="text-base font-bold text-[#0A192F] uppercase tracking-wide mt-1">
                  Manage Role Permissions: {permissionsTenant.name}
                </h3>
                <p className="text-xs text-[#6B7280]">
                  Configure exact permissions per role using interactive ticks (✓ Allowed) and crosses (✕ Blocked). Unchecked features are completely hidden from the client staff.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsPermissionsModalOpen(false)}
                className="text-[#6B7280] hover:text-[#0A192F] p-1 transition-colors"
                aria-label="Close"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Filter Toolbar */}
            <div className="px-5 py-2.5 bg-[#F5F5F0] border-b border-[#E5E7EB] shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280] mr-1">
                  Filter Category:
                </span>
                {['ALL', 'Administration', 'Members', 'Billing', 'Attendance', 'Biometrics', 'Inventory', 'CRM', 'Trainers', 'Operations'].map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setPermissionCategoryFilter(cat)}
                    className={
                      permissionCategoryFilter === cat
                        ? 'px-2 py-0.5 text-[11px] font-semibold border transition-colors rounded-none bg-[#0A192F] text-[#FBFBF9] border-[#0A192F]'
                        : 'px-2 py-0.5 text-[11px] font-semibold border transition-colors rounded-none bg-white text-[#4B5563] border-[#D1D5DB] hover:bg-[#E5E7EB]'
                    }
                  >
                    {cat}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={permissionSearch}
                  onChange={(e) => setPermissionSearch(e.target.value)}
                  placeholder="Search permission..."
                  className="px-2.5 py-1 text-xs border border-[#D1D5DB] bg-white rounded-none w-48 font-medium"
                />
                <button
                  type="button"
                  onClick={handleResetToDefaults}
                  className="whitespace-nowrap px-2.5 py-1 text-[11px] font-semibold border border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100 rounded-none"
                  title="Reset to system standard role defaults"
                >
                  Reset Defaults
                </button>
              </div>
            </div>

            {/* Permissions Matrix Table */}
            <div className="flex-1 min-h-0 overflow-y-auto bg-white">
              <table className="w-full border-collapse text-left text-xs">
                <thead className="bg-[#0A192F] text-[#FBFBF9] uppercase text-[10px] tracking-wider font-bold sticky top-0 z-10 select-none">
                  <tr>
                    <th className="py-2.5 px-4 w-72 border-r border-[#162E52]">Feature & Module</th>
                    {[
                      { key: 'FRONT_DESK', label: 'Front Desk' },
                      { key: 'TRAINER', label: 'Trainer' },
                      { key: 'STAFF', label: 'Staff' },
                    ].map((role) => (
                      <th key={role.key} className="py-2.5 px-2 text-center border-r border-[#162E52] last:border-r-0">
                        <div className="flex flex-col items-center gap-0.5">
                          <span>{role.label}</span>
                          <div className="flex items-center gap-1 font-mono text-[9px] lowercase font-normal opacity-80">
                            <span
                              onClick={() => handleGrantAllForRole(role.key)}
                              className="cursor-pointer hover:underline text-emerald-300 font-bold"
                              title="Grant all permissions to this role"
                            >
                              all ✓
                            </span>
                            <span>/</span>
                            <span
                              onClick={() => handleRevokeAllForRole(role.key)}
                              className="cursor-pointer hover:underline text-red-300 font-bold"
                              title="Revoke all permissions from this role"
                            >
                              none ✕
                            </span>
                          </div>
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB]">
                  {ALL_PERMISSIONS.filter((p) => {
                    const matchesCategory =
                      permissionCategoryFilter === 'ALL' || p.category === permissionCategoryFilter;
                    const matchesSearch =
                      permissionSearch === '' ||
                      p.label.toLowerCase().includes(permissionSearch.toLowerCase()) ||
                      p.description.toLowerCase().includes(permissionSearch.toLowerCase()) ||
                      p.id.toLowerCase().includes(permissionSearch.toLowerCase());
                    return matchesCategory && matchesSearch;
                  }).length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-xs text-[#6B7280]">
                        No permissions match your filter.
                      </td>
                    </tr>
                  ) : (
                    ALL_PERMISSIONS.filter((p) => {
                      const matchesCategory =
                        permissionCategoryFilter === 'ALL' || p.category === permissionCategoryFilter;
                      const matchesSearch =
                        permissionSearch === '' ||
                        p.label.toLowerCase().includes(permissionSearch.toLowerCase()) ||
                        p.description.toLowerCase().includes(permissionSearch.toLowerCase()) ||
                        p.id.toLowerCase().includes(permissionSearch.toLowerCase());
                      return matchesCategory && matchesSearch;
                    }).map((perm) => (
                      <tr key={perm.id} className="hover:bg-[#F9FAFB] transition-colors">
                        <td className="py-2 px-4 border-r border-[#E5E7EB]">
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-[#0A192F]">{perm.label}</span>
                            <span className="text-[9px] font-mono px-1.5 py-0.5 bg-[#F3F4F6] text-[#6B7280] border border-[#E5E7EB] uppercase">
                              {perm.category}
                            </span>
                          </div>
                          <p className="text-[10px] text-[#6B7280] mt-0.5 leading-snug">{perm.description}</p>
                        </td>

                        {['GYM_OWNER', 'BRANCH_MANAGER', 'FRONT_DESK', 'TRAINER', 'STAFF'].map((roleKey) => {
                          const isAllowed = (currentPermissions[roleKey] || []).includes(perm.id);
                          return (
                            <td key={roleKey} className="py-2 px-2 text-center border-r border-[#E5E7EB] last:border-r-0">
                              <button
                                type="button"
                                onClick={() => togglePermission(roleKey, perm.id)}
                                className={
                                  isAllowed
                                    ? 'inline-flex items-center justify-center gap-1 px-2.5 py-1 text-xs font-bold rounded-none border transition-all select-none w-24 bg-emerald-50 border-emerald-300 text-emerald-800 hover:bg-emerald-100'
                                    : 'inline-flex items-center justify-center gap-1 px-2.5 py-1 text-xs font-bold rounded-none border transition-all select-none w-24 bg-red-50 border-red-200 text-[#B91C1C] hover:bg-red-100'
                                }
                                title={
                                  isAllowed
                                    ? `Click to block ${perm.label} for ${roleKey}`
                                    : `Click to allow ${perm.label} for ${roleKey}`
                                }
                              >
                                {isAllowed ? (
                                  <>
                                    <span className="text-emerald-700 font-extrabold text-sm">✓</span>
                                    <span className="text-[10px] uppercase font-bold tracking-wider">Allowed</span>
                                  </>
                                ) : (
                                  <>
                                    <span className="text-[#B91C1C] font-extrabold text-sm">✕</span>
                                    <span className="text-[10px] uppercase font-bold tracking-wider">Blocked</span>
                                  </>
                                )}
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* Modal Footer */}
            <div className="p-3.5 px-5 bg-[#FBFBF9] border-t border-[#E5E7EB] shrink-0 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <span className="text-[11px] text-[#6B7280]">
                Click any cell button to flip between Allowed (✓) and Blocked (✕). Changes take effect instantly for all staff under this client.
              </span>

              <div className="flex items-center space-x-3">
                <Button
                  variant="outline"
                  type="button"
                  onClick={() => setIsPermissionsModalOpen(false)}
                  disabled={isSavingPermissions}
                  className="rounded-none text-xs border-[#D1D5DB] text-[#111827] hover:bg-[#F3F4F6]"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleSavePermissions}
                  isLoading={isSavingPermissions}
                  className="rounded-none text-xs bg-[#0A192F] text-[#FBFBF9] hover:bg-[#162E52] font-bold uppercase tracking-wider px-5"
                >
                  Save Permissions Matrix
                </Button>
              </div>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}


