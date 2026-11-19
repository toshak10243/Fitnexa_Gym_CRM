import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../lib/api-client';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Skeleton } from '../../components/ui/skeleton';

export function TrainersPage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [trainers, setTrainers] = useState<any[]>([]);
  const [staffUsers, setStaffUsers] = useState<any[]>([]);

  // Add Trainer Profile Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [bio, setBio] = useState('');
  const [specializations, setSpecializations] = useState('');
  const [commissionRate, setCommissionRate] = useState('20');
  const [maxClients, setMaxClients] = useState('15');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const fetchTrainers = async () => {
    setIsLoading(true);
    try {
      const [trainersRes, staffRes] = await Promise.all([
        apiClient.get('/trainers'),
        apiClient.get('/staff'),
      ]);
      setTrainers(trainersRes.data.data || []);
      setStaffUsers(staffRes.data.data || []);
    } catch {
      // Handled gracefully
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTrainers();
  }, []);

  const handleUpsertProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId) {
      setModalError('Please select a staff member');
      return;
    }
    setModalError(null);
    setIsSubmitting(true);
    try {
      await apiClient.post('/trainers/profile', {
        userId: selectedUserId,
        bio: bio.trim() || undefined,
        specializations: specializations
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
        commissionPercentage: parseFloat(commissionRate) || 0,
        maxActiveClients: parseInt(maxClients, 10) || 15,
      });
      setIsModalOpen(false);
      setSelectedUserId('');
      setBio('');
      setSpecializations('');
      fetchTrainers();
    } catch (err: any) {
      setModalError(err?.response?.data?.message || 'Failed to save trainer profile');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E5E7EB] pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#0A192F] uppercase">
            Trainer & Personal Training Management
          </h1>
          <p className="text-xs text-[#6B7280] mt-1">
            Certified coaches, PT allocations, client rosters, commission tiers, and session scheduling.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="text-xs border-[#E5E7EB] rounded-none hover:bg-[#F5F5F0]"
            onClick={() => navigate('/trainers/schedule')}
          >
            Session Calendar →
          </Button>
          <Button
            className="bg-[#0A192F] text-[#FBFBF9] hover:bg-[#162E52] text-xs rounded-none px-4"
            onClick={() => setIsModalOpen(true)}
          >
            + Assign Trainer Profile
          </Button>
        </div>
      </div>

      {/* Trainers Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-48 w-full" />
          ))}
        </div>
      ) : trainers.length === 0 ? (
        <div className="bg-[#FBFBF9] border border-[#E5E7EB] p-12 text-center text-xs text-[#6B7280]">
          No trainer profiles established yet. Click &apos;+ Assign Trainer Profile&apos; to register a coach.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {trainers.map((t) => {
            const user = t.user || {};
            const clientCount = t.assignments?.length || 0;
            return (
              <div
                key={t.id}
                className="bg-[#FBFBF9] border border-[#E5E7EB] p-5 flex flex-col justify-between hover:border-[#0A192F] transition-colors"
              >
                <div>
                  <div className="flex items-start justify-between">
                    <div>
                      <h2 className="text-base font-bold text-[#0A192F]">
                        {user.name || 'Staff Member'}
                      </h2>
                      <div className="text-[11px] font-mono text-[#6B7280]">
                        {user.email || user.phone}
                      </div>
                    </div>
                    <span className="inline-block px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200">
                      ACTIVE COACH
                    </span>
                  </div>

                  <p className="mt-3 text-xs text-[#6B7280] line-clamp-2">
                    {t.bio || 'Certified fitness trainer and strength coach.'}
                  </p>

                  {/* Specializations tags */}
                  <div className="mt-3 flex flex-wrap gap-1">
                    {(t.specializations || []).map((spec: string, idx: number) => (
                      <span
                        key={idx}
                        className="text-[9px] px-1.5 py-0.5 border border-[#E5E7EB] bg-white text-[#0A192F] font-medium"
                      >
                        {spec}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="mt-5 pt-4 border-t border-[#E5E7EB]">
                  <div className="grid grid-cols-2 gap-2 text-xs mb-4">
                    <div>
                      <span className="text-[10px] uppercase text-[#6B7280] block">Active Clients</span>
                      <span className="font-mono font-bold text-sm text-[#0A192F]">
                        {clientCount} / {t.maxActiveClients || 20}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] uppercase text-[#6B7280] block">Commission</span>
                      <span className="font-mono font-bold text-sm text-[#0A192F]">
                        {t.commissionPercentage || 0}%
                      </span>
                    </div>
                  </div>

                  <Button
                    variant="outline"
                    className="w-full text-xs border-[#E5E7EB] rounded-none hover:bg-[#F5F5F0]"
                    onClick={() => navigate(`/trainers/${t.id}`)}
                  >
                    View Roster & Availability →
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Add Trainer Profile */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-[#FBFBF9] border border-[#E5E7EB] w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-3">
              <h2 className="text-sm font-bold uppercase tracking-tight text-[#0A192F]">
                Assign Trainer Profile
              </h2>
              <button
                type="button"
                className="text-[#6B7280] hover:text-[#0A192F] text-sm font-mono"
                onClick={() => setIsModalOpen(false)}
              >
                ✕
              </button>
            </div>

            {modalError && (
              <div className="p-3 border border-red-200 bg-red-50 text-xs text-[#B91C1C]">
                {modalError}
              </div>
            )}

            <form onSubmit={handleUpsertProfile} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold uppercase text-[#0A192F] mb-1">
                  Staff Member *
                </label>
                <select
                  required
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="w-full text-xs border border-[#E5E7EB] bg-white p-2 rounded-none font-medium text-[#0A192F]"
                >
                  <option value="">Select Staff User...</option>
                  {staffUsers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} ({s.role})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-[#0A192F] mb-1">
                  Specializations (comma separated)
                </label>
                <Input
                  value={specializations}
                  onChange={(e) => setSpecializations(e.target.value)}
                  placeholder="e.g. Strength & Conditioning, HIIT, Weight Loss"
                  className="text-xs border-[#E5E7EB] bg-white rounded-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-[#0A192F] mb-1">
                    Commission (%)
                  </label>
                  <Input
                    type="number"
                    min="0"
                    max="100"
                    value={commissionRate}
                    onChange={(e) => setCommissionRate(e.target.value)}
                    className="text-xs border-[#E5E7EB] bg-white rounded-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase text-[#0A192F] mb-1">
                    Max Active Clients
                  </label>
                  <Input
                    type="number"
                    min="1"
                    max="100"
                    value={maxClients}
                    onChange={(e) => setMaxClients(e.target.value)}
                    className="text-xs border-[#E5E7EB] bg-white rounded-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-[#0A192F] mb-1">
                  Trainer Bio / Credentials
                </label>
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={2}
                  placeholder="e.g. ACE Certified with 6+ years experience in Olympic weightlifting..."
                  className="w-full text-xs border border-[#E5E7EB] bg-white p-2 text-[#0A192F] rounded-none focus:outline-hidden"
                />
              </div>

              <div className="pt-3 border-t border-[#E5E7EB] flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsModalOpen(false)}
                  className="text-xs border-[#E5E7EB] rounded-none h-8 px-4"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-[#0A192F] text-[#FBFBF9] hover:bg-[#162E52] text-xs rounded-none h-8 px-5 font-bold"
                >
                  {isSubmitting ? 'Saving...' : 'Establish Profile'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
