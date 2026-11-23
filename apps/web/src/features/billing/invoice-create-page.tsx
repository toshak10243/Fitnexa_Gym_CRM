import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../lib/api-client';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { formatPaiseToInr, calculateLineItemFinancials } from '../../lib/utils';

interface FormLineItem {
  description: string;
  quantity: number;
  unitPriceRupees: string;
  discountRupees: string;
  taxRateBps: number;
  itemType: string;
}

export function InvoiceCreatePage() {
  const navigate = useNavigate();

  const [members, setMembers] = useState<any[]>([]);
  const [branches, setBranches] = useState<any[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [selectedMemberId, setSelectedMemberId] = useState('');
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [dueDate, setDueDate] = useState(
    new Date(Date.now() + 15 * 86400000).toISOString().split('T')[0],
  );
  const [isTaxInclusive, setIsTaxInclusive] = useState(false);
  const [notes, setNotes] = useState('');
  const [terms, setTerms] = useState(
    'Fees once paid are non-refundable. Facility access requires compliance with gym rules.',
  );

  const [lineItems, setLineItems] = useState<FormLineItem[]>([
    {
      description: 'Membership Subscription Fee',
      quantity: 1,
      unitPriceRupees: '',
      discountRupees: '0',
      taxRateBps: 1800,
      itemType: 'PLAN',
    },
  ]);

  useEffect(() => {
    apiClient.get('/members?limit=50').then((res) => {
      const list = res.data.data.items || [];
      setMembers(list);
      if (list.length > 0) setSelectedMemberId(list[0].id);
    });

    apiClient.get('/tenant/branches').then((res) => {
      const list = res.data.data || [];
      setBranches(list);
      if (list.length > 0) setSelectedBranchId(list[0].id);
    });
  }, []);

  const handleAddLineItem = () => {
    setLineItems([
      ...lineItems,
      {
        description: '',
        quantity: 1,
        unitPriceRupees: '',
        discountRupees: '0',
        taxRateBps: 1800,
        itemType: 'SERVICE',
      },
    ]);
  };

  const handleRemoveLineItem = (index: number) => {
    if (lineItems.length <= 1) return;
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: keyof FormLineItem, value: any) => {
    const updated = [...lineItems];
    updated[index] = { ...updated[index], [field]: value };
    setLineItems(updated);
  };

  // Real-time financial calculations
  let subtotalInPaise = 0;
  let taxAmountInPaise = 0;
  let grandTotalInPaise = 0;

  lineItems.forEach((item) => {
    const unitPricePaise = Math.round(parseFloat(item.unitPriceRupees || '0') * 100);
    const discountPaise = Math.round(parseFloat(item.discountRupees || '0') * 100);
    const calc = calculateLineItemFinancials(
      unitPricePaise,
      item.quantity || 1,
      discountPaise,
      item.taxRateBps,
      isTaxInclusive,
    );
    subtotalInPaise += calc.taxableAmountInPaise;
    taxAmountInPaise += calc.taxAmountInPaise;
    grandTotalInPaise += calc.totalAmountInPaise;
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMemberId || !selectedBranchId) {
      alert('Member and Branch are mandatory.');
      return;
    }

    if (grandTotalInPaise <= 0) {
      alert('Invoice grand total must be greater than zero.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        memberId: selectedMemberId,
        branchId: selectedBranchId,
        invoiceDate,
        dueDate,
        isTaxInclusive,
        notes: notes.trim() || undefined,
        termsAndConditions: terms.trim() || undefined,
        lineItems: lineItems.map((item) => ({
          description: item.description.trim() || 'Service Fee',
          quantity: item.quantity || 1,
          unitPriceInPaise: Math.round(parseFloat(item.unitPriceRupees || '0') * 100),
          discountInPaise: Math.round(parseFloat(item.discountRupees || '0') * 100),
          taxRateBps: item.taxRateBps,
          itemType: item.itemType,
        })),
      };

      const res = await apiClient.post('/billing/invoices', payload, { timeout: 60000 });
      const delivery = res.data.data.emailDelivery;
      if (!delivery?.success || delivery?.mode !== 'smtp') alert('Invoice saved. Email was not delivered; use Email Invoice PDF on the invoice page to retry.');
      navigate(`/billing/invoices/${res.data.data.id}`);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to issue invoice';
      alert(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-5">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[#0A192F]">
            Issue New Tax Invoice
          </h1>
          <p className="text-sm text-[#6B7280] mt-1">
            Manual invoice creation for membership plans, personal training packages, and fitness services.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/billing/invoices')}
          className="rounded-none text-xs border-[#E5E7EB]"
        >
          Cancel
        </Button>
      </div>

      <form onSubmit={handleSubmit} className="bg-[#FBFBF9] border border-[#E5E7EB] p-6 space-y-6">
        {/* Recipient & Branch Selection */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold mb-1 text-[#111827]">
              Bill To Member *
            </label>
            <select
              value={selectedMemberId}
              onChange={(e) => setSelectedMemberId(e.target.value)}
              required
              className="w-full text-xs h-9 border border-[#E5E7EB] bg-[#FBFBF9] px-2 rounded-none"
            >
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.fullName} ({m.memberCode} - {m.phone})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1 text-[#111827]">
              Facility Branch *
            </label>
            <select
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
              required
              className="w-full text-xs h-9 border border-[#E5E7EB] bg-[#FBFBF9] px-2 rounded-none"
            >
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1 text-[#111827]">
              Invoice Date *
            </label>
            <Input
              type="date"
              value={invoiceDate}
              onChange={(e) => setInvoiceDate(e.target.value)}
              required
              className="rounded-none text-xs h-9"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold mb-1 text-[#111827]">
              Payment Due Date *
            </label>
            <Input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              required
              className="rounded-none text-xs h-9"
            />
          </div>
        </div>

        {/* Line Items Section */}
        <div className="space-y-3">
          <div className="flex items-center justify-between pb-1">
            <h2 className="text-xs font-bold uppercase tracking-wider text-[#0A192F]">
              Itemized Charges & Tax
            </h2>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleAddLineItem}
              className="rounded-none text-[11px] h-7 border-[#E5E7EB]"
            >
              + Add Item
            </Button>
          </div>

          <div className="space-y-3">
            {lineItems.map((item, idx) => (
              <div
                key={idx}
                className="grid grid-cols-12 gap-2 p-3 bg-[#F5F5F0] border border-[#E5E7EB] items-end text-xs"
              >
                <div className="col-span-12 md:col-span-4">
                  <label className="block font-semibold mb-1 text-[11px]">Description *</label>
                  <Input
                    value={item.description}
                    onChange={(e) => handleItemChange(idx, 'description', e.target.value)}
                    placeholder="e.g. 3-Month Fitness Plan"
                    required
                    className="rounded-none text-xs h-8 bg-[#FBFBF9]"
                  />
                </div>

                <div className="col-span-3 md:col-span-1">
                  <label className="block font-semibold mb-1 text-[11px]">Qty</label>
                  <Input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) =>
                      handleItemChange(idx, 'quantity', parseInt(e.target.value, 10) || 1)
                    }
                    className="rounded-none text-xs h-8 bg-[#FBFBF9]"
                  />
                </div>

                <div className="col-span-5 md:col-span-2">
                  <label className="block font-semibold mb-1 text-[11px]">Rate (₹) *</label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={item.unitPriceRupees}
                    onChange={(e) => handleItemChange(idx, 'unitPriceRupees', e.target.value)}
                    required
                    className="rounded-none text-xs h-8 bg-[#FBFBF9]"
                  />
                </div>

                <div className="col-span-4 md:col-span-2">
                  <label className="block font-semibold mb-1 text-[11px]">Discount (₹)</label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={item.discountRupees}
                    onChange={(e) => handleItemChange(idx, 'discountRupees', e.target.value)}
                    className="rounded-none text-xs h-8 bg-[#FBFBF9]"
                  />
                </div>

                <div className="col-span-8 md:col-span-2">
                  <label className="block font-semibold mb-1 text-[11px]">GST Rate</label>
                  <select
                    value={item.taxRateBps}
                    onChange={(e) =>
                      handleItemChange(idx, 'taxRateBps', parseInt(e.target.value, 10))
                    }
                    className="w-full h-8 border border-[#E5E7EB] bg-[#FBFBF9] px-2 rounded-none"
                  >
                    <option value={0}>0% GST</option>
                    <option value={500}>5% GST</option>
                    <option value={1200}>12% GST</option>
                    <option value={1800}>18% GST</option>
                  </select>
                </div>

                <div className="col-span-4 md:col-span-1 text-right">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={lineItems.length <= 1}
                    onClick={() => handleRemoveLineItem(idx)}
                    className="rounded-none h-8 text-[11px] border-red-300 text-red-700 hover:bg-red-50"
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isTaxInclusive}
                onChange={(e) => setIsTaxInclusive(e.target.checked)}
                className="h-4 w-4 rounded-none border-[#E5E7EB]"
              />
              <span className="text-xs font-semibold text-[#111827]">
                Prices entered above already include GST (Tax-Inclusive Pricing)
              </span>
            </label>
          </div>
        </div>

        {/* Financial Summary & Grand Total */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-[#E5E7EB]">
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold mb-1 text-[#111827]">
                Invoice Notes
              </label>
              <Input
                placeholder="Optional billing remarks for member..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="rounded-none text-xs h-9"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold mb-1 text-[#111827]">
                Terms & Conditions
              </label>
              <textarea
                rows={2}
                value={terms}
                onChange={(e) => setTerms(e.target.value)}
                className="w-full text-xs border border-[#E5E7EB] bg-[#FBFBF9] p-2 rounded-none"
              />
            </div>
          </div>

          <div className="bg-[#F5F5F0] border border-[#E5E7EB] p-4 space-y-2 text-xs">
            <div className="flex justify-between text-[#4B5563]">
              <span>Taxable Subtotal:</span>
              <span className="font-mono">{formatPaiseToInr(subtotalInPaise)}</span>
            </div>
            <div className="flex justify-between text-[#4B5563]">
              <span>Applicable GST:</span>
              <span className="font-mono">{formatPaiseToInr(taxAmountInPaise)}</span>
            </div>
            <div className="flex justify-between text-base font-bold text-[#0A192F] pt-2 border-t border-[#E5E7EB]">
              <span>Invoice Grand Total:</span>
              <span className="font-mono">{formatPaiseToInr(grandTotalInPaise)}</span>
            </div>
          </div>
        </div>

        {/* Submit Bar */}
        <div className="flex justify-end gap-2 pt-4 border-t border-[#E5E7EB]">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/billing/invoices')}
            className="rounded-none text-xs"
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="bg-[#0A192F] hover:bg-[#0F223D] text-[#FBFBF9] rounded-none text-xs h-9 px-6 font-semibold tracking-wider"
          >
            {isSubmitting ? 'Issuing Invoice...' : 'Issue & Post Invoice'}
          </Button>
        </div>
      </form>
    </div>
  );
}


