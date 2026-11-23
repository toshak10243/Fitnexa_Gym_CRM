import { useState, useEffect } from 'react';

interface CookieBannerProps {
  onOpenCookies: () => void;
  onOpenPrivacy: () => void;
}

export function CookieBanner({ onOpenCookies, onOpenPrivacy }: CookieBannerProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem('trifit_cookie_consent');
    if (!consent) {
      // Show banner after brief delay
      const timer = setTimeout(() => setVisible(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem('trifit_cookie_consent', 'accepted');
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 inset-x-0 z-40 bg-[#0A192F]/95 backdrop-blur-md border-t border-[#1E3A5F] text-[#CBD5E1] p-4 sm:p-5 shadow-none transition-all">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="space-y-1 text-center md:text-left">
          <div className="flex items-center justify-center md:justify-start gap-2">
            <span className="w-2 h-2 bg-[#38BDF8]" />
            <h5 className="text-xs font-bold uppercase tracking-widest text-[#FBFBF9]">
              Enterprise Cookie & Data Security Notice
            </h5>
          </div>
          <p className="text-xs text-[#94A3B8] max-w-3xl leading-relaxed">
            Trifit uses strictly essential authentication tokens and local storage buffers to power secure gym tenant routing,
            biometric turnstile synchronization, and offline recovery. We do not deploy third-party advertising cookies.{' '}
            <button
              type="button"
              onClick={onOpenPrivacy}
              className="text-[#38BDF8] underline hover:text-white"
            >
              Privacy Policy
            </button>{' '}
            and{' '}
            <button
              type="button"
              onClick={onOpenCookies}
              className="text-[#38BDF8] underline hover:text-white"
            >
              Cookie Policy
            </button>.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-shrink-0">
          <button
            type="button"
            onClick={onOpenCookies}
            className="px-4 py-2 text-xs font-semibold uppercase tracking-wider text-[#CBD5E1] border border-[#334E70] hover:bg-[#1E3A5F] transition-colors"
          >
            Manage Preferences
          </button>
          <button
            type="button"
            onClick={handleAccept}
            className="px-6 py-2 text-xs font-bold uppercase tracking-wider text-[#0A192F] bg-[#FBFBF9] hover:bg-white border border-[#CBD5E1] transition-colors"
          >
            Accept Essential Cookies
          </button>
        </div>
      </div>
    </div>
  );
}
