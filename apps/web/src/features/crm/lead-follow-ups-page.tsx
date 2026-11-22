import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../lib/api-client';
import { Button } from '../../components/ui/button';
import { Skeleton } from '../../components/ui/skeleton';

export function LeadFollowUpsPage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [followUps, setFollowUps] = useState<any[]>([]);

  const fetchFollowUps = async () => {
    setIsLoading(true);
    try {
      // Get leads with follow-ups
      const res = await apiClient.get('/leads?limit=100');
      const allLeads = res.data.data.items || [];
      const pending: any[] = [];
      allLeads.forEach((l: any) => {
        (l.followUps || []).forEach((fu: any) => {
          pending.push({
            ...fu,
            lead: l,
          });
        });
      });
      // Sort by scheduledAt
      pending.sort((a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime());
      setFollowUps(pending);
    } catch {
      // Handled gracefully
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFollowUps();
  }, []);

  const handleCompleteFollowUp = async (followUpId: string) => {
    const outcome = prompt('Enter follow-up call result:');
    if (!outcome) return;
    try {
      await apiClient.patch(`/leads/follow-ups/${followUpId}/complete`, {
        outcome,
      });
      fetchFollowUps();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Failed to complete follow-up');
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E5E7EB] pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#0A192F] uppercase">
            Scheduled CRM Follow-Ups
          </h1>
          <p className="text-xs text-[#6B7280] mt-1">
            Daily outbound calling schedule, sales follow-ups, and prospective member engagement.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="text-xs border-[#E5E7EB] rounded-none hover:bg-[#F5F5F0]"
            onClick={() => navigate('/leads')}
          >
            Leads Pipeline
          </Button>
          <Button
            className="bg-[#0A192F] text-[#FBFBF9] hover:bg-[#162E52] text-xs rounded-none px-4"
            onClick={() => navigate('/leads/new')}
          >
            + Intake New Lead
          </Button>
        </div>
      </div>

      {/* Follow-ups Table */}
      <div className="bg-[#FBFBF9] border border-[#E5E7EB]">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#E5E7EB] bg-[#F5F5F0] text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">
                <th className="py-3 px-4">Scheduled For</th>
                <th className="py-3 px-4">Prospect Name</th>
                <th className="py-3 px-4">Phone / Channel</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Notes / Strategy</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB] text-xs">
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={6} className="py-4 px-4">
                      <Skeleton className="h-5 w-full" />
                    </td>
                  </tr>
                ))
              ) : followUps.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-xs text-[#6B7280]">
                    No follow-ups recorded yet. Schedule follow-ups from any lead detail view.
                  </td>
                </tr>
              ) : (
                followUps.map((fu) => {
                  const isPending = fu.status === 'PENDING';
                  const isOverdue = isPending && new Date(fu.scheduledAt).getTime() < Date.now();

                  return (
                    <tr key={fu.id} className="hover:bg-[#F5F5F0] transition-colors">
                      <td className="py-3 px-4 font-mono text-[11px]">
                        <span className={isOverdue ? 'text-[#B91C1C] font-bold' : 'text-[#0A192F]'}>
                          {new Date(fu.scheduledAt).toLocaleString('en-IN', {
                            weekday: 'short',
                            day: '2-digit',
                            month: 'short',
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                        {isOverdue && (
                          <span className="block text-[9px] uppercase font-bold text-[#B91C1C]">
                            OVERDUE
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-bold text-[#0A192F]">
                        {fu.lead?.fullName}
                      </td>
                      <td className="py-3 px-4 text-[#0A192F]">
                        <div className="font-mono text-xs">{fu.lead?.mobileNumber}</div>
                        <div className="text-[10px] text-[#6B7280]">{fu.callType || 'CALL'}</div>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider border ${
                            isPending
                              ? 'bg-amber-50 text-amber-800 border-amber-200'
                              : 'bg-emerald-50 text-emerald-800 border-emerald-200'
                          }`}
                        >
                          {fu.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-[#6B7280] max-w-xs truncate">
                        {fu.notes || fu.outcome || '-'}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {isPending && (
                            <Button
                              size="sm"
                              className="bg-[#0A192F] text-white hover:bg-[#162E52] text-[10px] h-6 px-2.5 rounded-none font-bold"
                              onClick={() => handleCompleteFollowUp(fu.id)}
                            >
                              Log Call
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-[10px] h-6 px-2 border-[#E5E7EB] hover:bg-white rounded-none"
                            onClick={() => navigate(`/leads/${fu.lead?.id}`)}
                          >
                            View Lead
                          </Button>
                        </div>
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


