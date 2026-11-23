import { useState } from 'react';
import fitnexaLogo from '../../../assets/logo.png';

interface LandingNavbarProps {
  onOpenTrial: () => void;
  onOpenSubdomain: () => void;
}

export function LandingNavbar({ onOpenTrial, onOpenSubdomain }: LandingNavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { label: 'Features', href: '#features' },
    { label: 'Hardware', href: '#hardware' },
    { label: 'ROI Calculator', href: '#calculator' },
    { label: 'Pricing', href: '#pricing' },
    { label: 'FAQ', href: '#faq' },
  ];

  return (
    <header className="sticky top-0 z-50 w-full bg-[#FBFBF9]/95 backdrop-blur-md border-b border-[#E5E7EB]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo & Name */}
        <a href="/" className="flex items-center gap-2.5 focus-visible:outline-2 focus-visible:outline-[#0A192F]">
          <img src={fitnexaLogo} alt="Trifit Gym ERP" className="h-9 w-9 object-contain" />
          <div className="flex items-center gap-1.5">
            <span className="font-extrabold text-base tracking-tight text-[#0A192F]">TRIFIT</span>
            <span className="text-[9px] font-mono font-bold uppercase tracking-wider px-1.5 py-0.5 bg-[#0A192F] text-[#FBFBF9]">
              ERP
            </span>
          </div>
        </a>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-[#374151]">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="text-[#4B5563] hover:text-[#0A192F] transition-colors py-1"
            >
              {link.label}
            </a>
          ))}
        </nav>

        {/* Desktop Actions */}
        <div className="hidden sm:flex items-center gap-3">
          <button
            type="button"
            onClick={onOpenSubdomain}
            className="px-3.5 py-2 text-xs font-semibold uppercase tracking-wider text-[#0A192F] bg-white border border-[#CBD5E1] hover:bg-[#F5F5F0] transition-colors"
          >
            Client Login
          </button>
          <button
            type="button"
            onClick={onOpenTrial}
            className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-[#FBFBF9] bg-[#B91C1C] hover:bg-[#991B1B] border border-[#991B1B] transition-colors"
          >
            Claim 7-Day Free Trial
          </button>
        </div>

        {/* Mobile Hamburger Button */}
        <div className="flex items-center gap-2 md:hidden">
          <button
            type="button"
            onClick={onOpenTrial}
            className="sm:hidden px-2.5 py-1.5 text-[11px] font-bold uppercase tracking-wider text-[#FBFBF9] bg-[#B91C1C]"
          >
            Free Trial
          </button>
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1.5 border border-[#CBD5E1] text-[#0A192F] bg-white"
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
        <div className="md:hidden border-t border-[#E5E7EB] bg-[#FBFBF9] px-4 pt-3 pb-5 space-y-2">
          {navLinks.map((link) => (
            <a
              key={link.label}
              href={link.href}
              onClick={() => setMobileMenuOpen(false)}
              className="block px-3 py-2 text-xs font-semibold text-[#111827] hover:bg-[#F5F5F0]"
            >
              {link.label}
            </a>
          ))}
          <div className="pt-2 border-t border-[#E5E7EB] flex flex-col gap-2">
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenSubdomain();
              }}
              className="w-full text-center py-2 text-xs font-semibold uppercase tracking-wider text-[#0A192F] border border-[#CBD5E1] bg-white"
            >
              Client Login
            </button>
            <button
              type="button"
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenTrial();
              }}
              className="w-full text-center py-2 text-xs font-bold uppercase tracking-wider text-[#FBFBF9] bg-[#B91C1C]"
            >
              Claim 7-Day Free Trial
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
