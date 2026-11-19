import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiClient } from '../../lib/api-client';
import { Button } from '../../components/ui/button';
import { Skeleton } from '../../components/ui/skeleton';

export function TrainerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [isLoading, setIsLoading] = useState(true);
  const [trainer, setTrainer] = useState<any | null>(null);
  const [packages, setPackages] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);

  // Assign Package Modal
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [selectedPackageId, setSelectedPackageId] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);

  const fetchTrainer = async () => {
    setIsLoading(true);
    try {
      const [tRes, pRes, mRes] = await Promise.all([
        apiClient.get(`/trainers/${id}`),
        apiClient.get('/trainers/packages'),
        apiClient.get('/members?limit=50'),
      ]);
      setTrainer(tRes.data.data);
      setPackages(pRes.data.data || []);
      setMembers(mRes.data.data.items || []);
    } catch {
      // Handled gracefully
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (id) fetchTrainer();
  }, [id]);

  const handleAssignPackage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMemberId || !selectedPackageId) {
      setAssignError('Please select both a member and a training package.');
      return;
    }
    setAssignError(null);
    setIsAssigning(true);
    try {
      await apiClient.post('/trainers/assignments', {
        trainerProfileId: id,
        memberId: selectedMemberId,
        trainingPackageId: selectedPackageId,
      });
      setIsAssignModalOpen(false);
      setSelectedMemberId('');
      setSelectedPackageId('');
      fetchTrainer();
    } catch (err: any) {
      setAssignError(err?.response?.data?.message || 'Assignment failed');
    } finally {
      setIsAssigning(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 max-w-7xl mx-auto space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-64 w-full" />
          <Skeleton className="h-64 md:col-span-2 w-full" />
        </div>
      </div>
    );
  }

  if (!trainer) {
    return (
      <div className="p-8 max-w-7xl mx-auto text-center space-y-4">
        <div className="text-xs text-[#6B7280]">Trainer profile not found.</div>
        <Button
          variant="outline"
          className="text-xs border-[#E5E7EB] rounded-none"
          onClick={() => navigate('/trainers')}
        >
          ← Back to Trainers
        </Button>
      </div>
    );
  }

  const user = trainer.user || {};
  const assignments = trainer.assignments || [];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E5E7EB] pb-5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold tracking-tight text-[#0A192F] uppercase">
              {user.name}
            </h1>
            <span className="inline-block px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200">
              COACH ROSTER
            </span>
          </div>
          <p className="text-xs text-[#6B7280] mt-1 font-mono">
            {user.email || 'No email'} | {user.phone || 'No phone'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="text-xs border-[#E5E7EB] rounded-none hover:bg-[#F5F5F0]"
            onClick={() => navigate('/trainers')}
          >
            ← All Trainers
          </Button>
          <Button
            variant="outline"
            className="text-xs border-[#E5E7EB] rounded-none hover:bg-[#F5F5F0]"
            onClick={() => navigate('/trainers/schedule')}
          >
            Schedule Calendar
          </Button>
          <Button
            className="bg-[#0A192F] text-[#FBFBF9] hover:bg-[#162E52] text-xs rounded-none px-4"
            onClick={() => setIsAssignModalOpen(true)}
          >
            + Assign Client Package
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Trainer Bio & Specs */}
        <div className="bg-[#FBFBF9] border border-[#E5E7EB] p-5 space-y-4">
          <div className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">
            Profile Overview
          </div>

          <p className="text-xs text-[#0A192F]">
            {trainer.bio || 'Dedicated personal fitness trainer.'}
          </p>

          <div className="pt-3 border-t border-[#E5E7EB] space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-[#6B7280]">Commission Tier:</span>
              <span className="font-mono font-bold text-[#0A192F]">
                {trainer.commissionPercentage}%
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#6B7280]">Max Client Capacity:</span>
              <span className="font-mono font-bold text-[#0A192F]">
                {trainer.maxActiveClients}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#6B7280]">Active PT Clients:</span>
              <span className="font-mono font-bold text-emerald-700">
                {assignments.length}
              </span>
            </div>
          </div>

          <div className="pt-3 border-t border-[#E5E7EB]">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280] block mb-2">
              Specializations
            </span>
            <div className="flex flex-wrap gap-1.5">
              {(trainer.specializations || []).map((s: string, i: number) => (
                <span
                  key={i}
                  className="text-[10px] px-2 py-0.5 border border-[#E5E7EB] bg-white font-medium text-[#0A192F]"
                >
                  {s}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Right Column: Assigned PT Clients */}
        <div className="md:col-span-2 bg-[#FBFBF9] border border-[#E5E7EB] p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-3">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">
              Assigned Members & Active Training Packages ({assignments.length})
            </span>
          </div>

          {assignments.length === 0 ? (
            <div className="py-12 text-center text-xs text-[#6B7280]">
              No active training packages assigned yet. Click &apos;+ Assign Client Package&apos; above.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#E5E7EB] bg-[#F5F5F0] text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">
                    <th className="py-2.5 px-3">Member</th>
                    <th className="py-2.5 px-3">Package Name</th>
                    <th className="py-2.5 px-3 text-center">Sessions Remaining</th>
                    <th className="py-2.5 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB] text-xs">
                  {assignments.map((a: any) => (
                    <tr key={a.id} className="hover:bg-white transition-colors">
                      <td className="py-3 px-3 font-medium text-[#0A192F]">
                        <div>{a.member?.fullName}</div>
                        <div className="font-mono text-[10px] text-[#6B7280]">
                          {a.member?.mobileNumber}
                        </div>
                      </td>
                      <td className="py-3 px-3 text-[#0A192F]">
                        {a.trainingPackage?.name}
                      </td>
                      <td className="py-3 px-3 text-center font-mono font-bold text-[#0A192F]">
                        {a.sessionsRemaining} / {a.totalSessions}
                      </td>
                      <td className="py-3 px-3">
                        <span className="inline-block px-1.5 py-0.5 text-[9px] font-bold uppercase bg-emerald-50 text-emerald-800 border border-emerald-200">
                          {a.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Assign Package Modal */}
      {isAssignModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-[#FBFBF9] border border-[#E5E7EB] w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-3">
              <h2 className="text-sm font-bold uppercase tracking-tight text-[#0A192F]">
                Assign PT Package to Client
              </h2>
              <button
                type="button"
                className="text-[#6B7280] hover:text-[#0A192F] text-sm font-mono"
                onClick={() => setIsAssignModalOpen(false)}
              >
                ✕
              </button>
            </div>

            {assignError && (
              <div className="p-3 border border-red-200 bg-red-50 text-xs text-[#B91C1C]">
                {assignError}
              </div>
            )}

            <form onSubmit={handleAssignPackage} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold uppercase text-[#0A192F] mb-1">
                  Gym Member *
                </label>
                <select
                  required
                  value={selectedMemberId}
                  onChange={(e) => setSelectedMemberId(e.target.value)}
                  className="w-full text-xs border border-[#E5E7EB] bg-white p-2 rounded-none font-medium text-[#0A192F]"
                >
                  <option value="">Select Member...</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.fullName} ({m.mobileNumber})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-[#0A192F] mb-1">
                  Training Package *
                </label>
                <select
                  required
                  value={selectedPackageId}
                  onChange={(e) => setSelectedPackageId(e.target.value)}
                  className="w-full text-xs border border-[#E5E7EB] bg-white p-2 rounded-none font-medium text-[#0A192F]"
                >
                  <option value="">Select Package...</option>
                  {packages.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.sessionCount} Sessions - ₹{(p.priceInPaise / 100).toFixed(0)})
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-3 border-t border-[#E5E7EB] flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAssignModalOpen(false)}
                  className="text-xs border-[#E5E7EB] rounded-none h-8 px-4"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isAssigning}
                  className="bg-[#0A192F] text-[#FBFBF9] hover:bg-[#162E52] text-xs rounded-none h-8 px-5 font-bold"
                >
                  {isAssigning ? 'Assigning...' : 'Confirm Assignment'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
