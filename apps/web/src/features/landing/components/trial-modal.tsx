import { useState, useEffect, useId } from 'react';
import axios from 'axios';
import { LegalModal } from './legal-modals';

interface TrialModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultSlug?: string;
}

interface ProvisionedClient {
  gymName: string;
  slug: string;
  email: string;
  temporaryPassword: string;
  subdomainUrl: string;
  mailDispatched: boolean;
}

export function TrialModal({ isOpen, onClose, defaultSlug }: TrialModalProps) {
  const [gymName, setGymName] = useState('');
  const [desiredSlug, setDesiredSlug] = useState(defaultSlug || '');
  const [ownerName, setOwnerName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [initialPassword, setInitialPassword] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [agreedToCookies, setAgreedToCookies] = useState(false);
  const [legalModalType, setLegalModalType] = useState<'terms' | 'privacy' | 'cookies' | null>(null);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [provisionedData, setProvisionedData] = useState<ProvisionedClient | null>(null);
  const [copied, setCopied] = useState(false);

  // Sync defaultSlug if passed when opened
  useEffect(() => {
    if (defaultSlug) {
      setDesiredSlug(defaultSlug);
    }
  }, [defaultSlug]);

  const gymNameId = useId();
  const slugId = useId();
  const ownerNameId = useId();
  const emailId = useId();
  const phoneId = useId();
  const passwordId = useId();
  const termsCheckboxId = useId();
  const cookiesCheckboxId = useId();

  if (!isOpen) return null;

  const handleGymNameChange = (val: string) => {
    setGymName(val);
    const clean = val
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .slice(0, 20);
    setDesiredSlug(clean);
  };

  const handleCopyPassword = () => {
    if (provisionedData?.temporaryPassword) {
      navigator.clipboard.writeText(provisionedData.temporaryPassword);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    const cleanName = gymName.trim();
    const cleanSlug = desiredSlug.toLowerCase().trim().replace(/[^a-z0-9-]/g, '');
    const cleanOwnerName = ownerName.trim();
    const cleanEmail = email.toLowerCase().trim();
    const cleanPhone = phone.replace(/\D/g, '').trim();

    if (!cleanName || !cleanSlug || !cleanOwnerName || !cleanEmail || !cleanPhone) {
      setErrorMsg('Please complete all required fields.');
      return;
    }

    if (cleanPhone.length < 10) {
      setErrorMsg('Please enter a valid 10-digit Indian mobile number.');
      return;
    }

    if (!agreedToTerms || !agreedToCookies) {
      setErrorMsg('You must review and accept the Terms & Conditions, Privacy Policy, and Cookie Policy before activating your trial.');
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post('/api/v1/tenant/register-trial', {
        name: cleanName,
        slug: cleanSlug,
        ownerName: cleanOwnerName,
        ownerEmail: cleanEmail,
        ownerPhone: cleanPhone,
        initialPassword: initialPassword.trim() || undefined,
      });

      const data = res.data?.data || res.data;
      setProvisionedData({
        gymName: cleanName,
        slug: cleanSlug,
        email: cleanEmail,
        temporaryPassword: data.temporaryPassword || initialPassword.trim() || 'Assigned via Email',
        subdomainUrl: data.subdomainUrl || `https://${cleanSlug}.trifit.space`,
        mailDispatched: data.mailDispatched ?? true,
      });
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ||
        (err instanceof Error ? err.message : 'Failed to activate trial. Subdomain or email might already be registered.');
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 overflow-y-auto bg-[#0A192F]/85 backdrop-blur-sm p-3 sm:p-6 flex justify-center items-center min-h-screen">
        <div className="relative w-full max-w-2xl max-h-[92vh] overflow-y-auto bg-[#FBFBF9] border border-[#CBD5E1] p-5 sm:p-7 text-[#111827] shadow-none my-auto">
          {/* Close Button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 text-[#6B7280] hover:text-[#0A192F] focus-visible:outline-2 focus-visible:outline-[#0A192F]"
            aria-label="Close dialog"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="square" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {provisionedData ? (
            <div className="py-2 space-y-5">
              <div className="flex items-center gap-3 border-b border-[#E5E7EB] pb-4">
                <div className="w-10 h-10 bg-[#0A192F] text-[#FBFBF9] flex items-center justify-center font-bold text-sm border border-[#334E70]">
                  OK
                </div>
                <div>
                  <h3 className="text-lg font-bold text-[#0A192F]">7-Day Free Trial Portal Activated!</h3>
                  <p className="text-xs text-[#4B5563]">
                    Your dedicated gym ERP portal has been created and the subdomain is live.
                  </p>
                </div>
              </div>

              {/* Subdomain & Credentials Box */}
              <div className="bg-[#0A192F] text-[#FBFBF9] p-5 space-y-3.5 border border-[#1E3A5F]">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]">Your Dedicated Gym Portal URL</p>
                  <a
                    href={`${provisionedData.subdomainUrl}/login`}
                    target="_blank"
                    rel="noreferrer"
                    className="font-mono text-base font-bold text-[#38BDF8] hover:underline break-all"
                  >
                    {provisionedData.subdomainUrl}
                  </a>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 border-t border-[#1E3A5F]">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]">Admin Login Email</p>
                    <p className="font-mono text-xs font-bold text-[#FFFFFF] mt-0.5">{provisionedData.email}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-[#94A3B8]">Admin Password</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="font-mono text-xs font-bold text-[#FBBF24] bg-[#0F223D] px-2 py-0.5 border border-[#334E70]">
                        {provisionedData.temporaryPassword}
                      </span>
                      <button
                        type="button"
                        onClick={handleCopyPassword}
                        className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 bg-[#FFFFFF] text-[#0A192F] hover:bg-[#F5F5F0]"
                      >
                        {copied ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                  </div>
                </div>

                <div className="pt-2 text-[11px] text-[#CBD5E1]">
                  <span>Active Subscription: </span>
                  <strong className="text-[#4ADE80]">7-Day Free Trial (₹0)</strong>
                  <span className="text-[#94A3B8]"> &bull; Direct Biometric Sync &amp; WhatsApp Billing Included</span>
                </div>
              </div>

              <div className="p-3 bg-[#F0FDF4] border border-[#BBF7D0] text-xs text-[#166534]">
                <strong>Welcome Email Dispatched:</strong> Complete administrator onboarding details and login link have been emailed to{' '}
                <span className="font-mono font-bold text-[#0A192F]">{provisionedData.email}</span>.
              </div>

              {/* Action Buttons */}
              <div className="pt-2 flex flex-col sm:flex-row items-center gap-3">
                <a
                  href={`${provisionedData.subdomainUrl}/login`}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full sm:flex-1 py-3 text-center text-xs font-bold uppercase tracking-wider text-[#FBFBF9] bg-[#B91C1C] hover:bg-[#991B1B] border border-[#991B1B] transition-colors"
                >
                  Continue to Gym Login
                </a>
                <a
                  href={`https://wa.me/917567091267?text=${encodeURIComponent(
                    `Hello Trifit Team, I just activated our 7-day free trial for ${provisionedData.gymName} (${provisionedData.slug}.trifit.space). Please help us connect our turnstile hardware.`
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full sm:w-auto px-5 py-3 text-center text-xs font-bold uppercase tracking-wider text-[#0A192F] bg-white border border-[#CBD5E1] hover:bg-[#F5F5F0] transition-colors"
                >
                  WhatsApp Hardware Assistance
                </a>
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-5 bg-[#B91C1C]" />
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#B91C1C]">Instant Enterprise Onboarding</p>
              </div>
              <h3 className="mt-1 text-xl font-bold text-[#0A192F]">Claim Your 7-Day Free Enterprise Trial</h3>
              <p className="text-xs text-[#6B7280]">
                Provisions your live gym tenant, custom subdomain, and administrator account immediately.
              </p>

              {errorMsg && (
                <div className="mt-4 p-3 bg-[#FEE2E2] border border-[#FCA5A5] text-xs text-[#991B1B]">
                  {errorMsg}
                </div>
              )}

              <form onSubmit={handleSubmit} className="mt-5 space-y-4">
                {/* Gym Company Name & Subdomain */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor={gymNameId} className="block text-xs font-bold uppercase tracking-wider text-[#0A192F] mb-1">
                      Gym Company Name *
                    </label>
                    <input
                      id={gymNameId}
                      type="text"
                      required
                      value={gymName}
                      onChange={(e) => handleGymNameChange(e.target.value)}
                      placeholder="e.g. Iron Forge Gym"
                      className="w-full px-3 py-2 text-xs bg-white border border-[#CBD5E1] focus:border-[#0A192F] focus:outline-none rounded-none"
                    />
                  </div>

                  <div>
                    <label htmlFor={slugId} className="block text-xs font-bold uppercase tracking-wider text-[#0A192F] mb-1">
                      Subdomain / Slug Identifier *
                    </label>
                    <div className="flex items-center">
                      <input
                        id={slugId}
                        type="text"
                        required
                        value={desiredSlug}
                        onChange={(e) => setDesiredSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                        placeholder="e.g. ironforge"
                        className="w-full px-3 py-2 text-xs bg-white border border-[#CBD5E1] border-r-0 focus:border-[#0A192F] focus:outline-none rounded-none font-mono"
                      />
                      <span className="px-3 py-2 text-xs font-mono font-bold bg-[#F5F5F0] border border-[#CBD5E1] text-[#6B7280]">
                        .trifit.space
                      </span>
                    </div>
                  </div>
                </div>

                {/* Owner Name, Email, Mobile */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-[#E5E7EB] pt-4">
                  <div>
                    <label htmlFor={ownerNameId} className="block text-xs font-bold uppercase tracking-wider text-[#0A192F] mb-1">
                      Gym Owner / Admin Name *
                    </label>
                    <input
                      id={ownerNameId}
                      type="text"
                      required
                      value={ownerName}
                      onChange={(e) => setOwnerName(e.target.value)}
                      placeholder="e.g. Vikram Sharma"
                      className="w-full px-3 py-2 text-xs bg-white border border-[#CBD5E1] focus:border-[#0A192F] focus:outline-none rounded-none"
                    />
                  </div>

                  <div>
                    <label htmlFor={emailId} className="block text-xs font-bold uppercase tracking-wider text-[#0A192F] mb-1">
                      Admin Email (Login ID) *
                    </label>
                    <input
                      id={emailId}
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="admin@ironforge.in"
                      className="w-full px-3 py-2 text-xs bg-white border border-[#CBD5E1] focus:border-[#0A192F] focus:outline-none rounded-none"
                    />
                  </div>

                  <div>
                    <label htmlFor={phoneId} className="block text-xs font-bold uppercase tracking-wider text-[#0A192F] mb-1">
                      Admin Mobile Number *
                    </label>
                    <input
                      id={phoneId}
                      type="tel"
                      required
                      maxLength={10}
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="10-digit mobile"
                      className="w-full px-3 py-2 text-xs bg-white border border-[#CBD5E1] focus:border-[#0A192F] focus:outline-none rounded-none font-mono"
                    />
                  </div>
                </div>

                {/* Optional Password */}
                <div>
                  <label htmlFor={passwordId} className="block text-xs font-bold uppercase tracking-wider text-[#0A192F] mb-1">
                    Admin Login Password (Optional)
                  </label>
                  <input
                    id={passwordId}
                    type="text"
                    value={initialPassword}
                    onChange={(e) => setInitialPassword(e.target.value)}
                    placeholder="e.g. Tristara@123 (Leave blank to auto-generate a secure password)"
                    className="w-full px-3 py-2 text-xs bg-white border border-[#CBD5E1] focus:border-[#0A192F] focus:outline-none rounded-none font-mono"
                  />
                  <p className="text-[10px] text-[#6B7280] mt-1">
                    If left blank, a secure password is generated automatically and shown on screen + emailed to client.
                  </p>
                </div>

                {/* Hardcoded Subscription Plan & Payment Status */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-[#E5E7EB] pt-4">
                  <div>
                    <span className="block text-xs font-bold uppercase tracking-wider text-[#0A192F] mb-1">
                      SaaS Subscription Plan *
                    </span>
                    <div className="p-2.5 bg-[#FFFFFF] border border-[#CBD5E1] flex items-center justify-between">
                      <span className="font-bold text-xs text-[#0A192F]">7-Day Free Trial &bull; ₹0 (7 Days)</span>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 bg-[#B91C1C] text-[#FBFBF9]">
                        Complimentary
                      </span>
                    </div>
                  </div>

                  <div>
                    <span className="block text-xs font-bold uppercase tracking-wider text-[#0A192F] mb-1">
                      Payment Status
                    </span>
                    <div className="p-2.5 bg-[#FFFFFF] border border-[#CBD5E1] flex items-center justify-between">
                      <span className="font-bold text-xs text-[#16A34A]">PAID / ZERO CHARGE</span>
                      <span className="text-[10px] font-mono text-[#6B7280]">₹0 Due</span>
                    </div>
                  </div>
                </div>

                {/* Legal & Consent Checkboxes */}
                <div className="pt-2 space-y-2 border-t border-[#E5E7EB]">
                  <div className="flex items-start gap-2">
                    <input
                      id={termsCheckboxId}
                      type="checkbox"
                      required
                      checked={agreedToTerms}
                      onChange={(e) => {
                        setErrorMsg(null);
                        setAgreedToTerms(e.target.checked);
                      }}
                      className="mt-0.5 h-3.5 w-3.5 rounded-none border-[#CBD5E1] text-[#0A192F] focus:ring-0 focus:outline-2 focus:outline-[#0A192F] cursor-pointer"
                    />
                    <label htmlFor={termsCheckboxId} className="text-xs text-[#374151] cursor-pointer select-none leading-tight">
                      I have read and agree to the{' '}
                      <button
                        type="button"
                        onClick={() => setLegalModalType('terms')}
                        className="font-bold text-[#0A192F] underline hover:text-[#B91C1C]"
                      >
                        Terms and Conditions
                      </button>{' '}
                      and{' '}
                      <button
                        type="button"
                        onClick={() => setLegalModalType('privacy')}
                        className="font-bold text-[#0A192F] underline hover:text-[#B91C1C]"
                      >
                        Privacy Policy
                      </button>{' '}
                      (Indian DPDP Act 2023 compliant for gym biometric check-in data).{' '}
                      <span className="text-[#B91C1C] font-bold">*</span>
                    </label>
                  </div>

                  <div className="flex items-start gap-2">
                    <input
                      id={cookiesCheckboxId}
                      type="checkbox"
                      required
                      checked={agreedToCookies}
                      onChange={(e) => {
                        setErrorMsg(null);
                        setAgreedToCookies(e.target.checked);
                      }}
                      className="mt-0.5 h-3.5 w-3.5 rounded-none border-[#CBD5E1] text-[#0A192F] focus:ring-0 focus:outline-2 focus:outline-[#0A192F] cursor-pointer"
                    />
                    <label htmlFor={cookiesCheckboxId} className="text-xs text-[#374151] cursor-pointer select-none leading-tight">
                      I accept the{' '}
                      <button
                        type="button"
                        onClick={() => setLegalModalType('cookies')}
                        className="font-bold text-[#0A192F] underline hover:text-[#B91C1C]"
                      >
                        Cookie & Security Policy
                      </button>{' '}
                      (essential session authentication and local hardware sync buffer).{' '}
                      <span className="text-[#B91C1C] font-bold">*</span>
                    </label>
                  </div>
                </div>

                {/* Submit Action */}
                <div className="pt-2 border-t border-[#E5E7EB]">
                  <button
                    type="submit"
                    disabled={loading || !agreedToTerms || !agreedToCookies}
                    className="w-full py-3.5 text-xs font-bold uppercase tracking-wider text-[#FBFBF9] bg-[#B91C1C] hover:bg-[#991B1B] border border-[#991B1B] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading
                      ? 'Provisioning Subdomain & Creating Account...'
                      : !agreedToTerms || !agreedToCookies
                      ? 'Accept Terms & Cookies Above to Activate'
                      : 'Activate My 7-Day Free Trial'}
                  </button>
                  <p className="text-[10px] text-center text-[#6B7280] mt-1.5">
                    Zero credit card required. Your custom subdomain activates immediately upon submission.
                  </p>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* Embedded Legal Document Viewer */}
      <LegalModal
        type={legalModalType}
        onClose={() => setLegalModalType(null)}
      />
    </>
  );
}
