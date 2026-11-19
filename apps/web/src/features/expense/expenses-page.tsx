import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../lib/api-client';
import { Button } from '../../components/ui/button';
import { Skeleton } from '../../components/ui/skeleton';
import { formatPaiseToInr } from '../../lib/utils';
import { ExpenseStatus } from '@fitnexa/shared';

export function ExpensesPage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);

  // Filters
  const [selectedCat, setSelectedCat] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('');

  const fetchExpenses = async () => {
    setIsLoading(true);
    try {
      let url = `/expenses?page=${page}&limit=50`;
      if (selectedCat) url += `&categoryId=${selectedCat}`;
      if (selectedStatus) url += `&status=${selectedStatus}`;

      const [expRes, catRes] = await Promise.all([
        apiClient.get(url),
        apiClient.get('/expenses/categories'),
      ]);
      setExpenses(expRes.data.data.items || []);
      setTotal(expRes.data.data.total || 0);
      setCategories(catRes.data.data || []);
    } catch {
      // Handled gracefully
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchExpenses();
  }, [page, selectedCat, selectedStatus]);

  const handleApprove = async (id: string, approved: boolean) => {
    const notes = prompt(`Enter ${approved ? 'approval' : 'rejection'} notes (optional):`);
    try {
      await apiClient.patch(`/expenses/${id}/approve`, {
        approved,
        approvalNotes: notes || undefined,
      });
      fetchExpenses();
    } catch (err: any) {
      alert(err?.response?.data?.message || 'Action failed');
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E5E7EB] pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#0A192F] uppercase">
            Expense & Outflow Management
          </h1>
          <p className="text-xs text-[#6B7280] mt-1">
            Petty cash, rent, equipment maintenance, utilities, and manager approval workflows.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="text-xs border-[#E5E7EB] rounded-none hover:bg-[#F5F5F0]"
            onClick={() => navigate('/expenses/categories')}
          >
            Expense Categories
          </Button>
          <Button
            className="bg-[#0A192F] text-[#FBFBF9] hover:bg-[#162E52] text-xs rounded-none px-4"
            onClick={() => navigate('/expenses/new')}
          >
            + Record Expense
          </Button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-[#FBFBF9] border border-[#E5E7EB] p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={selectedCat}
            onChange={(e) => setSelectedCat(e.target.value)}
            className="text-xs border border-[#E5E7EB] bg-white px-3 h-9 rounded-none font-medium text-[#0A192F]"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>

          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="text-xs border border-[#E5E7EB] bg-white px-3 h-9 rounded-none font-medium text-[#0A192F]"
          >
            <option value="">All Statuses</option>
            {Object.values(ExpenseStatus).map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div className="text-xs text-[#6B7280] font-mono">
          Total Recorded: <span className="font-bold text-[#0A192F]">{total}</span>
        </div>
      </div>

      {/* Expenses Table */}
      <div className="bg-[#FBFBF9] border border-[#E5E7EB]">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#E5E7EB] bg-[#F5F5F0] text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">
                <th className="py-3 px-4">Date</th>
                <th className="py-3 px-4">Expense Title</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Payment Method</th>
                <th className="py-3 px-4 text-right">Amount</th>
                <th className="py-3 px-4">Status</th>
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
              ) : expenses.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-xs text-[#6B7280]">
                    No expense records found. Click &apos;+ Record Expense&apos; to log an expenditure.
                  </td>
                </tr>
              ) : (
                expenses.map((exp) => {
                  const isPending = exp.status === 'PENDING';
                  const isApproved = exp.status === 'APPROVED';
                  const isRejected = exp.status === 'REJECTED';

                  return (
                    <tr key={exp.id} className="hover:bg-[#F5F5F0] transition-colors">
                      <td className="py-3 px-4 font-mono text-[11px] text-[#6B7280]">
                        {new Date(exp.expenseDate).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="py-3 px-4 font-bold text-[#0A192F]">
                        <div>{exp.title}</div>
                        {exp.description && (
                          <div className="text-[10px] font-normal text-[#6B7280] truncate max-w-xs">
                            {exp.description}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-block px-1.5 py-0.5 text-[10px] border border-[#E5E7EB] bg-white font-medium text-[#0A192F]">
                          {exp.category?.name || 'General'}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-mono text-[11px] text-[#0A192F]">
                        {exp.paymentMethod}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-bold text-[#0A192F]">
                        {formatPaiseToInr(exp.amountInPaise)}
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider border ${
                            isApproved
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                              : isRejected
                              ? 'bg-rose-50 text-[#B91C1C] border-rose-200'
                              : 'bg-amber-50 text-amber-800 border-amber-200'
                          }`}
                        >
                          {exp.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        {isPending && (
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              size="sm"
                              className="bg-emerald-700 text-white hover:bg-emerald-800 text-[10px] h-6 px-2 rounded-none font-bold"
                              onClick={() => handleApprove(exp.id, true)}
                            >
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-red-200 text-[#B91C1C] hover:bg-red-50 text-[10px] h-6 px-2 rounded-none"
                              onClick={() => handleApprove(exp.id, false)}
                            >
                              Reject
                            </Button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="p-4 border-t border-[#E5E7EB] flex items-center justify-between text-xs text-[#6B7280]">
          <div>
            Showing <span className="font-bold text-[#0A192F]">{expenses.length}</span> of{' '}
            <span className="font-bold text-[#0A192F]">{total}</span> expenses
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="text-xs border-[#E5E7EB] rounded-none h-8 px-3"
            >
              Previous
            </Button>
            <span className="font-mono font-medium text-[#0A192F]">Page {page}</span>
            <Button
              variant="outline"
              disabled={expenses.length < 50}
              onClick={() => setPage((p) => p + 1)}
              className="text-xs border-[#E5E7EB] rounded-none h-8 px-3"
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
