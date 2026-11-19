import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiClient } from '../../lib/api-client';
import { Button } from '../../components/ui/button';
import { Skeleton } from '../../components/ui/skeleton';
import { formatPaiseToInr } from '../../lib/utils';
import { useAuth } from '../../context/auth-context';

export function ReceiptPrintPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { tenant } = useAuth();

  const [receipt, setReceipt] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [printMode, setPrintMode] = useState<'A4' | 'THERMAL'>('A4');

  useEffect(() => {
    const fetchReceipt = async () => {
      setIsLoading(true);
      try {
        const res = await apiClient.get(`/billing/receipts/${id}`);
        if (res.data.success) {
          setReceipt(res.data.data);
        }
      } catch {
        // Handled gracefully
      } finally {
        setIsLoading(false);
      }
    };

    if (id) fetchReceipt();
  }, [id]);

  const handlePrint = () => {
    window.print();
  };

  if (isLoading) {
    return (
      <div className="p-8 max-w-4xl mx-auto space-y-4">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-[500px] w-full" />
      </div>
    );
  }

  if (!receipt) {
    return (
      <div className="p-12 text-center space-y-3">
        <p className="text-sm font-semibold text-[#0A192F]">Receipt Not Found</p>
        <Button
          variant="outline"
          onClick={() => navigate('/billing/payments')}
          className="rounded-none border-[#0A192F]"
        >
          Back to Payments
        </Button>
      </div>
    );
  }

  const payment = receipt.payment || {};
  const member = payment.member || {};
  const allocations = payment.allocations || [];

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6">
      {/* Top Action Bar (hidden in print) */}
      <div className="print:hidden flex flex-col sm:flex-row items-center justify-between gap-4 bg-[#FBFBF9] border border-[#E5E7EB] p-4">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => navigate(-1)}
            className="rounded-none border-[#E5E7EB] text-xs"
          >
            ← Back
          </Button>
          <span className="text-xs font-semibold text-[#0A192F]">Print Format:</span>
          <div className="inline-flex border border-[#E5E7EB]">
            <button
              onClick={() => setPrintMode('A4')}
              className={`px-3 py-1 text-xs font-semibold uppercase tracking-wider ${
                printMode === 'A4'
                  ? 'bg-[#0A192F] text-[#FBFBF9]'
                  : 'bg-[#FBFBF9] text-[#4B5563] hover:bg-[#F5F5F0]'
              }`}
            >
              Standard A4
            </button>
            <button
              onClick={() => setPrintMode('THERMAL')}
              className={`px-3 py-1 text-xs font-semibold uppercase tracking-wider ${
                printMode === 'THERMAL'
                  ? 'bg-[#0A192F] text-[#FBFBF9]'
                  : 'bg-[#FBFBF9] text-[#4B5563] hover:bg-[#F5F5F0]'
              }`}
            >
              80mm Thermal Slip
            </button>
          </div>
        </div>

        <Button
          onClick={handlePrint}
          className="bg-[#0A192F] hover:bg-[#0F223D] text-[#FBFBF9] rounded-none text-xs flex items-center gap-2"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <polyline points="6 9 6 2 18 2 18 9" />
            <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
            <rect x="6" y="14" width="12" height="8" />
          </svg>
          Print Receipt
        </Button>
      </div>

      {/* A4 Format */}
      {printMode === 'A4' && (
        <div className="bg-[#FBFBF9] border border-[#E5E7EB] p-8 md:p-12 text-[#111827] print:border-none print:p-0">
          {/* Header */}
          <div className="flex justify-between items-start border-b-2 border-[#0A192F] pb-6">
            <div>
              <div className="text-2xl font-bold tracking-tight text-[#0A192F]">
                {tenant?.name || 'FITNEXA FITNESS CLUB'}
              </div>
              <div className="text-xs text-[#4B5563] mt-1 space-y-0.5">
                <p>Commercial Fitness Center & Health Club</p>
                <p>GSTIN: <span className="font-mono font-medium">07AAACF1234F1Z5</span></p>
                <p>Email: billing@fitnexa.in • Phone: +91 98765 43210</p>
              </div>
            </div>

            <div className="text-right">
              <div className="inline-block px-3 py-1 bg-[#0A192F] text-[#FBFBF9] text-xs font-bold uppercase tracking-wider">
                Official Payment Receipt
              </div>
              <div className="text-sm font-mono font-bold text-[#0A192F] mt-2">
                {receipt.receiptNumber}
              </div>
              <div className="text-xs text-[#6B7280] mt-0.5">
                Date:{' '}
                {new Date(receipt.issuedAt).toLocaleDateString('en-IN', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                })}
              </div>
            </div>
          </div>

          {/* Details Row */}
          <div className="grid grid-cols-2 gap-8 my-6 text-xs">
            <div className="bg-[#F5F5F0] border border-[#E5E7EB] p-4">
              <div className="font-semibold text-[#0A192F] uppercase tracking-wider mb-2">
                Received From (Member):
              </div>
              <div className="font-bold text-sm text-[#111827]">
                {member.firstName} {member.lastName}
              </div>
              <div className="font-mono text-[#4B5563] mt-1">
                Member Code: {member.memberCode}
              </div>
              <div className="text-[#4B5563] mt-0.5">Mobile: {member.mobile}</div>
              {member.email && <div className="text-[#4B5563]">Email: {member.email}</div>}
            </div>

            <div className="bg-[#F5F5F0] border border-[#E5E7EB] p-4">
              <div className="font-semibold text-[#0A192F] uppercase tracking-wider mb-2">
                Payment Particulars:
              </div>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-[#6B7280]">Payment Ref #:</span>
                  <span className="font-mono font-bold text-[#0A192F]">{payment.paymentNumber}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#6B7280]">Payment Method:</span>
                  <span className="font-bold uppercase tracking-wider">{payment.method}</span>
                </div>
                {payment.referenceNumber && (
                  <div className="flex justify-between">
                    <span className="text-[#6B7280]">UTR / Auth Code:</span>
                    <span className="font-mono">{payment.referenceNumber}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-[#6B7280]">Collected By:</span>
                  <span>{payment.receivedBy?.fullName || 'Front Desk'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Allocations Table */}
          <div className="border border-[#E5E7EB] mb-6 overflow-hidden">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#F5F5F0] border-b border-[#E5E7EB] text-[#6B7280] uppercase tracking-wider font-semibold">
                  <th className="py-2.5 px-4">Invoice #</th>
                  <th className="py-2.5 px-4">Invoice Date</th>
                  <th className="py-2.5 px-4 text-right">Invoice Amount</th>
                  <th className="py-2.5 px-4 text-right">Remaining Due</th>
                  <th className="py-2.5 px-4 text-right font-bold text-[#0A192F]">Amount Paid Now</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {allocations.map((a: any) => (
                  <tr key={a.id}>
                    <td className="py-2.5 px-4 font-mono font-semibold text-[#0A192F]">
                      {a.invoice?.invoiceNumber}
                    </td>
                    <td className="py-2.5 px-4 text-[#4B5563]">
                      {a.invoice?.invoiceDate
                        ? new Date(a.invoice.invoiceDate).toLocaleDateString('en-IN')
                        : '-'}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono text-[#4B5563]">
                      {formatPaiseToInr(a.invoice?.totalAmountInPaise || 0)}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono text-[#B91C1C]">
                      {formatPaiseToInr(a.invoice?.balanceDueInPaise || 0)}
                    </td>
                    <td className="py-2.5 px-4 text-right font-mono font-bold text-[#0A192F]">
                      {formatPaiseToInr(a.amountInPaise)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Total & Acknowledgement */}
          <div className="flex justify-between items-start bg-[#F5F5F0] border border-[#E5E7EB] p-4 text-xs">
            <div>
              <div className="font-semibold text-[#0A192F] uppercase tracking-wider">
                Notes & Terms:
              </div>
              <p className="text-[#6B7280] mt-1 max-w-sm">
                Fees once paid are non-transferable and subject to gym club terms & membership agreement.
              </p>
            </div>

            <div className="text-right">
              <div className="text-xs text-[#6B7280] uppercase tracking-wider font-semibold">
                Total Amount Received
              </div>
              <div className="text-2xl font-mono font-bold text-[#0A192F] mt-1">
                {formatPaiseToInr(receipt.amountInPaise)}
              </div>
              <div className="text-[10px] text-[#047857] font-semibold mt-0.5">
                PAYMENT CONFIRMED
              </div>
            </div>
          </div>

          {/* Footer Signature */}
          <div className="mt-12 pt-8 border-t border-[#E5E7EB] flex justify-between items-end text-xs text-[#6B7280]">
            <div>
              <p className="font-mono text-[10px]">
                Electronic System Generated Document • Fitnexa ERP
              </p>
              <p className="text-[10px]">Verify at: app.fitnexa.in/billing/verify</p>
            </div>

            <div className="text-right border-t border-[#4B5563] pt-1 px-8">
              <p className="font-semibold text-[#0A192F]">Authorized Signatory</p>
              <p className="text-[10px]">{tenant?.name || 'Fitnexa Fitness Club'}</p>
            </div>
          </div>
        </div>
      )}

      {/* 80mm Thermal Slip Printer Format */}
      {printMode === 'THERMAL' && (
        <div className="mx-auto w-[320px] bg-[#FBFBF9] border border-[#E5E7EB] p-4 text-[#111827] font-mono text-xs print:border-none print:w-full print:p-0">
          <div className="text-center border-b border-dashed border-[#111827] pb-3 mb-3">
            <div className="font-bold text-sm uppercase">{tenant?.name || 'FITNEXA GYM'}</div>
            <div className="text-[10px] text-[#4B5563]">GSTIN: 07AAACF1234F1Z5</div>
            <div className="text-[10px] text-[#4B5563]">Ph: +91 98765 43210</div>
            <div className="font-bold mt-2 text-xs">*** RECEIPT ***</div>
          </div>

          <div className="text-[11px] space-y-1 mb-3">
            <div className="flex justify-between">
              <span>Receipt #:</span>
              <span className="font-bold">{receipt.receiptNumber}</span>
            </div>
            <div className="flex justify-between">
              <span>Date:</span>
              <span>
                {new Date(receipt.issuedAt).toLocaleDateString('en-IN')}{' '}
                {new Date(receipt.issuedAt).toLocaleTimeString('en-IN', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Member:</span>
              <span className="font-bold truncate max-w-[150px]">
                {member.firstName} {member.lastName}
              </span>
            </div>
            <div className="flex justify-between">
              <span>Code:</span>
              <span>{member.memberCode}</span>
            </div>
            <div className="flex justify-between">
              <span>Method:</span>
              <span className="font-bold">{payment.method}</span>
            </div>
            {payment.referenceNumber && (
              <div className="flex justify-between">
                <span>Ref:</span>
                <span className="truncate max-w-[150px]">{payment.referenceNumber}</span>
              </div>
            )}
          </div>

          <div className="border-t border-b border-dashed border-[#111827] py-2 mb-3">
            <div className="flex justify-between text-[10px] font-bold uppercase mb-1">
              <span>Item / Inv</span>
              <span>Amount</span>
            </div>
            {allocations.map((a: any) => (
              <div key={a.id} className="flex justify-between text-[11px]">
                <span className="truncate max-w-[180px]">{a.invoice?.invoiceNumber}</span>
                <span className="font-bold">{formatPaiseToInr(a.amountInPaise)}</span>
              </div>
            ))}
          </div>

          <div className="text-right space-y-1 mb-4">
            <div className="text-xs font-bold flex justify-between">
              <span>TOTAL RECEIVED:</span>
              <span>{formatPaiseToInr(receipt.amountInPaise)}</span>
            </div>
          </div>

          <div className="text-center text-[10px] border-t border-dashed border-[#111827] pt-3 text-[#4B5563]">
            <p>Thank you for choosing Fitnexa!</p>
            <p>Keep this receipt for records.</p>
          </div>
        </div>
      )}
    </div>
  );
}
