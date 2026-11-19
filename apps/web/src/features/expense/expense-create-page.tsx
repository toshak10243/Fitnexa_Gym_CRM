import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../lib/api-client';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { ExpensePaymentMethod } from '@fitnexa/shared';

export function ExpenseCreatePage() {
  const navigate = useNavigate();

  const [categories, setCategories] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [branchId, setBranchId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split('T')[0]);
  const [amountRupees, setAmountRupees] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<ExpensePaymentMethod>(ExpensePaymentMethod.CASH);
  const [payeeName, setPayeeName] = useState('');
  const [description, setDescription] = useState('');
  const [notes, setNotes] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [meRes, catRes, branchRes] = await Promise.all([
          apiClient.get('/auth/me'),
          apiClient.get('/expenses/categories'),
          apiClient.get('/tenant/branches'),
        ]);
        const branchList = branchRes.data.data || [];
        setBranches(branchList);
        setCategories(catRes.data.data || []);
        if (catRes.data.data?.length > 0) {
          setCategoryId(catRes.data.data[0].id);
        }
        if (meRes.data.data?.branchId) {
          setBranchId(meRes.data.data.branchId);
        } else if (branchList.length > 0) {
          setBranchId(branchList[0].id);
        }
      } catch {
        // Handled gracefully
      }
    };
    fetchData();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountVal = parseFloat(amountRupees);
    if (!branchId || !categoryId || !payeeName.trim() || !description.trim() || !amountVal || amountVal <= 0) {
      setError('Please fill in all mandatory fields with a valid expense amount.');
      return;
    }

    setError(null);
    setIsSubmitting(true);
    try {
      await apiClient.post('/expenses', {
        branchId,
        categoryId,
        expenseDate,
        amountInPaise: Math.round(amountVal * 100),
        paymentMethod,
        payeeName: payeeName.trim(),
        description: description.trim(),
        notes: notes.trim() || undefined,
      });

      navigate('/expenses');
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to record expense');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-8 max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E5E7EB] pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#0A192F] uppercase">
            Record Operational Expense
          </h1>
          <p className="text-xs text-[#6B7280] mt-1">
            Log facility bills, repairs, equipment upkeep, cleaning supplies, and staff reimbursements.
          </p>
        </div>
        <Button
          variant="outline"
          className="text-xs border-[#E5E7EB] rounded-none hover:bg-[#F5F5F0]"
          onClick={() => navigate('/expenses')}
        >
          ← Cancel
        </Button>
      </div>

      {error && (
        <div className="p-4 border border-red-200 bg-red-50 text-xs text-[#B91C1C] font-bold">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-[#FBFBF9] border border-[#E5E7EB] p-6 space-y-5">
        {/* Branch & Category */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-[11px] font-bold uppercase text-[#0A192F] mb-1">
              Gym Facility Branch *
            </label>
            <select
              required
              value={branchId}
              onChange={(e) => setBranchId(e.target.value)}
              className="w-full text-xs border border-[#E5E7EB] bg-white p-2 rounded-none font-medium text-[#0A192F]"
            >
              <option value="">Select Branch...</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase text-[#0A192F] mb-1">
              Expense Category *
            </label>
            <select
              required
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full text-xs border border-[#E5E7EB] bg-white p-2 rounded-none font-medium text-[#0A192F]"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Date & Amount */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-[11px] font-bold uppercase text-[#0A192F] mb-1">
              Expense Incurred Date *
            </label>
            <Input
              type="date"
              required
              value={expenseDate}
              onChange={(e) => setExpenseDate(e.target.value)}
              className="text-xs border-[#E5E7EB] bg-white rounded-none font-mono"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase text-[#0A192F] mb-1">
              Amount Incurred (₹) *
            </label>
            <Input
              type="number"
              min="0.01"
              step="0.01"
              required
              value={amountRupees}
              onChange={(e) => setAmountRupees(e.target.value)}
              placeholder="e.g. 4500.00"
              className="text-xs border-[#E5E7EB] bg-white rounded-none font-mono"
            />
          </div>
        </div>

        {/* Payment Method & Payee */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-[11px] font-bold uppercase text-[#0A192F] mb-1">
              Payment Outflow Tender *
            </label>
            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value as ExpensePaymentMethod)}
              className="w-full text-xs border border-[#E5E7EB] bg-white p-2 rounded-none font-medium text-[#0A192F]"
            >
              {Object.values(ExpensePaymentMethod).map((m) => (
                <option key={m} value={m}>
                  {m.replace(/_/g, ' ')}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase text-[#0A192F] mb-1">
              Payee / Vendor Name *
            </label>
            <Input
              required
              value={payeeName}
              onChange={(e) => setPayeeName(e.target.value)}
              placeholder="e.g. State Electricity Board / Technogym AMC"
              className="text-xs border-[#E5E7EB] bg-white rounded-none"
            />
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-bold uppercase text-[#0A192F] mb-1">
            Expense Description / Voucher Particulars *
          </label>
          <Input
            required
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="e.g. Cable cross overhaul wire replacement and lubricant service"
            className="text-xs border-[#E5E7EB] bg-white rounded-none"
          />
        </div>

        <div>
          <label className="block text-[11px] font-bold uppercase text-[#0A192F] mb-1">
            Audit Notes / Reference No.
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Invoice # INV-8821; authorized by shift supervisor."
            className="w-full text-xs border border-[#E5E7EB] bg-white p-2 text-[#0A192F] rounded-none focus:outline-hidden"
          />
        </div>

        <div className="pt-4 border-t border-[#E5E7EB] flex items-center justify-end gap-3">
          <Button
            type="button"
            variant="outline"
            className="text-xs border-[#E5E7EB] rounded-none"
            onClick={() => navigate('/expenses')}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="bg-[#0A192F] text-[#FBFBF9] hover:bg-[#162E52] text-xs rounded-none h-10 px-6 font-bold"
          >
            {isSubmitting ? 'Recording...' : 'Submit Expense Voucher'}
          </Button>
        </div>
      </form>
    </div>
  );
}
