import fitnexaLogo from '../../../assets/logo.png';

interface LandingFooterProps {
  onOpenTrial: () => void;
  onOpenSubdomain: () => void;
  onOpenLegal?: (type: 'terms' | 'privacy' | 'cookies') => void;
}

export function LandingFooter({ onOpenTrial, onOpenSubdomain, onOpenLegal }: LandingFooterProps) {
  return (
    <footer className="bg-[#0A192F] border-t border-[#1E3A5F] text-[#CBD5E1] pt-16 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 pb-12 border-b border-[#1E3A5F]">
          {/* Brand Info */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 flex items-center justify-center bg-[#FBFBF9] p-1.5 border border-[#CBD5E1]">
                <img src={fitnexaLogo} alt="Trifit Platform" className="h-full w-full object-contain" />
              </div>
              <span className="font-bold text-xl tracking-tight text-[#FBFBF9]">TRIFIT ERP</span>
            </div>
            <p className="text-xs text-[#94A3B8] max-w-sm leading-relaxed">
              The high-performance operating system and CRM engineered for Indian fitness centers,
              commercial health clubs, CrossFit boxes, and multi-location gym chains.
            </p>
          </div>

          {/* Column 1: Software Modules */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-[#FBFBF9] mb-4">Core Modules</h4>
            <ul className="space-y-2.5 text-xs">
              <li><a href="#features" className="hover:text-[#FBFBF9] transition-colors">Biometric Turnstiles</a></li>
              <li><a href="#features" className="hover:text-[#FBFBF9] transition-colors">GST Tax Invoicing</a></li>
              <li><a href="#features" className="hover:text-[#FBFBF9] transition-colors">WhatsApp Fee Reminders</a></li>
              <li><a href="#features" className="hover:text-[#FBFBF9] transition-colors">Trainer PT Split Payroll</a></li>
              <li><a href="#features" className="hover:text-[#FBFBF9] transition-colors">Supplement POS & Stock</a></li>
              <li><a href="#features" className="hover:text-[#FBFBF9] transition-colors">Multi-Branch Telemetry</a></li>
            </ul>
          </div>

          {/* Column 2: Portals & Links */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-[#FBFBF9] mb-4">Portals & Links</h4>
            <ul className="space-y-2.5 text-xs">
              <li>
                <button type="button" onClick={onOpenSubdomain} className="hover:text-[#FBFBF9] transition-colors text-left">
                  Gym Client Subdomain Login
                </button>
              </li>
              <li><a href="/login" className="hover:text-[#FBFBF9] transition-colors">Super Admin Console</a></li>
              <li>
                <button type="button" onClick={onOpenTrial} className="hover:text-[#FBFBF9] transition-colors text-left text-[#F87171] font-semibold">
                  Start 7-Day Free Trial
                </button>
              </li>
              <li><a href="#pricing" className="hover:text-[#FBFBF9] transition-colors">Pricing Architecture</a></li>
              <li><a href="#hardware" className="hover:text-[#FBFBF9] transition-colors">Supported Hardware Devices</a></li>
              <li><a href="#calculator" className="hover:text-[#FBFBF9] transition-colors">ROI Revenue Calculator</a></li>
            </ul>
          </div>

          {/* Column 3: Contact & Direct Support */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-widest text-[#FBFBF9] mb-4">Direct Support</h4>
            <div className="space-y-3 text-xs">
              <p className="text-[#94A3B8]">Technical & Onboarding Hotline:</p>
              <p className="font-mono text-sm font-bold text-[#FBFBF9]">+91 75670 91267</p>
              <p className="text-[#94A3B8]">Enterprise Inquiries:</p>
              <p className="font-mono text-[#CBD5E1]">tristaraitsolutions@gmail.com</p>
              <div className="pt-2">
                <a
                  href="https://wa.me/917567091267"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-block px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider text-[#0A192F] bg-[#22C55E] hover:bg-[#16A34A]"
                >
                  WhatsApp Support
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom Bar with Privacy & Legal Links */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#94A3B8]">
          <p>&copy; {new Date().getFullYear()} Trifit Technologies. All rights reserved. Indian Gym Management CRM & ERP.</p>
          <div className="flex items-center gap-4 text-[11px]">
            {onOpenLegal && (
              <>
                <button
                  type="button"
                  onClick={() => onOpenLegal('terms')}
                  className="hover:text-white transition-colors underline"
                >
                  Terms of Service
                </button>
                <span>&bull;</span>
                <button
                  type="button"
                  onClick={() => onOpenLegal('privacy')}
                  className="hover:text-white transition-colors underline"
                >
                  Privacy Policy
                </button>
                <span>&bull;</span>
                <button
                  type="button"
                  onClick={() => onOpenLegal('cookies')}
                  className="hover:text-white transition-colors underline"
                >
                  Cookie Policy
                </button>
                <span>&bull;</span>
              </>
            )}
            <span>DPDP Act 2023 Compliant</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
