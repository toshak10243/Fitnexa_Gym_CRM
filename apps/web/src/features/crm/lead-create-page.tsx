import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../lib/api-client';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { LeadSource } from '@fitnexa/shared';

export function LeadCreatePage() {
  const navigate = useNavigate();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [source, setSource] = useState<LeadSource>(LeadSource.WALK_IN);
  const [fitnessGoal, setFitnessGoal] = useState('General Fitness');
  const [trialScheduledAt, setTrialScheduledAt] = useState('');
  const [notes, setNotes] = useState('');
  const [branchId, setBranchId] = useState('');
  const [branches, setBranches] = useState<any[]>([]);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserAndBranches = async () => {
      try {
        const [meRes, branchRes] = await Promise.all([
          apiClient.get('/auth/me'),
          apiClient.get('/tenant/branches'),
        ]);
        const branchList = branchRes.data.data || [];
        setBranches(branchList);
        if (meRes.data.data?.branchId) {
          setBranchId(meRes.data.data.branchId);
        } else if (branchList.length > 0) {
          setBranchId(branchList[0].id);
        }
      } catch {
        // Handled gracefully
      }
    };
    fetchUserAndBranches();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim() || !phone.trim() || !branchId) {
      setError('First name, last name, phone number, and branch are mandatory.');
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      const res = await apiClient.post('/leads', {
        branchId,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        phone: phone.trim(),
        email: email.trim() || undefined,
        source,
        fitnessGoal: fitnessGoal.trim() || undefined,
        trialScheduledAt: trialScheduledAt ? new Date(trialScheduledAt).toISOString() : undefined,
        notes: notes.trim() || undefined,
      });

      navigate(`/leads/${res.data.data.id}`);
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to create lead inquiry.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E5E7EB] pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#0A192F] uppercase">
            Intake New Lead Inquiry
          </h1>
          <p className="text-xs text-[#6B7280] mt-1">
            Capture prospective gym member details with automated duplicate mobile detection.
          </p>
        </div>
        <Button
          variant="outline"
          className="text-xs border-[#E5E7EB] rounded-none hover:bg-[#F5F5F0]"
          onClick={() => navigate('/leads')}
        >
          ← Cancel
        </Button>
      </div>

      {error && (
        <div className="p-4 border border-red-200 bg-red-50 text-xs text-[#B91C1C] font-bold">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-[#FBFBF9] border border-[#E5E7EB] p-6 space-y-5">
        {/* Name Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-[11px] font-bold uppercase text-[#0A192F] mb-1">
              First Name *
            </label>
            <Input
              required
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="e.g. Vikram"
              className="text-xs border-[#E5E7EB] bg-white rounded-none"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase text-[#0A192F] mb-1">
              Last Name *
            </label>
            <Input
              required
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="e.g. Malhotra"
              className="text-xs border-[#E5E7EB] bg-white rounded-none"
            />
          </div>
        </div>

        {/* Contact Fields */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-[11px] font-bold uppercase text-[#0A192F] mb-1">
              Mobile Number (10 digits) *
            </label>
            <Input
              required
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="9876543210"
              className="text-xs border-[#E5E7EB] bg-white rounded-none font-mono"
            />
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase text-[#0A192F] mb-1">
              Email Address
            </label>
            <Input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="prospect@gmail.com"
              className="text-xs border-[#E5E7EB] bg-white rounded-none"
            />
          </div>
        </div>

        {/* Channel & Target Facility */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-[11px] font-bold uppercase text-[#0A192F] mb-1">
              Inquiry Source Channel *
            </label>
            <select
              value={source}
              onChange={(e) => setSource(e.target.value as LeadSource)}
              className="w-full text-xs border border-[#E5E7EB] bg-white p-2 rounded-none font-medium text-[#0A192F]"
            >
              {Object.values(LeadSource).map((s) => (
                <option key={s} value={s}>
                  {s.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase text-[#0A192F] mb-1">
              Gym Branch Location *
            </label>
            <select
              required
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
              className="w-full text-xs border border-[#E5E7EB] bg-white p-2 rounded-none font-medium text-[#0A192F]"
            >
              <option value="">Select Branch...</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Fitness Goal & Trial Date */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-[11px] font-bold uppercase text-[#0A192F] mb-1">
              Primary Fitness Goal
            </label>
            <select
              value={fitnessGoal}
              onChange={(e) => setFitnessGoal(e.target.value)}
              className="w-full text-xs border border-[#E5E7EB] bg-white p-2 rounded-none font-medium text-[#0A192F]"
            >
              <option value="Fat Loss & Toning">Fat Loss & Toning</option>
              <option value="Muscle Hypertrophy & Bulk">Muscle Hypertrophy & Bulk</option>
              <option value="Athletic Conditioning">Athletic Conditioning</option>
              <option value="General Health & Mobility">General Health & Mobility</option>
              <option value="Rehabilitation / Physiotherapy">Rehabilitation / Physiotherapy</option>
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase text-[#0A192F] mb-1">
              Schedule Free Trial Workout
            </label>
            <Input
              type="datetime-local"
              value={trialScheduledAt}
              onChange={(e) => setTrialScheduledAt(e.target.value)}
              className="text-xs border-[#E5E7EB] bg-white rounded-none font-mono"
            />
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-bold uppercase text-[#0A192F] mb-1">
            Counselor / Staff Notes
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Inquired about annual couple package; prefers morning 7 AM workout slot."
            className="w-full text-xs border border-[#E5E7EB] bg-white p-2 text-[#0A192F] rounded-none focus:outline-hidden"
          />
        </div>

        <div className="pt-4 border-t border-[#E5E7EB] flex items-center justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            className="text-xs border-[#E5E7EB] rounded-none"
            onClick={() => navigate('/leads')}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="bg-[#0A192F] text-[#FBFBF9] hover:bg-[#162E52] text-xs rounded-none h-10 px-6 font-bold"
          >
            {isSubmitting ? 'Verifying & Saving...' : 'Save Lead Inquiry'}
          </Button>
        </div>
      </form>
    </div>
  );
}
