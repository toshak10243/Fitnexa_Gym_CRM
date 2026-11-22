import { createPortal } from 'react-dom';
import React, { useState, useEffect } from 'react';
import { apiClient } from '../../lib/api-client';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Skeleton } from '../../components/ui/skeleton';
import { PlanDurationType, UserRole } from '@fitnexa/shared';
import { useAuth } from '../../context/auth-context';

interface PlanItem {
  id: string;
  name: string;
  code: string | null;
  description: string | null;
  durationType: PlanDurationType;
  durationValue: number;
  priceInPaise: number;
  joiningFeeInPaise: number;
  taxRateBps: number;
  isTaxInclusive: boolean;
  maxFreezeDays: number;
  isActive: boolean;
  branch: {
    id: string;
    name: string;
  } | null;
  _count?: {
    memberMemberships: number;
  };
}

export function PlansPage() {
  const { user } = useAuth();
  const [plans, setPlans] = useState<PlanItem[]>([]);
  const [branches, setBranches] = useState<Array<{ id: string; name: string }>>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState<PlanItem | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    description: '',
    durationType: PlanDurationType.MONTHS,
    durationValue: 1,
    priceRupees: '',
    joiningFeeRupees: '0',
    taxRateBps: 1800,
    isTaxInclusive: false,
    maxFreezeDays: 0,
    branchId: '',
    isActive: true,
  });

  const fetchPlans = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set('search', search.trim());
      const res = await apiClient.get(`/plans?${params.toString()}`);
      setPlans(res.data.data.items || []);
    } catch {
      setPlans([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPlans();
    apiClient
      .get('/tenant/branches')
      .then((res) => setBranches(res.data.data || []))
      .catch(() => {});
  }, []);

  const handleOpenCreate = () => {
    setEditingPlan(null);
    setFormData({
      name: '',
      code: '',
      description: '',
      durationType: PlanDurationType.MONTHS,
      durationValue: 1,
      priceRupees: '',
      joiningFeeRupees: '0',
      taxRateBps: 1800,
      isTaxInclusive: false,
      maxFreezeDays: 0,
      branchId: '',
      isActive: true,
    });
    setIsModalOpen(true);
  };

  const handleOpenEdit = (plan: PlanItem) => {
    setEditingPlan(plan);
    setFormData({
      name: plan.name,
      code: plan.code || '',
      description: plan.description || '',
      durationType: plan.durationType,
      durationValue: plan.durationValue,
      priceRupees: (plan.priceInPaise / 100).toString(),
      joiningFeeRupees: (plan.joiningFeeInPaise / 100).toString(),
      taxRateBps: plan.taxRateBps,
      isTaxInclusive: plan.isTaxInclusive,
      maxFreezeDays: plan.maxFreezeDays,
      branchId: plan.branch?.id || '',
      isActive: plan.isActive,
    });
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.priceRupees) {
      alert('Plan name and price are required.');
      return;
    }

    const payload = {
      name: formData.name.trim(),
      code: formData.code.trim() || undefined,
      description: formData.description.trim() || undefined,
      durationType: formData.durationType,
      durationValue: Number(formData.durationValue),
      priceInPaise: Math.round(parseFloat(formData.priceRupees) * 100),
      joiningFeeInPaise: Math.round(parseFloat(formData.joiningFeeRupees || '0') * 100),
      taxRateBps: Number(formData.taxRateBps),
      isTaxInclusive: formData.isTaxInclusive,
      maxFreezeDays: Number(formData.maxFreezeDays || 0),
      branchId: formData.branchId || undefined,
      isActive: formData.isActive,
    };

    try {
      if (editingPlan) {
        await apiClient.patch(`/plans/${editingPlan.id}`, payload);
      } else {
        await apiClient.post('/plans', payload);
      }
      setIsModalOpen(false);
      fetchPlans();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Plan save failed';
      alert(`Operation failed: ${msg}`);
    }
  };

  const isManagement =
    user?.role === UserRole.GYM_OWNER ||
    user?.role === UserRole.BRANCH_MANAGER ||
    user?.role === UserRole.SUPER_ADMIN;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E5E7EB] pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0A192F]">
            Membership Plans & Pricing
          </h1>
          <p className="text-sm text-[#6B7280] mt-1">
            Enterprise subscription catalog with GST configuration, duration rules, and freeze allowances.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Input
            placeholder="Search plans by name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-48 text-xs h-9 rounded-none border-[#E5E7EB]"
          />
          <Button
            variant="outline"
            onClick={fetchPlans}
            className="rounded-none text-xs h-9 border-[#E5E7EB]"
          >
            Filter
          </Button>
          {isManagement && (
            <Button
              onClick={handleOpenCreate}
              className="bg-[#0A192F] hover:bg-[#0F223D] text-[#FBFBF9] rounded-none text-xs h-9 px-4"
            >
              Create Plan
            </Button>
          )}
        </div>
      </div>

      {/* Catalog Table */}
      <div className="border border-[#E5E7EB] bg-[#FBFBF9]">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[#111827]">
            <thead className="bg-[#0A192F] text-[#FBFBF9] uppercase tracking-wider text-[11px] font-semibold">
              <tr>
                <th className="py-3 px-4">Plan Name & Code</th>
                <th className="py-3 px-4">Duration</th>
                <th className="py-3 px-4">Catalog Fee (INR)</th>
                <th className="py-3 px-4">GST Rate</th>
                <th className="py-3 px-4">Freeze Allowance</th>
                <th className="py-3 px-4">Branch Scope</th>
                <th className="py-3 px-4">Subscribers</th>
                <th className="py-3 px-4">Status</th>
                {isManagement && <th className="py-3 px-4 text-right">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB]">
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="py-3 px-4">
                      <Skeleton className="h-4 w-32" />
                    </td>
                    <td className="py-3 px-4">
                      <Skeleton className="h-4 w-20" />
                    </td>
                    <td className="py-3 px-4">
                      <Skeleton className="h-4 w-24" />
                    </td>
                    <td className="py-3 px-4">
                      <Skeleton className="h-4 w-16" />
                    </td>
                    <td className="py-3 px-4">
                      <Skeleton className="h-4 w-16" />
                    </td>
                    <td className="py-3 px-4">
                      <Skeleton className="h-4 w-24" />
                    </td>
                    <td className="py-3 px-4">
                      <Skeleton className="h-4 w-12" />
                    </td>
                    <td className="py-3 px-4">
                      <Skeleton className="h-4 w-16" />
                    </td>
                    {isManagement && (
                      <td className="py-3 px-4 text-right">
                        <Skeleton className="h-4 w-12 ml-auto" />
                      </td>
                    )}
                  </tr>
                ))
              ) : plans.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-[#6B7280]">
                    No membership plans configured. Click "Create Membership Plan" to set up your catalog.
                  </td>
                </tr>
              ) : (
                plans.map((p) => (
                  <tr key={p.id} className="hover:bg-[#F5F5F0]">
                    <td className="py-3 px-4">
                      <div className="font-bold text-[#0A192F]">{p.name}</div>
                      {p.code && <div className="font-mono text-[10px] text-[#6B7280]">{p.code}</div>}
                    </td>
                    <td className="py-3 px-4 font-medium">
                      {p.durationValue} {p.durationType.toLowerCase()}
                    </td>
                    <td className="py-3 px-4 font-mono font-bold text-[#111827]">
                      ₹{(p.priceInPaise / 100).toLocaleString('en-IN')}
                      {p.joiningFeeInPaise > 0 && (
                        <span className="block text-[10px] font-normal text-[#6B7280]">
                          + ₹{(p.joiningFeeInPaise / 100).toLocaleString('en-IN')} joining fee
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-[#4B5563]">
                      {(p.taxRateBps / 100).toFixed(1)}% GST {p.isTaxInclusive ? '(Inc)' : '(Excl)'}
                    </td>
                    <td className="py-3 px-4">
                      {p.maxFreezeDays > 0 ? (
                        <span className="font-medium text-[#111827]">{p.maxFreezeDays} days</span>
                      ) : (
                        <span className="text-[#9CA3AF] italic">None</span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-[#4B5563]">
                      {p.branch ? p.branch.name : 'All Gym Branches'}
                    </td>
                    <td className="py-3 px-4 font-mono">{p._count?.memberMemberships ?? 0}</td>
                    <td className="py-3 px-4">
                      <span
                        className={`px-2 py-0.5 text-[10px] font-bold rounded-none ${
                          p.isActive
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : 'bg-gray-100 text-gray-700 border border-gray-300'
                        }`}
                      >
                        {p.isActive ? 'ACTIVE' : 'INACTIVE'}
                      </span>
                    </td>
                    {isManagement && (
                      <td className="py-3 px-4 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleOpenEdit(p)}
                          className="rounded-none text-xs h-7 border-[#E5E7EB]"
                        >
                          Configure
                        </Button>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE / EDIT PLAN MODAL */}
      {isModalOpen && createPortal(
        <div className="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center p-4">
          <div className="bg-[#FBFBF9] border border-[#E5E7EB] w-full max-w-lg p-6 space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-[#0A192F] pb-1">
              {editingPlan ? 'Configure Membership Plan' : 'Create New Membership Plan'}
            </h3>
            <form onSubmit={handleSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className="block font-semibold mb-1">Plan Name *</label>
                  <Input
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    required
                    placeholder="e.g. Annual Strength & Conditioning"
                    className="rounded-none text-xs h-9"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1">Internal Code</label>
                  <Input
                    value={formData.code}
                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                    placeholder="e.g. ANNUAL-SC"
                    className="rounded-none text-xs h-9 uppercase"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1">Branch Scope</label>
                  <select
                    value={formData.branchId}
                    onChange={(e) => setFormData({ ...formData, branchId: e.target.value })}
                    className="w-full h-9 border border-[#E5E7EB] bg-[#FBFBF9] px-2 rounded-none"
                  >
                    <option value="">All Branches</option>
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-semibold mb-1">Duration Unit *</label>
                  <select
                    value={formData.durationType}
                    onChange={(e) =>
                      setFormData({ ...formData, durationType: e.target.value as PlanDurationType })
                    }
                    className="w-full h-9 border border-[#E5E7EB] bg-[#FBFBF9] px-2 rounded-none"
                  >
                    <option value={PlanDurationType.DAYS}>Days</option>
                    <option value={PlanDurationType.MONTHS}>Months</option>
                    <option value={PlanDurationType.YEARS}>Years</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold mb-1">Duration Value *</label>
                  <Input
                    type="number"
                    min="1"
                    value={formData.durationValue}
                    onChange={(e) =>
                      setFormData({ ...formData, durationValue: parseInt(e.target.value, 10) || 1 })
                    }
                    required
                    className="rounded-none text-xs h-9"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1">Subscription Fee in ₹ *</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.priceRupees}
                    onChange={(e) => setFormData({ ...formData, priceRupees: e.target.value })}
                    required
                    placeholder="e.g. 18000"
                    className="rounded-none text-xs h-9"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1">Joining Fee in ₹</label>
                  <Input
                    type="number"
                    step="0.01"
                    value={formData.joiningFeeRupees}
                    onChange={(e) => setFormData({ ...formData, joiningFeeRupees: e.target.value })}
                    placeholder="0"
                    className="rounded-none text-xs h-9"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1">Max Freeze Days Allowance</label>
                  <Input
                    type="number"
                    min="0"
                    value={formData.maxFreezeDays}
                    onChange={(e) =>
                      setFormData({ ...formData, maxFreezeDays: parseInt(e.target.value, 10) || 0 })
                    }
                    placeholder="0"
                    className="rounded-none text-xs h-9"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1">GST Rate (%)</label>
                  <select
                    value={formData.taxRateBps}
                    onChange={(e) =>
                      setFormData({ ...formData, taxRateBps: parseInt(e.target.value, 10) })
                    }
                    className="w-full h-9 border border-[#E5E7EB] bg-[#FBFBF9] px-2 rounded-none"
                  >
                    <option value={0}>0% (Tax Exempt)</option>
                    <option value={500}>5.0% GST</option>
                    <option value={1200}>12.0% GST</option>
                    <option value={1800}>18.0% GST (Standard Fitness Service)</option>
                    <option value={2800}>28.0% GST</option>
                  </select>
                </div>

                <div className="col-span-2 space-y-2 pt-2 border-t border-[#E5E7EB]">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isTaxInclusive}
                      onChange={(e) =>
                        setFormData({ ...formData, isTaxInclusive: e.target.checked })
                      }
                      className="h-4 w-4 rounded-none border-[#E5E7EB]"
                    />
                    <span className="text-xs">Price is inclusive of GST</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formData.isActive}
                      onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                      className="h-4 w-4 rounded-none border-[#E5E7EB]"
                    />
                    <span className="text-xs">Active in Gym Catalog (available for admission)</span>
                  </label>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#E5E7EB]">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-none text-xs"
                >
                  Cancel
                </Button>
                <Button type="submit" className="bg-[#0A192F] text-[#FBFBF9] rounded-none text-xs">
                  {editingPlan ? 'Save Changes' : 'Create Plan'}
                </Button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}


