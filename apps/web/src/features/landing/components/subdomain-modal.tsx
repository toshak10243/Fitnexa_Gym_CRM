import { useState, useEffect, useId } from 'react';
import axios from 'axios';

interface SubdomainModalProps {
  isOpen: boolean;
  onClose: () => void;
  onClaimSubdomain: (slug: string) => void;
}

export function SubdomainModal({ isOpen, onClose, onClaimSubdomain }: SubdomainModalProps) {
  const [slug, setSlug] = useState('');
  const [status, setStatus] = useState<'idle' | 'checking' | 'found' | 'not_found'>('idle');
  const [tenantName, setTenantName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const slugInputId = useId();

  useEffect(() => {
    if (!isOpen) {
      setSlug('');
      setStatus('idle');
      setTenantName(null);
      setError(null);
      return;
    }
  }, [isOpen]);

  // Debounced auto-check
  useEffect(() => {
    const clean = slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
    if (!clean) {
      setStatus('idle');
      setTenantName(null);
      return;
    }

    setStatus('checking');
    const timer = setTimeout(async () => {
      try {
        const res = await axios.get(`/api/v1/tenant/lookup/${clean}`);
        if (res.data?.exists) {
          setStatus('found');
          setTenantName(res.data.name || clean);
        } else {
          setStatus('not_found');
          setTenantName(null);
        }
      } catch {
        // Fallback if network or endpoint fails
        setStatus('not_found');
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [slug]);

  if (!isOpen) return null;

  const cleanSlug = slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cleanSlug) {
      setError('Please enter your gym subdomain slug (e.g. tristara).');
      return;
    }

    if (status === 'found') {
      // Direct redirect to subdomain login
      window.location.href = `https://${cleanSlug}.trifit.space/login`;
    } else if (status === 'not_found') {
      onClaimSubdomain(cleanSlug);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#0A192F]/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="relative w-full max-w-md bg-[#FBFBF9] border border-[#CBD5E1] p-6 sm:p-8 text-[#111827] shadow-none">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 text-[#6B7280] hover:text-[#0A192F] focus-visible:outline-2 focus-visible:outline-[#0A192F]"
          aria-label="Close dialog"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="square" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <div className="flex items-center gap-2">
          <span className="h-1.5 w-6 bg-[#0A192F]" />
          <p className="text-xs font-bold uppercase tracking-widest text-[#0A192F]">Client Portal Access</p>
        </div>
        <h3 className="mt-2 text-xl font-bold text-[#0A192F]">Login to Your Gym Portal</h3>
        <p className="mt-1 text-xs text-[#6B7280]">
          Each fitness facility on Trifit has a dedicated, encrypted subdomain for staff and owner login.
        </p>

        {error && (
          <div className="mt-4 p-2.5 bg-[#FEE2E2] border border-[#FCA5A5] text-xs text-[#991B1B]">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <div className="flex justify-between items-center mb-1">
              <label htmlFor={slugInputId} className="block text-[11px] font-bold uppercase tracking-wider text-[#0A192F]">
                Your Gym Subdomain / Identifier
              </label>
              {status === 'checking' && (
                <span className="text-[10px] font-mono text-[#6B7280] animate-pulse">Checking status...</span>
              )}
            </div>

            <div className="flex items-center">
              <input
                id={slugInputId}
                type="text"
                autoFocus
                required
                value={slug}
                onChange={(e) => {
                  setError(null);
                  setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''));
                }}
                placeholder="tristara"
                className="w-full px-3 py-2.5 text-sm bg-white border border-[#CBD5E1] border-r-0 focus:border-[#0A192F] focus:outline-none rounded-none font-mono"
              />
              <span className="px-3 py-2.5 text-xs font-mono font-bold bg-[#F5F5F0] border border-[#CBD5E1] text-[#6B7280]">
                .trifit.space
              </span>
            </div>
            <p className="text-[10px] text-[#6B7280] mt-1">Example: For Tristara Gym, enter &quot;tristara&quot;.</p>
          </div>

          {/* Case 1: Subdomain FOUND */}
          {status === 'found' && (
            <div className="p-3 bg-[#F0FDF4] border border-[#86EFAC] text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 bg-[#16A34A]" />
                <span className="font-bold text-[#166534] uppercase tracking-wider text-[11px]">Portal Verified</span>
              </div>
              <p className="mt-1 text-[#15803D]">
                Active portal detected for <strong>{tenantName}</strong> ({cleanSlug}.trifit.space).
              </p>
              <div className="mt-3">
                <button
                  type="button"
                  onClick={() => {
                    window.location.href = `https://${cleanSlug}.trifit.space/login`;
                  }}
                  className="w-full py-2.5 text-xs font-bold uppercase tracking-wider text-white bg-[#15803D] hover:bg-[#166534] transition-colors"
                >
                  Continue to {tenantName} Login &rarr;
                </button>
              </div>
            </div>
          )}

          {/* Case 2: Subdomain NOT FOUND -> Beautiful High-Converting Claim Box */}
          {status === 'not_found' && cleanSlug.length > 0 && (
            <div className="p-4 bg-[#FFFFFF] border-2 border-[#0A192F] text-xs space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 bg-[#B91C1C] text-white">
                  Not Registered
                </span>
                <span className="text-[10px] font-mono text-[#16A34A] font-semibold">Subdomain Available</span>
              </div>

              <div>
                <h4 className="font-bold text-sm text-[#0A192F]">
                  &quot;{cleanSlug}.trifit.space&quot; was not found.
                </h4>
                <p className="mt-1 text-xs text-[#4B5563] leading-relaxed">
                  No active gym portal is registered under this identifier yet. Good news: this custom subdomain is available for your gym!
                </p>
              </div>

              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => onClaimSubdomain(cleanSlug)}
                  className="w-full py-3 text-xs font-bold uppercase tracking-wider text-[#FBFBF9] bg-[#B91C1C] hover:bg-[#991B1B] border border-[#991B1B] transition-colors flex items-center justify-center gap-2"
                >
                  <span>Claim &quot;{cleanSlug}.trifit.space&quot; Free in 1-Click</span>
                  <span className="font-mono text-sm">&rarr;</span>
                </button>
                <p className="text-[10px] text-center text-[#6B7280] mt-1.5 font-medium">
                  Includes 7-day free enterprise sandbox &bull; Zero credit card
                </p>
              </div>
            </div>
          )}

          {/* Default Button if idle or checking */}
          {(status === 'idle' || status === 'checking') && (
            <div className="pt-2">
              <button
                type="submit"
                disabled={!cleanSlug || status === 'checking'}
                className="w-full py-3 text-xs font-bold uppercase tracking-wider text-[#FBFBF9] bg-[#0A192F] hover:bg-[#1E3A5F] border border-[#0A192F] transition-colors disabled:opacity-50"
              >
                {status === 'checking' ? 'Verifying Subdomain...' : 'Verify & Continue to Gym Login'}
              </button>
            </div>
          )}
        </form>

        <div className="mt-6 pt-4 border-t border-[#E5E7EB]">
          <p className="text-[11px] text-[#4B5563]">
            Are you the Platform Administrator?{' '}
            <a href="/login" className="font-bold text-[#B91C1C] hover:underline">
              Super Admin Console Login
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
