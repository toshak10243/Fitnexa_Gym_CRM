import { useState } from 'react';
import fitnexaLogo from '../../../assets/logo.png';

interface LandingNavbarProps {
  onOpenTrial: () => void;
  onOpenSubdomain: () => void;
}

export function LandingNavbar({ onOpenTrial, onOpenSubdomain }: LandingNavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { label: 'Platform Features', href: '#features' },
    { label: 'Biometrics & Hardware', href: '#hardware' },
    { label: 'ROI Calculator', href: '#calculator' },
    { label: 'Pricing Plans', href: '#pricing' },
    { label: 'Enterprise FAQ', href: '#faq' },
  ];

  return (
    <header className="sticky top-0 z-50 w-full bg-[#FBFBF9]/95 backdrop-blur-md border-b border-[#E5E7EB] transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
        {/* Brand Logo & Name */}
        <a href="/" className="flex items-center gap-3 group focus-visible:outline-2 focus-visible:outline-[#0A192F]">
          <div className="h-11 w-11 flex items-center justify-center bg-[#0F223D] border border-[#CBD5E1] p-1.5">
            <img src={fitnexaLogo} alt="Trifit Gym ERP" className="h-full w-full object-contain" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-lg tracking-tight text-[#0A192F]">TRIFIT</span>
              <span className="text-[10px] font-bold uppercase tracking-widest px-1.5 py-0.5 bg-[#0A192F] text-[#FBFBF9]">ERP</span>
            </div>
            <p className="text-[11px] font-medium text-[#6B7280] tracking-wide">Enterprise Gym Operating System</p>
          </div>
        </a>

        {/* Desktop Navigation */}
        <nav className="hidden lg:flex items-center gap-7 text-sm font-medium text-[#111827]">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="text-[#4B5563] hover:text-[#0A192F] transition-colors focus-visible:outline-2 focus-visible:outline-[#0A192F]"
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* Action Buttons */}
        <div className="hidden sm:flex items-center gap-3">
          <button
            type="button"
            onClick={onOpenSubdomain}
            className="px-4 py-2.5 text-xs font-semibold uppercase tracking-wider text-[#0A192F] bg-transparent border border-[#CBD5E1] hover:bg-[#F5F5F0] transition-colors focus-visible:outline-2 focus-visible:outline-[#0A192F]"
          >
            Client Login
          </button>
          <button
            type="button"
            onClick={onOpenTrial}
            className="px-5 py-2.5 text-xs font-bold uppercase tracking-wider text-[#FBFBF9] bg-[#B91C1C] hover:bg-[#991B1B] border border-[#991B1B] transition-colors focus-visible:outline-2 focus-visible:outline-[#B91C1C]"
          >
            Claim 7-Day Free Trial
          </button>
        </div>

        {/* Mobile Hamburger Button */}
        <div className="flex items-center gap-2 lg:hidden">
          <button
            type="button"
            onClick={onOpenTrial}
            className="sm:hidden px-3 py-1.5 text-xs font-bold uppercase tracking-wider text-[#FBFBF9] bg-[#B91C1C]"
          >
            Free Trial
          </button>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 border border-[#CBD5E1] text-[#0A192F] bg-[#FFFFFF] hover:bg-[#F5F5F0]"
            aria-label="Toggle navigation menu"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              {mobileMenuOpen ? (
                <path strokeLinecap="square" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              ) : (
                <path strokeLinecap="square" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t border-[#E5E7EB] bg-[#FBFBF9] px-4 pt-3 pb-6 space-y-3">
          <div className="grid grid-cols-1 gap-2 pt-2">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2 text-sm font-medium text-[#111827] hover:bg-[#F5F5F0] border-l-2 border-transparent hover:border-[#0A192F]"
              >
                {link.label}
              </a>
            ))}
          </div>
          <div className="pt-3 border-t border-[#E5E7EB] flex flex-col gap-2">
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenSubdomain();
              }}
              className="w-full text-center py-2.5 text-xs font-semibold uppercase tracking-wider text-[#0A192F] border border-[#CBD5E1] bg-white"
            >
              Gym Subdomain Client Login
            </button>
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenTrial();
              }}
              className="w-full text-center py-2.5 text-xs font-bold uppercase tracking-wider text-[#FBFBF9] bg-[#B91C1C]"
            >
              Claim 7-Day Free Trial
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
