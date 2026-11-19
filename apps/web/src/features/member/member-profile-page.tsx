import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiClient } from '../../lib/api-client';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Skeleton } from '../../components/ui/skeleton';
import { MemberStatus, UserRole, PaymentMethodType } from '@fitnexa/shared';
import { useAuth } from '../../context/auth-context';
import { formatPaiseToInr, parseInrToPaise } from '../../lib/utils';

export function MemberProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [member, setMember] = useState<any>(null);
  const [plans, setPlans] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'details' | 'memberships' | 'billing' | 'attendance' | 'notes' | 'activity'>('details');

  // Attendance state
  const [memberAttendances, setMemberAttendances] = useState<any[]>([]);

  // Billing state
  const [memberInvoices, setMemberInvoices] = useState<any[]>([]);
  const [memberPayments, setMemberPayments] = useState<any[]>([]);
  const [isCollectModalOpen, setIsCollectModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<any>(null);
  const [paymentForm, setPaymentForm] = useState({
    amountRupees: '',
    method: PaymentMethodType.UPI,
    referenceNumber: '',
    notes: '',
  });

  // Renewal Modal state
  const [isRenewalModalOpen, setIsRenewalModalOpen] = useState(false);
  const [renewalForm, setRenewalForm] = useState({
    membershipId: '',
    planId: '',
    branchId: '',
    downPaymentRupees: '0.00',
    downPaymentMethod: PaymentMethodType.UPI,
    downPaymentRef: '',
  });

  // Modals state
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [isFreezeModalOpen, setIsFreezeModalOpen] = useState(false);
  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [selectedMembership, setSelectedMembership] = useState<any>(null);

  // Form states
  const [assignForm, setAssignForm] = useState({
    planId: '',
    branchId: '',
    startDate: new Date().toISOString().split('T')[0],
    customPrice: '',
  });

  const [freezeForm, setFreezeForm] = useState({
    freezeStartDate: new Date().toISOString().split('T')[0],
    freezeEndDate: '',
    reason: '',
  });

  const [cancelForm, setCancelForm] = useState({
    cancellationReason: '',
  });

  const [newNote, setNewNote] = useState('');
  const [isNotePinned, setIsNotePinned] = useState(false);
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);

  const fetchMember = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.get(`/members/${id}`);
      setMember(res.data.data);
      if (res.data.data.branchId) {
        setAssignForm((prev) => ({ ...prev, branchId: res.data.data.branchId }));
      }
    } catch {
      setMember(null);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchFinancials = async () => {
    try {
      const [invRes, payRes] = await Promise.all([
        apiClient.get(`/billing/invoices?memberId=${id}&limit=50`),
        apiClient.get(`/billing/payments?memberId=${id}&limit=50`),
      ]);
      if (invRes.data.success) {
        setMemberInvoices(invRes.data.data.items || []);
      }
      if (payRes.data.success) {
        setMemberPayments(payRes.data.data.items || []);
      }
    } catch {
      // Handled gracefully
    }
  };

  useEffect(() => {
    fetchMember();
    fetchFinancials();
    apiClient.get(`/attendance/history?memberId=${id}&limit=50`).then((res) => {
      if (res.data.data?.items) {
        setMemberAttendances(res.data.data.items);
      }
    }).catch(() => {});
    apiClient.get('/plans?isActive=true').then((res) => {
      setPlans(res.data.data.items || []);
      if (res.data.data.items?.length > 0) {
        setAssignForm((prev) => ({ ...prev, planId: res.data.data.items[0].id }));
      }
    });
    apiClient.get('/tenant/branches').then((res) => {
      setBranches(res.data.data || []);
    });
  }, [id]);

  const handleOpenCollectModal = (inv: any) => {
    setSelectedInvoice(inv);
    setPaymentForm({
      amountRupees: (inv.balanceDueInPaise / 100).toFixed(2),
      method: PaymentMethodType.UPI,
      referenceNumber: '',
      notes: '',
    });
    setIsCollectModalOpen(true);
  };

  const handleCollectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice) return;

    const amountInPaise = parseInrToPaise(paymentForm.amountRupees);
    if (amountInPaise <= 0) {
      alert('Payment amount must be greater than zero.');
      return;
    }

    try {
      await apiClient.post('/billing/payments', {
        memberId: id,
        branchId: selectedInvoice.branchId,
        amountInPaise,
        method: paymentForm.method,
        referenceNumber: paymentForm.referenceNumber || undefined,
        notes: paymentForm.notes || undefined,
        allocations: [
          {
            invoiceId: selectedInvoice.id,
            amountInPaise,
          },
        ],
      });
      setIsCollectModalOpen(false);
      fetchFinancials();
      fetchMember();
    } catch (err: any) {
      alert(err.response?.data?.message || 'Payment recording failed');
    }
  };

  const handleOpenRenewalModal = (membership?: any) => {
    const defaultPlanId = membership?.planId || (plans[0]?.id || '');
    const defaultBranchId = membership?.branchId || member?.branchId || (branches[0]?.id || '');
    setRenewalForm({
      membershipId: membership?.id || '',
      planId: defaultPlanId,
      branchId: defaultBranchId,
      downPaymentRupees: '0.00',
      downPaymentMethod: PaymentMethodType.UPI,
      downPaymentRef: '',
    });
    setIsRenewalModalOpen(true);
  };

  const handleRenewalSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const downPaymentInPaise = parseInrToPaise(renewalForm.downPaymentRupees);
      await apiClient.post('/billing/renewals', {
        memberId: id,
        currentMembershipId: renewalForm.membershipId || undefined,
        planId: renewalForm.planId,
        branchId: renewalForm.branchId,
        downPaymentInPaise: downPaymentInPaise > 0 ? downPaymentInPaise : undefined,
        downPaymentMethod: downPaymentInPaise > 0 ? renewalForm.downPaymentMethod : undefined,
        downPaymentReference: downPaymentInPaise > 0 ? renewalForm.downPaymentRef : undefined,
      });
      setIsRenewalModalOpen(false);
      fetchFinancials();
      fetchMember();
      alert('Membership renewal processed successfully.');
    } catch (err: any) {
      alert(err.response?.data?.message || 'Renewal failed');
    }
  };

  const handleAssignPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.post('/memberships/assign', {
        memberId: id,
        planId: assignForm.planId,
        branchId: assignForm.branchId,
        startDate: assignForm.startDate,
        customPriceInPaise: assignForm.customPrice
          ? Math.round(parseFloat(assignForm.customPrice) * 100)
          : undefined,
      });
      setIsAssignModalOpen(false);
      fetchMember();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Plan assignment failed';
      alert(`Assignment failed: ${msg}`);
    }
  };

  const handleFreeze = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMembership) return;
    try {
      await apiClient.post(`/memberships/${selectedMembership.id}/freeze`, freezeForm);
      setIsFreezeModalOpen(false);
      fetchMember();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Freeze failed';
      alert(`Freeze operation failed: ${msg}`);
    }
  };

  const handleUnfreeze = async (membershipId: string) => {
    if (!confirm('Are you sure you want to unfreeze this membership? The expiration date will be extended.')) {
      return;
    }
    try {
      await apiClient.post(`/memberships/${membershipId}/unfreeze`, {});
      fetchMember();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Unfreeze failed';
      alert(`Unfreeze operation failed: ${msg}`);
    }
  };

  const handleCancelMembership = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMembership) return;
    try {
      await apiClient.post(`/memberships/${selectedMembership.id}/cancel`, cancelForm);
      setIsCancelModalOpen(false);
      fetchMember();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Cancellation failed';
      alert(`Cancellation failed: ${msg}`);
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNote.trim()) return;
    setIsSubmittingNote(true);
    try {
      await apiClient.post(`/members/${id}/notes`, {
        note: newNote.trim(),
        isPinned: isNotePinned,
      });
      setNewNote('');
      setIsNotePinned(false);
      fetchMember();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save note';
      alert(msg);
    } finally {
      setIsSubmittingNote(false);
    }
  };

  const handleStatusChange = async (newStatus: MemberStatus) => {
    if (!confirm(`Change member status to ${newStatus}?`)) return;
    try {
      await apiClient.patch(`/members/${id}/status`, { status: newStatus });
      fetchMember();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Status update failed';
      alert(msg);
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 max-w-7xl mx-auto space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (!member) {
    return (
      <div className="p-12 text-center text-[#6B7280]">
        <h2 className="text-lg font-bold text-[#0A192F]">Member Not Found</h2>
        <p className="mt-1 text-xs">The requested member record could not be loaded or was removed.</p>
        <Button onClick={() => navigate('/members')} className="mt-4 rounded-none text-xs">
          Return to Member Directory
        </Button>
      </div>
    );
  }

  const isManagement =
    user?.role === UserRole.GYM_OWNER ||
    user?.role === UserRole.BRANCH_MANAGER ||
    user?.role === UserRole.SUPER_ADMIN ||
    user?.role === UserRole.FRONT_DESK;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* 360 Header Card */}
      <div className="bg-[#0A192F] text-[#FBFBF9] border border-[#162E52] p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 bg-[#B91C1C] flex items-center justify-center font-bold text-xl text-[#FBFBF9] rounded-none border border-red-500/30">
              {member.fullName.charAt(0)}
            </div>
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold tracking-tight text-[#FBFBF9]">
                  {member.fullName}
                </h1>
                <span className="font-mono text-xs font-bold px-2 py-0.5 bg-[#162E52] text-[#FBFBF9] border border-[#234578]">
                  {member.memberCode}
                </span>
                <span
                  className={`text-[11px] font-bold px-2 py-0.5 rounded-none uppercase ${
                    member.status === 'ACTIVE'
                      ? 'bg-emerald-950 text-emerald-400 border border-emerald-700'
                      : 'bg-amber-950 text-amber-400 border border-amber-700'
                  }`}
                >
                  {member.status}
                </span>
              </div>
              <div className="text-xs text-gray-300 mt-1 flex flex-wrap gap-4">
                <span>Phone: {member.phone}</span>
                {member.email && <span>Email: {member.email}</span>}
                <span>Branch: {member.branch.name}</span>
                <span>Admitted: {member.joiningDate.split('T')[0]}</span>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate(`/members/${id}/print`)}
              className="rounded-none text-xs h-8 border-gray-600 bg-transparent text-[#FBFBF9] hover:bg-[#162E52]"
            >
              Print Admission Form
            </Button>
            {isManagement && (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsAssignModalOpen(true)}
                  className="rounded-none text-xs h-8 border-[#B91C1C] text-[#FBFBF9] bg-[#B91C1C] hover:bg-[#991B1B]"
                >
                  Enroll / Renew Plan
                </Button>
                <select
                  value={member.status}
                  onChange={(e) => handleStatusChange(e.target.value as MemberStatus)}
                  className="h-8 text-xs bg-[#162E52] border border-gray-600 text-[#FBFBF9] px-2 rounded-none"
                >
                  <option value="ACTIVE">Set: Active</option>
                  <option value="INACTIVE">Set: Inactive</option>
                  <option value="SUSPENDED">Set: Suspended</option>
                  <option value="ARCHIVED">Set: Archived</option>
                </select>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Profile Navigation Tabs */}
      <div className="flex border-b border-[#E5E7EB] bg-[#FBFBF9] overflow-x-auto">
        <button
          onClick={() => setActiveTab('details')}
          className={`py-3 px-6 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'details'
              ? 'border-[#0A192F] text-[#0A192F]'
              : 'border-transparent text-[#6B7280] hover:text-[#111827]'
          }`}
        >
          Overview & Details
        </button>
        <button
          onClick={() => setActiveTab('memberships')}
          className={`py-3 px-6 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'memberships'
              ? 'border-[#0A192F] text-[#0A192F]'
              : 'border-transparent text-[#6B7280] hover:text-[#111827]'
          }`}
        >
          Memberships & Subscriptions ({member.memberships?.length || 0})
        </button>
        <button
          onClick={() => setActiveTab('billing')}
          className={`py-3 px-6 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'billing'
              ? 'border-[#0A192F] text-[#0A192F]'
              : 'border-transparent text-[#6B7280] hover:text-[#111827]'
          }`}
        >
          <span>Billing & Financial Ledger ({memberInvoices.length})</span>
          {memberInvoices.reduce(
            (sum, inv) =>
              inv.status !== 'VOID' && inv.status !== 'PAID' ? sum + inv.balanceDueInPaise : sum,
            0,
          ) > 0 && (
            <span className="bg-[#B91C1C] text-[#FBFBF9] text-[9px] font-mono px-1.5 py-0.5 rounded-none font-bold">
              {formatPaiseToInr(
                memberInvoices.reduce(
                  (sum, inv) =>
                    inv.status !== 'VOID' && inv.status !== 'PAID'
                      ? sum + inv.balanceDueInPaise
                      : sum,
                  0,
                ),
              )}{' '}
              DUE
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab('attendance')}
          className={`py-3 px-6 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'attendance'
              ? 'border-[#0A192F] text-[#0A192F]'
              : 'border-transparent text-[#6B7280] hover:text-[#111827]'
          }`}
        >
          Attendance & Access ({memberAttendances.length})
        </button>
        <button
          onClick={() => setActiveTab('notes')}
          className={`py-3 px-6 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'notes'
              ? 'border-[#0A192F] text-[#0A192F]'
              : 'border-transparent text-[#6B7280] hover:text-[#111827]'
          }`}
        >
          Internal Staff Notes ({member.notes?.length || 0})
        </button>
        <button
          onClick={() => setActiveTab('activity')}
          className={`py-3 px-6 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors whitespace-nowrap ${
            activeTab === 'activity'
              ? 'border-[#0A192F] text-[#0A192F]'
              : 'border-transparent text-[#6B7280] hover:text-[#111827]'
          }`}
        >
          Audit Timeline ({member.activities?.length || 0})
        </button>
      </div>

      {/* TAB 1: Overview & Details */}
      {activeTab === 'details' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Residential Address */}
          <div className="border border-[#E5E7EB] bg-[#FBFBF9] p-5 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#0A192F] border-b border-[#E5E7EB] pb-2">
              Residential Address
            </h3>
            {member.address ? (
              <div className="text-xs text-[#4B5563] space-y-1">
                <p className="font-semibold text-[#111827]">{member.address.addressLine1}</p>
                {member.address.addressLine2 && <p>{member.address.addressLine2}</p>}
                <p>
                  {member.address.city}, {member.address.state} - {member.address.pincode}
                </p>
                <p>{member.address.country}</p>
              </div>
            ) : (
              <p className="text-xs text-[#9CA3AF] italic">No residential address recorded.</p>
            )}
          </div>

          {/* Emergency Contact */}
          <div className="border border-[#E5E7EB] bg-[#FBFBF9] p-5 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#0A192F] border-b border-[#E5E7EB] pb-2">
              Emergency Contact
            </h3>
            {member.emergencyContact ? (
              <div className="text-xs text-[#4B5563] space-y-1">
                <p className="font-semibold text-[#111827]">{member.emergencyContact.name}</p>
                <p>Relationship: {member.emergencyContact.relationship}</p>
                <p className="font-mono">Phone: {member.emergencyContact.phone}</p>
              </div>
            ) : (
              <p className="text-xs text-[#9CA3AF] italic">No emergency contact recorded.</p>
            )}
          </div>

          {/* Fitness & Body Metrics */}
          <div className="border border-[#E5E7EB] bg-[#FBFBF9] p-5 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#0A192F] border-b border-[#E5E7EB] pb-2">
              Fitness Profile & Schedule
            </h3>
            <div className="grid grid-cols-2 gap-2 text-xs text-[#4B5563]">
              <div>
                <span className="text-[#9CA3AF]">Fitness Goal:</span>
                <p className="font-semibold text-[#111827]">{member.fitnessGoal || 'General Fitness'}</p>
              </div>
              <div>
                <span className="text-[#9CA3AF]">Workout Timing:</span>
                <p className="font-semibold text-[#111827]">{member.workoutTiming || 'Flexible'}</p>
              </div>
              <div>
                <span className="text-[#9CA3AF]">Height:</span>
                <p className="font-semibold text-[#111827]">
                  {member.heightCm ? `${member.heightCm} cm` : 'Not recorded'}
                </p>
              </div>
              <div>
                <span className="text-[#9CA3AF]">Weight:</span>
                <p className="font-semibold text-[#111827]">
                  {member.weightKg ? `${member.weightKg} kg` : 'Not recorded'}
                </p>
              </div>
              <div className="col-span-2">
                <span className="text-[#9CA3AF]">Assigned Trainer:</span>
                <p className="font-semibold text-[#111827]">
                  {member.assignedTrainer ? member.assignedTrainer.fullName : 'General Floor Staff'}
                </p>
              </div>
            </div>
          </div>

          {/* Confidential Health Declaration */}
          <div className="border border-[#E5E7EB] bg-[#FBFBF9] p-5 space-y-3">
            <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#0A192F]">
                Health Declaration (Confidential)
              </h3>
              <span className="text-[10px] font-semibold text-[#B91C1C] bg-red-50 px-2 py-0.5 border border-red-200">
                Staff Confidential
              </span>
            </div>
            {member.healthDeclaration ? (
              <div className="space-y-2 text-xs text-[#4B5563]">
                <div className="flex items-center gap-2">
                  <span className="font-semibold">Declared Medical Condition:</span>
                  <span
                    className={`px-2 py-0.5 text-[10px] font-bold ${
                      member.healthDeclaration.hasHealthCondition
                        ? 'bg-amber-100 text-amber-900 border border-amber-300'
                        : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                    }`}
                  >
                    {member.healthDeclaration.hasHealthCondition ? 'YES' : 'NONE DECLARED'}
                  </span>
                </div>
                {member.healthDeclaration.hasHealthCondition && (
                  <>
                    <div>
                      <span className="text-[#9CA3AF]">Medical History:</span>
                      <p className="text-[#111827] font-medium">
                        {member.healthDeclaration.medicalHistory || 'None specified'}
                      </p>
                    </div>
                    <div>
                      <span className="text-[#9CA3AF]">Physician Restrictions:</span>
                      <p className="text-[#111827] font-medium">
                        {member.healthDeclaration.exerciseRestrictions || 'None specified'}
                      </p>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <p className="text-xs text-[#9CA3AF] italic">No health declaration submitted.</p>
            )}
          </div>
        </div>
      )}

      {/* TAB 2: Memberships */}
      {activeTab === 'memberships' && (
        <div className="border border-[#E5E7EB] bg-[#FBFBF9]">
          <div className="p-4 border-b border-[#E5E7EB] flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#0A192F]">
              Enrolled Membership Plans & History
            </h3>
            {isManagement && (
              <Button
                size="sm"
                onClick={() => setIsAssignModalOpen(true)}
                className="rounded-none text-xs h-7 bg-[#0A192F] text-[#FBFBF9]"
              >
                Enroll New Plan
              </Button>
            )}
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-[#111827]">
              <thead className="bg-[#F5F5F0] border-b border-[#E5E7EB] text-[11px] font-semibold uppercase">
                <tr>
                  <th className="py-2.5 px-4">Plan Name</th>
                  <th className="py-2.5 px-4">Start Date</th>
                  <th className="py-2.5 px-4">End Date</th>
                  <th className="py-2.5 px-4">Fee Paid</th>
                  <th className="py-2.5 px-4">Tax (GST)</th>
                  <th className="py-2.5 px-4">Freeze Days Used</th>
                  <th className="py-2.5 px-4">Status</th>
                  <th className="py-2.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {member.memberships?.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-8 text-center text-[#6B7280]">
                      No memberships enrolled yet.
                    </td>
                  </tr>
                ) : (
                  member.memberships?.map((m: any) => (
                    <tr key={m.id} className="hover:bg-[#F5F5F0]">
                      <td className="py-3 px-4 font-semibold text-[#0A192F]">{m.plan.name}</td>
                      <td className="py-3 px-4">{m.startDate.split('T')[0]}</td>
                      <td className="py-3 px-4 font-semibold">{m.endDate.split('T')[0]}</td>
                      <td className="py-3 px-4">₹{(m.pricePaidInPaise / 100).toLocaleString('en-IN')}</td>
                      <td className="py-3 px-4 text-[#6B7280]">
                        ₹{(m.taxPaidInPaise / 100).toLocaleString('en-IN')}
                      </td>
                      <td className="py-3 px-4">
                        {m.totalFreezeDaysUsed} / {m.plan.maxFreezeDays} days
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 text-[10px] font-bold rounded-none ${
                            m.status === 'ACTIVE'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : m.status === 'FROZEN'
                              ? 'bg-amber-100 text-amber-800 border border-amber-300'
                              : 'bg-gray-100 text-gray-700 border border-gray-300'
                          }`}
                        >
                          {m.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right space-x-1">
                        {m.status === 'ACTIVE' && isManagement && (
                          <>
                            {m.plan.maxFreezeDays > 0 && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setSelectedMembership(m);
                                  setIsFreezeModalOpen(true);
                                }}
                                className="rounded-none text-[10px] h-6 px-2 border-[#E5E7EB]"
                              >
                                Freeze
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedMembership(m);
                                setIsCancelModalOpen(true);
                              }}
                              className="rounded-none text-[10px] h-6 px-2 border-red-300 text-red-700 hover:bg-red-50"
                            >
                              Cancel
                            </Button>
                          </>
                        )}
                        {m.status === 'FROZEN' && isManagement && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleUnfreeze(m.id)}
                            className="rounded-none text-[10px] h-6 px-2 border-emerald-300 text-emerald-800 hover:bg-emerald-50"
                          >
                            Unfreeze
                          </Button>
                        )}
                        {isManagement && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleOpenRenewalModal(m)}
                            className="rounded-none text-[10px] h-6 px-2 border-[#0A192F] text-[#0A192F] hover:bg-[#F5F5F0]"
                          >
                            Renew
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB: Billing & Financial Ledger */}
      {activeTab === 'billing' && (
        <div className="space-y-6">
          {/* Outstanding Balance Banner */}
          {memberInvoices.reduce(
            (sum, inv) =>
              inv.status !== 'VOID' && inv.status !== 'PAID' ? sum + inv.balanceDueInPaise : sum,
            0,
          ) > 0 ? (
            <div className="bg-[#FEF2F2] border border-[#FECACA] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-[#DC2626]"></span>
                  <span className="text-xs font-bold uppercase tracking-wider text-[#991B1B]">
                    Payment Attention Required
                  </span>
                </div>
                <div className="text-xl font-bold font-mono text-[#B91C1C] mt-1">
                  Outstanding Balance:{' '}
                  {formatPaiseToInr(
                    memberInvoices.reduce(
                      (sum, inv) =>
                        inv.status !== 'VOID' && inv.status !== 'PAID'
                          ? sum + inv.balanceDueInPaise
                          : sum,
                      0,
                    ),
                  )}
                </div>
                <p className="text-xs text-[#7F1D1D] mt-0.5">
                  Unpaid dues are tracked on this account. Settle promptly to prevent membership lock.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  onClick={() => {
                    const firstUnpaid = memberInvoices.find(
                      (inv) => inv.status !== 'VOID' && inv.status !== 'PAID',
                    );
                    if (firstUnpaid) handleOpenCollectModal(firstUnpaid);
                  }}
                  className="bg-[#B91C1C] hover:bg-[#991B1B] text-[#FBFBF9] rounded-none text-xs"
                >
                  Quick Collect Dues
                </Button>
              </div>
            </div>
          ) : (
            <div className="bg-[#ECFDF5] border border-[#A7F3D0] p-4 flex items-center justify-between text-xs text-[#047857]">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-[#10B981]"></span>
                <span className="font-bold">Account in Good Standing: No Outstanding Dues</span>
              </div>
              <span className="font-mono font-semibold">Balance: ₹0.00</span>
            </div>
          )}

          {/* KPI Tiles */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-[#FBFBF9] border border-[#E5E7EB] p-4">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-[#6B7280]">
                Total Invoiced
              </div>
              <div className="text-xl font-bold font-mono text-[#0A192F] mt-1">
                {formatPaiseToInr(
                  memberInvoices.reduce(
                    (sum, inv) => (inv.status !== 'VOID' ? sum + inv.totalAmountInPaise : sum),
                    0,
                  ),
                )}
              </div>
              <div className="text-[10px] text-[#6B7280] mt-0.5">
                Across {memberInvoices.length} invoices
              </div>
            </div>

            <div className="bg-[#FBFBF9] border border-[#E5E7EB] p-4">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-[#6B7280]">
                Total Paid & Settled
              </div>
              <div className="text-xl font-bold font-mono text-[#047857] mt-1">
                {formatPaiseToInr(
                  memberPayments.reduce((sum, p) => sum + p.amountInPaise, 0),
                )}
              </div>
              <div className="text-[10px] text-[#047857] mt-0.5">
                Across {memberPayments.length} transactions
              </div>
            </div>

            <div className="bg-[#FBFBF9] border border-[#E5E7EB] p-4">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-[#6B7280]">
                Net Balance Due
              </div>
              <div className="text-xl font-bold font-mono text-[#B91C1C] mt-1">
                {formatPaiseToInr(
                  memberInvoices.reduce(
                    (sum, inv) =>
                      inv.status !== 'VOID' && inv.status !== 'PAID'
                        ? sum + inv.balanceDueInPaise
                        : sum,
                    0,
                  ),
                )}
              </div>
              <div className="text-[10px] text-[#6B7280] mt-0.5">Current liability</div>
            </div>
          </div>

          {/* Invoices List */}
          <div className="bg-[#FBFBF9] border border-[#E5E7EB]">
            <div className="p-4 border-b border-[#E5E7EB] flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#0A192F]">
                Invoices & Tax Bills ({memberInvoices.length})
              </h3>
              {isManagement && (
                <Button
                  size="sm"
                  onClick={() => navigate('/billing/invoices/new')}
                  className="rounded-none text-xs h-7 bg-[#0A192F] text-[#FBFBF9]"
                >
                  Generate New Invoice
                </Button>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-[#111827]">
                <thead className="bg-[#F5F5F0] border-b border-[#E5E7EB] text-[11px] font-semibold uppercase text-[#6B7280]">
                  <tr>
                    <th className="py-2.5 px-4">Invoice #</th>
                    <th className="py-2.5 px-4">Invoice Date</th>
                    <th className="py-2.5 px-4">Due Date</th>
                    <th className="py-2.5 px-4 text-right">Total Amount</th>
                    <th className="py-2.5 px-4 text-right">Paid</th>
                    <th className="py-2.5 px-4 text-right">Balance Due</th>
                    <th className="py-2.5 px-4 text-center">Status</th>
                    <th className="py-2.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB]">
                  {memberInvoices.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-[#6B7280]">
                        No invoices billed to this member yet.
                      </td>
                    </tr>
                  ) : (
                    memberInvoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-[#F5F5F0]">
                        <td className="py-3 px-4 font-mono font-bold text-[#0A192F]">
                          <button
                            onClick={() => navigate(`/billing/invoices/${inv.id}`)}
                            className="hover:underline"
                          >
                            {inv.invoiceNumber}
                          </button>
                        </td>
                        <td className="py-3 px-4 text-[#4B5563]">
                          {new Date(inv.invoiceDate).toLocaleDateString('en-IN')}
                        </td>
                        <td className="py-3 px-4 text-[#4B5563]">
                          {new Date(inv.dueDate).toLocaleDateString('en-IN')}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-[#0A192F]">
                          {formatPaiseToInr(inv.totalAmountInPaise)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-[#047857]">
                          {formatPaiseToInr(inv.paidAmountInPaise)}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-[#B91C1C]">
                          {formatPaiseToInr(inv.balanceDueInPaise)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={`inline-block px-2 py-0.5 text-[10px] font-bold border uppercase tracking-wider rounded-none ${
                              inv.status === 'PAID'
                                ? 'bg-[#ECFDF5] text-[#047857] border-[#A7F3D0]'
                                : inv.status === 'PARTIALLY_PAID'
                                ? 'bg-[#FFFBEB] text-[#B45309] border-[#FDE68A]'
                                : inv.status === 'OVERDUE'
                                ? 'bg-[#FEF2F2] text-[#DC2626] border-[#FECACA]'
                                : 'bg-[#EFF6FF] text-[#1D4ED8] border-[#BFDBFE]'
                            }`}
                          >
                            {inv.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right space-x-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate(`/billing/invoices/${inv.id}`)}
                            className="rounded-none text-[10px] h-6 px-2 hover:bg-[#E5E7EB]"
                          >
                            View
                          </Button>
                          {inv.status !== 'PAID' && inv.status !== 'VOID' && isManagement && (
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => handleOpenCollectModal(inv)}
                              className="rounded-none text-[10px] h-6 px-2 bg-[#0A192F] hover:bg-[#0F223D] text-[#FBFBF9]"
                            >
                              Collect
                            </Button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Payment Receipts List */}
          <div className="bg-[#FBFBF9] border border-[#E5E7EB]">
            <div className="p-4 border-b border-[#E5E7EB]">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#0A192F]">
                Payment Receipts & Transactions ({memberPayments.length})
              </h3>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-[#111827]">
                <thead className="bg-[#F5F5F0] border-b border-[#E5E7EB] text-[11px] font-semibold uppercase text-[#6B7280]">
                  <tr>
                    <th className="py-2.5 px-4">Payment #</th>
                    <th className="py-2.5 px-4">Date</th>
                    <th className="py-2.5 px-4">Method</th>
                    <th className="py-2.5 px-4">Ref / UTR</th>
                    <th className="py-2.5 px-4 text-right">Amount Paid</th>
                    <th className="py-2.5 px-4">Collected By</th>
                    <th className="py-2.5 px-4 text-center">Receipt</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB]">
                  {memberPayments.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-[#6B7280]">
                        No payment records found for this member.
                      </td>
                    </tr>
                  ) : (
                    memberPayments.map((p) => (
                      <tr key={p.id} className="hover:bg-[#F5F5F0]">
                        <td className="py-3 px-4 font-mono font-bold text-[#0A192F]">
                          {p.paymentNumber}
                        </td>
                        <td className="py-3 px-4 text-[#4B5563]">
                          {new Date(p.paymentDate).toLocaleDateString('en-IN')}
                        </td>
                        <td className="py-3 px-4">
                          <span className="inline-block px-2 py-0.5 text-[10px] font-bold border uppercase tracking-wider bg-[#F5F5F0] border-[#E5E7EB]">
                            {p.method}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px] text-[#4B5563]">
                          {p.referenceNumber || '-'}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-[#047857]">
                          {formatPaiseToInr(p.amountInPaise)}
                        </td>
                        <td className="py-3 px-4 text-[#4B5563]">
                          {p.receivedBy?.fullName || 'Staff'}
                        </td>
                        <td className="py-3 px-4 text-center">
                          {p.receipt?.id ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => navigate(`/billing/receipts/${p.receipt.id}`)}
                              className="rounded-none text-[10px] h-6 px-2 text-[#0A192F] hover:bg-[#E5E7EB] font-mono"
                            >
                              {p.receipt.receiptNumber || 'Print Receipt'}
                            </Button>
                          ) : (
                            <span className="text-[#9CA3AF] text-[10px]">-</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Internal Notes */}
      {activeTab === 'notes' && (
        <div className="space-y-4">
          <form
            onSubmit={handleAddNote}
            className="border border-[#E5E7EB] bg-[#FBFBF9] p-4 space-y-3"
          >
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#0A192F]">
              Add Internal Staff Note
            </h3>
            <textarea
              rows={3}
              value={newNote}
              onChange={(e) => setNewNote(e.target.value)}
              placeholder="Record member interaction, training progress, diet preferences or billing reminders..."
              className="w-full text-xs border border-[#E5E7EB] bg-[#FBFBF9] p-2 text-[#111827] focus:outline-none focus:ring-1 focus:ring-[#0A192F] rounded-none"
            />
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isNotePinned}
                  onChange={(e) => setIsNotePinned(e.target.checked)}
                  className="h-4 w-4 rounded-none border-[#E5E7EB]"
                />
                <span className="text-xs text-[#4B5563]">Pin this note to top of profile</span>
              </label>
              <Button
                type="submit"
                size="sm"
                disabled={isSubmittingNote}
                className="bg-[#0A192F] text-[#FBFBF9] rounded-none text-xs h-8 px-4"
              >
                {isSubmittingNote ? 'Saving...' : 'Save Note'}
              </Button>
            </div>
          </form>

          <div className="space-y-2">
            {member.notes?.map((n: any) => (
              <div
                key={n.id}
                className={`p-3 border text-xs ${
                  n.isPinned
                    ? 'bg-amber-50/50 border-amber-200'
                    : 'bg-[#FBFBF9] border-[#E5E7EB]'
                }`}
              >
                <div className="flex items-center justify-between text-[#6B7280] text-[11px] mb-1">
                  <span className="font-semibold text-[#111827]">
                    {n.author?.fullName || 'Staff Member'} ({n.author?.role || 'STAFF'})
                  </span>
                  <span>{new Date(n.createdAt).toLocaleString('en-IN')}</span>
                </div>
                <p className="text-[#111827] whitespace-pre-wrap">{n.note}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 4: Activity Timeline */}
      {activeTab === 'activity' && (
        <div className="border border-[#E5E7EB] bg-[#FBFBF9] p-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-[#0A192F] mb-4">
            Immutable Audit Trail & Activity Ledger
          </h3>
          <div className="space-y-3">
            {member.activities?.map((a: any) => (
              <div key={a.id} className="flex items-start gap-3 border-l-2 border-[#0A192F] pl-3 py-1">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-[#0A192F]">{a.action}</span>
                    <span className="text-[10px] text-[#6B7280]">
                      {new Date(a.createdAt).toLocaleString('en-IN')}
                    </span>
                  </div>
                  {a.details && (
                    <pre className="text-[10px] text-[#6B7280] bg-[#F5F5F0] p-1.5 mt-1 rounded-none overflow-x-auto">
                      {JSON.stringify(a.details, null, 2)}
                    </pre>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: Attendance & Access History */}
      {activeTab === 'attendance' && (
        <div className="border border-[#E5E7EB] bg-[#FBFBF9] p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#0A192F]">
              Gate Access & Facility Attendance Ledger
            </h3>
            <span className="text-xs font-mono text-[#6B7280]">
              Total Logged Visits: {memberAttendances.length}
            </span>
          </div>

          <div className="overflow-x-auto bg-white border border-[#E5E7EB]">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#E5E7EB] bg-[#F5F5F0] text-[#6B7280] uppercase tracking-wider text-[10px]">
                  <th className="py-2.5 px-4 font-semibold">Timestamp</th>
                  <th className="py-2.5 px-4 font-semibold">Direction</th>
                  <th className="py-2.5 px-4 font-semibold">Access Decision</th>
                  <th className="py-2.5 px-4 font-semibold">Source</th>
                  <th className="py-2.5 px-4 font-semibold">Gate / Terminal</th>
                  <th className="py-2.5 px-4 font-semibold">Session Duration</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {memberAttendances.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-[#6B7280]">
                      No attendance events recorded for this athlete yet.
                    </td>
                  </tr>
                ) : (
                  memberAttendances.map((act) => {
                    const isCheckIn = act.direction === 'CHECK_IN';
                    return (
                      <tr key={act.id} className="hover:bg-[#F5F5F0] transition-colors">
                        <td className="py-3 px-4 font-mono text-[#0A192F]">
                          {new Date(act.timestamp).toLocaleDateString('en-IN')}{' '}
                          {new Date(act.timestamp).toLocaleTimeString('en-IN', {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex items-center px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider border ${
                              isCheckIn
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                : 'bg-blue-50 text-blue-700 border-blue-200'
                            }`}
                          >
                            {act.direction.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          {act.accessDecision ? (
                            <div>
                              <span
                                className={`inline-flex items-center px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider border ${
                                  act.accessDecision.decision === 'GRANTED'
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                                    : 'bg-red-50 text-red-700 border-red-200'
                                }`}
                              >
                                {act.accessDecision.decision}
                              </span>
                              <span className="block text-[10px] text-[#6B7280] mt-0.5">
                                {act.accessDecision.reasonCode}
                              </span>
                            </div>
                          ) : (
                            <span className="text-[#6B7280]">—</span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-mono text-[11px] text-[#6B7280]">
                          {act.source}
                        </td>
                        <td className="py-3 px-4 text-[#6B7280]">
                          {act.device?.name || 'Front Desk'}
                        </td>
                        <td className="py-3 px-4 font-mono text-[#0A192F]">
                          {act.session?.durationInMinutes != null
                            ? `${act.session.durationInMinutes} mins`
                            : '—'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ASSIGN MEMBERSHIP MODAL */}
      {isAssignModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-[#FBFBF9] border border-[#E5E7EB] w-full max-w-md p-6 space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-[#0A192F] border-b border-[#E5E7EB] pb-2">
              Enroll / Renew Membership Plan
            </h3>
            <form onSubmit={handleAssignPlan} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold mb-1">Select Membership Plan *</label>
                <select
                  value={assignForm.planId}
                  onChange={(e) => setAssignForm({ ...assignForm, planId: e.target.value })}
                  required
                  className="w-full h-9 border border-[#E5E7EB] bg-[#FBFBF9] px-2 rounded-none"
                >
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} - ₹{(p.priceInPaise / 100).toLocaleString('en-IN')} ({p.durationValue}{' '}
                      {p.durationType})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold mb-1">Facility Branch *</label>
                <select
                  value={assignForm.branchId}
                  onChange={(e) => setAssignForm({ ...assignForm, branchId: e.target.value })}
                  required
                  className="w-full h-9 border border-[#E5E7EB] bg-[#FBFBF9] px-2 rounded-none"
                >
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold mb-1">Membership Start Date *</label>
                <Input
                  type="date"
                  value={assignForm.startDate}
                  onChange={(e) => setAssignForm({ ...assignForm, startDate: e.target.value })}
                  required
                  className="rounded-none text-xs h-9"
                />
              </div>

              <div>
                <label className="block font-semibold mb-1">
                  Custom Negotiated Fee in ₹ (Optional Override)
                </label>
                <Input
                  type="number"
                  placeholder="Leave empty to use catalog standard price"
                  value={assignForm.customPrice}
                  onChange={(e) => setAssignForm({ ...assignForm, customPrice: e.target.value })}
                  className="rounded-none text-xs h-9"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-[#E5E7EB]">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAssignModalOpen(false)}
                  className="rounded-none text-xs"
                >
                  Cancel
                </Button>
                <Button type="submit" className="bg-[#0A192F] text-[#FBFBF9] rounded-none text-xs">
                  Enroll Member
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FREEZE MEMBERSHIP MODAL */}
      {isFreezeModalOpen && selectedMembership && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-[#FBFBF9] border border-[#E5E7EB] w-full max-w-md p-6 space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-[#0A192F] border-b border-[#E5E7EB] pb-2">
              Freeze Membership: {selectedMembership.plan.name}
            </h3>
            <p className="text-xs text-[#6B7280]">
              Max freeze allowance: {selectedMembership.plan.maxFreezeDays} days. Already used:{' '}
              {selectedMembership.totalFreezeDaysUsed} days.
            </p>
            <form onSubmit={handleFreeze} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold mb-1">Freeze Start Date *</label>
                <Input
                  type="date"
                  value={freezeForm.freezeStartDate}
                  onChange={(e) =>
                    setFreezeForm({ ...freezeForm, freezeStartDate: e.target.value })
                  }
                  required
                  className="rounded-none text-xs h-9"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Freeze End Date *</label>
                <Input
                  type="date"
                  value={freezeForm.freezeEndDate}
                  onChange={(e) => setFreezeForm({ ...freezeForm, freezeEndDate: e.target.value })}
                  required
                  className="rounded-none text-xs h-9"
                />
              </div>
              <div>
                <label className="block font-semibold mb-1">Reason for Freeze</label>
                <Input
                  placeholder="e.g. Travel, Examination, Medical rest"
                  value={freezeForm.reason}
                  onChange={(e) => setFreezeForm({ ...freezeForm, reason: e.target.value })}
                  className="rounded-none text-xs h-9"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-[#E5E7EB]">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsFreezeModalOpen(false)}
                  className="rounded-none text-xs"
                >
                  Cancel
                </Button>
                <Button type="submit" className="bg-[#B91C1C] text-[#FBFBF9] rounded-none text-xs">
                  Confirm Freeze
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CANCEL MEMBERSHIP MODAL */}
      {isCancelModalOpen && selectedMembership && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-[#FBFBF9] border border-[#E5E7EB] w-full max-w-md p-6 space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-red-700 border-b border-red-200 pb-2">
              Cancel Membership: {selectedMembership.plan.name}
            </h3>
            <form onSubmit={handleCancelMembership} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold mb-1">Mandatory Reason for Cancellation *</label>
                <textarea
                  rows={3}
                  value={cancelForm.cancellationReason}
                  onChange={(e) => setCancelForm({ cancellationReason: e.target.value })}
                  required
                  placeholder="Document why subscriber is terminating membership prematurely..."
                  className="w-full p-2 border border-[#E5E7EB] bg-[#FBFBF9] rounded-none focus:outline-none"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-[#E5E7EB]">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCancelModalOpen(false)}
                  className="rounded-none text-xs"
                >
                  Close
                </Button>
                <Button type="submit" className="bg-red-700 text-[#FBFBF9] rounded-none text-xs">
                  Confirm Cancellation
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QUICK COLLECT PAYMENT MODAL */}
      {isCollectModalOpen && selectedInvoice && (
        <div className="fixed inset-0 z-50 bg-[#0A192F]/60 flex items-center justify-center p-4">
          <div className="bg-[#FBFBF9] border border-[#E5E7EB] max-w-md w-full p-6 space-y-4">
            <div className="border-b border-[#E5E7EB] pb-3">
              <h3 className="text-base font-bold text-[#0A192F]">Collect Member Dues</h3>
              <p className="text-xs text-[#6B7280] mt-0.5">
                Invoice {selectedInvoice.invoiceNumber} • Outstanding:{' '}
                {formatPaiseToInr(selectedInvoice.balanceDueInPaise)}
              </p>
            </div>

            <form onSubmit={handleCollectSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-[#0A192F] uppercase tracking-wider mb-1">
                  Collection Amount (₹) *
                </label>
                <Input
                  type="number"
                  step="0.01"
                  required
                  value={paymentForm.amountRupees}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amountRupees: e.target.value })}
                  className="rounded-none bg-[#FBFBF9] font-mono text-sm"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#0A192F] uppercase tracking-wider mb-1">
                  Payment Method *
                </label>
                <select
                  value={paymentForm.method}
                  onChange={(e) =>
                    setPaymentForm({ ...paymentForm, method: e.target.value as PaymentMethodType })
                  }
                  className="w-full h-10 px-3 text-xs bg-[#FBFBF9] border border-[#E5E7EB] rounded-none text-[#111827] focus:outline-none focus:ring-1 focus:ring-[#0A192F]"
                >
                  <option value={PaymentMethodType.UPI}>UPI / QR</option>
                  <option value={PaymentMethodType.CASH}>Cash Drawer</option>
                  <option value={PaymentMethodType.CARD_MANUAL}>Credit / Debit Card</option>
                  <option value={PaymentMethodType.BANK_TRANSFER}>Bank Transfer</option>
                  <option value={PaymentMethodType.CHEQUE}>Cheque</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-[#0A192F] uppercase tracking-wider mb-1">
                  UTR / Reference / Voucher #
                </label>
                <Input
                  type="text"
                  placeholder="e.g. 423984029348 or Cheque 002934"
                  value={paymentForm.referenceNumber}
                  onChange={(e) => setPaymentForm({ ...paymentForm, referenceNumber: e.target.value })}
                  className="rounded-none bg-[#FBFBF9] font-mono text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-[#0A192F] uppercase tracking-wider mb-1">
                  Notes
                </label>
                <Input
                  type="text"
                  placeholder="Optional receipt notes"
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                  className="rounded-none bg-[#FBFBF9] text-xs"
                />
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-[#E5E7EB]">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsCollectModalOpen(false)}
                  className="rounded-none border-[#E5E7EB] text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-[#0A192F] hover:bg-[#0F223D] text-[#FBFBF9] rounded-none text-xs"
                >
                  Record Payment & Issue Receipt
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RENEW MEMBERSHIP MODAL */}
      {isRenewalModalOpen && (
        <div className="fixed inset-0 z-50 bg-[#0A192F]/60 flex items-center justify-center p-4">
          <div className="bg-[#FBFBF9] border border-[#E5E7EB] max-w-md w-full p-6 space-y-4">
            <div className="border-b border-[#E5E7EB] pb-3">
              <h3 className="text-base font-bold text-[#0A192F]">Renew Membership Plan</h3>
              <p className="text-xs text-[#6B7280] mt-0.5">
                Chained renewal extends continuous gym access and generates tax invoice.
              </p>
            </div>

            <form onSubmit={handleRenewalSubmit} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-[#0A192F] uppercase tracking-wider mb-1">
                  Target Membership Plan *
                </label>
                <select
                  required
                  value={renewalForm.planId}
                  onChange={(e) => setRenewalForm({ ...renewalForm, planId: e.target.value })}
                  className="w-full h-10 px-3 text-xs bg-[#FBFBF9] border border-[#E5E7EB] rounded-none text-[#111827] focus:outline-none focus:ring-1 focus:ring-[#0A192F]"
                >
                  {plans.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.durationInDays} days • {formatPaiseToInr(p.priceInPaise)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-[#0A192F] uppercase tracking-wider mb-1">
                  Gym Branch *
                </label>
                <select
                  required
                  value={renewalForm.branchId}
                  onChange={(e) => setRenewalForm({ ...renewalForm, branchId: e.target.value })}
                  className="w-full h-10 px-3 text-xs bg-[#FBFBF9] border border-[#E5E7EB] rounded-none text-[#111827] focus:outline-none focus:ring-1 focus:ring-[#0A192F]"
                >
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="border-t border-[#E5E7EB] pt-3">
                <div className="font-semibold text-[#0A192F] uppercase tracking-wider mb-2">
                  Immediate Down Payment (Optional)
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] text-[#6B7280] mb-1">Down Payment (₹)</label>
                    <Input
                      type="number"
                      step="0.01"
                      value={renewalForm.downPaymentRupees}
                      onChange={(e) =>
                        setRenewalForm({ ...renewalForm, downPaymentRupees: e.target.value })
                      }
                      className="rounded-none bg-[#FBFBF9] font-mono text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-[#6B7280] mb-1">Method</label>
                    <select
                      value={renewalForm.downPaymentMethod}
                      onChange={(e) =>
                        setRenewalForm({
                          ...renewalForm,
                          downPaymentMethod: e.target.value as PaymentMethodType,
                        })
                      }
                      className="w-full h-9 px-2 text-xs bg-[#FBFBF9] border border-[#E5E7EB] rounded-none"
                    >
                      <option value={PaymentMethodType.UPI}>UPI / QR</option>
                      <option value={PaymentMethodType.CASH}>Cash</option>
                      <option value={PaymentMethodType.CARD_MANUAL}>Card</option>
                      <option value={PaymentMethodType.BANK_TRANSFER}>Bank Transfer</option>
                    </select>
                  </div>
                </div>

                {parseFloat(renewalForm.downPaymentRupees) > 0 && (
                  <div className="mt-2">
                    <label className="block text-[11px] text-[#6B7280] mb-1">
                      UTR / Reference Number
                    </label>
                    <Input
                      type="text"
                      placeholder="e.g. 423984029348"
                      value={renewalForm.downPaymentRef}
                      onChange={(e) =>
                        setRenewalForm({ ...renewalForm, downPaymentRef: e.target.value })
                      }
                      className="rounded-none bg-[#FBFBF9] font-mono text-xs"
                    />
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-[#E5E7EB]">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsRenewalModalOpen(false)}
                  className="rounded-none border-[#E5E7EB] text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-[#0A192F] hover:bg-[#0F223D] text-[#FBFBF9] rounded-none text-xs"
                >
                  Generate Renewal & Invoice
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
