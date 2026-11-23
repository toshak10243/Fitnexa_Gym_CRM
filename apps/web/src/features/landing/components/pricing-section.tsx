interface PricingSectionProps {
  onOpenTrial: () => void;
}

export function PricingSection({ onOpenTrial }: PricingSectionProps) {
  const commonFeatures = [
    'Full platform access across all modules',
    'Direct biometric turnstile & Face-ID integration',
    'Automated WhatsApp payment reminders & fee receipts',
    'GST compliant digital invoicing & tax ledgers',
    'Member registration, digital KYC & photo capture',
    'Front-desk POS register & supplement inventory',
    'Trainer PT package tracking & commission splits',
    'Daily automated cloud backups & real-time telemetry',
  ];

  const plans = [
    {
      id: 'trial',
      name: '7-Day Free Trial',
      tagline: 'Instant zero-risk evaluation',
      price: '₹0',
      period: 'for 7 days',
      effectiveMonth: 'Complimentary',
      highlight: true,
      badge: 'Start Immediate',
      features: [
        ...commonFeatures.slice(0, 6),
        'Zero credit card or upfront deposit required',
        'Complimentary setup & turnstile wiring test',
      ],
      cta: 'Claim 7-Day Free Trial',
      isTrial: true,
    },
    {
      id: 'monthly',
      name: '1-Month Standard Plan',
      tagline: 'Month-to-month flexibility',
      price: '₹800',
      period: 'for 1 month',
      effectiveMonth: '₹800 / mo',
      highlight: false,
      badge: null,
      features: commonFeatures,
      cta: 'Subscribe Monthly',
      isTrial: false,
    },
    {
      id: 'quarterly',
      name: '3-Month Quarterly Plan',
      tagline: 'Ideal for growing studios',
      price: '₹2,500',
      period: 'for 3 months',
      effectiveMonth: '₹833 / mo',
      highlight: false,
      badge: 'Quarterly',
      features: commonFeatures,
      cta: 'Subscribe Quarterly',
      isTrial: false,
    },
    {
      id: 'semiannual',
      name: '6-Month Semi-Annual Plan',
      tagline: 'Long-term stability & consistency',
      price: '₹4,500',
      period: 'for 6 months',
      effectiveMonth: '₹750 / mo',
      highlight: false,
      badge: 'Save 6%',
      features: commonFeatures,
      cta: 'Subscribe Semi-Annual',
      isTrial: false,
    },
    {
      id: 'annual',
      name: '12-Month Annual Enterprise Plan',
      tagline: 'The complete franchise & club suite',
      price: '₹8,000',
      period: 'for 12 months',
      effectiveMonth: '₹667 / mo',
      highlight: true,
      badge: 'Best Commercial Value',
      features: [
        ...commonFeatures,
        'Dedicated senior technical account manager',
        'Priority 24/7 hotline & WhatsApp support',
      ],
      cta: 'Choose Annual Enterprise',
      isTrial: false,
    },
    {
      id: 'lifetime',
      name: 'Lifetime License + Free AMC',
      tagline: 'Perpetual ownership license + 1 year free AMC',
      price: '₹25,000',
      period: 'one-time investment',
      effectiveMonth: 'Zero recurring fees',
      highlight: false,
      badge: 'Zero Monthly Dues',
      features: [
        'Perpetual software license with lifetime ownership',
        'Includes 1 year free AMC & hardware updates',
        ...commonFeatures.slice(1, 7),
        'Dedicated server isolation & custom domain mapping',
      ],
      cta: 'Inquire Lifetime License',
      isTrial: false,
    },
  ];

  return (
    <section id="pricing" className="py-24 bg-[#FBFBF9] border-t border-[#E5E7EB]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto">
          <p className="text-xs font-bold uppercase tracking-widest text-[#B91C1C]">Commercial Transparency</p>
          <h2 className="mt-2 text-3xl sm:text-4xl font-bold tracking-tight text-[#0A192F]">
            Transparent Subscriptions Built for Indian Gym Economics
          </h2>
          <p className="mt-4 text-sm text-[#4B5563] leading-relaxed">
            No hidden setup fees, no lock-in contracts, and zero transaction cuts on your member fee collections.
            Every plan includes complete biometric turnstile support and GST compliance.
          </p>
        </div>

        {/* 2-column grid on desktop to strictly avoid forbidden 3-column pricing */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`p-8 flex flex-col justify-between border ${
                plan.highlight
                  ? 'bg-[#FFFFFF] border-2 border-[#0A192F]'
                  : 'bg-[#FFFFFF] border border-[#E5E7EB]'
              }`}
            >
              <div>
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-xl font-bold text-[#0A192F]">{plan.name}</h3>
                    <p className="text-xs text-[#6B7280] mt-1">{plan.tagline}</p>
                  </div>
                  {plan.badge && (
                    <span
                      className={`text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 ${
                        plan.id === 'trial'
                          ? 'bg-[#B91C1C] text-[#FBFBF9]'
                          : 'bg-[#0A192F] text-[#FBFBF9]'
                      }`}
                    >
                      {plan.badge}
                    </span>
                  )}
                </div>

                <div className="mt-6 pt-6 border-t border-[#E5E7EB] flex items-baseline gap-2">
                  <span className="font-mono text-3xl sm:text-4xl font-extrabold text-[#0A192F] tracking-tight">
                    {plan.price}
                  </span>
                  <span className="text-xs font-medium text-[#6B7280]">{plan.period}</span>
                </div>
                <div className="text-[11px] font-mono text-[#B91C1C] font-semibold mt-1">
                  Effective: {plan.effectiveMonth}
                </div>

                <div className="mt-8">
                  <p className="text-xs font-bold uppercase tracking-wider text-[#0A192F] mb-4">Included Capabilities:</p>
                  <ul className="space-y-3 text-xs text-[#374151]">
                    {plan.features.map((feature) => (
                      <li key={feature} className="flex items-start gap-2.5">
                        <span className="h-1.5 w-1.5 rounded-none bg-[#B91C1C] mt-1.5 flex-shrink-0" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <div className="mt-10 pt-6 border-t border-[#E5E7EB]">
                <button
                  type="button"
                  onClick={onOpenTrial}
                  className={`w-full py-3.5 text-xs font-bold uppercase tracking-wider text-center transition-colors focus-visible:outline-2 ${
                    plan.highlight
                      ? 'bg-[#B91C1C] hover:bg-[#991B1B] text-[#FBFBF9] border border-[#991B1B]'
                      : 'bg-[#0A192F] hover:bg-[#1E3A5F] text-[#FBFBF9] border border-[#0A192F]'
                  }`}
                >
                  {plan.cta}
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Enterprise Migration Guarantee Notice */}
        <div className="mt-12 bg-[#F5F5F0] border border-[#CBD5E1] p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="space-y-1 text-center md:text-left">
            <h4 className="text-sm font-bold text-[#0A192F] uppercase tracking-wide">
              Switching from Excel, Fitternity, GymPanda or Local Software?
            </h4>
            <p className="text-xs text-[#4B5563]">
              Our engineering team imports your existing active members, expired balances, and membership history with zero downtime.
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenTrial}
            className="flex-shrink-0 px-6 py-3 text-xs font-bold uppercase tracking-wider text-[#0A192F] bg-white border border-[#0A192F] hover:bg-[#F5F5F0]"
          >
            Request Free Data Migration
          </button>
        </div>
      </div>
    </section>
  );
}

