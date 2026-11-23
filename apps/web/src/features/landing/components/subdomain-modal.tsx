import { useState, useId } from 'react';

interface SubdomainModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function SubdomainModal({ isOpen, onClose }: SubdomainModalProps) {
  const [slug, setSlug] = useState('');
  const [error, setError] = useState<string | null>(null);

  const slugInputId = useId();

  if (!isOpen) return null;

  const handleNavigate = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = slug.trim().toLowerCase().replace(/[^a-z0-9-]/g, '');
    if (!clean) {
      setError('Please enter your gym subdomain slug (e.g. tristara).');
      return;
    }

    // Redirect to subdomain login
    const targetUrl = `https://${clean}.trifit.space/login`;
    window.location.href = targetUrl;
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

        <form onSubmit={handleNavigate} className="mt-5 space-y-4">
          <div>
            <label htmlFor={slugInputId} className="block text-[11px] font-bold uppercase tracking-wider text-[#0A192F] mb-1">
              Your Gym Subdomain / Identifier
            </label>
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

          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-3 text-xs font-bold uppercase tracking-wider text-[#FBFBF9] bg-[#0A192F] hover:bg-[#1E3A5F] border border-[#0A192F] transition-colors"
            >
              Continue to Gym Login
            </button>
          </div>
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
