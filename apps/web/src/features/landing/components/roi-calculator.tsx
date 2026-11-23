import { useState, useId } from 'react';

export function RoiCalculator() {
  const [memberCount, setMemberCount] = useState<number>(350);
  const [avgMonthlyFee, setAvgMonthlyFee] = useState<number>(2500);
  const [leakageRate, setLeakageRate] = useState<number>(12); // 12% industry average

  const memberSliderId = useId();
  const feeSliderId = useId();
  const leakageSliderId = useId();

  // Calculations
  const monthlyRevenue = memberCount * avgMonthlyFee;
  const monthlyLeakagePrevented = Math.round(monthlyRevenue * (leakageRate / 100));
  const automatedFollowupRecovery = Math.round(monthlyRevenue * 0.06); // 6% recovery via automated WhatsApp payment links
  const totalMonthlyBenefit = monthlyLeakagePrevented + automatedFollowupRecovery;
  const annualBenefit = totalMonthlyBenefit * 12;

  const formatRupee = (val: number) => {
    return '₹' + val.toLocaleString('en-IN');
  };

  return (
    <section id="calculator" className="py-20 bg-[#F5F5F0] border-y border-[#E5E7EB]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto">
          <p className="text-xs font-bold uppercase tracking-widest text-[#B91C1C]">Revenue Impact Model</p>
          <h2 className="mt-2 text-3xl sm:text-4xl font-bold tracking-tight text-[#0A192F]">
            Calculate What Your Gym Recovers With Biometric Automation
          </h2>
          <p className="mt-4 text-sm text-[#4B5563] leading-relaxed">
            Most Indian gym facilities leak between 10% and 18% of their monthly dues due to manual turnstile gates,
            unauthorized proxy check-ins, and delayed membership renewal follow-ups.
          </p>
        </div>

        <div className="mt-14 grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
          {/* Controls Column */}
          <div className="lg:col-span-7 bg-[#FFFFFF] border border-[#E5E7EB] p-6 sm:p-8 flex flex-col justify-between">
            <div className="space-y-8">
              {/* Member Count Slider */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label htmlFor={memberSliderId} className="text-xs font-bold uppercase tracking-wider text-[#0A192F]">
                    Total Active Members
                  </label>
                  <span className="font-mono text-sm font-bold text-[#0A192F] bg-[#F5F5F0] px-2.5 py-1 border border-[#E5E7EB]">
                    {memberCount} Members
                  </span>
                </div>
                <input
                  id={memberSliderId}
                  type="range"
                  min="50"
                  max="2000"
                  step="25"
                  value={memberCount}
                  onChange={(e) => setMemberCount(Number(e.target.value))}
                  className="w-full h-2 bg-[#E5E7EB] rounded-none appearance-none cursor-pointer accent-[#B91C1C]"
                />
                <div className="flex justify-between text-[11px] font-mono text-[#6B7280] mt-1">
                  <span>50</span>
                  <span>500</span>
                  <span>1,000</span>
                  <span>2,000+</span>
                </div>
              </div>

              {/* Average Monthly Fee Slider */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label htmlFor={feeSliderId} className="text-xs font-bold uppercase tracking-wider text-[#0A192F]">
                    Average Monthly Fee Per Member
                  </label>
                  <span className="font-mono text-sm font-bold text-[#0A192F] bg-[#F5F5F0] px-2.5 py-1 border border-[#E5E7EB]">
                    {formatRupee(avgMonthlyFee)} / mo
                  </span>
                </div>
                <input
                  id={feeSliderId}
                  type="range"
                  min="800"
                  max="12000"
                  step="200"
                  value={avgMonthlyFee}
                  onChange={(e) => setAvgMonthlyFee(Number(e.target.value))}
                  className="w-full h-2 bg-[#E5E7EB] rounded-none appearance-none cursor-pointer accent-[#B91C1C]"
                />
                <div className="flex justify-between text-[11px] font-mono text-[#6B7280] mt-1">
                  <span>₹800</span>
                  <span>₹3,000</span>
                  <span>₹6,000</span>
                  <span>₹12,000</span>
                </div>
              </div>

              {/* Unenforced Entry Leakage % */}
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label htmlFor={leakageSliderId} className="text-xs font-bold uppercase tracking-wider text-[#0A192F]">
                    Estimated Unpaid Entry / Expired Access Rate
                  </label>
                  <span className="font-mono text-sm font-bold text-[#B91C1C] bg-[#FEE2E2] px-2.5 py-1 border border-[#FCA5A5]">
                    {leakageRate}% Unpaid Entries
                  </span>
                </div>
                <input
                  id={leakageSliderId}
                  type="range"
                  min="5"
                  max="25"
                  step="1"
                  value={leakageRate}
                  onChange={(e) => setLeakageRate(Number(e.target.value))}
                  className="w-full h-2 bg-[#E5E7EB] rounded-none appearance-none cursor-pointer accent-[#B91C1C]"
                />
                <div className="flex justify-between text-[11px] font-mono text-[#6B7280] mt-1">
                  <span>5% (Strict)</span>
                  <span>12% (Typical)</span>
                  <span>25% (High Leakage)</span>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-[#E5E7EB] text-xs text-[#6B7280] flex items-center justify-between">
              <span>Current Base Monthly Billing:</span>
              <span className="font-mono font-bold text-[#0A192F]">{formatRupee(monthlyRevenue)}</span>
            </div>
          </div>

          {/* Value Projection Output Box */}
          <div className="lg:col-span-5 bg-[#0F223D] border border-[#1E3A5F] text-[#FBFBF9] p-6 sm:p-8 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-6 bg-[#B91C1C]" />
                <p className="text-xs font-bold uppercase tracking-widest text-[#CBD5E1]">Projected Value Retention</p>
              </div>

              <div className="mt-8 space-y-5">
                <div className="border-b border-[#334E70] pb-4">
                  <p className="text-xs text-[#94A3B8]">Stopped Gate Access For Expired Members:</p>
                  <p className="mt-1 font-mono text-2xl font-bold text-[#FBFBF9]">{formatRupee(monthlyLeakagePrevented)} <span className="text-xs text-[#CBD5E1] font-sans font-normal">/ month</span></p>
                </div>

                <div className="border-b border-[#334E70] pb-4">
                  <p className="text-xs text-[#94A3B8]">Automated WhatsApp Renewal Link Recovery:</p>
                  <p className="mt-1 font-mono text-2xl font-bold text-[#FBFBF9]">{formatRupee(automatedFollowupRecovery)} <span className="text-xs text-[#CBD5E1] font-sans font-normal">/ month</span></p>
                </div>

                <div className="pt-2">
                  <p className="text-xs uppercase tracking-wider font-semibold text-[#CBD5E1]">Total Estimated Annual Recovery:</p>
                  <p className="mt-2 font-mono text-3xl sm:text-4xl font-extrabold text-[#38BDF8]">{formatRupee(annualBenefit)}</p>
                  <p className="text-xs text-[#94A3B8] mt-1">Net profit straight back into gym operational margins.</p>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-[#334E70]">
              <a
                href="#pricing"
                className="w-full block text-center py-3 text-xs font-bold uppercase tracking-wider text-[#0A192F] bg-[#FBFBF9] hover:bg-[#FFFFFF] border border-[#CBD5E1] transition-colors"
              >
                Choose Subscription Plan
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

