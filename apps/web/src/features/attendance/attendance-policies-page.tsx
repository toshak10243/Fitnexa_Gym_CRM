import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../lib/api-client';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Skeleton } from '../../components/ui/skeleton';
import { formatPaiseToInr } from '../../lib/utils';

export function AttendancePoliciesPage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Form state
  const [gracePeriodDays, setGracePeriodDays] = useState(2);
  const [allowBranchRoaming, setAllowBranchRoaming] = useState(false);
  const [restrictOnOutstandingDues, setRestrictOnOutstandingDues] = useState(false);
  const [maxDuesThresholdRupees, setMaxDuesThresholdRupees] = useState(0);
  const [duplicateCheckinWindowMinutes, setDuplicateCheckinWindowMinutes] = useState(15);
  const [autoCheckoutAfterHours, setAutoCheckoutAfterHours] = useState(4);
  const [operatingHoursStart, setOperatingHoursStart] = useState('05:30');
  const [operatingHoursEnd, setOperatingHoursEnd] = useState('23:00');

  useEffect(() => {
    const fetchPolicy = async () => {
      setIsLoading(true);
      try {
        const res = await apiClient.get('/attendance/policy');
        const policy = res.data.data;
        if (policy) {
          setGracePeriodDays(policy.gracePeriodDays ?? 2);
          setAllowBranchRoaming(policy.allowBranchRoaming ?? false);
          setRestrictOnOutstandingDues(policy.restrictOnOutstandingDues ?? false);
          setMaxDuesThresholdRupees(Math.floor((policy.maxDuesThresholdInPaise ?? 0) / 100));
          setDuplicateCheckinWindowMinutes(policy.duplicateCheckinWindowMinutes ?? 15);
          setAutoCheckoutAfterHours(policy.autoCheckoutAfterHours ?? 4);
          setOperatingHoursStart(policy.operatingHoursStart ?? '05:30');
          setOperatingHoursEnd(policy.operatingHoursEnd ?? '23:00');
        }
      } catch {
        // Default policy fallback
      } finally {
        setIsLoading(false);
      }
    };

    fetchPolicy();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setFeedback(null);

    try {
      await apiClient.put('/attendance/policy', {
        gracePeriodDays: Number(gracePeriodDays),
        allowBranchRoaming: Boolean(allowBranchRoaming),
        restrictOnOutstandingDues: Boolean(restrictOnOutstandingDues),
        maxDuesThresholdInPaise: Math.round(Number(maxDuesThresholdRupees) * 100),
        duplicateCheckinWindowMinutes: Number(duplicateCheckinWindowMinutes),
        autoCheckoutAfterHours: Number(autoCheckoutAfterHours),
        operatingHoursStart,
        operatingHoursEnd,
      });

      setFeedback({
        type: 'success',
        message: 'Access control and attendance policy configuration saved successfully.',
      });
    } catch (err: any) {
      setFeedback({
        type: 'error',
        message: err.message || 'Failed to update attendance policy.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="p-8 max-w-4xl mx-auto space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E5E7EB] pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#0A192F] uppercase">
            Facility Access Rules & Policy Engine
          </h1>
          <p className="text-xs text-[#6B7280] mt-1">
            Configure turnstile admission logic, grace periods, debounce windows, and fee-due restrictions.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="text-xs border-[#E5E7EB] rounded-none hover:bg-[#F5F5F0]"
            onClick={() => navigate('/attendance')}
          >
            ← Back to Telemetry
          </Button>
        </div>
      </div>

      {feedback && (
        <div
          className={`p-3 border text-xs font-medium ${
            feedback.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
              : 'bg-red-50 text-red-800 border-red-300'
          }`}
        >
          {feedback.message}
        </div>
      )}

      {/* Policy Form */}
      <form onSubmit={handleSave} className="bg-[#FBFBF9] border border-[#E5E7EB] p-6 space-y-6">
        {/* Section 1: Financial & Dues Policy */}
        <div className="space-y-4">
          <div className="pb-1">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#0A192F]">
              1. Fee Dues & Admission Gating
            </h2>
            <p className="text-[11px] text-[#6B7280]">
              By Indian gym standard, dues do not block entry unless your gym policy strictly demands it.
            </p>
          </div>

          <div className="flex items-start space-x-3 p-4 bg-white border border-[#E5E7EB]">
            <input
              type="checkbox"
              id="restrictOnOutstandingDues"
              checked={restrictOnOutstandingDues}
              onChange={(e) => setRestrictOnOutstandingDues(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded-none border-[#E5E7EB] text-[#0A192F] focus:ring-0"
            />
            <div className="space-y-1">
              <label
                htmlFor="restrictOnOutstandingDues"
                className="text-xs font-bold text-[#0A192F] cursor-pointer"
              >
                Strictly Deny Turnstile Access on Outstanding Dues
              </label>
              <p className="text-[11px] text-[#6B7280]">
                When disabled (recommended), members with pending balance are admitted with a warning on the front-desk display. When enabled, turnstiles remain locked.
              </p>
            </div>
          </div>

          {restrictOnOutstandingDues && (
            <div className="bg-white border border-[#E5E7EB] p-4 space-y-2">
              <label className="block text-[11px] font-bold uppercase text-[#0A192F]">
                Maximum Permissible Dues Threshold (INR ₹)
              </label>
              <div className="flex items-center gap-2">
                <span className="text-sm font-bold text-[#6B7280]">₹</span>
                <Input
                  type="number"
                  min={0}
                  step={100}
                  value={maxDuesThresholdRupees}
                  onChange={(e) => setMaxDuesThresholdRupees(Number(e.target.value))}
                  className="rounded-none border-[#E5E7EB] bg-white h-9 text-xs w-48 font-mono"
                />
              </div>
              <p className="text-[11px] text-[#6B7280]">
                Athletes with outstanding balance under {formatPaiseToInr(maxDuesThresholdRupees * 100)} will still be admitted.
              </p>
            </div>
          )}
        </div>

        {/* Section 2: Membership Expiry & Grace Periods */}
        <div className="space-y-4">
          <div className="pb-1">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#0A192F]">
              2. Membership Expiry & Grace Periods
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white border border-[#E5E7EB] p-4 space-y-1">
              <label className="block text-[11px] font-bold uppercase text-[#0A192F]">
                Grace Period Window (Days)
              </label>
              <Input
                type="number"
                min={0}
                max={30}
                value={gracePeriodDays}
                onChange={(e) => setGracePeriodDays(Number(e.target.value))}
                className="rounded-none border-[#E5E7EB] bg-white h-9 text-xs font-mono"
              />
              <p className="text-[11px] text-[#6B7280]">
                Days member can enter after plan expiry before access is strictly blocked.
              </p>
            </div>

            <div className="bg-white border border-[#E5E7EB] p-4 flex items-start space-x-3">
              <input
                type="checkbox"
                id="allowBranchRoaming"
                checked={allowBranchRoaming}
                onChange={(e) => setAllowBranchRoaming(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded-none border-[#E5E7EB] text-[#0A192F] focus:ring-0"
              />
              <div className="space-y-1">
                <label
                  htmlFor="allowBranchRoaming"
                  className="text-xs font-bold text-[#0A192F] cursor-pointer"
                >
                  Allow Multi-Branch Roaming
                </label>
                <p className="text-[11px] text-[#6B7280]">
                  Permits athletes registered at one branch to check in at any sister branch.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Hardware Debounce & Session Limits */}
        <div className="space-y-4">
          <div className="pb-1">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#0A192F]">
              3. Terminal Debouncing & Session Lifecycle
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white border border-[#E5E7EB] p-4 space-y-1">
              <label className="block text-[11px] font-bold uppercase text-[#0A192F]">
                Duplicate Tap Debounce Window (Minutes)
              </label>
              <Input
                type="number"
                min={1}
                max={60}
                value={duplicateCheckinWindowMinutes}
                onChange={(e) => setDuplicateCheckinWindowMinutes(Number(e.target.value))}
                className="rounded-none border-[#E5E7EB] bg-white h-9 text-xs font-mono"
              />
              <p className="text-[11px] text-[#6B7280]">
                Prevents accidental double-tapping at turnstiles from creating duplicate sessions.
              </p>
            </div>

            <div className="bg-white border border-[#E5E7EB] p-4 space-y-1">
              <label className="block text-[11px] font-bold uppercase text-[#0A192F]">
                Auto-Checkout Stale Threshold (Hours)
              </label>
              <Input
                type="number"
                min={1}
                max={24}
                value={autoCheckoutAfterHours}
                onChange={(e) => setAutoCheckoutAfterHours(Number(e.target.value))}
                className="rounded-none border-[#E5E7EB] bg-white h-9 text-xs font-mono"
              />
              <p className="text-[11px] text-[#6B7280]">
                Automatically closes unclosed active sessions if athlete forgot to tap exit.
              </p>
            </div>
          </div>
        </div>

        {/* Section 4: Operating Hours */}
        <div className="space-y-4">
          <div className="pb-1">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#0A192F]">
              4. Facility Operating Hours (Daily Gating)
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white border border-[#E5E7EB] p-4 space-y-1">
              <label className="block text-[11px] font-bold uppercase text-[#0A192F]">
                Morning Door Open Time (HH:MM)
              </label>
              <Input
                type="time"
                value={operatingHoursStart}
                onChange={(e) => setOperatingHoursStart(e.target.value)}
                className="rounded-none border-[#E5E7EB] bg-white h-9 text-xs font-mono"
              />
            </div>

            <div className="bg-white border border-[#E5E7EB] p-4 space-y-1">
              <label className="block text-[11px] font-bold uppercase text-[#0A192F]">
                Night Gate Lock Time (HH:MM)
              </label>
              <Input
                type="time"
                value={operatingHoursEnd}
                onChange={(e) => setOperatingHoursEnd(e.target.value)}
                className="rounded-none border-[#E5E7EB] bg-white h-9 text-xs font-mono"
              />
            </div>
          </div>
        </div>

        {/* Submit */}
        <div className="flex justify-end pt-4 border-t border-[#E5E7EB]">
          <Button
            type="submit"
            disabled={isSaving}
            className="bg-[#0A192F] text-white hover:bg-[#162E52] text-xs font-bold rounded-none px-6 py-2 h-10"
          >
            {isSaving ? 'Saving Policies...' : 'Save & Enforce Policies'}
          </Button>
        </div>
      </form>
    </div>
  );
}
