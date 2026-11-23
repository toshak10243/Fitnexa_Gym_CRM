import { useState, useEffect, useId } from 'react';
import axios from 'axios';
import { LegalModal } from './legal-modals';

interface TrialModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultSlug?: string;
}

export function TrialModal({ isOpen, onClose, defaultSlug }: TrialModalProps) {
  const [gymName, setGymName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [city, setCity] = useState('');
  const [desiredSlug, setDesiredSlug] = useState(defaultSlug || '');
  const [memberRange, setMemberRange] = useState('200-500');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [agreedToCookies, setAgreedToCookies] = useState(false);
  const [legalModalType, setLegalModalType] = useState<'terms' | 'privacy' | 'cookies' | null>(null);

  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Sync defaultSlug if it changes when opened
  useEffect(() => {
    if (defaultSlug) {
      setDesiredSlug(defaultSlug);
    }
  }, [defaultSlug]);

  const gymNameId = useId();
  const ownerNameId = useId();
  const phoneId = useId();
  const emailId = useId();
  const cityId = useId();
  const slugId = useId();
  const rangeId = useId();
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!gymName.trim() || !ownerName.trim() || !phone.trim() || !email.trim()) {
      setErrorMsg('Please complete all required fields.');
      return;
    }

    if (phone.replace(/\D/g, '').length < 10) {
      setErrorMsg('Please enter a valid 10-digit mobile number.');
      return;
    }

    if (!agreedToTerms || !agreedToCookies) {
      setErrorMsg('You must review and accept the Terms & Conditions, Privacy Policy, and Cookie Policy before activating your trial.');
      return;
    }

    setLoading(true);
    try {
      await axios.post('/api/v1/crm/leads', {
        fullName: ownerName.trim(),
        phone: phone.trim(),
        email: email.trim(),
        notes: `Free Trial Request | Gym: ${gymName} | City: ${city} | Desired Subdomain: ${desiredSlug}.trifit.space | Members: ${memberRange} | Accepted Terms & Cookies: YES`,
        source: 'WEBSITE_TRIAL_MODAL',
      }).catch(() => {
        // Fallback gracefully
      });

      setSubmitted(true);
    } catch {
      setSubmitted(true);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 overflow-y-auto bg-[#0A192F]/85 backdrop-blur-sm p-3 sm:p-5 flex justify-center items-center min-h-screen">
        <div className="relative w-full max-w-lg max-h-[92vh] overflow-y-auto bg-[#FBFBF9] border border-[#CBD5E1] p-5 sm:p-6 text-[#111827] shadow-none my-auto">
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

          {submitted ? (
            <div className="text-center py-4">
              <div className="w-14 h-14 mx-auto bg-[#0A192F] text-[#FBFBF9] flex items-center justify-center font-bold text-xl border border-[#334E70]">
                OK
              </div>
              <h3 className="mt-4 text-xl font-bold text-[#0A192F]">7-Day Free Trial Reserved!</h3>
              <p className="mt-2 text-xs text-[#4B5563] max-w-sm mx-auto">
                Thank you, <strong className="text-[#0A192F]">{ownerName}</strong>. Your reserved subdomain is{' '}
                <span className="font-mono font-bold text-[#B91C1C]">{desiredSlug || 'yourgym'}.trifit.space</span>.
              </p>
              <p className="mt-2 text-[11px] text-[#6B7280]">
                Our technical team will connect with you on WhatsApp within 15 minutes to configure your biometric credentials.
              </p>

              <div className="mt-6 space-y-2.5">
                <a
                  href={`https://wa.me/918619544828?text=${encodeURIComponent(
                    `Hello Trifit Team, I just requested a 7-day free trial for ${gymName} (${desiredSlug}.trifit.space). Please activate our sandbox.`
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full inline-flex items-center justify-center py-2.5 px-4 text-xs font-bold uppercase tracking-wider text-[#FBFBF9] bg-[#16A34A] hover:bg-[#15803D] transition-colors"
                >
                  Connect on WhatsApp Immediately
                </a>
                <button
                  type="button"
                  onClick={onClose}
                  className="w-full py-2 text-xs font-semibold uppercase tracking-wider text-[#0A192F] border border-[#CBD5E1] bg-white hover:bg-[#F5F5F0]"
                >
                  Close Window
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-5 bg-[#B91C1C]" />
                <p className="text-[10px] font-bold uppercase tracking-widest text-[#B91C1C]">Zero-Risk Evaluation</p>
              </div>
              <h3 className="mt-1 text-xl font-bold text-[#0A192F]">Claim Your 7-Day Free Enterprise Trial</h3>
              <p className="text-[11px] text-[#6B7280]">
                Full biometric turnstile control, WhatsApp billing, and automated fee recovery with zero upfront commitment.
              </p>

              {errorMsg && (
                <div className="mt-3 p-2 bg-[#FEE2E2] border border-[#FCA5A5] text-[11px] text-[#991B1B]">
                  {errorMsg}
                </div>
              )}

              <form onSubmit={handleSubmit} className="mt-4 space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor={gymNameId} className="block text-[10px] font-bold uppercase tracking-wider text-[#0A192F] mb-0.5">
                      Gym / Fitness Center Name *
                    </label>
                    <input
                      id={gymNameId}
                      type="text"
                      required
                      value={gymName}
                      onChange={(e) => handleGymNameChange(e.target.value)}
                      placeholder="e.g. Iron Forge Fitness"
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#CBD5E1] focus:border-[#0A192F] focus:outline-none rounded-none"
                    />
                  </div>

                  <div>
                    <label htmlFor={ownerNameId} className="block text-[10px] font-bold uppercase tracking-wider text-[#0A192F] mb-0.5">
                      Owner / Manager Full Name *
                    </label>
                    <input
                      id={ownerNameId}
                      type="text"
                      required
                      value={ownerName}
                      onChange={(e) => setOwnerName(e.target.value)}
                      placeholder="e.g. Vikram Sharma"
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#CBD5E1] focus:border-[#0A192F] focus:outline-none rounded-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor={phoneId} className="block text-[10px] font-bold uppercase tracking-wider text-[#0A192F] mb-0.5">
                      WhatsApp Mobile Number *
                    </label>
                    <input
                      id={phoneId}
                      type="tel"
                      required
                      maxLength={10}
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="10-digit mobile number"
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#CBD5E1] focus:border-[#0A192F] focus:outline-none rounded-none font-mono"
                    />
                  </div>

                  <div>
                    <label htmlFor={emailId} className="block text-[10px] font-bold uppercase tracking-wider text-[#0A192F] mb-0.5">
                      Business Email *
                    </label>
                    <input
                      id={emailId}
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="owner@yourgym.com"
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#CBD5E1] focus:border-[#0A192F] focus:outline-none rounded-none"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor={cityId} className="block text-[10px] font-bold uppercase tracking-wider text-[#0A192F] mb-0.5">
                      City / State
                    </label>
                    <input
                      id={cityId}
                      type="text"
                      value={city}
                      onChange={(e) => setCity(e.target.value)}
                      placeholder="e.g. Delhi NCR, Jaipur, Bengaluru"
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#CBD5E1] focus:border-[#0A192F] focus:outline-none rounded-none"
                    />
                  </div>

                  <div>
                    <label htmlFor={rangeId} className="block text-[10px] font-bold uppercase tracking-wider text-[#0A192F] mb-0.5">
                      Active Member Base
                    </label>
                    <select
                      id={rangeId}
                      value={memberRange}
                      onChange={(e) => setMemberRange(e.target.value)}
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#CBD5E1] focus:border-[#0A192F] focus:outline-none rounded-none"
                    >
                      <option value="under-200">Under 200 Members</option>
                      <option value="200-500">200 to 500 Members</option>
                      <option value="500-1000">500 to 1,000 Members</option>
                      <option value="1000+">1,000+ Multi-Branch</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label htmlFor={slugId} className="block text-[10px] font-bold uppercase tracking-wider text-[#0A192F] mb-0.5">
                    Desired Gym Subdomain
                  </label>
                  <div className="flex items-center">
                    <input
                      id={slugId}
                      type="text"
                      value={desiredSlug}
                      onChange={(e) => setDesiredSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''))}
                      placeholder="ironforge"
                      className="w-full px-2.5 py-1.5 text-xs bg-white border border-[#CBD5E1] border-r-0 focus:border-[#0A192F] focus:outline-none rounded-none font-mono"
                    />
                    <span className="px-2.5 py-1.5 text-[11px] font-mono font-bold bg-[#F5F5F0] border border-[#CBD5E1] text-[#6B7280]">
                      .trifit.space
                    </span>
                  </div>
                  <p className="text-[10px] text-[#6B7280] mt-0.5">This will be your dedicated encrypted login portal.</p>
                </div>

                {/* Mandatory Checkboxes */}
                <div className="pt-2 pb-1 space-y-2 border-t border-[#E5E7EB]">
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
                    <label htmlFor={termsCheckboxId} className="text-[11px] text-[#374151] cursor-pointer select-none leading-tight">
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
                      (DPDP Act 2023 compliant for gym biometric check-in data).{' '}
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
                    <label htmlFor={cookiesCheckboxId} className="text-[11px] text-[#374151] cursor-pointer select-none leading-tight">
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

                <div className="pt-2 border-t border-[#E5E7EB]">
                  <button
                    type="submit"
                    disabled={loading || !agreedToTerms || !agreedToCookies}
                    className="w-full py-2.5 text-xs font-bold uppercase tracking-wider text-[#FBFBF9] bg-[#B91C1C] hover:bg-[#991B1B] border border-[#991B1B] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading
                      ? 'Processing Activation...'
                      : !agreedToTerms || !agreedToCookies
                      ? 'Accept Terms & Cookies Above to Activate'
                      : 'Activate My 7-Day Free Trial'}
                  </button>
                  <p className="text-[10px] text-center text-[#6B7280] mt-1.5">
                    No credit card required. Includes full biometric hardware setup assistance.
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
