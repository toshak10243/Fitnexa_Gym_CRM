import { createPortal } from 'react-dom';
import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { apiClient } from '../../lib/api-client';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';

export function ProductCreatePage() {
  const navigate = useNavigate();
  const location = useLocation();
  const editProduct = (location.state as any)?.product;

  const [categories, setCategories] = useState<any[]>([]);
  const [isLoadingCats, setIsLoadingCats] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form State
  const [categoryId, setCategoryId] = useState('');
  const [sku, setSku] = useState('');
  const [barcode, setBarcode] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [photoPreview, setPhotoPreview] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [unit, setUnit] = useState('PIECES');
  const [costRupees, setCostRupees] = useState('');
  const [sellingRupees, setSellingRupees] = useState('');
  const [discountPercentage, setDiscountPercentage] = useState('0');
  const [taxRate, setTaxRate] = useState('18');
  const [hsnCode, setHsnCode] = useState('2106');
  const [reorderThreshold, setReorderThreshold] = useState('5');
  const [manufacturingDate, setManufacturingDate] = useState('');
  const [expiryDate, setExpiryDate] = useState('');

  // Quick Category Modal
  const [showCatModal, setShowCatModal] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatCode, setNewCatCode] = useState('');

  const fetchCategories = async () => {
    setIsLoadingCats(true);
    try {
      const res = await apiClient.get('/inventory/categories');
      const list = res.data.data || [];
      setCategories(list);
      if (list.length > 0 && !categoryId) {
        setCategoryId(list[0].id);
      }
    } catch {
      // Handled
    } finally {
      setIsLoadingCats(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    if (!editProduct) return;
    setCategoryId(editProduct.categoryId || editProduct.category?.id || '');
    setSku(editProduct.sku || ''); setBarcode(editProduct.barcode || '');
    setName(editProduct.name || ''); setDescription(editProduct.description || '');
    setUnit(editProduct.unit || 'PIECES'); setPhotoUrl(editProduct.photoUrl || ''); setPhotoPreview(editProduct.photoUrl || '');
    setCostRupees(String((editProduct.costPriceInPaise || 0) / 100));
    setSellingRupees(String((editProduct.sellingPriceInPaise || 0) / 100));
    setDiscountPercentage(String(editProduct.discountPercentage ?? 0));
    setTaxRate(String(editProduct.taxRatePercentage ?? 18));
    setHsnCode(editProduct.hsnCode || ''); setReorderThreshold(String(editProduct.reorderThreshold ?? 5));
    setManufacturingDate(editProduct.manufacturingDate ? String(editProduct.manufacturingDate).slice(0, 10) : '');
    setExpiryDate(editProduct.expiryDate ? String(editProduct.expiryDate).slice(0, 10) : '');
  }, [editProduct]);

  const handleCreateCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCatName.trim() || !newCatCode.trim()) return;

    try {
      const res = await apiClient.post('/inventory/categories', {
        name: newCatName.trim(),
        code: newCatCode.trim().toUpperCase(),
      });
      setShowCatModal(false);
      setNewCatName('');
      setNewCatCode('');
      await fetchCategories();
      setCategoryId(res.data.data.id);
    } catch (err: any) {
      alert(err.message || 'Failed to create category');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryId || !sku.trim() || !name.trim()) {
      setError('Category, SKU and Product Name are mandatory.');
      return;
    }

    const costPaise = Math.round(parseFloat(costRupees || '0') * 100);
    const sellingPaise = Math.round(parseFloat(sellingRupees || '0') * 100);

    if (sellingPaise <= 0) {
      setError('Selling price must be greater than zero.');
      return;
    }
    if (!manufacturingDate || !expiryDate) { setError('Manufacturing date and expiry date are mandatory.'); return; }
    if (new Date(expiryDate) <= new Date(manufacturingDate)) { setError('Expiry date must be after manufacturing date.'); return; }

    setIsSubmitting(true);
    setError(null);

    try {
      const payload = {
        categoryId,
        sku: sku.trim().toUpperCase(),
        barcode: barcode.trim() || undefined,
        photoUrl: photoUrl || undefined,
        name: name.trim(),
        description: description.trim() || undefined,
        unit,
        costPriceInPaise: costPaise,
        sellingPriceInPaise: sellingPaise,
        discountPercentage: Math.min(100, Math.max(0, parseFloat(discountPercentage) || 0)),
        taxRatePercentage: parseFloat(taxRate) || 0,
        hsnCode: hsnCode.trim() || undefined,
        reorderThreshold: parseInt(reorderThreshold, 10) || 5,
        manufacturingDate,
        expiryDate,
      };
      if (editProduct?.id) {
        // Existing API deployments may still expose the older update contract;
        // SKU/barcode remain immutable identifiers during ordinary edits.
        const { sku: _sku, barcode: _barcode, ...editablePayload } = payload;
        await apiClient.put(`/inventory/products/${editProduct.id}`, editablePayload);
      }
      else await apiClient.post('/inventory/products', payload);

      navigate('/inventory/products');
    } catch (err: any) {
      setError(err.message || 'Failed to create product.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePhotoUpload = async (file?: File) => {
    if (!file) return;
    setIsUploadingPhoto(true);
    try {
      const form = new FormData();
      form.append('photo', file);
      setPhotoPreview(URL.createObjectURL(file));
      const res = await apiClient.post('/inventory/products/upload-photo', form, { headers: { 'Content-Type': 'multipart/form-data' } });
      const payload = res.data?.data ?? res.data;
      setPhotoUrl(payload.photoUrl);
      setToast('Product photo uploaded successfully.');
      window.setTimeout(() => setToast(null), 3000);
    } catch (err: any) { setError(err.message || 'Product image upload failed.'); setToast('Product photo upload failed.'); }
    finally { setIsUploadingPhoto(false); }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto space-y-6">
      {toast && <div className="fixed right-6 top-6 z-[10000] border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs font-semibold text-emerald-800">{toast}</div>}
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#E5E7EB] pb-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-[#0A192F] uppercase">
            {editProduct ? 'Edit Retail Inventory Product' : 'Create Retail Inventory Product'}
          </h1>
          <p className="text-xs text-[#6B7280] mt-1">
            Configure new retail merchandise, dietary supplements, beverage stock, or gym spares.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="text-xs border-[#E5E7EB] rounded-none hover:bg-[#F5F5F0]"
            onClick={() => navigate('/inventory/products')}
          >
            â† Back to Products
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-300 text-red-800 text-xs font-medium">
          {error}
        </div>
      )}

      {/* Product Form */}
      <form onSubmit={handleSubmit} className="bg-[#FBFBF9] border border-[#E5E7EB] p-6 space-y-6">
        {/* Product photo stays at the top so the uploaded preview is immediately visible. */}
        <div className="border-b border-[#E5E7EB] pb-5">
          <label className="block text-[11px] font-bold uppercase text-[#0A192F] mb-2">Product Photo</label>
          <div className="flex items-start gap-4">
            <div className="h-32 w-32 border border-[#E5E7EB] bg-white flex items-center justify-center overflow-hidden">
              {photoPreview ? (
                <img src={photoPreview} alt="Product preview" className="h-full w-full object-cover" onError={() => setPhotoPreview('')} />
              ) : (
                <span className="text-[10px] uppercase text-[#6B7280] text-center px-2">No image selected</span>
              )}
            </div>
            <div className="flex-1">
              <input type="file" accept="image/jpeg,image/png,image/webp" disabled={isUploadingPhoto}
                onChange={(e) => handlePhotoUpload(e.target.files?.[0])}
                className="w-full text-xs border border-[#E5E7EB] p-2 bg-[#FBFBF9]" />
              <p className="text-[10px] text-[#6B7280] mt-2">JPG, PNG or WebP up to 5 MB. Preview appears immediately after selection.</p>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          {/* Category */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-bold uppercase text-[#0A192F]">
                Product Category *
              </label>
              <a href="/inventory/categories" className="text-[10px] text-[#B91C1C] hover:underline font-bold uppercase">Manage Categories</a>
            </div>
            <select
              required
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full text-xs border border-[#E5E7EB] bg-white px-3 py-2 rounded-none text-[#0A192F] h-9"
            >
              {isLoadingCats ? (
                <option>Loading categories...</option>
              ) : (
                categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.code})
                  </option>
                ))
              )}
            </select>
          </div>

          {/* Unit */}
          <div>
            <label className="block text-[11px] font-bold uppercase text-[#0A192F] mb-1">
              Measurement Unit
            </label>
            <select
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              className="w-full text-xs border border-[#E5E7EB] bg-white px-3 py-2 rounded-none text-[#0A192F] h-9"
            >
              <option value="PIECES">PIECES</option>
              <option value="BOXES">BOXES</option>
              <option value="BOTTLES">BOTTLES</option>
              <option value="SCOOPS">SCOOPS</option>
              <option value="KGS">KGS</option>
              <option value="PACKS">PACKS</option>
            </select>
          </div>

          {/* Product Name */}
          <div className="md:col-span-2">
            <label className="block text-[11px] font-bold uppercase text-[#0A192F] mb-1">
              Product Name *
            </label>
            <Input
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Optimum Nutrition 100% Whey Gold Standard 1kg (Chocolate)"
              className="rounded-none border-[#E5E7EB] bg-white h-9 text-xs"
            />
          </div>

          {/* Description */}
          <div className="md:col-span-2">
            <label className="block text-[11px] font-bold uppercase text-[#0A192F] mb-1">
              Product Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Full specification, dosage instructions, or package details..."
              className="w-full text-xs border border-[#E5E7EB] bg-white p-2 text-[#0A192F] rounded-none focus:outline-hidden"
            />
          </div>

          {/* SKU */}
          <div>
            <label className="block text-[11px] font-bold uppercase text-[#0A192F] mb-1">
              Stock Keeping Unit (SKU) *
            </label>
            <Input
              required
              value={sku}
              onChange={(e) => setSku(e.target.value.toUpperCase())}
              placeholder="e.g. ON-WHEY-1KG-CHOC"
              className="rounded-none border-[#E5E7EB] bg-white h-9 text-xs font-mono uppercase"
            />
            <p className="text-[10px] text-[#6B7280] mt-1">Unique inventory identifier</p>
          </div>

          {/* Barcode */}
          <div>
            <label className="block text-[11px] font-bold uppercase text-[#0A192F] mb-1">
              Barcode / EAN-13 (Optional for Scanner)
            </label>
            <Input
              value={barcode}
              onChange={(e) => setBarcode(e.target.value)}
              placeholder="e.g. 8901234567890"
              className="rounded-none border-[#E5E7EB] bg-white h-9 text-xs font-mono"
            />
            <p className="text-[10px] text-[#6B7280] mt-1">Directly scannable at POS checkout</p>
          </div>

          {/* Cost Price */}
          <div>
            <label className="block text-[11px] font-bold uppercase text-[#0A192F] mb-1">
              Purchase Price (INR â‚¹) *
            </label>
            <div className="flex items-center gap-2">
              <span className="font-bold text-[#6B7280]">â‚¹</span>
              <Input
                required
                type="number"
                step="0.01"
                min="0"
                value={costRupees}
                onChange={(e) => setCostRupees(e.target.value)}
                placeholder="2400.00"
                className="rounded-none border-[#E5E7EB] bg-white h-9 text-xs font-mono"
              />
            </div>
          </div>

          {/* Selling Price */}
          <div>
            <label className="block text-[11px] font-bold uppercase text-[#0A192F] mb-1">
              Selling Price / MRP (INR â‚¹) *
            </label>
            <div className="flex items-center gap-2">
              <span className="font-bold text-[#6B7280]">â‚¹</span>
              <Input
                required
                type="number"
                step="0.01"
                min="0"
                value={sellingRupees}
                onChange={(e) => setSellingRupees(e.target.value)}
                placeholder="3200.00"
                className="rounded-none border-[#E5E7EB] bg-white h-9 text-xs font-mono font-bold text-[#0A192F]"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase text-[#0A192F] mb-1">Discount (%)</label>
            <div className="flex items-center gap-2">
              <Input type="number" min="0" max="100" step="0.01" value={discountPercentage} onChange={(e) => setDiscountPercentage(e.target.value)} placeholder="0" className="rounded-none border-[#E5E7EB] bg-white h-9 text-xs font-mono" />
              <span className="text-xs text-[#6B7280]">off MRP</span>
            </div>
          </div>

          {/* Tax Slab */}
          <div>
            <label className="block text-[11px] font-bold uppercase text-[#0A192F] mb-1">
              Indian GST Tax Slab
            </label>
            <select
              value={taxRate}
              onChange={(e) => setTaxRate(e.target.value)}
              className="w-full text-xs border border-[#E5E7EB] bg-white px-3 py-2 rounded-none text-[#0A192F] h-9"
            >
              <option value="0">0% GST (Exempt e.g. Raw Eggs, Bananas)</option>
              <option value="5">5% GST</option>
              <option value="12">12% GST</option>
              <option value="18">18% GST (Standard e.g. Whey, Shakers, Spares)</option>
              <option value="28">28% GST</option>
            </select>
          </div>

          {/* HSN Code */}
          <div>
            <label className="block text-[11px] font-bold uppercase text-[#0A192F] mb-1">
              HSN Code (Tax Reporting)
            </label>
            <Input
              value={hsnCode}
              onChange={(e) => setHsnCode(e.target.value)}
              placeholder="e.g. 2106 (Food Prep) or 9506 (Gym Gear)"
              className="rounded-none border-[#E5E7EB] bg-white h-9 text-xs font-mono"
            />
          </div>

          {/* Reorder Threshold */}
          <div>
            <label className="block text-[11px] font-bold uppercase text-[#0A192F] mb-1">
              Low-Stock Reorder Alert Level (Units)
            </label>
            <Input
              type="number"
              min="0"
              value={reorderThreshold}
              onChange={(e) => setReorderThreshold(e.target.value)}
              className="rounded-none border-[#E5E7EB] bg-white h-9 text-xs font-mono"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase text-[#0A192F] mb-1">Manufacturing Date *</label>
            <Input type="date" required value={manufacturingDate} onChange={(e) => setManufacturingDate(e.target.value)} className="rounded-none border-[#E5E7EB] bg-white h-9 text-xs" />
          </div>
          <div>
            <label className="block text-[11px] font-bold uppercase text-[#0A192F] mb-1">Expiry Date *</label>
            <Input type="date" required value={expiryDate} min={manufacturingDate || undefined} onChange={(e) => setExpiryDate(e.target.value)} className="rounded-none border-[#E5E7EB] bg-white h-9 text-xs" />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-[#E5E7EB]">
          <Button
            type="button"
            variant="outline"
            className="text-xs border-[#E5E7EB] rounded-none"
            onClick={() => navigate('/inventory/products')}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting}
            className="bg-[#0A192F] text-white hover:bg-[#162E52] text-xs font-bold rounded-none px-6"
          >
            {isSubmitting ? 'Creating...' : 'Register Product SKU'}
          </Button>
        </div>
      </form>

      {/* Quick Add Category Modal */}
      {showCatModal && createPortal(
        <div className="fixed inset-0 z-[9999] bg-black/60 flex items-center justify-center p-4">
          <div className="bg-[#FBFBF9] border border-[#E5E7EB] w-full max-w-md p-6 space-y-4">
            <h3 className="text-sm font-bold uppercase tracking-wider text-[#0A192F] pb-1">
              Add Product Category
            </h3>
            <form onSubmit={handleCreateCategory} className="space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-bold uppercase text-[#0A192F] mb-1">
                  Category Name *
                </label>
                <Input
                  required
                  value={newCatName}
                  onChange={(e) => setNewCatName(e.target.value)}
                  placeholder="e.g. Energy Drinks & Hydration"
                  className="rounded-none border-[#E5E7EB] bg-white h-9 text-xs"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase text-[#0A192F] mb-1">
                  Unique Code *
                </label>
                <Input
                  required
                  value={newCatCode}
                  onChange={(e) => setNewCatCode(e.target.value.toUpperCase())}
                  placeholder="e.g. BEVERAGE"
                  className="rounded-none border-[#E5E7EB] bg-white h-9 text-xs font-mono uppercase"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-[#E5E7EB]">
                <Button
                  type="button"
                  variant="outline"
                  className="text-xs border-[#E5E7EB] rounded-none"
                  onClick={() => setShowCatModal(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="bg-[#0A192F] text-white hover:bg-[#162E52] text-xs rounded-none px-4"
                >
                  Save Category
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


