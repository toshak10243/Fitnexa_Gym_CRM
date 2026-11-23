import { createPortal } from 'react-dom';
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiClient } from '../../lib/api-client';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Skeleton } from '../../components/ui/skeleton';
import { useAuth } from '../../context/auth-context';

export function TrainerDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { tenant } = useAuth();

  const [isLoading, setIsLoading] = useState(true);
  const [trainer, setTrainer] = useState<any | null>(null);
  const [packages, setPackages] = useState<any[]>([]);
  const [members, setMembers] = useState<any[]>([]);

  // Assign Package Modal
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [selectedPackageId, setSelectedPackageId] = useState('');
  const [assignmentStartDate, setAssignmentStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [isAssigning, setIsAssigning] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editForm, setEditForm] = useState<any>({});
  const [isPackageOpen, setIsPackageOpen] = useState(false);
  const [packageForm, setPackageForm] = useState({ name: '', description: '', sessionCount: '12', validityDays: '30', priceRupees: '' });

  const fetchTrainer = async () => {
    setIsLoading(true);
    try {
      const [tRes, pRes, mRes] = await Promise.all([
        apiClient.get(`/trainers/${id}`),
        apiClient.get('/trainers/packages').catch(() => ({ data: { data: [] } })),
        apiClient.get('/members?limit=50').catch(() => ({ data: { data: { items: [] } } })),
      ]);
      setTrainer(tRes.data.data);
      setPackages(pRes.data.data || []);
      setMembers(mRes.data.data?.items || mRes.data.data || []);
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
        branchId: trainer?.branchId || trainer?.user?.branchId || members.find((member) => member.id === selectedMemberId)?.branchId,
        trainerProfileId: id,
        memberId: selectedMemberId,
        packageId: selectedPackageId,
        startDate: assignmentStartDate,
      });
      setIsAssignModalOpen(false);
      setSelectedMemberId('');
      setSelectedPackageId('');
      setAssignmentStartDate(new Date().toISOString().slice(0, 10));
      fetchTrainer();
      setToast('Client assigned to trainer successfully.');
      window.setTimeout(() => setToast(null), 3500);
    } catch (err: any) {
      setAssignError(err?.response?.data?.message || 'Assignment failed');
    } finally {
      setIsAssigning(false);
    }
  };

  const openEdit = () => setEditForm({
    ...trainer,
    fullName: trainer?.user?.fullName || '',
    email: trainer?.user?.email || '',
    phone: trainer?.user?.phone || '',
    branchId: trainer?.branchId || '',
    dob: trainer?.dob ? String(trainer.dob).slice(0, 10) : '',
    dateOfJoining: trainer?.dateOfJoining ? String(trainer.dateOfJoining).slice(0, 10) : '',
    specializations: Array.isArray(trainer?.specializations) ? trainer.specializations.join(', ') : trainer?.specializations || '',
  });
  const handleSaveEdit = async (e: React.FormEvent) => {
    e.preventDefault(); setIsSavingEdit(true);
    try {
      const payload = { ...editForm, specializations: typeof editForm.specializations === 'string' ? editForm.specializations.split(',').map((item: string) => item.trim()).filter(Boolean) : editForm.specializations };
      await apiClient.patch(`/trainers/${id}`, payload); setIsEditOpen(false); await fetchTrainer();
    }
    catch (err: any) { alert(err?.response?.data?.message || 'Trainer update failed'); }
    finally { setIsSavingEdit(false); }
  };
  const handleDelete = async () => {
    if (!window.confirm('Delete this trainer profile permanently?')) return;
    try { await apiClient.delete(`/trainers/${id}`); navigate('/trainers'); }
    catch (err: any) { alert(err?.response?.data?.message || 'Trainer cannot be deleted'); }
  };
  const handleCreatePackage = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.post('/trainers/packages', { name: packageForm.name, description: packageForm.description, sessionCount: Number(packageForm.sessionCount), validityDays: Number(packageForm.validityDays), priceInPaise: Math.round(Number(packageForm.priceRupees) * 100) });
      setIsPackageOpen(false); setPackageForm({ name: '', description: '', sessionCount: '12', validityDays: '30', priceRupees: '' });
      setToast('Training package created successfully.');
      window.setTimeout(() => setToast(null), 3500);
    } catch (err: any) { alert(err?.response?.data?.message || 'Could not create training package'); }
  };

  const formatCurrency = (paise?: number) => {
    if (paise === undefined || paise === null) return '₹0';
    return (paise / 100).toLocaleString('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    });
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return 'Not set';
    try {
      return new Date(dateStr).toLocaleDateString('en-IN', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
      });
    } catch {
      return dateStr;
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 max-w-7xl mx-auto space-y-6">
        <Skeleton className="h-12 w-96" />
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
          className="text-xs border-[#E5E7EB] rounded-none hover:bg-[#F5F5F0]"
          onClick={() => navigate('/trainers')}
        >
          ← Back to Trainers
        </Button>
      </div>
    );
  }

  const user = trainer.user || {};
  const assignments = trainer.assignments || [];
  const sessions = trainer.sessions || [];

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {toast && <div className="fixed right-6 top-6 z-[10000] border border-[#A7F3D0] bg-[#ECFDF5] px-4 py-3 text-xs font-semibold text-[#065F46]">{toast}</div>}
      {/* Top Breadcrumb Navigation */}
      <div className="flex items-center justify-between text-xs pb-2 border-b border-[#E5E7EB]">
        <div className="flex items-center gap-2 text-[#6B7280]">
          <button
            onClick={() => navigate('/trainers')}
            className="hover:text-[#0A192F] underline"
          >
            Trainers & Coaching
          </button>
          <span>/</span>
          <span className="font-bold text-[#0A192F]">{user.fullName || 'Trainer Profile'}</span>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="text-xs border-[#E5E7EB] rounded-none hover:bg-[#F5F5F0] py-1 px-3"
            onClick={() => navigate('/trainers')}
          >
            ← Back to Roster
          </Button>
          <Button
            variant="outline"
            className="text-xs border-[#E5E7EB] rounded-none hover:bg-[#F5F5F0] py-1 px-3"
            onClick={() => navigate('/trainers/schedule')}
          >
            Session Schedule Calendar
          </Button>
          <Button
            variant="outline"
            className="text-xs border-[#E5E7EB] rounded-none hover:bg-[#F5F5F0] py-1 px-3"
            onClick={() => window.print()}
          >
            Print Trainer PDF
          </Button>
          <Button
            className="bg-[#0A192F] text-[#FBFBF9] hover:bg-[#162E52] text-xs rounded-none py-1 px-4"
            onClick={() => setIsAssignModalOpen(true)}
          >
            + Assign PT Client
          </Button>
          <Button variant="outline" className="text-xs rounded-none border-[#0A192F]" onClick={() => setIsPackageOpen(true)}>Add Training Package</Button>
          <Button variant="outline" className="text-xs rounded-none border-[#0A192F]" onClick={() => { openEdit(); setIsEditOpen(true); }}>Edit Trainer</Button>
          <Button variant="outline" className="text-xs rounded-none border-red-300 text-red-700" onClick={handleDelete}>Delete</Button>
        </div>
      </div>

      <div className="hidden print:flex items-start justify-between border-b-2 border-[#0A192F] pb-4 text-[#111827]">
        <div className="flex items-center gap-3">
          {tenant?.logoUrl && <img src={tenant.logoUrl} alt="Organization logo" className="h-14 w-14 object-contain" />}
          <div>
            <div className="text-xl font-extrabold uppercase tracking-wide text-[#0A192F]">{tenant?.name || 'Trifit Elite Fitness & Sports Club'}</div>
            <div className="text-[10px] mt-1">{tenant?.address}, {tenant?.city}, {tenant?.state} - {tenant?.pincode}</div>
            <div className="text-[10px]">Mobile: {tenant?.phone || '-'} | Email: {tenant?.email || '-'} | GSTIN: {tenant?.gstin || '-'} | PAN: {tenant?.pan || '-'}</div>
          </div>
        </div>
        <div className="text-right text-[10px]">{tenant?.website || ''}<br />{tenant?.instagram || ''}<br />{tenant?.whatsapp || ''}</div>
      </div>

      {/* Hero 360-Degree Header Card */}
      <div className="bg-[#FBFBF9] border border-[#E5E7EB] p-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            {/* Coach Photo Thumbnail */}
            <div className="w-20 h-20 rounded-sm bg-[#0A192F] text-[#FBFBF9] border-2 border-[#162E52] flex items-center justify-center font-bold text-xl uppercase overflow-hidden flex-shrink-0 shadow-sm">
              {trainer.photoUrl ? (
                <img
                  src={trainer.photoUrl}
                  alt={user.fullName}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span>
                  {(user.fullName || 'T')
                    .split(' ')
                    .map((n: string) => n[0])
                    .join('')
                    .slice(0, 2)}
                </span>
              )}
            </div>

            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold tracking-tight text-[#0A192F]">
                  {user.fullName || 'Fitness Trainer'}
                </h1>
                <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200">
                  {user.status || 'ACTIVE'} COACH
                </span>
                {trainer.bloodGroup && (
                  <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-red-50 text-[#B91C1C] border border-red-200">
                    BLOOD: {trainer.bloodGroup}
                  </span>
                )}
              </div>
              <div className="text-xs font-mono text-[#6B7280] mt-1 flex flex-wrap items-center gap-3">
                <span>Phone: {user.phone || 'N/A'}</span>
                <span>&bull;</span>
                <span>Email: {user.email || 'N/A'}</span>
                <span>&bull;</span>
                <span className="capitalize">{trainer.shift?.toLowerCase() || 'General'} Shift</span>
              </div>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="flex flex-wrap items-center gap-4 border-t md:border-t-0 md:border-l border-[#E5E7EB] pt-4 md:pt-0 md:pl-6">
            <div className="text-left">
              <span className="text-[10px] font-bold uppercase text-[#6B7280] block">
                Monthly Salary
              </span>
              <span className="text-base font-bold font-mono text-[#0A192F]">
                {formatCurrency(trainer.baseSalaryInPaise)}
              </span>
            </div>
            <div className="text-left">
              <span className="text-[10px] font-bold uppercase text-[#6B7280] block">
                PT Cut
              </span>
              <span className="text-base font-bold font-mono text-[#059669]">
                {trainer.commissionPercentage || 0}%
              </span>
            </div>
            <div className="text-left">
              <span className="text-[10px] font-bold uppercase text-[#6B7280] block">
                Active Clients
              </span>
              <span className="text-base font-bold font-mono text-[#0A192F]">
                {assignments.length}
              </span>
            </div>
            <div className="text-left">
              <span className="text-[10px] font-bold uppercase text-[#6B7280] block">
                Experience
              </span>
              <span className="text-base font-bold font-mono text-[#0A192F]">
                {trainer.experienceYears || 0} Yrs
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Grid: 4 Enterprise Detail Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Panel 1: Personal Records & Emergency Medical */}
        <div className="bg-[#FBFBF9] border border-[#E5E7EB] p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#0A192F]">
              1. Personal & Emergency Medical Information
            </h2>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-[10px] font-bold uppercase text-[#6B7280] block">Gender</span>
              <span className="text-[#0A192F] font-medium capitalize">
                {trainer.gender?.toLowerCase() || 'Not specified'}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase text-[#6B7280] block">Date of Birth</span>
              <span className="text-[#0A192F] font-mono">
                {formatDate(trainer.dob)}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase text-[#6B7280] block">Blood Group</span>
              <span className="inline-block mt-0.5 px-2 py-0.5 text-[11px] font-mono font-bold bg-red-50 text-[#B91C1C] border border-red-200">
                {trainer.bloodGroup || 'Not set'}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase text-[#6B7280] block">City & State</span>
              <span className="text-[#0A192F]">
                {[trainer.city, trainer.state].filter(Boolean).join(', ') || 'N/A'}
              </span>
            </div>
            <div className="col-span-2">
              <span className="text-[10px] font-bold uppercase text-[#6B7280] block">Full Address</span>
              <span className="text-[#0A192F]">
                {trainer.address || 'Address not recorded'} {trainer.pincode ? `(${trainer.pincode})` : ''}
              </span>
            </div>
          </div>

          <div className="pt-3 border-t border-[#E5E7EB] space-y-2">
            <span className="text-[10px] font-bold uppercase text-[#B91C1C] block">
              Emergency Contact Details
            </span>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-[10px] text-[#6B7280] block">Contact Person</span>
                <span className="text-[#0A192F] font-bold">
                  {trainer.emergencyContactName || 'None provided'}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-[#6B7280] block">Emergency Phone</span>
                <span className="text-[#0A192F] font-mono font-bold">
                  {trainer.emergencyContactPhone || 'None provided'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Panel 2: Employment, Shift & Compensation Terms */}
        <div className="bg-[#FBFBF9] border border-[#E5E7EB] p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#0A192F]">
              2. Employment, Shift & Payroll Terms
            </h2>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <span className="text-[10px] font-bold uppercase text-[#6B7280] block">Date of Joining (DOJ)</span>
              <span className="text-[#0A192F] font-mono font-bold">
                {formatDate(trainer.dateOfJoining)}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase text-[#6B7280] block">Employment Type</span>
              <span className="text-[#0A192F] font-medium">
                {trainer.employmentType ? trainer.employmentType.replace('_', ' ') : 'Full Time'}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase text-[#6B7280] block">Assigned Shift</span>
              <span className="text-[#0A192F] font-bold capitalize">
                {trainer.shift?.toLowerCase() || 'General'} Shift
              </span>
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase text-[#6B7280] block">Experience</span>
              <span className="text-[#0A192F] font-mono">
                {trainer.experienceYears || 0} Years in Fitness
              </span>
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase text-[#6B7280] block">Monthly Base Salary</span>
              <span className="text-[#0A192F] font-mono font-bold text-sm">
                {formatCurrency(trainer.baseSalaryInPaise)}
              </span>
            </div>
            <div>
              <span className="text-[10px] font-bold uppercase text-[#6B7280] block">PT Commission Rate</span>
              <span className="text-[#059669] font-mono font-bold text-sm">
                {trainer.commissionPercentage || 0}% per Package
              </span>
            </div>
          </div>

          <div className="pt-3 border-t border-[#E5E7EB]">
            <span className="text-[10px] font-bold uppercase text-[#6B7280] block mb-1">
              Coaching Specializations
            </span>
            <div className="flex flex-wrap gap-1">
              {(trainer.specializations || []).map((s: string, idx: number) => (
                <span
                  key={idx}
                  className="text-[10px] px-2 py-0.5 bg-white border border-[#E5E7EB] text-[#0A192F] font-medium"
                >
                  {s}
                </span>
              ))}
              {(!trainer.specializations || trainer.specializations.length === 0) && (
                <span className="text-[11px] text-[#9CA3AF]">No specific tags set</span>
              )}
            </div>
          </div>
        </div>

        {/* Panel 3: Qualifications, Certifications & KYC Identity */}
        <div className="bg-[#FBFBF9] border border-[#E5E7EB] p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#0A192F]">
              3. Certifications & KYC Identity Verification
            </h2>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <span className="text-[10px] font-bold uppercase text-[#6B7280] block mb-0.5">
                Certifications & Accredited Diplomas
              </span>
              <p className="text-[#0A192F] bg-white border border-[#E5E7EB] p-2 rounded-none font-medium">
                {trainer.certifications || 'No certifications recorded yet.'}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-[10px] font-bold uppercase text-[#6B7280] block mb-0.5">
                  ID Proof Document
                </span>
                <span className="text-[#0A192F] font-bold uppercase">
                  {trainer.idProofType || 'AADHAAR'}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold uppercase text-[#6B7280] block mb-0.5">
                  ID Proof Number
                </span>
                <span className="text-[#0A192F] font-mono font-bold">
                  {trainer.idProofNumber || 'Not submitted'}
                </span>
              </div>
            </div>

            <div>
              <span className="text-[10px] font-bold uppercase text-[#6B7280] block mb-0.5">
                Professional Bio & Coaching Philosophy
              </span>
              <p className="text-[#4B5563] text-xs leading-relaxed bg-white border border-[#E5E7EB] p-2">
                {trainer.bio || 'Experienced personal trainer focused on sustainable fitness transformations and strength development.'}
              </p>
            </div>

            {/* Attached KYC Documents */}
            <div>
              <span className="text-[10px] font-bold uppercase text-[#6B7280] block mb-1">
                Attached KYC & Certification Documents
              </span>
              {Array.isArray(trainer.documents) && trainer.documents.length > 0 ? (
                <div className="space-y-1.5">
                  {trainer.documents.map((doc: any, idx: number) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-2 bg-white border border-[#E5E7EB] text-xs"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="text-[9px] font-mono font-bold bg-[#0A192F] text-[#FBFBF9] px-1 py-0.5">
                          DOC
                        </span>
                        <span className="font-medium text-[#0A192F] truncate">
                          {doc.name || 'Document'}
                        </span>
                      </div>
                      <a
                        href={doc.url}
                        target="_blank"
                        rel="noreferrer"
                        className="text-[11px] text-[#0A192F] hover:underline font-bold"
                      >
                        View File ↗
                      </a>
                    </div>
                  ))}
                </div>
              ) : (
                <span className="text-xs text-[#9CA3AF] italic">
                  No documents attached.
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Panel 4: Assigned Clients / Packages Summary */}
        <div className="bg-[#FBFBF9] border border-[#E5E7EB] p-5 space-y-4">
          <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#0A192F]">
              4. Active PT Member Assignments ({assignments.length})
            </h2>
            <button
              onClick={() => setIsAssignModalOpen(true)}
              className="text-[11px] font-bold text-[#0A192F] hover:underline uppercase"
            >
              + Assign Client
            </button>
          </div>

          {assignments.length === 0 ? (
            <div className="py-8 text-center text-xs text-[#6B7280]">
              No active training clients assigned. Click &apos;+ Assign Client&apos; to link a member.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-[#F5F5F0] text-[10px] uppercase font-bold text-[#6B7280] border-b border-[#E5E7EB]">
                    <th className="py-2 px-2">Member</th>
                    <th className="py-2 px-2">Package</th>
                    <th className="py-2 px-2 text-center">Sessions Remaining</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E7EB]">
                  {assignments.map((a: any) => (
                    <tr key={a.id} className="hover:bg-white">
                      <td className="py-2.5 px-2 font-medium text-[#0A192F]">
                        <div>{a.member?.fullName}</div>
                        <div className="text-[10px] font-mono text-[#6B7280]">
                          {a.member?.phone}
                        </div>
                      </td>
                      <td className="py-2.5 px-2 text-[#4B5563]">
                        {a.package?.name || 'Personal Training'}
                      </td>
                      <td className="py-2.5 px-2 text-center font-mono font-bold text-emerald-700">
                        {a.remainingSessions ?? 'N/A'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Panel 5: Recent PT Session Log */}
      <div className="bg-[#FBFBF9] border border-[#E5E7EB] p-5 space-y-3">
        <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-2">
          <h2 className="text-xs font-bold uppercase tracking-wider text-[#0A192F]">
            Recent Training Session History ({sessions.length})
          </h2>
          <Button
            variant="outline"
            className="text-xs border-[#E5E7EB] rounded-none hover:bg-[#F5F5F0] py-1 px-3"
            onClick={() => navigate('/trainers/schedule')}
          >
            Open Full Calendar →
          </Button>
        </div>

        {sessions.length === 0 ? (
          <div className="py-6 text-center text-xs text-[#6B7280]">
            No training sessions logged yet for this coach.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-[#F5F5F0] text-[10px] uppercase font-bold text-[#6B7280] border-b border-[#E5E7EB]">
                  <th className="py-2 px-3">Date & Time</th>
                  <th className="py-2 px-3">Member</th>
                  <th className="py-2 px-3">Duration</th>
                  <th className="py-2 px-3">Status</th>
                  <th className="py-2 px-3">Session Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {sessions.map((s: any) => (
                  <tr key={s.id} className="hover:bg-white">
                    <td className="py-2.5 px-3 font-mono">
                      {formatDate(s.scheduledAt)}
                    </td>
                    <td className="py-2.5 px-3 font-medium text-[#0A192F]">
                      {s.member?.fullName || 'Client'}
                    </td>
                    <td className="py-2.5 px-3 font-mono">
                      {s.durationMinutes || 60} mins
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase bg-emerald-50 text-emerald-800 border border-emerald-200">
                        {s.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-[#6B7280] italic">
                      {s.notes || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal: Assign PT Package to Member */}
      {isAssignModalOpen &&
        createPortal(
          <div className="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center p-4">
            <div className="bg-[#FBFBF9] border border-[#E5E7EB] w-full max-w-md p-6 space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-[#E5E7EB]">
                <h2 className="text-sm font-bold uppercase tracking-tight text-[#0A192F]">
                  Assign Client to {user.fullName}
                </h2>
                <button
                  type="button"
                  className="text-[#6B7280] hover:text-[#0A192F] p-1 transition-colors"
                  aria-label="Close"
                  onClick={() => setIsAssignModalOpen(false)}
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
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
                    Select Member *
                  </label>
                  <select
                    required
                    value={selectedMemberId}
                    onChange={(e) => setSelectedMemberId(e.target.value)}
                    className="w-full text-xs border border-[#E5E7EB] bg-white p-2 rounded-none font-medium text-[#0A192F]"
                  >
                    <option value="">Choose registered member...</option>
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.fullName} ({m.phone || m.memberCode})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold uppercase text-[#0A192F] mb-1">
                    Personal Training Package *
                  </label>
                  <select
                    required
                    value={selectedPackageId}
                    onChange={(e) => setSelectedPackageId(e.target.value)}
                    className="w-full text-xs border border-[#E5E7EB] bg-white p-2 rounded-none font-medium text-[#0A192F]"
                  >
                    <option value="">Choose training package...</option>
                    {packages.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.sessionCount} Sessions - ₹{(p.priceInPaise / 100).toLocaleString('en-IN')})
                      </option>
                    ))}
                  </select>
                </div>

                <Input label="Assignment Start Date" type="date" required value={assignmentStartDate} onChange={(e) => setAssignmentStartDate(e.target.value)} />

                <div className="pt-3 border-t border-[#E5E7EB] flex items-center justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="text-xs border-[#E5E7EB] rounded-none hover:bg-[#F5F5F0]"
                    onClick={() => setIsAssignModalOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isAssigning}
                    className="bg-[#0A192F] text-[#FBFBF9] hover:bg-[#162E52] text-xs rounded-none px-4"
                  >
                    {isAssigning ? 'Assigning...' : 'Confirm Assignment'}
                  </Button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}
      {isEditOpen && createPortal(
        <div className="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center p-4">
          <form onSubmit={handleSaveEdit} className="bg-[#FBFBF9] border border-[#E5E7EB] p-6 w-full max-w-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-base font-bold uppercase text-[#0A192F]">Edit Trainer Profile</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {['fullName','email','phone','gender','dob','dateOfJoining','bloodGroup','city','state','pincode','employmentType','shift','experienceYears','baseSalaryInPaise','commissionPercentage','specializations','certifications','idProofType','idProofNumber','address','bio'].map((key) => (
                <Input key={key} type={key === 'dob' || key === 'dateOfJoining' ? 'date' : key === 'email' ? 'email' : 'text'} label={key.replace(/([A-Z])/g, ' $1')} value={Array.isArray(editForm[key]) ? editForm[key].join(', ') : editForm[key] || ''} onChange={(e) => setEditForm((prev: any) => ({ ...prev, [key]: e.target.value }))} />
              ))}
            </div>
            <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setIsEditOpen(false)}>Cancel</Button><Button type="submit" isLoading={isSavingEdit}>Save Changes</Button></div>
          </form>
        </div>, document.body
      )}
      {isPackageOpen && createPortal(
        <div className="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center p-4">
          <form onSubmit={handleCreatePackage} className="bg-[#FBFBF9] border border-[#E5E7EB] p-6 w-full max-w-lg space-y-4">
            <h2 className="text-base font-bold uppercase text-[#0A192F]">Add Training Package</h2>
            <Input label="Package Name" required value={packageForm.name} onChange={(e) => setPackageForm({ ...packageForm, name: e.target.value })} />
            <Input label="Description" value={packageForm.description} onChange={(e) => setPackageForm({ ...packageForm, description: e.target.value })} />
            <div className="grid grid-cols-3 gap-3">
              <Input label="Sessions" type="number" min="1" required value={packageForm.sessionCount} onChange={(e) => setPackageForm({ ...packageForm, sessionCount: e.target.value })} />
              <Input label="Validity Days" type="number" min="1" required value={packageForm.validityDays} onChange={(e) => setPackageForm({ ...packageForm, validityDays: e.target.value })} />
              <Input label="Price (INR)" type="number" min="0" required value={packageForm.priceRupees} onChange={(e) => setPackageForm({ ...packageForm, priceRupees: e.target.value })} />
            </div>
            <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setIsPackageOpen(false)}>Cancel</Button><Button type="submit">Create Package</Button></div>
          </form>
        </div>, document.body
      )}
      <div className="hidden print:block border-t border-[#0A192F] pt-3 text-[10px] text-[#4B5563]">
        {tenant?.name || 'Trifit Elite Fitness & Sports Club'} | {tenant?.timezone || 'Asia/Kolkata'} | Currency: {tenant?.currency || 'INR'} | {tenant?.website || ''}
      </div>
    </div>
  );
}


