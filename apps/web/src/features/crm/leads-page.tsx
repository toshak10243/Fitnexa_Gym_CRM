import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../lib/api-client';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Skeleton } from '../../components/ui/skeleton';
import { LeadStage } from '@fitnexa/shared';

export function LeadsPage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [leads, setLeads] = useState<any[]>([]);
  const [total, setTotal] = useState(0);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedStage, setSelectedStage] = useState<string>('');
  const [selectedSource, setSelectedSource] = useState<string>('');

  const fetchLeads = async () => {
    setIsLoading(true);
    try {
      let url = '/leads?limit=50';
      if (search.trim()) url += `&search=${encodeURIComponent(search.trim())}`;
      if (selectedStage) url += `&stage=${selectedStage}`;
      if (selectedSource) url += `&source=${selectedSource}`;

      const res = await apiClient.get(url);
      setLeads(res.data.data.items || []);
      setTotal(res.data.data.total || 0);
    } catch {
      // Handled gracefully
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLeads();
  }, [search, selectedStage, selectedSource]);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E5E7EB] pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#0A192F] uppercase">
            Lead Management & Sales CRM
          </h1>
          <p className="text-xs text-[#6B7280] mt-1">
            Walk-in inquiries, Instagram/Google campaigns, trial booking pipeline, and member conversion.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="text-xs border-[#E5E7EB] rounded-none hover:bg-[#F5F5F0]"
            onClick={() => navigate('/leads/follow-ups')}
          >
            Pending Follow-Ups
          </Button>
          <Button
            className="bg-[#0A192F] text-[#FBFBF9] hover:bg-[#162E52] text-xs rounded-none px-4"
            onClick={() => navigate('/leads/new')}
          >
            + Intake New Inquiry
          </Button>
        </div>
      </div>

      {/* Stage Tabs Bar */}
      <div className="flex flex-wrap items-center gap-1 pb-1">
        <button
          type="button"
          onClick={() => setSelectedStage('')}
          className={`px-3 py-1.5 text-xs font-bold border transition-colors ${
            !selectedStage
              ? 'bg-[#0A192F] text-white border-[#0A192F]'
              : 'bg-white text-[#6B7280] border-[#E5E7EB] hover:bg-[#F5F5F0]'
          }`}
        >
          All Stages ({total})
        </button>
        {Object.values(LeadStage).map((stage) => (
          <button
            key={stage}
            type="button"
            onClick={() => setSelectedStage(stage)}
            className={`px-3 py-1.5 text-xs font-bold border transition-colors ${
              selectedStage === stage
                ? 'bg-[#0A192F] text-white border-[#0A192F]'
                : 'bg-white text-[#6B7280] border-[#E5E7EB] hover:bg-[#F5F5F0]'
            }`}
          >
            {stage.replace(/_/g, ' ')}
          </button>
        ))}
      </div>

      {/* Filter Toolbar */}
      <div className="bg-[#FBFBF9] border border-[#E5E7EB] p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search prospect by name or phone..."
            className="text-xs border-[#E5E7EB] bg-white h-9 rounded-none w-64"
          />

          <select
            value={selectedSource}
            onChange={(e) => setSelectedSource(e.target.value)}
            className="text-xs border border-[#E5E7EB] bg-white px-3 h-9 rounded-none font-medium text-[#0A192F]"
          >
            <option value="">All Sources</option>
            <option value="WALK_IN">Walk-In</option>
            <option value="WEBSITE">Website</option>
            <option value="INSTAGRAM">Instagram</option>
            <option value="GOOGLE_ADS">Google Ads</option>
            <option value="REFERRAL">Member Referral</option>
            <option value="CALL">Inbound Call</option>
          </select>
        </div>
      </div>

      {/* Leads Table */}
      <div className="bg-[#FBFBF9] border border-[#E5E7EB]">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#E5E7EB] bg-[#F5F5F0] text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">
                <th className="py-3 px-4">Inquiry Date</th>
                <th className="py-3 px-4">Prospect Name</th>
                <th className="py-3 px-4">Contact</th>
                <th className="py-3 px-4">Source</th>
                <th className="py-3 px-4">Stage</th>
                <th className="py-3 px-4">Fitness Goals</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB] text-xs">
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={7} className="py-4 px-4">
                      <Skeleton className="h-5 w-full" />
                    </td>
                  </tr>
                ))
              ) : leads.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-xs text-[#6B7280]">
                    No leads found matching your criteria. Click &apos;+ Intake New Inquiry&apos; to add one.
                  </td>
                </tr>
              ) : (
                leads.map((lead) => {
                  const isConverted = lead.stage === 'CONVERTED';
                  const isLost = lead.stage === 'LOST';

                  return (
                    <tr key={lead.id} className="hover:bg-[#F5F5F0] transition-colors">
                      <td className="py-3 px-4 font-mono text-[11px] text-[#6B7280]">
                        {new Date(lead.createdAt).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="py-3 px-4 font-bold text-[#0A192F]">
                        {lead.fullName}
                      </td>
                      <td className="py-3 px-4 text-[#0A192F]">
                        <div className="font-mono text-xs">{lead.mobileNumber}</div>
                        {lead.email && <div className="text-[11px] text-[#6B7280]">{lead.email}</div>}
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-block px-1.5 py-0.5 text-[9px] font-bold tracking-wider uppercase border border-[#E5E7EB] bg-white text-[#0A192F]">
                          {lead.source?.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-2 py-0.5 text-[9px] font-bold tracking-wider uppercase border ${
                            isConverted
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : isLost
                              ? 'bg-rose-50 text-[#B91C1C] border-rose-200'
                              : 'bg-amber-50 text-amber-800 border-amber-200'
                          }`}
                        >
                          {lead.stage?.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-[#6B7280] max-w-xs truncate">
                        {lead.fitnessGoal || '-'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => navigate(`/leads/${lead.id}`)}
                          className="text-[11px] h-7 border-[#E5E7EB] rounded-none hover:bg-white"
                        >
                          Manage Lead
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}


