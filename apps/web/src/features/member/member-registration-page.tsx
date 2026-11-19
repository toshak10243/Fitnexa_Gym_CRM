import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../lib/api-client';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Gender } from '@fitnexa/shared';

const DRAFT_KEY = 'fitnexa_member_reg_draft';

export function MemberRegistrationPage() {
  const navigate = useNavigate();

  const [branches, setBranches] = useState<Array<{ id: string; name: string }>>([]);
  const [trainers, setTrainers] = useState<Array<{ id: string; fullName: string }>>([]);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeStep, setActiveStep] = useState<number>(1);
  const [isDirty, setIsDirty] = useState<boolean>(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState<boolean>(false);
  const [photoUploadError, setPhotoUploadError] = useState<string | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  // Form State
  const [formData, setFormData] = useState({
    // Step 1: Personal
    branchId: '',
    fullName: '',
    photoUrl: '',
    phone: '',
    altPhone: '',
    email: '',
    dob: '',
    gender: '' as Gender | '',
    occupation: '',
    joiningDate: new Date().toISOString().split('T')[0],

    // Step 2: Address
    addressLine1: '',
    addressLine2: '',
    city: 'Mumbai',
    state: 'Maharashtra',
    pincode: '',
    country: 'India',

    // Step 3: Emergency Contact
    emergencyName: '',
    emergencyRelationship: '',
    emergencyPhone: '',

    // Step 4: Fitness & Metrics
    fitnessGoal: '',
    previousExperience: '',
    heightCm: '',
    weightKg: '',
    workoutTiming: 'Morning (6:00 AM - 9:00 AM)',
    assignedTrainerId: '',

    // Step 5: Confidential Health Declaration
    hasHealthCondition: false,
    medicalHistory: '',
    exerciseRestrictions: '',
    emergencyConsent: true,
    processingConsent: true,

    // Step 6: Minor & Consents
    isMinor: false,
    guardianName: '',
    guardianPhone: '',
    guardianRelation: '',
    guardianConsentGiven: false,
    termsAccepted: true,
    privacyPolicyAccepted: true,
    gymRulesAccepted: true,
    marketingConsent: false,
  });

  // Load draft from localStorage on mount if exists
  useEffect(() => {
    const savedDraft = localStorage.getItem(DRAFT_KEY);
    if (savedDraft) {
      try {
        const parsed = JSON.parse(savedDraft);
        setFormData((prev) => ({ ...prev, ...parsed }));
      } catch {
        localStorage.removeItem(DRAFT_KEY);
      }
    }
  }, []);

  // Fetch branches and trainers
  useEffect(() => {
    apiClient
      .get('/tenant/branches')
      .then((res) => {
        const branchList = res.data.data || [];
        setBranches(branchList);
        if (branchList.length > 0 && !formData.branchId) {
          setFormData((prev) => ({ ...prev, branchId: branchList[0].id }));
        }
      })
      .catch(() => {});

    apiClient
      .get('/staff')
      .then((res) => {
        const staffList = res.data.data.items || [];
        setTrainers(staffList.filter((s: { role: string }) => s.role === 'TRAINER'));
      })
      .catch(() => {});
  }, []);

  // Warn on unsaved changes before leaving
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isDirty) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isDirty]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>,
  ) => {
    const { name, value, type } = e.target;
    setIsDirty(true);

    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData((prev) => {
        const updated = { ...prev, [name]: checked };
        localStorage.setItem(DRAFT_KEY, JSON.stringify(updated));
        return updated;
      });
    } else {
      setFormData((prev) => {
        const updated = { ...prev, [name]: value };
        localStorage.setItem(DRAFT_KEY, JSON.stringify(updated));
        return updated;
      });
    }
  };

  const handleClearDraft = () => {
    if (confirm('Are you sure you want to discard this registration draft?')) {
      localStorage.removeItem(DRAFT_KEY);
      setIsDirty(false);
      window.location.reload();
    }
  };

  const handlePhotoFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setPhotoUploadError('File size exceeds the 5MB limit.');
      return;
    }

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
      setPhotoUploadError('Only JPG, PNG, and WebP image formats are permitted.');
      return;
    }

    setPhotoUploadError(null);
    setIsUploadingPhoto(true);

    try {
      const uploadData = new FormData();
      uploadData.append('photo', file);

      const res = await apiClient.post('/members/upload-photo', uploadData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      if (res.data?.data?.photoUrl) {
        setFormData((prev) => {
          const updated = { ...prev, photoUrl: res.data.data.photoUrl };
          localStorage.setItem(DRAFT_KEY, JSON.stringify(updated));
          return updated;
        });
        setIsDirty(true);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Photo upload failed';
      setPhotoUploadError(msg);
    } finally {
      setIsUploadingPhoto(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleRemovePhoto = () => {
    setFormData((prev) => {
      const updated = { ...prev, photoUrl: '' };
      localStorage.setItem(DRAFT_KEY, JSON.stringify(updated));
      return updated;
    });
    setPhotoUploadError(null);
    setIsDirty(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    // Basic Validations
    if (!formData.fullName.trim()) {
      setErrorMessage('Full name is required.');
      setActiveStep(1);
      return;
    }
    if (!formData.phone.trim() || formData.phone.length < 10) {
      setErrorMessage('Valid 10-digit mobile number is required.');
      setActiveStep(1);
      return;
    }
    if (!formData.branchId) {
      setErrorMessage('Please assign a branch for this member.');
      setActiveStep(1);
      return;
    }
    if (formData.isMinor && !formData.guardianName.trim()) {
      setErrorMessage('Guardian name is mandatory for minors under 18.');
      setActiveStep(6);
      return;
    }
    if (!formData.termsAccepted || !formData.privacyPolicyAccepted) {
      setErrorMessage('Membership Terms and Privacy Policy must be accepted.');
      setActiveStep(6);
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        branchId: formData.branchId,
        fullName: formData.fullName.trim(),
        photoUrl: formData.photoUrl.trim() || undefined,
        phone: formData.phone.trim(),
        altPhone: formData.altPhone.trim() || undefined,
        email: formData.email.trim() || undefined,
        dob: formData.dob || undefined,
        gender: formData.gender || undefined,
        occupation: formData.occupation.trim() || undefined,
        joiningDate: formData.joiningDate || undefined,
        fitnessGoal: formData.fitnessGoal.trim() || undefined,
        previousExperience: formData.previousExperience.trim() || undefined,
        heightCm: formData.heightCm ? parseFloat(formData.heightCm) : undefined,
        weightKg: formData.weightKg ? parseFloat(formData.weightKg) : undefined,
        workoutTiming: formData.workoutTiming || undefined,
        assignedTrainerId: formData.assignedTrainerId || undefined,
        isMinor: formData.isMinor,
        guardianName: formData.isMinor ? formData.guardianName.trim() : undefined,
        guardianPhone: formData.isMinor ? formData.guardianPhone.trim() : undefined,
        guardianRelation: formData.isMinor ? formData.guardianRelation.trim() : undefined,
        address: formData.addressLine1.trim()
          ? {
              addressLine1: formData.addressLine1.trim(),
              addressLine2: formData.addressLine2.trim() || undefined,
              city: formData.city.trim(),
              state: formData.state.trim(),
              pincode: formData.pincode.trim(),
              country: formData.country.trim(),
            }
          : undefined,
        emergencyContact: formData.emergencyName.trim()
          ? {
              name: formData.emergencyName.trim(),
              relationship: formData.emergencyRelationship.trim(),
              phone: formData.emergencyPhone.trim(),
            }
          : undefined,
        healthDeclaration: {
          hasHealthCondition: formData.hasHealthCondition,
          medicalHistory: formData.medicalHistory.trim() || undefined,
          exerciseRestrictions: formData.exerciseRestrictions.trim() || undefined,
          emergencyConsent: formData.emergencyConsent,
          processingConsent: formData.processingConsent,
        },
        consent: {
          termsAccepted: formData.termsAccepted,
          privacyPolicyAccepted: formData.privacyPolicyAccepted,
          gymRulesAccepted: formData.gymRulesAccepted,
          marketingConsent: formData.marketingConsent,
          guardianConsentGiven: formData.isMinor ? formData.guardianConsentGiven : undefined,
        },
      };

      const res = await apiClient.post('/members', payload);
      localStorage.removeItem(DRAFT_KEY);
      setIsDirty(false);
      navigate(`/members/${res.data.data.id}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Registration failed';
      setErrorMessage(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  const steps = [
    { num: 1, title: 'Personal Details' },
    { num: 2, title: 'Residential Address' },
    { num: 3, title: 'Emergency Contact' },
    { num: 4, title: 'Fitness & Body Metrics' },
    { num: 5, title: 'Health Declaration' },
    { num: 6, title: 'Consent & Guardian' },
  ];

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0A192F]">
            Member Admission Wizard
          </h1>
          <p className="text-sm text-[#6B7280] mt-1">
            Complete registration record, health declarations, emergency contacts, and signed gym agreements.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isDirty && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleClearDraft}
              className="rounded-none text-xs h-8 border-[#E5E7EB] text-[#6B7280]"
            >
              Clear Draft
            </Button>
          )}
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate('/members')}
            className="rounded-none text-xs h-8 border-[#E5E7EB]"
          >
            Cancel
          </Button>
        </div>
      </div>

      {errorMessage && (
        <div className="p-3 bg-red-50 border border-red-200 text-xs text-red-800">
          <span className="font-semibold">Error:</span> {errorMessage}
        </div>
      )}

      {/* Step Indicator Tabs */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-1 bg-[#F5F5F0] p-1 border border-[#E5E7EB]">
        {steps.map((s) => (
          <button
            key={s.num}
            type="button"
            onClick={() => setActiveStep(s.num)}
            className={`py-2 px-3 text-left text-xs transition-colors rounded-none ${
              activeStep === s.num
                ? 'bg-[#0A192F] text-[#FBFBF9] font-semibold'
                : 'bg-[#FBFBF9] text-[#4B5563] hover:bg-[#E5E7EB]'
            }`}
          >
            <div className="text-[10px] opacity-75">Step 0{s.num}</div>
            <div className="truncate">{s.title}</div>
          </button>
        ))}
      </div>

      {/* Wizard Form Form */}
      <form onSubmit={handleSubmit} className="bg-[#FBFBF9] border border-[#E5E7EB] p-6 space-y-6">
        {/* STEP 1: Personal Details */}
        {activeStep === 1 && (
          <div className="space-y-5">
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#0A192F] pb-1">
              Section 1: Personal Identification & Contact
            </h2>

            {/* Profile Picture Upload Card */}
            <div className="p-4 border border-[#E5E7EB] bg-[#F5F5F0] flex flex-col sm:flex-row items-start sm:items-center gap-5">
              <div className="relative h-24 w-24 flex-shrink-0 border border-[#E5E7EB] bg-[#FBFBF9] flex items-center justify-center overflow-hidden">
                {formData.photoUrl ? (
                  <img
                    src={formData.photoUrl}
                    alt="Member Preview"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex flex-col items-center justify-center text-[#9CA3AF] p-2 text-center">
                    <svg
                      className="h-8 w-8 mb-1 text-[#6B7280]"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={1.5}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z"
                      />
                    </svg>
                    <span className="text-[10px] font-medium leading-tight">No Photo</span>
                  </div>
                )}
                {isUploadingPhoto && (
                  <div className="absolute inset-0 bg-black/60 flex items-center justify-center text-[#FBFBF9] text-[10px] font-bold">
                    Uploading...
                  </div>
                )}
              </div>

              <div className="flex-1 space-y-2">
                <div>
                  <h4 className="text-xs font-bold text-[#0A192F] uppercase tracking-wider">
                    Member Profile Picture
                  </h4>
                  <p className="text-[11px] text-[#6B7280]">
                    Upload a portrait photo for biometric kiosk verification, access gates, and digital membership badges.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    accept="image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={handlePhotoFileChange}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isUploadingPhoto}
                    onClick={() => fileInputRef.current?.click()}
                    className="rounded-none text-xs h-8 border-[#0A192F] text-[#0A192F] hover:bg-[#0A192F] hover:text-[#FBFBF9]"
                  >
                    <svg
                      className="h-3.5 w-3.5 mr-1.5"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
                      />
                    </svg>
                    {formData.photoUrl ? 'Replace Photo' : 'Upload Photo'}
                  </Button>

                  {formData.photoUrl && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleRemovePhoto}
                      className="rounded-none text-xs h-8 border-red-300 text-[#B91C1C] hover:bg-red-50"
                    >
                      Remove
                    </Button>
                  )}
                  <span className="text-[10px] text-[#9CA3AF]">
                    JPG, PNG, or WebP up to 5MB
                  </span>
                </div>

                {photoUploadError && (
                  <p className="text-[11px] font-medium text-[#B91C1C]">
                    {photoUploadError}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#111827] mb-1">
                  Assigned Branch *
                </label>
                <select
                  name="branchId"
                  value={formData.branchId}
                  onChange={handleChange}
                  required
                  className="w-full text-xs h-9 border border-[#E5E7EB] bg-[#FBFBF9] px-2 text-[#111827] focus:outline-none focus:ring-1 focus:ring-[#0A192F] rounded-none"
                >
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#111827] mb-1">
                  Full Legal Name *
                </label>
                <Input
                  name="fullName"
                  value={formData.fullName}
                  onChange={handleChange}
                  required
                  placeholder="e.g. Vikramaditya Rathore"
                  className="rounded-none text-xs h-9 border-[#E5E7EB]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#111827] mb-1">
                  Primary Mobile Number *
                </label>
                <Input
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  required
                  placeholder="10-digit mobile (e.g. 9876543210)"
                  className="rounded-none text-xs h-9 border-[#E5E7EB]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#111827] mb-1">
                  Alternate Phone
                </label>
                <Input
                  name="altPhone"
                  value={formData.altPhone}
                  onChange={handleChange}
                  placeholder="Optional secondary phone"
                  className="rounded-none text-xs h-9 border-[#E5E7EB]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#111827] mb-1">
                  Email Address
                </label>
                <Input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="e.g. member@example.com"
                  className="rounded-none text-xs h-9 border-[#E5E7EB]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#111827] mb-1">
                  Date of Birth
                </label>
                <Input
                  type="date"
                  name="dob"
                  value={formData.dob}
                  onChange={handleChange}
                  className="rounded-none text-xs h-9 border-[#E5E7EB]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#111827] mb-1">Gender</label>
                <select
                  name="gender"
                  value={formData.gender}
                  onChange={handleChange}
                  className="w-full text-xs h-9 border border-[#E5E7EB] bg-[#FBFBF9] px-2 text-[#111827] focus:outline-none focus:ring-1 focus:ring-[#0A192F] rounded-none"
                >
                  <option value="">Prefer not to state</option>
                  <option value="MALE">Male</option>
                  <option value="FEMALE">Female</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#111827] mb-1">
                  Occupation
                </label>
                <Input
                  name="occupation"
                  value={formData.occupation}
                  onChange={handleChange}
                  placeholder="e.g. Architect, Consultant, Business"
                  className="rounded-none text-xs h-9 border-[#E5E7EB]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#111827] mb-1">
                  Admission Date *
                </label>
                <Input
                  type="date"
                  name="joiningDate"
                  value={formData.joiningDate}
                  onChange={handleChange}
                  required
                  className="rounded-none text-xs h-9 border-[#E5E7EB]"
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: Residential Address */}
        {activeStep === 2 && (
          <div className="space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#0A192F] pb-1">
              Section 2: Residential Address
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-[#111827] mb-1">
                  Address Line 1
                </label>
                <Input
                  name="addressLine1"
                  value={formData.addressLine1}
                  onChange={handleChange}
                  placeholder="Flat / House No, Building, Street"
                  className="rounded-none text-xs h-9 border-[#E5E7EB]"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-[#111827] mb-1">
                  Address Line 2
                </label>
                <Input
                  name="addressLine2"
                  value={formData.addressLine2}
                  onChange={handleChange}
                  placeholder="Landmark, Area / Sector"
                  className="rounded-none text-xs h-9 border-[#E5E7EB]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#111827] mb-1">City</label>
                <Input
                  name="city"
                  value={formData.city}
                  onChange={handleChange}
                  className="rounded-none text-xs h-9 border-[#E5E7EB]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#111827] mb-1">State</label>
                <Input
                  name="state"
                  value={formData.state}
                  onChange={handleChange}
                  className="rounded-none text-xs h-9 border-[#E5E7EB]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#111827] mb-1">PIN Code</label>
                <Input
                  name="pincode"
                  value={formData.pincode}
                  onChange={handleChange}
                  placeholder="6-digit PIN code"
                  className="rounded-none text-xs h-9 border-[#E5E7EB]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#111827] mb-1">Country</label>
                <Input
                  name="country"
                  value={formData.country}
                  onChange={handleChange}
                  className="rounded-none text-xs h-9 border-[#E5E7EB]"
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: Emergency Contact */}
        {activeStep === 3 && (
          <div className="space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#0A192F] pb-1">
              Section 3: Emergency Contact Details
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#111827] mb-1">
                  Contact Person Name
                </label>
                <Input
                  name="emergencyName"
                  value={formData.emergencyName}
                  onChange={handleChange}
                  placeholder="e.g. Sunita Rathore"
                  className="rounded-none text-xs h-9 border-[#E5E7EB]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#111827] mb-1">
                  Relationship
                </label>
                <Input
                  name="emergencyRelationship"
                  value={formData.emergencyRelationship}
                  onChange={handleChange}
                  placeholder="e.g. Spouse, Parent, Sibling"
                  className="rounded-none text-xs h-9 border-[#E5E7EB]"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#111827] mb-1">
                  Emergency Phone Number
                </label>
                <Input
                  name="emergencyPhone"
                  value={formData.emergencyPhone}
                  onChange={handleChange}
                  placeholder="10-digit mobile"
                  className="rounded-none text-xs h-9 border-[#E5E7EB]"
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: Fitness & Body Metrics */}
        {activeStep === 4 && (
          <div className="space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#0A192F] pb-1">
              Section 4: Fitness Profile & Training Schedule
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[#111827] mb-1">
                  Primary Fitness Goal
                </label>
                <Input
                  name="fitnessGoal"
                  value={formData.fitnessGoal}
                  onChange={handleChange}
                  placeholder="e.g. Weight Loss, Hypertrophy, Endurance"
                  className="rounded-none text-xs h-9 border-[#E5E7EB]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#111827] mb-1">
                  Previous Gym Experience
                </label>
                <Input
                  name="previousExperience"
                  value={formData.previousExperience}
                  onChange={handleChange}
                  placeholder="e.g. Beginner, 1 year regular training"
                  className="rounded-none text-xs h-9 border-[#E5E7EB]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#111827] mb-1">
                  Height (in cm)
                </label>
                <Input
                  type="number"
                  step="0.1"
                  name="heightCm"
                  value={formData.heightCm}
                  onChange={handleChange}
                  placeholder="e.g. 175"
                  className="rounded-none text-xs h-9 border-[#E5E7EB]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#111827] mb-1">
                  Weight (in kg)
                </label>
                <Input
                  type="number"
                  step="0.1"
                  name="weightKg"
                  value={formData.weightKg}
                  onChange={handleChange}
                  placeholder="e.g. 72.5"
                  className="rounded-none text-xs h-9 border-[#E5E7EB]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#111827] mb-1">
                  Preferred Workout Slot
                </label>
                <select
                  name="workoutTiming"
                  value={formData.workoutTiming}
                  onChange={handleChange}
                  className="w-full text-xs h-9 border border-[#E5E7EB] bg-[#FBFBF9] px-2 text-[#111827] focus:outline-none focus:ring-1 focus:ring-[#0A192F] rounded-none"
                >
                  <option value="Morning (6:00 AM - 9:00 AM)">Morning (6:00 AM - 9:00 AM)</option>
                  <option value="Midday (10:00 AM - 1:00 PM)">Midday (10:00 AM - 1:00 PM)</option>
                  <option value="Evening (5:00 PM - 8:00 PM)">Evening (5:00 PM - 8:00 PM)</option>
                  <option value="Night (8:00 PM - 11:00 PM)">Night (8:00 PM - 11:00 PM)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#111827] mb-1">
                  Assigned Personal Trainer
                </label>
                <select
                  name="assignedTrainerId"
                  value={formData.assignedTrainerId}
                  onChange={handleChange}
                  className="w-full text-xs h-9 border border-[#E5E7EB] bg-[#FBFBF9] px-2 text-[#111827] focus:outline-none focus:ring-1 focus:ring-[#0A192F] rounded-none"
                >
                  <option value="">Unassigned (General Floor Staff)</option>
                  {trainers.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.fullName}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}

        {/* STEP 5: Health Declaration */}
        {activeStep === 5 && (
          <div className="space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#0A192F] pb-1">
              Section 5: Health Declaration & Medical Disclaimer (Confidential)
            </h2>
            <div className="bg-amber-50 border border-amber-200 p-3 text-xs text-amber-900">
              Health declarations are restricted to management and medical staff. Please declare any relevant physical conditions to assist coaches in preventing exercise-induced injury.
            </div>

            <div className="space-y-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  name="hasHealthCondition"
                  checked={formData.hasHealthCondition}
                  onChange={handleChange}
                  className="h-4 w-4 border-[#E5E7EB] text-[#0A192F] rounded-none"
                />
                <span className="text-xs font-semibold text-[#111827]">
                  Member has pre-existing medical conditions, past surgeries, or chronic ailments.
                </span>
              </label>

              {formData.hasHealthCondition && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-6 border-l-2 border-[#0A192F]">
                  <div>
                    <label className="block text-xs font-semibold text-[#111827] mb-1">
                      Relevant Medical History
                    </label>
                    <textarea
                      name="medicalHistory"
                      rows={3}
                      value={formData.medicalHistory}
                      onChange={handleChange}
                      placeholder="e.g. Hypertension, Asthma, slipped disc (L4-L5)"
                      className="w-full text-xs border border-[#E5E7EB] bg-[#FBFBF9] p-2 text-[#111827] focus:outline-none focus:ring-1 focus:ring-[#0A192F] rounded-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#111827] mb-1">
                      Exercise Restrictions Advised by Physician
                    </label>
                    <textarea
                      name="exerciseRestrictions"
                      rows={3}
                      value={formData.exerciseRestrictions}
                      onChange={handleChange}
                      placeholder="e.g. Avoid overhead squats, restrict heart rate below 140 bpm"
                      className="w-full text-xs border border-[#E5E7EB] bg-[#FBFBF9] p-2 text-[#111827] focus:outline-none focus:ring-1 focus:ring-[#0A192F] rounded-none"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-2 pt-2 border-t border-[#E5E7EB]">
                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    name="emergencyConsent"
                    checked={formData.emergencyConsent}
                    onChange={handleChange}
                    className="h-4 w-4 mt-0.5 border-[#E5E7EB] text-[#0A192F] rounded-none"
                  />
                  <span className="text-xs text-[#4B5563]">
                    Emergency Medical Consent: I authorize the gym administration to seek emergency medical care, hospital transfer, and first-aid treatment if required in event of acute injury or cardiac distress.
                  </span>
                </label>

                <label className="flex items-start gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    name="processingConsent"
                    checked={formData.processingConsent}
                    onChange={handleChange}
                    className="h-4 w-4 mt-0.5 border-[#E5E7EB] text-[#0A192F] rounded-none"
                  />
                  <span className="text-xs text-[#4B5563]">
                    Health Data Processing Consent: I consent to the confidential storage of my disclosed health declarations solely for workout safety validation under Fitnexa data governance standards.
                  </span>
                </label>
              </div>
            </div>
          </div>
        )}

        {/* STEP 6: Consents & Minor Guardian */}
        {activeStep === 6 && (
          <div className="space-y-4">
            <h2 className="text-sm font-bold uppercase tracking-wider text-[#0A192F] pb-1">
              Section 6: Terms Acknowledgement & Guardian Consent
            </h2>

            {/* Minor Checkbox */}
            <div className="p-3 bg-[#F5F5F0] border border-[#E5E7EB]">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  name="isMinor"
                  checked={formData.isMinor}
                  onChange={handleChange}
                  className="h-4 w-4 border-[#E5E7EB] text-[#0A192F] rounded-none"
                />
                <span className="text-xs font-bold text-[#0A192F]">
                  Subscriber is a Minor (Under 18 Years of Age)
                </span>
              </label>

              {formData.isMinor && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3 pt-3 border-t border-[#E5E7EB]">
                  <div>
                    <label className="block text-xs font-semibold text-[#111827] mb-1">
                      Parent / Guardian Name *
                    </label>
                    <Input
                      name="guardianName"
                      value={formData.guardianName}
                      onChange={handleChange}
                      required={formData.isMinor}
                      placeholder="e.g. Rajesh Singhania"
                      className="rounded-none text-xs h-9 border-[#E5E7EB]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#111827] mb-1">
                      Guardian Relationship
                    </label>
                    <Input
                      name="guardianRelation"
                      value={formData.guardianRelation}
                      onChange={handleChange}
                      placeholder="e.g. Father / Mother"
                      className="rounded-none text-xs h-9 border-[#E5E7EB]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-[#111827] mb-1">
                      Guardian Phone
                    </label>
                    <Input
                      name="guardianPhone"
                      value={formData.guardianPhone}
                      onChange={handleChange}
                      placeholder="10-digit mobile"
                      className="rounded-none text-xs h-9 border-[#E5E7EB]"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Consents */}
            <div className="space-y-2 pt-2">
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  name="termsAccepted"
                  checked={formData.termsAccepted}
                  onChange={handleChange}
                  required
                  className="h-4 w-4 mt-0.5 border-[#E5E7EB] text-[#0A192F] rounded-none"
                />
                <span className="text-xs text-[#111827] font-medium">
                  I accept the Membership Terms & Facility Usage Policies of the gym enterprise.
                </span>
              </label>

              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  name="privacyPolicyAccepted"
                  checked={formData.privacyPolicyAccepted}
                  onChange={handleChange}
                  required
                  className="h-4 w-4 mt-0.5 border-[#E5E7EB] text-[#0A192F] rounded-none"
                />
                <span className="text-xs text-[#111827] font-medium">
                  I acknowledge receipt of the Privacy Notice and agree to data retention terms.
                </span>
              </label>

              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  name="gymRulesAccepted"
                  checked={formData.gymRulesAccepted}
                  onChange={handleChange}
                  required
                  className="h-4 w-4 mt-0.5 border-[#E5E7EB] text-[#0A192F] rounded-none"
                />
                <span className="text-xs text-[#111827] font-medium">
                  I agree to follow all Gym Safety Rules, equipment hygiene standards, and etiquette.
                </span>
              </label>

              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  name="marketingConsent"
                  checked={formData.marketingConsent}
                  onChange={handleChange}
                  className="h-4 w-4 mt-0.5 border-[#E5E7EB] text-[#0A192F] rounded-none"
                />
                <span className="text-xs text-[#6B7280]">
                  (Optional) Receive gym announcements, workout tips, and renewal alerts via WhatsApp / SMS.
                </span>
              </label>
            </div>
          </div>
        )}

        {/* Wizard Controls */}
        <div className="flex items-center justify-between border-t border-[#E5E7EB] pt-4">
          <Button
            type="button"
            variant="outline"
            disabled={activeStep === 1}
            onClick={() => setActiveStep((s) => Math.max(1, s - 1))}
            className="rounded-none text-xs h-9 px-4 border-[#E5E7EB]"
          >
            Previous Step
          </Button>

          <div className="flex items-center gap-2">
            {activeStep < 6 ? (
              <Button
                type="button"
                onClick={() => setActiveStep((s) => Math.min(6, s + 1))}
                className="bg-[#0A192F] hover:bg-[#0F223D] text-[#FBFBF9] rounded-none text-xs h-9 px-6 font-semibold"
              >
                Next Section
              </Button>
            ) : (
              <Button
                type="submit"
                disabled={isSubmitting}
                className="bg-[#B91C1C] hover:bg-[#991B1B] text-[#FBFBF9] rounded-none text-xs h-9 px-8 font-semibold tracking-wider"
              >
                {isSubmitting ? 'Registering Member...' : 'Complete Registration'}
              </Button>
            )}
          </div>
        </div>
      </form>
    </div>
  );
}
