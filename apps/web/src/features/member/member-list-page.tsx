import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../lib/api-client';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Skeleton } from '../../components/ui/skeleton';
import { MemberStatus, UserRole } from '@fitnexa/shared';
import { useAuth } from '../../context/auth-context';

interface MemberItem {
  id: string;
  memberCode: string;
  fullName: string;
  phone: string;
  email: string | null;
  status: MemberStatus;
  joiningDate: string;
  branch: {
    id: string;
    name: string;
  };
  assignedTrainer?: {
    id: string;
    fullName: string;
  } | null;
  memberships?: Array<{
    id: string;
    status: string;
    endDate: string;
    plan: {
      name: string;
    };
  }>;
}

export function MemberListPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const [members, setMembers] = useState<MemberItem[]>([]);
  const [branches, setBranches] = useState<Array<{ id: string; name: string }>>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');
  const [selectedBranch, setSelectedBranch] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [totalPages, setTotalPages] = useState<number>(1);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [isExporting, setIsExporting] = useState<boolean>(false);

  // Fetch branches for filter
  useEffect(() => {
    apiClient
      .get('/tenant/branches')
      .then((res) => setBranches(res.data.data || []))
      .catch(() => {});
  }, []);

  // Fetch paginated members
  const fetchMembers = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', page.toString());
      params.set('limit', '15');
      if (search.trim()) params.set('search', search.trim());
      if (selectedStatus) params.set('status', selectedStatus);
      if (selectedBranch) params.set('branchId', selectedBranch);

      const res = await apiClient.get(`/members?${params.toString()}`);
      setMembers(res.data.data.items || []);
      setTotalPages(res.data.data.meta.totalPages || 1);
      setTotalCount(res.data.data.meta.total || 0);
    } catch {
      setMembers([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, [page, selectedStatus, selectedBranch]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    fetchMembers();
  };

  const handleExportCsv = async () => {
    setIsExporting(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set('search', search.trim());
      if (selectedStatus) params.set('status', selectedStatus);
      if (selectedBranch) params.set('branchId', selectedBranch);

      const response = await apiClient.get(`/members/export?${params.toString()}`, {
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `fitnexa-members-${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Export failed';
      alert(`Export failed: ${msg}`);
    } finally {
      setIsExporting(false);
    }
  };

  const getStatusBadge = (status: MemberStatus) => {
    switch (status) {
      case MemberStatus.ACTIVE:
        return (
          <span className="inline-flex items-center px-2 py-0.5 text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-none">
            ACTIVE
          </span>
        );
      case MemberStatus.INACTIVE:
        return (
          <span className="inline-flex items-center px-2 py-0.5 text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300 rounded-none">
            INACTIVE
          </span>
        );
      case MemberStatus.SUSPENDED:
        return (
          <span className="inline-flex items-center px-2 py-0.5 text-xs font-semibold bg-red-100 text-red-800 border border-red-300 rounded-none">
            SUSPENDED
          </span>
        );
      case MemberStatus.ARCHIVED:
        return (
          <span className="inline-flex items-center px-2 py-0.5 text-xs font-semibold bg-gray-100 text-gray-800 border border-gray-300 rounded-none">
            ARCHIVED
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-0.5 text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-300 rounded-none">
            {status}
          </span>
        );
    }
  };

  const isManagement =
    user?.role === UserRole.GYM_OWNER ||
    user?.role === UserRole.BRANCH_MANAGER ||
    user?.role === UserRole.SUPER_ADMIN ||
    user?.role === UserRole.FRONT_DESK;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E5E7EB] pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0A192F]">Member Directory</h1>
          <p className="text-sm text-[#6B7280] mt-1">
            Enterprise database of active subscribers, registrations, and membership lifecycles.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isManagement && (
            <>
              <Button
                variant="outline"
                onClick={handleExportCsv}
                disabled={isExporting}
                className="rounded-none border-[#E5E7EB] text-xs h-9"
              >
                {isExporting ? 'Exporting...' : 'Export CSV'}
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate('/imports')}
                className="rounded-none border-[#E5E7EB] text-xs h-9"
              >
                Excel Migration
              </Button>
              <Button
                onClick={() => navigate('/members/new')}
                className="bg-[#0A192F] hover:bg-[#0F223D] text-[#FBFBF9] rounded-none text-xs h-9 px-4"
              >
                Register Member
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-[#FBFBF9] border border-[#E5E7EB] p-4 flex flex-col md:flex-row gap-3 items-center justify-between">
        <form onSubmit={handleSearchSubmit} className="flex-1 flex gap-2 w-full md:w-auto">
          <Input
            placeholder="Search by name, phone, or member code (e.g. FX-2026-0001)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full text-xs h-9 rounded-none border-[#E5E7EB] bg-[#FBFBF9]"
          />
          <Button type="submit" variant="outline" className="rounded-none text-xs h-9 px-4">
            Search
          </Button>
        </form>

        <div className="flex items-center gap-3 w-full md:w-auto">
          {/* Branch Filter */}
          <select
            value={selectedBranch}
            onChange={(e) => {
              setSelectedBranch(e.target.value);
              setPage(1);
            }}
            className="h-9 text-xs border border-[#E5E7EB] bg-[#FBFBF9] px-2 text-[#111827] focus:outline-none focus:ring-1 focus:ring-[#0A192F] rounded-none"
          >
            <option value="">All Branches</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => {
              setSelectedStatus(e.target.value);
              setPage(1);
            }}
            className="h-9 text-xs border border-[#E5E7EB] bg-[#FBFBF9] px-2 text-[#111827] focus:outline-none focus:ring-1 focus:ring-[#0A192F] rounded-none"
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="INACTIVE">Inactive</option>
            <option value="SUSPENDED">Suspended</option>
            <option value="ARCHIVED">Archived</option>
          </select>
        </div>
      </div>

      {/* Member Directory Table */}
      <div className="border border-[#E5E7EB] bg-[#FBFBF9]">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-[#111827]">
            <thead className="bg-[#0A192F] text-[#FBFBF9] uppercase tracking-wider text-[11px] font-semibold">
              <tr>
                <th className="py-3 px-4">Member Code</th>
                <th className="py-3 px-4">Member Name</th>
                <th className="py-3 px-4">Contact</th>
                <th className="py-3 px-4">Branch</th>
                <th className="py-3 px-4">Current Plan</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Joining Date</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB]">
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="py-3 px-4">
                      <Skeleton className="h-4 w-20" />
                    </td>
                    <td className="py-3 px-4">
                      <Skeleton className="h-4 w-32" />
                    </td>
                    <td className="py-3 px-4">
                      <Skeleton className="h-4 w-24" />
                    </td>
                    <td className="py-3 px-4">
                      <Skeleton className="h-4 w-20" />
                    </td>
                    <td className="py-3 px-4">
                      <Skeleton className="h-4 w-28" />
                    </td>
                    <td className="py-3 px-4">
                      <Skeleton className="h-4 w-16" />
                    </td>
                    <td className="py-3 px-4">
                      <Skeleton className="h-4 w-20" />
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Skeleton className="h-4 w-12 ml-auto" />
                    </td>
                  </tr>
                ))
              ) : members.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-[#6B7280]">
                    No member records found matching query criteria.
                  </td>
                </tr>
              ) : (
                members.map((member) => {
                  const latestMembership = member.memberships?.[0];
                  return (
                    <tr
                      key={member.id}
                      className="hover:bg-[#F5F5F0] transition-colors cursor-pointer"
                      onClick={() => navigate(`/members/${member.id}`)}
                    >
                      <td className="py-3 px-4 font-mono font-semibold text-[#0A192F]">
                        {member.memberCode}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-[#111827]">{member.fullName}</div>
                      </td>
                      <td className="py-3 px-4 text-[#4B5563]">
                        <div>{member.phone}</div>
                        {member.email && (
                          <div className="text-[11px] text-[#6B7280]">{member.email}</div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-[#4B5563]">{member.branch?.name || '-'}</td>
                      <td className="py-3 px-4">
                        {latestMembership ? (
                          <div>
                            <span className="font-medium text-[#111827]">
                              {latestMembership.plan.name}
                            </span>
                            <div className="text-[10px] text-[#6B7280]">
                              Expires {latestMembership.endDate.split('T')[0]}
                            </div>
                          </div>
                        ) : (
                          <span className="text-[#9CA3AF] italic">No active plan</span>
                        )}
                      </td>
                      <td className="py-3 px-4">{getStatusBadge(member.status)}</td>
                      <td className="py-3 px-4 text-[#6B7280]">
                        {member.joiningDate.split('T')[0]}
                      </td>
                      <td className="py-3 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate(`/members/${member.id}`)}
                          className="rounded-none text-xs h-7 border-[#E5E7EB]"
                        >
                          View 360
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        <div className="p-4 border-t border-[#E5E7EB] flex items-center justify-between text-xs text-[#6B7280]">
          <div>
            Showing <span className="font-semibold text-[#111827]">{members.length}</span> of{' '}
            <span className="font-semibold text-[#111827]">{totalCount}</span> registered members
          </div>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="rounded-none h-7 px-3 text-xs"
            >
              Previous
            </Button>
            <span className="px-3 py-1 font-mono text-xs">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="rounded-none h-7 px-3 text-xs"
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
