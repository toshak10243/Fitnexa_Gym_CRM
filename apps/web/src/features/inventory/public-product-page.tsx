import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { apiClient } from '../../lib/api-client';

export function PublicProductPage() {
  const { id } = useParams<{ id: string }>();
  const [product, setProduct] = useState<any>(null);
  const [error, setError] = useState('');
  useEffect(() => { apiClient.get(`/inventory/public/products/${id}`).then((r) => setProduct(r.data?.data ?? r.data)).catch(() => setError('Product not found.')); }, [id]);
  if (error) return <main className="min-h-screen bg-[#FBFBF9] flex items-center justify-center text-[#B91C1C]">{error}</main>;
  if (!product) return <main className="min-h-screen bg-[#FBFBF9] flex items-center justify-center text-[#6B7280]">Loading product...</main>;
  return <main className="min-h-screen bg-[#FBFBF9] p-6 text-[#0A192F]"><div className="max-w-3xl mx-auto border border-[#E5E7EB] bg-[#FBFBF9] p-6"><div className="flex gap-6 items-start">{product.photoUrl ? <img src={product.photoUrl} alt={product.name} className="h-56 w-56 object-contain border border-[#E5E7EB] bg-white" /> : <div className="h-56 w-56 flex items-center justify-center bg-[#0A192F] text-[#FBFBF9] text-6xl font-bold">{product.name?.charAt(0)}</div>}<div><p className="text-xs uppercase text-[#6B7280]">Trifit product</p><h1 className="text-3xl font-bold mt-2">{product.name}</h1><p className="mt-3 text-sm text-[#6B7280]">{product.description || 'Product details'}</p><p className="mt-5 text-2xl font-bold">{((product.sellingPricePaise || 0) / 100).toFixed(2)}</p></div></div><div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8 border-t border-[#E5E7EB] pt-5 text-sm"><div><span className="text-[#6B7280]">SKU</span><strong className="block">{product.sku}</strong></div><div><span className="text-[#6B7280]">Barcode</span><strong className="block">{product.barcode || 'N/A'}</strong></div><div><span className="text-[#6B7280]">Category</span><strong className="block">{product.category?.name || 'N/A'}</strong></div><div><span className="text-[#6B7280]">Stock</span><strong className="block">{product.currentStock} {product.unit}</strong></div></div></div></main>;
}


