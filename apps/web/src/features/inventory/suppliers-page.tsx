import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiClient } from '../../lib/api-client';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Skeleton } from '../../components/ui/skeleton';

export function SuppliersPage() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [gstin, setGstin] = useState('');
  const [address, setAddress] = useState('');

  const fetchSuppliers = async () => {
    setIsLoading(true);
    try {
      const res = await apiClient.get('/inventory/suppliers');
      setSuppliers(res.data.data || []);
    } catch {
      // Handled gracefully
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  const handleCreateSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Supplier name is required');
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      await apiClient.post('/inventory/suppliers', {
        name: name.trim(),
        contactPerson: contactPerson.trim() || undefined,
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        gstin: gstin.trim().toUpperCase() || undefined,
        address: address.trim() || undefined,
        isGstRegistered: !!gstin.trim(),
      });
      setIsModalOpen(false);
      setName('');
      setContactPerson('');
      setEmail('');
      setPhone('');
      setGstin('');
      setAddress('');
      fetchSuppliers();
    } catch (err: any) {
      setError(err?.response?.data?.message || 'Failed to create supplier');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E5E7EB] pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#0A192F] uppercase">
            Supplier & Vendor Directory
          </h1>
          <p className="text-xs text-[#6B7280] mt-1">
            Registered distributors, manufacturers, and trade accounts with GSTIN verification.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="text-xs border-[#E5E7EB] rounded-none hover:bg-[#F5F5F0]"
            onClick={() => navigate('/inventory')}
          >
            ← Inventory
          </Button>
          <Button
            className="bg-[#0A192F] text-[#FBFBF9] hover:bg-[#162E52] text-xs rounded-none px-4"
            onClick={() => setIsModalOpen(true)}
          >
            + Register Supplier
          </Button>
        </div>
      </div>

      {/* Suppliers Table */}
      <div className="bg-[#FBFBF9] border border-[#E5E7EB]">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#E5E7EB] bg-[#F5F5F0] text-[10px] font-bold uppercase tracking-wider text-[#6B7280]">
                <th className="py-3 px-4">Supplier Name</th>
                <th className="py-3 px-4">Contact Person</th>
                <th className="py-3 px-4">Phone / Email</th>
                <th className="py-3 px-4">GSTIN</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">City / Address</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB] text-xs">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td colSpan={6} className="py-4 px-4">
                      <Skeleton className="h-5 w-full" />
                    </td>
                  </tr>
                ))
              ) : suppliers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-xs text-[#6B7280]">
                    No suppliers registered yet. Click &apos;+ Register Supplier&apos; to add one.
                  </td>
                </tr>
              ) : (
                suppliers.map((s) => (
                  <tr key={s.id} className="hover:bg-[#F5F5F0] transition-colors">
                    <td className="py-3 px-4 font-bold text-[#0A192F]">
                      {s.name}
                    </td>
                    <td className="py-3 px-4 text-[#0A192F]">
                      {s.contactPerson || '-'}
                    </td>
                    <td className="py-3 px-4 text-[#6B7280]">
                      <div>{s.phone || '-'}</div>
                      <div className="text-[11px]">{s.email || '-'}</div>
                    </td>
                    <td className="py-3 px-4 font-mono text-[11px] text-[#0A192F]">
                      {s.gstin ? (
                        <span className="bg-white px-2 py-0.5 border border-[#E5E7EB] font-bold">
                          {s.gstin}
                        </span>
                      ) : (
                        <span className="text-[#6B7280]">Unregistered</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className="inline-block px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-800 border border-emerald-200">
                        {s.isActive ? 'ACTIVE' : 'INACTIVE'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-[#6B7280] max-w-xs truncate">
                      {s.address || '-'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Register Supplier Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-[#FBFBF9] border border-[#E5E7EB] w-full max-w-md p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-3">
              <h2 className="text-sm font-bold uppercase tracking-tight text-[#0A192F]">
                Register New Supplier
              </h2>
              <button
                type="button"
                className="text-[#6B7280] hover:text-[#0A192F] text-sm font-mono"
                onClick={() => setIsModalOpen(false)}
              >
                ✕
              </button>
            </div>

            {error && (
              <div className="p-3 border border-red-200 bg-red-50 text-xs text-[#B91C1C]">
                {error}
              </div>
            )}

            <form onSubmit={handleCreateSupplier} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold uppercase text-[#0A192F] mb-1">
                  Supplier / Company Name *
                </label>
                <Input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Optimum Health Distribution Pvt Ltd"
                  className="text-xs border-[#E5E7EB] bg-white rounded-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold uppercase text-[#0A192F] mb-1">
                    Contact Person
                  </label>
                  <Input
                    value={contactPerson}
                    onChange={(e) => setContactPerson(e.target.value)}
                    placeholder="e.g. Rajesh Kumar"
                    className="text-xs border-[#E5E7EB] bg-white rounded-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase text-[#0A192F] mb-1">
                    Phone Number
                  </label>
                  <Input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. 9876543210"
                    className="text-xs border-[#E5E7EB] bg-white rounded-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-[#0A192F] mb-1">
                  Email Address
                </label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="orders@vendor.com"
                  className="text-xs border-[#E5E7EB] bg-white rounded-none"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-[#0A192F] mb-1">
                  GSTIN (15-digit alphanumeric)
                </label>
                <Input
                  value={gstin}
                  onChange={(e) => setGstin(e.target.value)}
                  placeholder="e.g. 07AAAAA0000A1Z5"
                  className="text-xs border-[#E5E7EB] bg-white rounded-none font-mono uppercase"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold uppercase text-[#0A192F] mb-1">
                  Billing & Warehouse Address
                </label>
                <textarea
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  rows={2}
                  placeholder="Full office or warehouse address..."
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
                  {isSubmitting ? 'Registering...' : 'Save Supplier'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
