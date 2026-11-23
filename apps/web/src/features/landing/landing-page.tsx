import { useState, useEffect } from 'react';
import { LandingNavbar } from './components/landing-navbar';
import { Hero3dCanvas } from './components/hero-3d-canvas';
import { RoiCalculator } from './components/roi-calculator';
import { HardwareMatrix } from './components/hardware-matrix';
import { PricingSection } from './components/pricing-section';
import { LandingFooter } from './components/landing-footer';
import { TrialModal } from './components/trial-modal';
import { SubdomainModal } from './components/subdomain-modal';
import { CookieBanner } from './components/cookie-banner';
import { LegalModal } from './components/legal-modals';

export function LandingPage() {
  const [trialModalOpen, setTrialModalOpen] = useState(false);
  const [subdomainModalOpen, setSubdomainModalOpen] = useState(false);
  const [claimedSlug, setClaimedSlug] = useState<string>('');
  const [legalModalType, setLegalModalType] = useState<'terms' | 'privacy' | 'cookies' | null>(null);

  useEffect(() => {
    document.title = 'Trifit | India\'s #1 Biometric Gym ERP, Turnstile CRM & WhatsApp Billing Software';

    // Inject Comprehensive SEO Schema.org JSON-LD
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.text = JSON.stringify({
      '@context': 'https://schema.org',
      '@graph': [
        {
          '@type': 'SoftwareApplication',
          '@id': 'https://trifit.space/#software',
          'name': 'Trifit Gym Management ERP & Biometric CRM',
          'operatingSystem': 'Cloud, Web, Cross-platform, Linux, Windows, Android, iOS',
          'applicationCategory': 'BusinessApplication, FitnessManagement, ERP',
          'url': 'https://trifit.space',
          'description': 'India\'s #1 Gym Management ERP & CRM software with real-time biometric turnstile gate control, automated WhatsApp fee billing, GST invoicing, and multi-branch gym telemetry.',
          'offers': [
            {
              '@type': 'Offer',
              'name': '7-Day Free Trial',
              'price': '0',
              'priceCurrency': 'INR',
              'priceValidUntil': '2027-12-31',
              'description': 'Instant zero-risk evaluation with direct biometric turnstile integration and WhatsApp billing.',
            },
            {
              '@type': 'Offer',
              'name': '1-Month Standard Plan',
              'price': '1800',
              'priceCurrency': 'INR',
              'priceValidUntil': '2027-12-31',
            },
            {
              '@type': 'Offer',
              'name': '3-Month Quarterly Plan',
              'price': '5200',
              'priceCurrency': 'INR',
              'priceValidUntil': '2027-12-31',
            },
            {
              '@type': 'Offer',
              'name': '6-Month Semi-Annual Plan',
              'price': '9500',
              'priceCurrency': 'INR',
              'priceValidUntil': '2027-12-31',
            },
            {
              '@type': 'Offer',
              'name': '12-Month Annual Enterprise Plan',
              'price': '18000',
              'priceCurrency': 'INR',
              'priceValidUntil': '2027-12-31',
            },
            {
              '@type': 'Offer',
              'name': 'Lifetime License',
              'price': '125000',
              'priceCurrency': 'INR',
              'priceValidUntil': '2027-12-31',
            },
          ],
          'aggregateRating': {
            '@type': 'AggregateRating',
            'ratingValue': '4.95',
            'ratingCount': '248',
          },
        },
        {
          '@type': 'Organization',
          '@id': 'https://trifit.space/#organization',
          'name': 'Trifit Technologies',
          'url': 'https://trifit.space',
          'logo': 'https://trifit.space/assets/logo.png',
          'email': 'tristaraitsolutions@gmail.com',
          'telephone': '+917567091267',
          'contactPoint': {
            '@type': 'ContactPoint',
            'telephone': '+917567091267',
            'contactType': 'customer support',
            'areaServed': 'IN',
            'availableLanguage': ['Hindi', 'English'],
          },
        },
        {
          '@type': 'FAQPage',
          '@id': 'https://trifit.space/#faq',
          'mainEntity': [
            {
              '@type': 'Question',
              'name': 'Which biometric turnstiles and face-recognition machines work with Trifit?',
              'acceptedAnswer': {
                '@type': 'Answer',
                'text': 'Trifit natively interfaces with standard Indian gym biometric hardware including Essl, ZKTeco, Mantra, Realtime, and Hikvision turnstiles, flap barriers, and facial recognition terminals over LAN or cloud relay push.',
              },
            },
            {
              '@type': 'Question',
              'name': 'How does Trifit stop unpaid members from entering the gym?',
              'acceptedAnswer': {
                '@type': 'Answer',
                'text': 'Trifit syncs active membership expiry dates directly to turnstile relays. The second a membership lapses or fee dues remain unpaid, the turnstile automatically denies access, requiring front-desk settlement.',
              },
            },
            {
              '@type': 'Question',
              'name': 'Does Trifit send automated fee receipts and payment links on WhatsApp?',
              'acceptedAnswer': {
                '@type': 'Answer',
                'text': 'Yes. When a member registers or renews, Trifit dispatches an instant digital GST invoice with dynamic UPI QR payment links directly to the member\'s WhatsApp number with automated payment reminders.',
              },
            },
            {
              '@type': 'Question',
              'name': 'Can existing member data be migrated from Excel or legacy gym software?',
              'acceptedAnswer': {
                '@type': 'Answer',
                'text': 'Yes. Trifit provides a free comprehensive Excel data migration service. Our dedicated engineers import your entire active member roster, renewal dates, and balance dues with zero downtime.',
              },
            },
            {
              '@type': 'Question',
              'name': 'Is Trifit fully compliant with Indian GST regulations?',
              'acceptedAnswer': {
                '@type': 'Answer',
                'text': 'Yes. Trifit features a built-in Indian GST dual-tax engine supporting CGST (9%) + SGST (9%) or IGST (18%) with gym SAC codes (999723), GSTIN tagging, and one-click accountant ledger exports.',
              },
            },
          ],
        },
      ],
    });
    document.head.appendChild(script);

    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
    };
  }, []);

  const coreFeatures = [
    {
      number: '01',
      title: 'Biometric Turnstiles & Face-ID Access',
      description:
        'Direct hardware interface with Essl, ZKTeco, and Mantra turnstiles. The gate automatically locks within 500ms when a member\'s fee expires or dues are unpaid. Completely stops friends entering on proxy cards.',
      badges: ['Anti-Passback', 'Real-Time Relay Push', 'Offline Buffer Sync'],
    },
    {
      number: '02',
      title: 'Automated GST Billing & WhatsApp Invoices',
      description:
        'Compliant with Indian taxation (CGST + SGST or IGST). Generates official tax invoices and sends instantaneous digital receipts and UPI payment links directly to members\' WhatsApp numbers.',
      badges: ['Dual-Tax GST Engine', 'Dynamic UPI QR Codes', 'Digital Receipts'],
    },
    {
      number: '03',
      title: 'Member Retention CRM & Walk-In Pipeline',
      description:
        'Convert walk-in gym inquiries into paying annual memberships. Track lead source, scheduled demo workouts, follow-up history, and receive automated notifications before a member drops out.',
      badges: ['Lead Stage Funnels', 'Expiry Alerts', 'Dropout Risk Warnings'],
    },
    {
      number: '04',
      title: 'Trainer PT Packages & Shift Rostering',
      description:
        'Manage personal trainer assignments, package session deductibles, and automated commission calculations upon fee collection. Eliminate manual trainer payroll disputes forever.',
      badges: ['PT Session Punch-In', 'Automated Commission', 'Slot Scheduling'],
    },
    {
      number: '05',
      title: 'Supplement Store & POS Retail Register',
      description:
        'Sell protein supplements, merchandise, and gym gear right at the front desk with barcode scanning, batch expiry tracking, and integrated cash drawer kickout relays.',
      badges: ['Barcode Scanning', 'Batch Expiry Alerts', 'Cash Drawer Integration'],
    },
    {
      number: '06',
      title: 'Multi-Branch Franchise Telemetry',
      description:
        'Monitor multiple gym locations from a single master executive screen. Compare revenue across branches, track staff attendance, and control role-based permissions with bank-grade security.',
      badges: ['Executive Dashboard', 'Branch Comparisons', 'Audit Ledger'],
    },
  ];

  const faqs = [
    {
      question: 'Will Trifit work with my gym\'s existing biometric turnstile machine?',
      answer:
        'Yes. Trifit natively supports standard commercial biometric terminals used in Indian gyms, including Essl, ZKTeco, Mantra, and Hikvision devices operating over TCP/IP LAN or push protocol. Our deployment engineers assist with setup during your 7-day trial.',
    },
    {
      question: 'How does Trifit prevent unauthorized members from entering the gym?',
      answer:
        'Trifit continuously syncs active membership expiry dates with the turnstile gate relay. The moment a member\'s renewal date passes without payment, their biometric ID is suspended at the turnstile, requiring front-desk settlement before entry.',
    },
    {
      question: 'Can we import our existing member records from Excel or another software?',
      answer:
        'Yes. We provide a full CSV / Excel bulk import engine. During onboarding, our technical team cleans and migrates your member names, contact numbers, active membership end-dates, and unpaid dues balances completely free of charge.',
    },
    {
      question: 'Is Trifit compliant with Indian GST requirements?',
      answer:
        'Yes. Trifit includes a dual-tax GST engine configured for Indian fitness centers (CGST 9% + SGST 9% or IGST 18%). Invoices include your gym\'s GSTIN, SAC codes, serial numbering, and breakdown for monthly accountant filing.',
    },
    {
      question: 'What happens if the internet broadband in our gym goes down?',
      answer:
        'The biometric turnstile hardware maintains local punch memory buffers. Active members can continue checking in without delay. As soon as the broadband connection is restored, all punch times sync up to the cloud ledger automatically.',
    },
    {
      question: 'How do my gym members and front-desk staff log into our portal?',
      answer:
        'Every gym on Trifit receives their own dedicated encrypted subdomain (for example, tristara.trifit.space). Staff and gym owners log in directly from their custom portal URL.',
    },
  ];

  return (
    <div className="min-h-screen bg-[#FBFBF9] text-[#111827] font-sans antialiased selection:bg-[#B91C1C] selection:text-white">
      {/* Navigation */}
      <LandingNavbar
        onOpenTrial={() => setTrialModalOpen(true)}
        onOpenSubdomain={() => setSubdomainModalOpen(true)}
      />

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-10 pb-16 lg:pt-14 lg:pb-24 border-b border-[#E5E7EB]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            {/* Left Content (7 Cols) */}
            <div className="lg:col-span-7 space-y-5">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#FFFFFF] border border-[#CBD5E1] text-[10px] font-bold uppercase tracking-widest text-[#0A192F]">
                <span className="w-2 h-2 bg-[#B91C1C]" />
                India&apos;s #1 Biometric Gym ERP &amp; Turnstile Access Operating System
              </div>

              <h1 className="text-3xl sm:text-5xl lg:text-[50px] font-extrabold tracking-tight text-[#0A192F] leading-[1.12]">
                Zero Unpaid Workouts. Auto-Lock Turnstiles on Due Dates. Recover Every Gym Fee on WhatsApp.
              </h1>

              <p className="text-sm sm:text-base text-[#4B5563] max-w-2xl leading-relaxed">
                Stop losing ₹50,000 to ₹1,50,000 every month in unpaid entries and forgotten renewals. Trifit syncs biometric turnstiles directly with your fee ledger. When a membership lapses, turnstiles lock automatically while WhatsApp sends automated UPI payment links and official GST invoices.
              </p>

              {/* Action Buttons */}
              <div className="pt-1 flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <button
                  type="button"
                  onClick={() => setTrialModalOpen(true)}
                  className="px-7 py-3.5 text-xs font-bold uppercase tracking-wider text-[#FBFBF9] bg-[#B91C1C] hover:bg-[#991B1B] border border-[#991B1B] transition-colors focus-visible:outline-2 focus-visible:outline-[#B91C1C]"
                >
                  Claim 7-Day Free Trial
                </button>
                <button
                  type="button"
                  onClick={() => setSubdomainModalOpen(true)}
                  className="px-6 py-3.5 text-xs font-bold uppercase tracking-wider text-[#0A192F] bg-[#FFFFFF] hover:bg-[#F5F5F0] border border-[#CBD5E1] transition-colors focus-visible:outline-2 focus-visible:outline-[#0A192F]"
                >
                  Client Subdomain Login
                </button>
              </div>

              {/* Guarantee Points */}
              <div className="pt-3 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-medium text-[#4B5563]">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-[#16A34A]" />
                  <span>No credit card required</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-[#16A34A]" />
                  <span>Essl, ZK &amp; Mantra ready</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-[#16A34A]" />
                  <span>Free Excel data migration</span>
                </div>
              </div>
            </div>

            {/* Right Interactive 3D Canvas (5 Cols) */}
            <div className="lg:col-span-5 relative">
              <Hero3dCanvas />
            </div>
          </div>
        </div>
      </section>

      {/* High-Impact Gym Operational Metrics Strip */}
      <section className="bg-[#0A192F] text-[#FBFBF9] border-b border-[#1E3A5F] py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            <div className="p-2">
              <p className="font-mono text-2xl sm:text-3xl font-extrabold text-[#FBFBF9]">100%</p>
              <p className="text-xs text-[#CBD5E1] mt-1 font-medium">Turnstile Gate Lock on Due Date</p>
            </div>
            <div className="p-2">
              <p className="font-mono text-2xl sm:text-3xl font-extrabold text-[#38BDF8]">0%</p>
              <p className="text-xs text-[#CBD5E1] mt-1 font-medium">Unpaid Workout Tolerance</p>
            </div>
            <div className="p-2">
              <p className="font-mono text-2xl sm:text-3xl font-extrabold text-[#FBFBF9]">15 Min</p>
              <p className="text-xs text-[#CBD5E1] mt-1 font-medium">WhatsApp Fee Recovery Speed</p>
            </div>
            <div className="p-2">
              <p className="font-mono text-2xl sm:text-3xl font-extrabold text-[#4ADE80]">₹0</p>
              <p className="text-xs text-[#CBD5E1] mt-1 font-medium">Data Migration &amp; Setup Fee</p>
            </div>
          </div>
        </div>
      </section>

      {/* Platform Features Grid (Avoids 3-column pricing/cards) */}
      <section id="features" className="py-24 bg-[#FFFFFF]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <p className="text-xs font-bold uppercase tracking-widest text-[#B91C1C]">Complete Architecture</p>
            <h2 className="mt-2 text-3xl sm:text-4xl font-bold tracking-tight text-[#0A192F]">
              Everything Required to Run an Enterprise Fitness Operation
            </h2>
            <p className="mt-4 text-sm text-[#4B5563] leading-relaxed">
              Designed from the ground up for commercial fitness center reality: loud environments, heavy walk-in footfalls, peak 7 AM and 7 PM crowds, and strict front-desk cash accounting.
            </p>
          </div>

          {/* 2-column feature card layout strictly adhering to Constitution */}
          <div className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-8">
            {coreFeatures.map((feat) => (
              <div
                key={feat.number}
                className="bg-[#FBFBF9] border border-[#E5E7EB] p-8 flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-center">
                    <span className="font-mono text-xs font-bold text-[#B91C1C] bg-[#FEE2E2] px-2.5 py-1">
                      MODULE {feat.number}
                    </span>
                    <span className="h-1 w-6 bg-[#0A192F]" />
                  </div>

                  <h3 className="mt-5 text-xl font-bold text-[#0A192F]">{feat.title}</h3>
                  <p className="mt-2 text-xs sm:text-sm text-[#4B5563] leading-relaxed">
                    {feat.description}
                  </p>
                </div>

                <div className="mt-6 pt-5 border-t border-[#E5E7EB] flex flex-wrap gap-2">
                  {feat.badges.map((b) => (
                    <span
                      key={b}
                      className="text-[10px] font-mono font-semibold uppercase tracking-wider px-2 py-1 bg-white border border-[#CBD5E1] text-[#0A192F]"
                    >
                      {b}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ROI Calculator Section */}
      <RoiCalculator />

      {/* Hardware Ecosystem */}
      <HardwareMatrix />

      {/* Pricing Plans */}
      <PricingSection onOpenTrial={() => setTrialModalOpen(true)} />

      {/* FAQ Section */}
      <section id="faq" className="py-24 bg-[#FFFFFF] border-t border-[#E5E7EB]">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto">
            <p className="text-xs font-bold uppercase tracking-widest text-[#B91C1C]">Common Questions</p>
            <h2 className="mt-2 text-3xl font-bold tracking-tight text-[#0A192F]">
              Frequently Asked Questions by Indian Gym Owners
            </h2>
            <p className="mt-3 text-xs text-[#6B7280]">
              Everything you need to know about hardware wiring, data migration, and software activation.
            </p>
          </div>

          <div className="mt-14 space-y-6">
            {faqs.map((faq, idx) => (
              <div key={idx} className="bg-[#FBFBF9] border border-[#E5E7EB] p-6 sm:p-7">
                <h3 className="text-base font-bold text-[#0A192F] flex items-start gap-3">
                  <span className="font-mono text-xs font-bold text-[#B91C1C] mt-0.5">0{idx + 1}.</span>
                  <span>{faq.question}</span>
                </h3>
                <p className="mt-3 text-xs sm:text-sm text-[#4B5563] leading-relaxed pl-7">
                  {faq.answer}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom Conversion Banner */}
      <section className="bg-[#0F223D] text-[#FBFBF9] py-16 border-t border-[#1E3A5F]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Ready to Stop Fee Leakage &amp; Turn Your Gym into an Automated Profit Machine?
          </h2>
          <p className="mt-4 text-sm text-[#CBD5E1] max-w-2xl mx-auto">
            Start your 7-day free trial today. Connect your biometric turnstiles, migrate your member records from Excel with zero downtime, and start sending automated WhatsApp receipts within 24 hours.
          </p>
          <div className="mt-8 flex flex-col sm:flex-row justify-center items-center gap-4">
            <button
              type="button"
              onClick={() => setTrialModalOpen(true)}
              className="w-full sm:w-auto px-8 py-4 text-xs font-bold uppercase tracking-wider text-[#FBFBF9] bg-[#B91C1C] hover:bg-[#991B1B] border border-[#991B1B] transition-colors"
            >
              Claim 7-Day Free Trial
            </button>
            <a
              href="https://wa.me/917567091267"
              target="_blank"
              rel="noreferrer"
              className="w-full sm:w-auto px-7 py-4 text-xs font-bold uppercase tracking-wider text-[#0A192F] bg-[#FFFFFF] hover:bg-[#F5F5F0] border border-[#CBD5E1] transition-colors"
            >
              Speak to Technical Specialist on WhatsApp
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <LandingFooter
        onOpenTrial={() => setTrialModalOpen(true)}
        onOpenSubdomain={() => setSubdomainModalOpen(true)}
        onOpenLegal={(type) => setLegalModalType(type)}
      />

      {/* Cookie Banner */}
      <CookieBanner
        onOpenCookies={() => setLegalModalType('cookies')}
        onOpenPrivacy={() => setLegalModalType('privacy')}
      />

      {/* Modals */}
      <TrialModal
        isOpen={trialModalOpen}
        defaultSlug={claimedSlug}
        onClose={() => {
          setTrialModalOpen(false);
          setClaimedSlug('');
        }}
      />
      <SubdomainModal
        isOpen={subdomainModalOpen}
        onClose={() => setSubdomainModalOpen(false)}
        onClaimSubdomain={(slugToClaim) => {
          setSubdomainModalOpen(false);
          setClaimedSlug(slugToClaim);
          setTrialModalOpen(true);
        }}
      />
      <LegalModal
        type={legalModalType}
        onClose={() => setLegalModalType(null)}
      />
    </div>
  );
}

