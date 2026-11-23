interface LegalModalProps {
  type: 'terms' | 'privacy' | 'cookies' | null;
  onClose: () => void;
}

export function LegalModal({ type, onClose }: LegalModalProps) {
  if (!type) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#0A192F]/85 backdrop-blur-sm flex justify-center items-center p-3 sm:p-5 min-h-screen">
      <div className="relative w-full max-w-2xl max-h-[88vh] my-auto bg-[#FBFBF9] border border-[#CBD5E1] p-5 sm:p-7 text-[#111827] shadow-none flex flex-col justify-between">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-5 right-5 p-2 text-[#6B7280] hover:text-[#0A192F] focus-visible:outline-2 focus-visible:outline-[#0A192F]"
          aria-label="Close dialog"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="square" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Modal Header */}
        <div className="border-b border-[#E5E7EB] pb-4">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-6 bg-[#0A192F]" />
            <p className="text-[11px] font-bold uppercase tracking-widest text-[#0A192F]">Legal & Compliance</p>
          </div>
          <h3 className="mt-1 text-2xl font-bold text-[#0A192F]">
            {type === 'terms' && 'Terms and Conditions of Service'}
            {type === 'privacy' && 'Privacy Policy & Data Protection'}
            {type === 'cookies' && 'Cookie & Local Storage Policy'}
          </h3>
          <p className="text-xs text-[#6B7280] mt-0.5">
            Governing Trifit Gym ERP Platform &bull; Effective November 2026
          </p>
        </div>

        {/* Scrollable Content Body */}
        <div className="my-5 overflow-y-auto pr-2 space-y-4 text-xs text-[#374151] leading-relaxed max-h-[55vh]">
          {type === 'terms' && (
            <>
              <div>
                <h4 className="font-bold text-[#0A192F] uppercase tracking-wide text-xs mb-1">1. SaaS Subscription & Service Provision</h4>
                <p>
                  Trifit Technologies provides cloud-based gym management, attendance tracking, member CRM, and point-of-sale software to commercial fitness businesses and franchise operators. By creating a tenant account or commencing a 7-day trial, the Subscriber agrees to be bound by these terms.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-[#0A192F] uppercase tracking-wide text-xs mb-1">2. Gym Member Data Ownership</h4>
                <p>
                  All member personal records, attendance logs, billing transactions, and workout data entered into the platform remain the exclusive intellectual and proprietary property of the Gym Tenant. Trifit acts solely as a data processor and will never sell, lease, or monetize gym client databases to third parties or competitors.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-[#0A192F] uppercase tracking-wide text-xs mb-1">3. Biometric Hardware & Access Control</h4>
                <p>
                  Trifit interfaces with commercial turnstile hardware (Essl, ZKTeco, Mantra) via standard networking protocols. While the software delivers gate lock signals based on membership dues, the physical installation, barrier maintenance, and emergency manual release mechanisms remain the legal responsibility of the gym facility.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-[#0A192F] uppercase tracking-wide text-xs mb-1">4. Payment Terms & GST Billing</h4>
                <p>
                  SaaS fees are billed in Indian Rupees (INR) plus applicable GST. Subscriptions may be cancelled at any point prior to the subsequent billing cycle. Data export in standard CSV format is guaranteed for a period of 30 days following subscription cessation.
                </p>
              </div>
            </>
          )}

          {type === 'privacy' && (
            <>
              <div>
                <h4 className="font-bold text-[#0A192F] uppercase tracking-wide text-xs mb-1">1. Compliance with Digital Personal Data Protection (DPDP) Act 2023</h4>
                <p>
                  Trifit processes personal data strictly in adherence to the Indian Digital Personal Data Protection Act, 2023. We enforce tenant-level database isolation, role-based access control, and zero-trust perimeter security across all tenant subdomains.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-[#0A192F] uppercase tracking-wide text-xs mb-1">2. Biometric Verification & Template Hashing</h4>
                <p>
                  Trifit does NOT store raw photographic images of fingerprints or faces on public servers. Biometric devices transmit mathematical vector hashes directly to the local relay. Access decisions are evaluated against membership expiry timestamps with sub-second execution.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-[#0A192F] uppercase tracking-wide text-xs mb-1">3. Financial Ledger & Invoice Data Security</h4>
                <p>
                  All GST tax invoices, member fee receipts, and cash drawer ledgers are encrypted using 256-bit AES algorithms at rest and TLS 1.3 protocol in transit. Immutable audit logs track every financial deletion or refund action taken by gym administrators.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-[#0A192F] uppercase tracking-wide text-xs mb-1">4. Data Retention & Right to Erasure</h4>
                <p>
                  Gym owners possess administrative authority to delete or anonymize expired member records upon request, in compliance with statutory Indian accounting and tax retention periods.
                </p>
              </div>
            </>
          )}

          {type === 'cookies' && (
            <>
              <div>
                <h4 className="font-bold text-[#0A192F] uppercase tracking-wide text-xs mb-1">1. Purpose of Cookies & Local Storage</h4>
                <p>
                  Trifit utilizes essential cookies and browser local storage mechanisms strictly necessary for the operation, security, and integrity of the gym management system. We do not deploy third-party advertising or cross-site tracking cookies.
                </p>
              </div>

              <div>
                <h4 className="font-bold text-[#0A192F] uppercase tracking-wide text-xs mb-1">2. Category Breakdown</h4>
                <ul className="space-y-1.5 list-disc pl-4 mt-1">
                  <li><strong>Essential Authentication Cookies:</strong> Cryptographically signed JWT tokens and session identifiers required to maintain secure staff and owner login across custom subdomains.</li>
                  <li><strong>Tenant Routing State:</strong> Cookies that identify your gym subdomain context (e.g. tristara.trifit.space) to ensure tenant data isolation.</li>
                  <li><strong>Hardware Sync Buffer:</strong> Local browser storage used to maintain offline check-in records during momentary internet broadband cuts.</li>
                </ul>
              </div>

              <div>
                <h4 className="font-bold text-[#0A192F] uppercase tracking-wide text-xs mb-1">3. Management & Control</h4>
                <p>
                  Users may configure their browser to reject or delete cookies; however, disabling essential session tokens will prevent successful authentication to the gym staff and owner dashboard.
                </p>
              </div>
            </>
          )}
        </div>

        {/* Modal Footer */}
        <div className="pt-4 border-t border-[#E5E7EB] flex items-center justify-between">
          <span className="text-[11px] font-mono text-[#6B7280]">Status: Legally Binding Document</span>
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 text-xs font-bold uppercase tracking-wider text-[#FBFBF9] bg-[#0A192F] hover:bg-[#1E3A5F] transition-colors"
          >
            Acknowledge & Close
          </button>
        </div>
      </div>
    </div>
  );
}

