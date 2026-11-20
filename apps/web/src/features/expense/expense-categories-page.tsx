import { createPortal } from 'react-dom';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../lib/api-client';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Skeleton } from '../../components/ui/skeleton';

export function ExpenseCategoriesPage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [categories, setCategories] = useState<any[]>([]);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  const fetchCategories = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.get('/expenses/categories');
      setCategories(res.data.data || []);
    } catch {
      // Handled gracefully
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !code.trim()) {
      setModalError('Category name and code are required.');
      return;
    }
    setModalError(null);
    setIsSubmitting(true);
    try {
      await apiClient.post('/expenses/categories', {
        name: name.trim(),
        code: code.trim().toUpperCase(),
        description: description.trim() || undefined,
      });
      setIsModalOpen(false);
      setName('');
      setCode('');
      setDescription('');
      fetchCategories();
    } catch (err: any) {
      setModalError(err?.response?.data?.message || 'Failed to create category');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E5E7EB] pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#0A192F] uppercase">
            Expense Account Head Categories
          </h1>
          <p className="text-xs text-[#6B7280] mt-1">
            General ledger classification for gym operating expenditures, utility allocations, and tax reporting.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="text-xs border-[#E5E7EB] rounded-none hover:bg-[#F5F5F0]"
            onClick={() => navigate('/expenses')}
          >
            ← Expense Ledger
          </Button>
          <Button
            className="bg-[#0A192F] text-[#FBFBF9] hover:bg-[#162E52] text-xs rounded-none px-4"
            onClick={() => setIsModalOpen(true)}
          >
            + Create Category
          </Button>
        </div>
      </div>

      {/* Categories Grid */}
      <div className="bg-[#FBFBF9] border border-[#E5E7EB]">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#E5E7EB] bg-[#F5F5F0] text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">
                <th className="py-3 px-4">Code</th>
                <th className="py-3 px-4">Category Name</th>
                <th className="py-3 px-4">Description</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB] text-xs">
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={3} className="py-4 px-4">
                      <Skeleton className="h-5 w-full" />
                    </td>
                  </tr>
                ))
              ) : categories.length === 0 ? (
                <tr>
                  <td colSpan={3} className="py-12 text-center text-xs text-[#6B7280]">
                    No expense categories configured. Click &apos;+ Create Category&apos; to add one.
                  </td>
                </tr>
              ) : (
                categories.map((c) => (
                  <tr key={c.id} className="hover:bg-white transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-[#0A192F]">
                      <span className="bg-white border border-[#E5E7EB] px-2 py-0.5">
                        {c.code}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-bold text-[#0A192F]">
                      {c.name}
                    </td>
                    <td className="py-3 px-4 text-[#6B7280]">
                      {c.description || '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && createPortal(
        <div className="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center p-4">
          <div className="bg-[#FBFBF9] border border-[#E5E7EB] w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between pb-2">
              <h2 className="text-sm font-bold uppercase tracking-tight text-[#0A192F]">
                Create Expense Category
              </h2>
              <button
                type="button"
                className="text-[#6B7280] hover:text-[#0A192F] text-sm font-mono"
                onClick={() => setIsModalOpen(false)}
              >
                ✕
              </button>
            </div>

            {modalError && (
              <div className="p-3 border border-red-200 bg-red-50 text-xs text-[#B91C1C]">
                {modalError}
              </div>
            )}

            <form onSubmit={handleCreateCategory} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold uppercase text-[#0A192F] mb-1">
                  Category Name *
                </label>
                <Input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Equipment Maintenance & Repairs"
                  className="text-xs border-[#E5E7EB] bg-white rounded-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-[#0A192F] mb-1">
                  Ledger Code (uppercase alphanumeric) *
                </label>
                <Input
                  required
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="e.g. MAINT_REPAIR"
                  className="text-xs border-[#E5E7EB] bg-white rounded-none font-mono uppercase"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-[#0A192F] mb-1">
                  Description
                </label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  placeholder="Expenses related to treadmill servicing, cable repairs, and bench upholstery."
                  className="w-full text-xs border border-[#E5E7EB] bg-white p-2 text-[#0A192F] rounded-none focus:outline-hidden"
                />
              </div>

              <div className="pt-3 border-t border-[#E5E7EB] flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsModalOpen(false)}
                  className="text-xs border-[#E5E7EB] rounded-none h-8 px-4"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-[#0A192F] text-[#FBFBF9] hover:bg-[#162E52] text-xs rounded-none h-8 px-5 font-bold"
                >
                  {isSubmitting ? 'Creating...' : 'Save Category'}
                </Button>
              </div>
            </form>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
