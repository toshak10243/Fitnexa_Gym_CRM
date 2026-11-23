import { createPortal } from 'react-dom';
import { useState, useEffect, useMemo, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { apiClient } from '../../lib/api-client';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Skeleton } from '../../components/ui/skeleton';

const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];

const COMMON_SPECIALIZATIONS = [
  'Strength & Conditioning',
  'Fat Loss & HIIT',
  'Bodybuilding & Hypertrophy',
  'Functional Fitness',
  'Yoga & Flexibility',
  'CrossFit',
  'Postural Rehab & Injury Care',
  'Sports Nutrition',
];

interface UploadedDoc {
  name: string;
  url: string;
  size?: number;
}

export function TrainersPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [trainers, setTrainers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterShift, setFilterShift] = useState('ALL');
  const [filterBloodGroup, setFilterBloodGroup] = useState('ALL');

  // Register Trainer Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTrainerId, setEditingTrainerId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Form Fields (Password removed completely)
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [gender, setGender] = useState('MALE');
  const [dob, setDob] = useState('');
  const [bloodGroup, setBloodGroup] = useState('B+');
  const [emergencyContactName, setEmergencyContactName] = useState('');
  const [emergencyContactPhone, setEmergencyContactPhone] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [pincode, setPincode] = useState('');
  const [dateOfJoining, setDateOfJoining] = useState(
    new Date().toISOString().split('T')[0]
  );
  const [baseSalaryInRupees, setBaseSalaryInRupees] = useState('40000');
  const [commissionPercentage, setCommissionPercentage] = useState('20');
  const [employmentType, setEmploymentType] = useState('FULL_TIME');
  const [shift, setShift] = useState('MORNING');
  const [experienceYears, setExperienceYears] = useState('3');
  const [selectedSpecializations, setSelectedSpecializations] = useState<string[]>([
    'Strength & Conditioning',
  ]);
  const [certifications, setCertifications] = useState('');
  const [idProofType, setIdProofType] = useState('AADHAAR');
  const [idProofNumber, setIdProofNumber] = useState('');
  const [bio, setBio] = useState('');

  // Photo & Document Upload State
  const [photoUrl, setPhotoUrl] = useState('');
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [uploadedDocs, setUploadedDocs] = useState<UploadedDoc[]>([]);
  const [isUploadingDoc, setIsUploadingDoc] = useState(false);

  const fetchTrainers = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.get('/trainers');
      setTrainers(res.data.data || []);
    } catch {
      // Handled gracefully
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTrainers();
  }, []);

  useEffect(() => {
    const requestedId = (location.state as { editTrainerId?: string } | null)?.editTrainerId;
    const trainer = requestedId ? trainers.find((item) => item.id === requestedId) : null;
    if (trainer) {
      openEditTrainer(trainer);
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [trainers, location.state]);

  const toggleSpecialization = (spec: string) => {
    setSelectedSpecializations((prev) =>
      prev.includes(spec) ? prev.filter((s) => s !== spec) : [...prev, spec]
    );
  };

  const handlePhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Show preview immediately
    setPhotoPreview(URL.createObjectURL(file));
    setIsUploadingPhoto(true);
    setModalError(null);

    try {
      const formData = new FormData();
      formData.append('photo', file);
      const res = await apiClient.post('/trainers/upload-photo', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setPhotoUrl(res.data.data.photoUrl);
    } catch (err: any) {
      setModalError(err?.response?.data?.message || 'Failed to upload trainer photo.');
      setPhotoPreview(null);
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleRemovePhoto = () => {
    setPhotoUrl('');
    setPhotoPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDocSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingDoc(true);
    setModalError(null);

    try {
      const formData = new FormData();
      formData.append('document', file);
      const res = await apiClient.post('/trainers/upload-document', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const newDoc: UploadedDoc = {
        name: res.data.data.originalName || file.name,
        url: res.data.data.documentUrl,
        size: res.data.data.size,
      };
      setUploadedDocs((prev) => [...prev, newDoc]);
    } catch (err: any) {
      setModalError(err?.response?.data?.message || 'Failed to upload document.');
    } finally {
      setIsUploadingDoc(false);
      if (docInputRef.current) docInputRef.current.value = '';
    }
  };

  const handleRemoveDoc = (index: number) => {
    setUploadedDocs((prev) => prev.filter((_, i) => i !== index));
  };

  const handleCreateTrainer = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);

    if (!fullName.trim() || !email.trim() || !phone.trim()) {
      setModalError('Full Name, Email, and Phone number are mandatory.');
      return;
    }

    setIsSubmitting(true);
    try {
      const salaryPaise = Math.round(parseFloat(baseSalaryInRupees || '0') * 100);
      const commission = parseInt(commissionPercentage, 10) || 0;
      const exp = parseInt(experienceYears, 10) || 0;

      const trainerPayload = {
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        photoUrl: photoUrl.trim() || undefined,
        gender,
        dob: dob || undefined,
        bloodGroup: bloodGroup || undefined,
        emergencyContactName: emergencyContactName.trim() || undefined,
        emergencyContactPhone: emergencyContactPhone.trim() || undefined,
        address: address.trim() || undefined,
        city: city.trim() || undefined,
        state: state.trim() || undefined,
        pincode: pincode.trim() || undefined,
        dateOfJoining: dateOfJoining || undefined,
        baseSalaryInPaise: salaryPaise,
        commissionPercentage: commission,
        employmentType,
        shift,
        experienceYears: exp,
        specializations: selectedSpecializations,
        certifications: certifications.trim() || undefined,
        idProofType: idProofType || undefined,
        idProofNumber: idProofNumber.trim() || undefined,
        bio: bio.trim() || undefined,
        documents: uploadedDocs,
      };
      if (editingTrainerId) await apiClient.patch(`/trainers/${editingTrainerId}`, trainerPayload);
      else await apiClient.post('/trainers', trainerPayload);

      setIsModalOpen(false);
      resetForm();
      fetchTrainers();
    } catch (err: any) {
      setModalError(
        err?.response?.data?.message || 'Failed to register trainer. Please verify fields.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setEditingTrainerId(null);
    setFullName('');
    setEmail('');
    setPhone('');
    setPhotoUrl('');
    setPhotoPreview(null);
    setUploadedDocs([]);
    setGender('MALE');
    setDob('');
    setBloodGroup('B+');
    setEmergencyContactName('');
    setEmergencyContactPhone('');
    setAddress('');
    setCity('');
    setState('');
    setPincode('');
    setDateOfJoining(new Date().toISOString().split('T')[0]);
    setBaseSalaryInRupees('40000');
    setCommissionPercentage('20');
    setEmploymentType('FULL_TIME');
    setShift('MORNING');
    setExperienceYears('3');
    setSelectedSpecializations(['Strength & Conditioning']);
    setCertifications('');
    setIdProofType('AADHAAR');
    setIdProofNumber('');
    setBio('');
    setModalError(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (docInputRef.current) docInputRef.current.value = '';
  };

  const openEditTrainer = (trainer: any) => {
    const user = trainer.user || {};
    setEditingTrainerId(trainer.id);
    setFullName(user.fullName || ''); setEmail(user.email || ''); setPhone(user.phone || '');
    setGender(trainer.gender || 'MALE'); setDob(trainer.dob ? String(trainer.dob).slice(0, 10) : '');
    setBloodGroup(trainer.bloodGroup || 'B+'); setEmergencyContactName(trainer.emergencyContactName || ''); setEmergencyContactPhone(trainer.emergencyContactPhone || '');
    setAddress(trainer.address || ''); setCity(trainer.city || ''); setState(trainer.state || ''); setPincode(trainer.pincode || '');
    setDateOfJoining(trainer.dateOfJoining ? String(trainer.dateOfJoining).slice(0, 10) : ''); setBaseSalaryInRupees(String((trainer.baseSalaryInPaise || 0) / 100));
    setCommissionPercentage(String(trainer.commissionPercentage || 0)); setEmploymentType(trainer.employmentType || 'FULL_TIME'); setShift(trainer.shift || 'MORNING');
    setExperienceYears(String(trainer.experienceYears || 0)); setSelectedSpecializations(trainer.specializations || []); setCertifications(trainer.certifications || '');
    setIdProofType(trainer.idProofType || 'AADHAAR'); setIdProofNumber(trainer.idProofNumber || ''); setBio(trainer.bio || '');
    setPhotoUrl(trainer.photoUrl || ''); setPhotoPreview(trainer.photoUrl || null); setUploadedDocs(trainer.documents || []); setModalError(null); setIsModalOpen(true);
  };

  const filteredTrainers = useMemo(() => {
    return trainers.filter((t) => {
      const u = t.user || {};
      const matchesSearch =
        !searchQuery ||
        (u.fullName || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (u.email || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
        (u.phone || '').includes(searchQuery) ||
        (t.specializations || []).some((s: string) =>
          s.toLowerCase().includes(searchQuery.toLowerCase())
        );

      const matchesShift = filterShift === 'ALL' || t.shift === filterShift;
      const matchesBlood =
        filterBloodGroup === 'ALL' || t.bloodGroup === filterBloodGroup;

      return matchesSearch && matchesShift && matchesBlood;
    });
  }, [trainers, searchQuery, filterShift, filterBloodGroup]);

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

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E5E7EB] pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-[#0A192F] uppercase">
              Fitness Trainers & Coaching Staff
            </h1>
            <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-[#0A192F] text-[#FBFBF9]">
              {trainers.length} COACHES
            </span>
          </div>
          <p className="text-xs text-[#6B7280] mt-1">
            Trainer records, direct photo & document uploads, blood groups, payroll & salary, and shift management.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="text-xs border-[#E5E7EB] rounded-none hover:bg-[#F5F5F0] text-[#0A192F]"
            onClick={() => navigate('/trainers/schedule')}
          >
            PT Session Calendar →
          </Button>
          <Button
            className="bg-[#0A192F] text-[#FBFBF9] hover:bg-[#162E52] text-xs rounded-none px-4 flex items-center gap-2"
            onClick={() => {
              resetForm();
              setIsModalOpen(true);
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            + Register New Trainer
          </Button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-[#FBFBF9] border border-[#E5E7EB] p-4 flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="w-full md:w-80">
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name, phone, email, specialization..."
            className="text-xs border-[#E5E7EB] bg-white rounded-none"
          />
        </div>
        <div className="flex flex-wrap items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-1.5 text-xs text-[#6B7280]">
            <span className="text-[11px] font-bold uppercase text-[#0A192F]">Shift:</span>
            <select
              value={filterShift}
              onChange={(e) => setFilterShift(e.target.value)}
              className="text-xs border border-[#E5E7EB] bg-white p-1.5 rounded-none text-[#0A192F]"
            >
              <option value="ALL">All Shifts</option>
              <option value="MORNING">Morning (06:00 - 14:00)</option>
              <option value="EVENING">Evening (14:00 - 22:00)</option>
              <option value="GENERAL">General (09:00 - 18:00)</option>
              <option value="FLEXIBLE">Flexible</option>
            </select>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-[#6B7280]">
            <span className="text-[11px] font-bold uppercase text-[#0A192F]">Blood Group:</span>
            <select
              value={filterBloodGroup}
              onChange={(e) => setFilterBloodGroup(e.target.value)}
              className="text-xs border border-[#E5E7EB] bg-white p-1.5 rounded-none text-[#0A192F]"
            >
              <option value="ALL">All Groups</option>
              {BLOOD_GROUPS.map((bg) => (
                <option key={bg} value={bg}>
                  {bg}
                </option>
              ))}
            </select>
          </div>
          {(searchQuery || filterShift !== 'ALL' || filterBloodGroup !== 'ALL') && (
            <button
              onClick={() => {
                setSearchQuery('');
                setFilterShift('ALL');
                setFilterBloodGroup('ALL');
              }}
              className="text-[11px] text-[#B91C1C] hover:underline uppercase font-bold"
            >
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Trainers Table / Roster */}
      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" />
          ))}
        </div>
      ) : filteredTrainers.length === 0 ? (
        <div className="bg-[#FBFBF9] border border-[#E5E7EB] p-12 text-center space-y-3">
          <div className="text-xs text-[#6B7280]">
            No trainer profiles found matching current filters.
          </div>
          <Button
            className="bg-[#0A192F] text-[#FBFBF9] hover:bg-[#162E52] text-xs rounded-none px-4"
            onClick={() => {
              resetForm();
              setIsModalOpen(true);
            }}
          >
            + Register First Trainer
          </Button>
        </div>
      ) : (
        <div className="border border-[#E5E7EB] bg-[#FBFBF9] overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-[#0A192F] text-[#FBFBF9] text-[11px] uppercase tracking-wider">
                <th className="py-3 px-4 font-semibold">Coach Profile</th>
                <th className="py-3 px-3 font-semibold">Blood Group</th>
                <th className="py-3 px-3 font-semibold">Shift & Status</th>
                <th className="py-3 px-3 font-semibold">Date of Joining</th>
                <th className="py-3 px-3 font-semibold">Base Salary & PT Cut</th>
                <th className="py-3 px-3 font-semibold">Specializations</th>
                <th className="py-3 px-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB] text-[#111827]">
              {filteredTrainers.map((t) => {
                const u = t.user || {};
                return (
                  <tr
                    key={t.id}
                    className="hover:bg-[#F5F5F0] transition-colors cursor-pointer"
                    onClick={() => navigate(`/trainers/${t.id}`)}
                  >
                    {/* Coach Profile */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-sm bg-[#0A192F] text-[#FBFBF9] flex items-center justify-center font-bold text-xs uppercase overflow-hidden border border-[#E5E7EB] flex-shrink-0">
                          {t.photoUrl ? (
                            <img
                              src={t.photoUrl}
                              alt={u.fullName}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <span>
                              {(u.fullName || 'T')
                                .split(' ')
                                .map((n: string) => n[0])
                                .join('')
                                .slice(0, 2)}
                            </span>
                          )}
                        </div>
                        <div>
                          <div className="font-bold text-[#0A192F] hover:underline">
                            {u.fullName || 'Trainer'}
                          </div>
                          <div className="text-[11px] font-mono text-[#6B7280]">
                            {u.phone} &bull; {u.email}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Blood Group */}
                    <td className="py-3 px-3">
                      {t.bloodGroup ? (
                        <span className="inline-block px-2 py-0.5 text-[10px] font-mono font-bold uppercase bg-red-50 text-[#B91C1C] border border-red-200">
                          {t.bloodGroup}
                        </span>
                      ) : (
                        <span className="text-[#9CA3AF] text-[10px]">-</span>
                      )}
                    </td>

                    {/* Shift & Status */}
                    <td className="py-3 px-3">
                      <div className="font-medium text-[#0A192F] capitalize">
                        {t.shift ? t.shift.toLowerCase() : 'General'} Shift
                      </div>
                      <div className="text-[10px] text-[#6B7280]">
                        {t.employmentType ? t.employmentType.replace('_', ' ') : 'Full Time'}
                      </div>
                    </td>

                    {/* Date of Joining */}
                    <td className="py-3 px-3 font-mono text-[11px] text-[#4B5563]">
                      {formatDate(t.dateOfJoining)}
                    </td>

                    {/* Salary & Commission */}
                    <td className="py-3 px-3">
                      <div className="font-mono font-bold text-[#0A192F]">
                        {formatCurrency(t.baseSalaryInPaise)}
                        <span className="text-[10px] font-normal text-[#6B7280]"> / mo</span>
                      </div>
                      <div className="text-[10px] font-mono text-[#059669]">
                        +{t.commissionPercentage || 0}% PT Cut
                      </div>
                    </td>

                    {/* Specializations */}
                    <td className="py-3 px-3">
                      <div className="flex flex-wrap gap-1 max-w-xs">
                        {(t.specializations || []).slice(0, 2).map((s: string, idx: number) => (
                          <span
                            key={idx}
                            className="text-[9px] px-1.5 py-0.5 bg-white border border-[#E5E7EB] text-[#0A192F]"
                          >
                            {s}
                          </span>
                        ))}
                        {(t.specializations || []).length > 2 && (
                          <span className="text-[9px] px-1 py-0.5 text-[#6B7280]">
                            +{(t.specializations || []).length - 2} more
                          </span>
                        )}
                        {(!t.specializations || t.specializations.length === 0) && (
                          <span className="text-[10px] text-[#9CA3AF]">General Trainer</span>
                        )}
                      </div>
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-right">
                      <Button variant="outline" className="text-xs border-[#0A192F] rounded-none mr-2 py-1 px-3" onClick={(e) => { e.stopPropagation(); openEditTrainer(t); }}>Edit</Button>
                      <Button
                        variant="outline"
                        className="text-xs border-[#E5E7EB] rounded-none hover:bg-[#0A192F] hover:text-[#FBFBF9] py-1 px-3"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/trainers/${t.id}`);
                        }}
                      >
                        View Profile →
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal: Comprehensive Register New Trainer */}
      {isModalOpen &&
        createPortal(
          <div className="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center p-4">
            <div className="bg-[#FBFBF9] border border-[#E5E7EB] w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden">
              {/* Modal Header */}
              <div className="bg-[#0A192F] text-[#FBFBF9] px-6 py-4 flex items-center justify-between border-b border-[#162E52] flex-shrink-0">
                <div>
                  <h2 className="text-sm font-bold uppercase tracking-wider">
                    {editingTrainerId ? 'Edit Fitness Coach / Trainer' : 'Register New Fitness Coach / Trainer'}
                  </h2>
                  <p className="text-[10px] text-[#9CA3AF] mt-0.5">
                    Trainer personnel record for administration & payroll. No login password required.
                  </p>
                </div>
                <button
                  type="button"
                  className="text-[#9CA3AF] hover:text-[#FBFBF9] p-1 transition-colors"
                  aria-label="Close"
                  onClick={() => setIsModalOpen(false)}
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Modal Error */}
              {modalError && (
                <div className="p-3 border-b border-red-200 bg-red-50 text-xs text-[#B91C1C] flex-shrink-0">
                  {modalError}
                </div>
              )}

              {/* Form Body */}
              <form onSubmit={handleCreateTrainer} className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* SECTION 1: Personal & Photo Upload */}
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-[#0A192F] pb-2 border-b border-[#E5E7EB] mb-3 flex items-center justify-between">
                    <span>1. Personal & Contact Information</span>
                    <span className="text-[10px] text-[#6B7280] font-normal">Internal admin record</span>
                  </div>

                  {/* Direct Photo Upload */}
                  <div className="mb-4 p-3 bg-white border border-[#E5E7EB] flex flex-col sm:flex-row items-center gap-4">
                    <div className="w-16 h-16 rounded-sm bg-[#0A192F] text-[#FBFBF9] border border-[#E5E7EB] flex items-center justify-center font-bold text-sm uppercase overflow-hidden flex-shrink-0">
                      {photoPreview || photoUrl ? (
                        <img
                          src={photoPreview || photoUrl}
                          alt="Trainer preview"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="text-[10px] text-[#9CA3AF]">No Photo</span>
                      )}
                    </div>
                    <div className="flex-1 text-center sm:text-left">
                      <div className="text-xs font-bold text-[#0A192F]">
                        Trainer Profile Photo (Direct Upload)
                      </div>
                      <div className="text-[10px] text-[#6B7280] mt-0.5">
                        Upload official coach photo (JPG, PNG, or WebP up to 5MB).
                      </div>
                      <div className="mt-2 flex items-center gap-2 justify-center sm:justify-start">
                        <input
                          type="file"
                          ref={fileInputRef}
                          accept="image/png,image/jpeg,image/webp"
                          className="hidden"
                          onChange={handlePhotoSelect}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={isUploadingPhoto}
                          className="text-xs border-[#E5E7EB] rounded-none hover:bg-[#F5F5F0]"
                          onClick={() => fileInputRef.current?.click()}
                        >
                          {isUploadingPhoto
                            ? 'Uploading...'
                            : photoUrl
                            ? 'Change Photo'
                            : 'Upload Photo'}
                        </Button>
                        {photoUrl && (
                          <button
                            type="button"
                            onClick={handleRemovePhoto}
                            className="text-[11px] text-[#B91C1C] hover:underline"
                          >
                            Remove
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold uppercase text-[#0A192F] mb-1">
                        Full Name *
                      </label>
                      <Input
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder="e.g. Vikramaditya Singh"
                        className="text-xs border-[#E5E7EB] bg-white rounded-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase text-[#0A192F] mb-1">
                        Email Address *
                      </label>
                      <Input
                        required
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="e.g. vikram.trainer@gmail.com"
                        className="text-xs border-[#E5E7EB] bg-white rounded-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase text-[#0A192F] mb-1">
                        Mobile Phone (10 digits) *
                      </label>
                      <Input
                        required
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="e.g. 9876543210"
                        className="text-xs border-[#E5E7EB] bg-white rounded-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase text-[#0A192F] mb-1">
                        Gender
                      </label>
                      <select
                        value={gender}
                        onChange={(e) => setGender(e.target.value)}
                        className="w-full text-xs border border-[#E5E7EB] bg-white p-2 rounded-none text-[#0A192F]"
                      >
                        <option value="MALE">Male</option>
                        <option value="FEMALE">Female</option>
                        <option value="OTHER">Other</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase text-[#0A192F] mb-1">
                        Date of Birth (DOB)
                      </label>
                      <Input
                        type="date"
                        value={dob}
                        onChange={(e) => setDob(e.target.value)}
                        className="text-xs border-[#E5E7EB] bg-white rounded-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase text-[#0A192F] mb-1">
                        City
                      </label>
                      <Input
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder="e.g. New Delhi"
                        className="text-xs border-[#E5E7EB] bg-white rounded-none"
                      />
                    </div>
                  </div>

                  {/* Address */}
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-3">
                    <div className="md:col-span-2">
                      <label className="block text-[11px] font-bold uppercase text-[#0A192F] mb-1">
                        Residential Address
                      </label>
                      <Input
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="Flat / House No, Street, Area"
                        className="text-xs border-[#E5E7EB] bg-white rounded-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold uppercase text-[#0A192F] mb-1">
                        State
                      </label>
                      <Input
                        value={state}
                        onChange={(e) => setState(e.target.value)}
                        placeholder="e.g. Delhi NCR"
                        className="text-xs border-[#E5E7EB] bg-white rounded-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold uppercase text-[#0A192F] mb-1">
                        Pincode
                      </label>
                      <Input
                        value={pincode}
                        onChange={(e) => setPincode(e.target.value)}
                        placeholder="e.g. 110001"
                        className="text-xs border-[#E5E7EB] bg-white rounded-none"
                      />
                    </div>
                  </div>
                </div>

                {/* SECTION 2: Medical & Emergency Contact */}
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-[#0A192F] pb-2 border-b border-[#E5E7EB] mb-3">
                    2. Emergency Contact & Medical Data
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold uppercase text-[#0A192F] mb-1">
                        Blood Group *
                      </label>
                      <select
                        value={bloodGroup}
                        onChange={(e) => setBloodGroup(e.target.value)}
                        className="w-full text-xs border border-[#E5E7EB] bg-white p-2 rounded-none text-[#0A192F] font-bold"
                      >
                        {BLOOD_GROUPS.map((bg) => (
                          <option key={bg} value={bg}>
                            {bg}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase text-[#0A192F] mb-1">
                        Emergency Contact Person
                      </label>
                      <Input
                        value={emergencyContactName}
                        onChange={(e) => setEmergencyContactName(e.target.value)}
                        placeholder="e.g. Meera Singh (Spouse / Parent)"
                        className="text-xs border-[#E5E7EB] bg-white rounded-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase text-[#0A192F] mb-1">
                        Emergency Contact Mobile
                      </label>
                      <Input
                        value={emergencyContactPhone}
                        onChange={(e) => setEmergencyContactPhone(e.target.value)}
                        placeholder="e.g. 9811223344"
                        className="text-xs border-[#E5E7EB] bg-white rounded-none"
                      />
                    </div>
                  </div>
                </div>

                {/* SECTION 3: Employment, Shift & Compensation */}
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-[#0A192F] pb-2 border-b border-[#E5E7EB] mb-3">
                    3. Employment, Shift Schedule & Payroll
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold uppercase text-[#0A192F] mb-1">
                        Date of Joining (DOJ) *
                      </label>
                      <Input
                        type="date"
                        required
                        value={dateOfJoining}
                        onChange={(e) => setDateOfJoining(e.target.value)}
                        className="text-xs border-[#E5E7EB] bg-white rounded-none"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase text-[#0A192F] mb-1">
                        Base Monthly Salary (₹ INR) *
                      </label>
                      <Input
                        type="number"
                        min="0"
                        step="500"
                        required
                        value={baseSalaryInRupees}
                        onChange={(e) => setBaseSalaryInRupees(e.target.value)}
                        placeholder="e.g. 40000"
                        className="text-xs border-[#E5E7EB] bg-white rounded-none font-mono font-bold"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase text-[#0A192F] mb-1">
                        PT Commission Rate (%)
                      </label>
                      <Input
                        type="number"
                        min="0"
                        max="100"
                        value={commissionPercentage}
                        onChange={(e) => setCommissionPercentage(e.target.value)}
                        placeholder="e.g. 20"
                        className="text-xs border-[#E5E7EB] bg-white rounded-none font-mono font-bold"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase text-[#0A192F] mb-1">
                        Assigned Shift Timing *
                      </label>
                      <select
                        value={shift}
                        onChange={(e) => setShift(e.target.value)}
                        className="w-full text-xs border border-[#E5E7EB] bg-white p-2 rounded-none text-[#0A192F]"
                      >
                        <option value="MORNING">Morning Shift (06:00 - 14:00)</option>
                        <option value="EVENING">Evening Shift (14:00 - 22:00)</option>
                        <option value="GENERAL">General Shift (09:00 - 18:00)</option>
                        <option value="FLEXIBLE">Flexible / Split Shifts</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase text-[#0A192F] mb-1">
                        Employment Type
                      </label>
                      <select
                        value={employmentType}
                        onChange={(e) => setEmploymentType(e.target.value)}
                        className="w-full text-xs border border-[#E5E7EB] bg-white p-2 rounded-none text-[#0A192F]"
                      >
                        <option value="FULL_TIME">Full Time</option>
                        <option value="PART_TIME">Part Time</option>
                        <option value="CONTRACT">Contractual / Freelance</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold uppercase text-[#0A192F] mb-1">
                        Total Fitness Experience (Years)
                      </label>
                      <Input
                        type="number"
                        min="0"
                        max="50"
                        value={experienceYears}
                        onChange={(e) => setExperienceYears(e.target.value)}
                        placeholder="e.g. 4"
                        className="text-xs border-[#E5E7EB] bg-white rounded-none font-mono"
                      />
                    </div>
                  </div>
                </div>

                {/* SECTION 4: Qualifications & Optional Document Upload (KYC) */}
                <div>
                  <div className="text-xs font-bold uppercase tracking-wider text-[#0A192F] pb-2 border-b border-[#E5E7EB] mb-3 flex items-center justify-between">
                    <span>4. Qualifications, Certifications & KYC Identity</span>
                    <span className="text-[10px] text-[#6B7280]">Documents are optional</span>
                  </div>

                  {/* Specializations selection */}
                  <div className="space-y-1.5 mb-3">
                    <label className="block text-[11px] font-bold uppercase text-[#0A192F]">
                      Specializations (Click to toggle)
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {COMMON_SPECIALIZATIONS.map((spec) => {
                        const isSelected = selectedSpecializations.includes(spec);
                        return (
                          <button
                            type="button"
                            key={spec}
                            onClick={() => toggleSpecialization(spec)}
                            className={`text-[10px] px-2.5 py-1 border transition-colors ${
                              isSelected
                                ? 'bg-[#0A192F] text-[#FBFBF9] border-[#0A192F] font-bold'
                                : 'bg-white text-[#4B5563] border-[#E5E7EB] hover:border-[#0A192F]'
                            }`}
                          >
                            {isSelected ? ' ' : '+ '}
                            {spec}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold uppercase text-[#0A192F] mb-1">
                        Certifications & Diplomas
                      </label>
                      <Input
                        value={certifications}
                        onChange={(e) => setCertifications(e.target.value)}
                        placeholder="e.g. ACE Certified, K11 Fitness Academy CPT, CPR/AED"
                        className="text-xs border-[#E5E7EB] bg-white rounded-none"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-bold uppercase text-[#0A192F] mb-1">
                          ID Proof Type
                        </label>
                        <select
                          value={idProofType}
                          onChange={(e) => setIdProofType(e.target.value)}
                          className="w-full text-xs border border-[#E5E7EB] bg-white p-2 rounded-none text-[#0A192F]"
                        >
                          <option value="AADHAAR">Aadhaar Card</option>
                          <option value="PAN">PAN Card</option>
                          <option value="PASSPORT">Passport</option>
                          <option value="DRIVING_LICENSE">Driving License</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold uppercase text-[#0A192F] mb-1">
                          ID Proof Number
                        </label>
                        <Input
                          value={idProofNumber}
                          onChange={(e) => setIdProofNumber(e.target.value)}
                          placeholder="e.g. 5432 1098 7654"
                          className="text-xs border-[#E5E7EB] bg-white rounded-none font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Optional Documents Upload Section */}
                  <div className="mt-3 p-3 bg-white border border-[#E5E7EB]">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-xs font-bold text-[#0A192F]">
                          KYC / Certification Documents{' '}
                          <span className="text-[#6B7280] font-normal lowercase">(Optional)</span>
                        </div>
                        <div className="text-[10px] text-[#6B7280]">
                          Attach Aadhaar scan, trainer certification, or contract copy (PDF, JPG, PNG up to 10MB).
                        </div>
                      </div>
                      <div>
                        <input
                          type="file"
                          ref={docInputRef}
                          accept=".pdf,image/png,image/jpeg,image/webp"
                          className="hidden"
                          onChange={handleDocSelect}
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={isUploadingDoc}
                          className="text-xs border-[#E5E7EB] rounded-none hover:bg-[#F5F5F0]"
                          onClick={() => docInputRef.current?.click()}
                        >
                          {isUploadingDoc ? 'Uploading Document...' : '+ Attach Document'}
                        </Button>
                      </div>
                    </div>

                    {/* Uploaded Documents List */}
                    {uploadedDocs.length > 0 && (
                      <div className="mt-3 space-y-1.5 border-t border-[#E5E7EB] pt-2">
                        {uploadedDocs.map((doc, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between text-xs p-2 bg-[#FBFBF9] border border-[#E5E7EB]"
                          >
                            <div className="flex items-center gap-2 truncate">
                              <span className="font-mono text-[10px] text-[#0A192F] uppercase bg-white border border-[#E5E7EB] px-1">
                                DOC
                              </span>
                              <span className="font-medium text-[#0A192F] truncate">
                                {doc.name}
                              </span>
                            </div>
                            <div className="flex items-center gap-3">
                              <a
                                href={doc.url}
                                target="_blank"
                                rel="noreferrer"
                                className="text-[11px] text-[#0A192F] hover:underline"
                              >
                                View File ↗
                              </a>
                              <button
                                type="button"
                                onClick={() => handleRemoveDoc(idx)}
                                className="text-[11px] text-[#B91C1C] hover:underline"
                              >
                                Remove
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Bio */}
                  <div className="mt-3">
                    <label className="block text-[11px] font-bold uppercase text-[#0A192F] mb-1">
                      Professional Bio & Summary
                    </label>
                    <textarea
                      rows={2}
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      placeholder="Coaching experience, competitive achievements, special certifications..."
                      className="w-full text-xs border border-[#E5E7EB] bg-white p-2 rounded-none text-[#0A192F]"
                    />
                  </div>
                </div>

                {/* Modal Footer Actions */}
                <div className="pt-4 border-t border-[#E5E7EB] flex items-center justify-end gap-3 flex-shrink-0">
                  <Button
                    type="button"
                    variant="outline"
                    className="text-xs border-[#E5E7EB] rounded-none hover:bg-[#F5F5F0]"
                    onClick={() => setIsModalOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={isSubmitting || isUploadingPhoto || isUploadingDoc}
                    className="bg-[#0A192F] text-[#FBFBF9] hover:bg-[#162E52] text-xs rounded-none px-6"
                  >
                    {isSubmitting ? 'Saving Trainer...' : editingTrainerId ? 'Save Trainer Changes' : 'Save & Register Coach'}
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


