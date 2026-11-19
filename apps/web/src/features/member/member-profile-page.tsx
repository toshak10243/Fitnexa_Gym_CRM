import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiClient } from '../../lib/api-client';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Skeleton } from '../../components/ui/skeleton';
import { MemberStatus, UserRole } from '@fitnexa/shared';
import { useAuth } from '../../context/auth-context';

export function MemberProfilePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [member, setMember] = useState<any>(null);
  const [plans, setPlans] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'details' | 'memberships' | 'notes' | 'activity'>('details');

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

  useEffect(() => {
    fetchMember();
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
      <div className="flex border-b border-[#E5E7EB] bg-[#FBFBF9]">
        <button
          onClick={() => setActiveTab('details')}
          className={`py-3 px-6 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors ${
            activeTab === 'details'
              ? 'border-[#0A192F] text-[#0A192F]'
              : 'border-transparent text-[#6B7280] hover:text-[#111827]'
          }`}
        >
          Overview & Details
        </button>
        <button
          onClick={() => setActiveTab('memberships')}
          className={`py-3 px-6 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors ${
            activeTab === 'memberships'
              ? 'border-[#0A192F] text-[#0A192F]'
              : 'border-transparent text-[#6B7280] hover:text-[#111827]'
          }`}
        >
          Memberships & Subscriptions ({member.memberships?.length || 0})
        </button>
        <button
          onClick={() => setActiveTab('notes')}
          className={`py-3 px-6 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors ${
            activeTab === 'notes'
              ? 'border-[#0A192F] text-[#0A192F]'
              : 'border-transparent text-[#6B7280] hover:text-[#111827]'
          }`}
        >
          Internal Staff Notes ({member.notes?.length || 0})
        </button>
        <button
          onClick={() => setActiveTab('activity')}
          className={`py-3 px-6 text-xs font-bold uppercase tracking-wider border-b-2 transition-colors ${
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
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
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
    </div>
  );
}
