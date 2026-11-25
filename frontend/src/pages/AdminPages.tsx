import React, { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, unwrap, formatINR } from '../services/api';
import { useCart } from '../context/CartContext';
import { ProductCounts, DataBoutiqueStatus, ZipImportPreviewResult, UnmatchedImportImageItem } from '../types';
import { PageHeader } from '../components/PageHeader';
import { ConfirmDialog } from '../components/ConfirmDialog';

const ADMIN_TABS = [
  'overview', 'products', 'images', 'importer', 'categories', 'sources',
  'inventory', 'orders', 'users', 'lifecycle', 'compatibility', 'analytics', 'reviews', 'settings'
] as const;

type AdminTab = typeof ADMIN_TABS[number];

export const AdminDashboardPage: React.FC<{ initialTab?: AdminTab }> = ({ initialTab = 'overview' }) => {
  const [tab, setTab] = useState<AdminTab>(initialTab);
  const qc = useQueryClient();
  const { showToast } = useCart();

  const [newSku, setNewSku] = useState('');
  const [newName, setNewName] = useState('');
  const [newPrice, setNewPrice] = useState('');
  const [newCatId, setNewCatId] = useState('1');
  const [newSource, setNewSource] = useState('MISSIONCART_DIRECT');

  const [impSource, setImpSource] = useState('AMAZON_IN');
  const [impFormat, setImpFormat] = useState<'JSON' | 'CSV'>('JSON');
  const [impContent, setImpContent] = useState('');
  const [impUpdateExisting, setImpUpdateExisting] = useState(false);
  const [impResult, setImpResult] = useState<any>(null);
  const [impBusy, setImpBusy] = useState(false);

  const [zipFile, setZipFile] = useState<File | null>(null);
  const [zipCountry, setZipCountry] = useState('');
  const [zipAutoApproveImg, setZipAutoApproveImg] = useState(false);
  const [zipResult, setZipResult] = useState<ZipImportPreviewResult | null>(null);
  const [zipBusy, setZipBusy] = useState(false);
  const [assignProductIds, setAssignProductIds] = useState<Record<number, string>>({});
  const [colCategorySlug, setColCategorySlug] = useState('fashion');
  const [colTitle, setColTitle] = useState('');
  const [colSubtitle, setColSubtitle] = useState('');
  const [colKeywords, setColKeywords] = useState('');

  const [catName, setCatName] = useState('');
  const [catGroup, setCatGroup] = useState('Everyday essentials');
  const [ruleCode, setRuleCode] = useState('');
  const [ruleTitle, setRuleTitle] = useState('');
  const [ruleAction, setRuleAction] = useState('');
  const [imageFilter, setImageFilter] = useState<'PENDING' | 'ALL'>('PENDING');
  const [customImageUrls, setCustomImageUrls] = useState<Record<number, string>>({});
  const [pendingDeleteProductId, setPendingDeleteProductId] = useState<number | null>(null);
  const [pendingDeleteCategoryId, setPendingDeleteCategoryId] = useState<number | null>(null);

  const { data: overview } = useQuery({ queryKey: ['admin-overview'], queryFn: async () => unwrap<any>(await api.get('/admin/overview')) });
  const { data: counts } = useQuery({ queryKey: ['product-counts'], queryFn: async () => unwrap<ProductCounts>(await api.get('/products/count')) });
  const { data: products } = useQuery({
    queryKey: ['admin-products', tab, imageFilter],
    queryFn: async () => unwrap<any[]>(await api.get(`/admin/products?size=100${tab === 'images' && imageFilter === 'PENDING' ? '&imageStatus=REQUIRES_IMAGE' : ''}`)),
    enabled: tab === 'products' || tab === 'images' || tab === 'inventory',
  });
  const { data: categories } = useQuery({ queryKey: ['categories'], queryFn: async () => unwrap<any[]>(await api.get('/categories')) });
  const { data: sources } = useQuery({ queryKey: ['sources'], queryFn: async () => unwrap<any[]>(await api.get('/sources')) });
  const { data: orders } = useQuery({ queryKey: ['admin-orders'], queryFn: async () => unwrap<any[]>(await api.get('/admin/orders')), enabled: tab === 'orders' });
  const { data: users } = useQuery({ queryKey: ['admin-users'], queryFn: async () => unwrap<any[]>(await api.get('/admin/users')), enabled: tab === 'users' });
  const { data: lifecycle } = useQuery({ queryKey: ['admin-lifecycle'], queryFn: async () => unwrap<any[]>(await api.get('/admin/lifecycle')), enabled: tab === 'lifecycle' });
  const { data: jobs } = useQuery({ queryKey: ['admin-jobs'], queryFn: async () => unwrap<any[]>(await api.get('/admin/catalog/jobs')), enabled: tab === 'importer' || tab === 'overview' });
  const { data: rules } = useQuery({ queryKey: ['compat-rules'], queryFn: async () => unwrap<any[]>(await api.get('/compatibility/rules')), enabled: tab === 'compatibility' });
  const { data: analytics } = useQuery({ queryKey: ['admin-analytics'], queryFn: async () => unwrap<any>(await api.get('/admin/analytics')), enabled: tab === 'analytics' });
  const { data: reviews } = useQuery({ queryKey: ['admin-reviews'], queryFn: async () => unwrap<any[]>(await api.get('/admin/reviews')), enabled: tab === 'reviews' });
  const { data: reviewPhotos } = useQuery({ queryKey: ['admin-review-photos'], queryFn: async () => unwrap<any[]>(await api.get('/admin/review-photos')), enabled: tab === 'reviews' });
  const { data: unmatchedImages } = useQuery({ queryKey: ['admin-unmatched-images'], queryFn: async () => unwrap<UnmatchedImportImageItem[]>(await api.get('/admin/catalog/unmatched-images')), enabled: tab === 'importer' });
  const { data: dataBoutique } = useQuery({ queryKey: ['admin-databoutique'], queryFn: async () => unwrap<DataBoutiqueStatus>(await api.get('/admin/databoutique/status')), enabled: tab === 'importer' || tab === 'sources' });
  const { data: adminCollections } = useQuery({ queryKey: ['admin-collections'], queryFn: async () => unwrap<any[]>(await api.get('/admin/collections')), enabled: tab === 'categories' });
  const { data: settings } = useQuery({ queryKey: ['admin-settings'], queryFn: async () => unwrap<any[]>(await api.get('/admin/settings')), enabled: tab === 'settings' });
  const { data: paymentConfig } = useQuery({ queryKey: ['payment-config'], queryFn: async () => unwrap<any>(await api.get('/payments/config')) });

  const runImport = async (previewOnly: boolean) => {
    setImpBusy(true);
    try {
      const res = await api.post('/admin/catalog/import', {
        sourcePlatform: impSource,
        format: impFormat,
        fileName: `admin-upload.${impFormat.toLowerCase()}`,
        content: impContent,
        previewOnly,
        updateExisting: impUpdateExisting,
      });
      setImpResult(unwrap(res));
      if (!previewOnly) {
        qc.invalidateQueries({ queryKey: ['admin-jobs'] });
        qc.invalidateQueries({ queryKey: ['admin-products'] });
        qc.invalidateQueries({ queryKey: ['admin-overview'] });
        qc.invalidateQueries({ queryKey: ['product-counts'] });
        showToast('Bulk catalog import executed');
      }
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Import validation error');
    } finally {
      setImpBusy(false);
    }
  };

  return (
    <div className="mc-container" style={{ padding: '2.5rem 1.5rem 3.5rem' }}>
      <PageHeader
        title="MissionCart Admin Console"
        subtitle="Catalog operations, image verification queue, category governance, orders, and payment settings."
        breadcrumbs={[{ label: 'Admin' }]}
      />

      <ConfirmDialog
        open={pendingDeleteProductId !== null || pendingDeleteCategoryId !== null}
        title={pendingDeleteProductId !== null ? 'Delete product from catalogue?' : 'Delete category?'}
        message={pendingDeleteProductId !== null
          ? 'Are you sure you want to permanently remove this product from MissionCart?'
          : 'Are you sure you want to remove this category? Categories with assigned products cannot be deleted.'}
        confirmLabel="Yes, Delete"
        cancelLabel="Keep Item"
        onConfirm={async () => {
          try {
            if (pendingDeleteProductId !== null) {
              await api.delete(`/admin/products/${pendingDeleteProductId}`);
              qc.invalidateQueries({ queryKey: ['admin-products'] });
              qc.invalidateQueries({ queryKey: ['product-counts'] });
              showToast('Product deleted');
            } else if (pendingDeleteCategoryId !== null) {
              await api.delete(`/admin/categories/${pendingDeleteCategoryId}`);
              qc.invalidateQueries({ queryKey: ['categories'] });
              showToast('Category deleted');
            }
          } catch (err: any) {
            showToast(err?.response?.data?.message || 'Delete failed.');
          } finally {
            setPendingDeleteProductId(null);
            setPendingDeleteCategoryId(null);
          }
        }}
        onCancel={() => {
          setPendingDeleteProductId(null);
          setPendingDeleteCategoryId(null);
        }}
      />

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem', marginBottom: '2rem', paddingBottom: '1rem', borderBottom: '1px solid var(--mc-border)' }}>
        {ADMIN_TABS.map((t) => (
          <button key={t} type="button" onClick={() => setTab(t)} className={`mc-btn ${tab === t ? 'mc-btn-accent' : 'mc-btn-outline'}`} style={{ padding: '0.4rem 0.9rem', fontSize: '0.8rem', textTransform: 'capitalize' }}>
            {t}
          </button>
        ))}
      </div>

      {tab === 'overview' && overview && (
        <div className="mc-grid-4">
          {[
            ['Total DB Products', (counts?.totalImportedProducts ?? overview.totalProducts).toLocaleString('en-IN')],
            ['Image-Verified Listings', (counts?.imageVerifiedProducts ?? overview.verifiedImagesCount).toLocaleString('en-IN')],
            ['Pending Image Queue', (counts?.pendingImageProducts ?? overview.requiresImageCount).toLocaleString('en-IN')],
            ['Registered Users', overview.totalUsers],
            ['Total Orders', overview.totalOrders],
            ['Native Revenue', formatINR(overview.totalRevenue)],
            ['Active Missions', overview.activeMissions],
            ['Import Jobs', overview.importJobsCount],
          ].map(([label, val]) => (
            <div key={String(label)} className="mc-card" style={{ padding: '1.3rem' }}>
              <div style={{ fontSize: '0.78rem', color: 'var(--mc-muted)', textTransform: 'uppercase' }}>{label}</div>
              <div className="mc-serif" style={{ fontSize: '2rem', marginTop: '0.3rem', color: 'var(--mc-burgundy)' }}>{val}</div>
            </div>
          ))}
        </div>
      )}

      {tab === 'products' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              await api.post('/admin/products', {
                sku: newSku, name: newName, price: Number(newPrice), categoryId: Number(newCatId),
                sourcePlatform: newSource, productType: newSource === 'MISSIONCART_DIRECT' ? 'MISSIONCART_DIRECT' : 'EXTERNAL_CATALOG',
                description: newName, stockQuantity: 15, imageStatus: 'REQUIRES_IMAGE', published: true, approved: true,
              });
              setNewSku(''); setNewName(''); setNewPrice('');
              qc.invalidateQueries({ queryKey: ['admin-products'] });
              qc.invalidateQueries({ queryKey: ['product-counts'] });
              showToast('Product created (added to image verification queue)');
            }}
            className="mc-linen-panel"
            style={{ padding: '1.25rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.65rem' }}
          >
            <input required className="mc-input" placeholder="SKU (e.g. MC-NEW-01)" value={newSku} onChange={(e) => setNewSku(e.target.value)} />
            <input required className="mc-input" placeholder="Product Name" value={newName} onChange={(e) => setNewName(e.target.value)} />
            <input required type="number" className="mc-input" placeholder="Price INR" value={newPrice} onChange={(e) => setNewPrice(e.target.value)} />
            <select className="mc-select" value={newCatId} onChange={(e) => setNewCatId(e.target.value)}>
              {(categories || []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <select className="mc-select" value={newSource} onChange={(e) => setNewSource(e.target.value)}>
              {(sources || []).map((s) => <option key={s.code} value={s.code}>{s.name}</option>)}
            </select>
            <button type="submit" className="mc-btn mc-btn-accent">Add Product</button>
          </form>

          <div className="mc-card" style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.86rem' }}>
              <thead>
                <tr style={{ textAlign: 'left', borderBottom: '1px solid var(--mc-border)', background: 'var(--mc-card)' }}>
                  <th style={{ padding: '0.75rem' }}>SKU</th>
                  <th style={{ padding: '0.75rem' }}>Name</th>
                  <th style={{ padding: '0.75rem' }}>Source</th>
                  <th style={{ padding: '0.75rem' }}>Price</th>
                  <th style={{ padding: '0.75rem' }}>Image Status</th>
                  <th style={{ padding: '0.75rem' }}>Status</th>
                  <th style={{ padding: '0.75rem' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {(products || []).map((p) => (
                  <tr key={p.id} style={{ borderBottom: '1px solid var(--mc-border)' }}>
                    <td style={{ padding: '0.65rem' }}>{p.sku}</td>
                    <td style={{ padding: '0.65rem', fontWeight: 600 }}>{p.name}</td>
                    <td style={{ padding: '0.65rem' }}>{p.sourcePlatform}</td>
                    <td style={{ padding: '0.65rem' }}>{p.price > 0 ? formatINR(p.price) : 'Pending'}</td>
                    <td style={{ padding: '0.65rem' }}>{p.imageStatus}</td>
                    <td style={{ padding: '0.65rem' }}>{p.published && p.approved ? 'Live' : 'Pending'}</td>
                    <td style={{ padding: '0.65rem', display: 'flex', gap: '0.4rem' }}>
                      <button type="button" className="mc-btn mc-btn-outline" style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem' }} onClick={async () => {
                        await api.put(`/admin/products/${p.id}`, { approved: !p.approved, published: !p.published });
                        qc.invalidateQueries({ queryKey: ['admin-products'] });
                      }}>Toggle Live</button>
                      <button type="button" className="mc-btn mc-btn-outline" style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem' }} onClick={() => setPendingDeleteProductId(p.id)}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'images' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '0.75rem' }}>
            <p style={{ margin: 0, color: 'var(--mc-muted)' }}>
              Products without verified photos are isolated here and excluded from customer-facing product cards.
            </p>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button type="button" className={`mc-btn ${imageFilter === 'PENDING' ? 'mc-btn-accent' : 'mc-btn-outline'}`} style={{ padding: '0.4rem 0.9rem', fontSize: '0.8rem' }} onClick={() => setImageFilter('PENDING')}>
                Pending Queue ({counts?.pendingImageProducts ?? 0})
              </button>
              <button type="button" className={`mc-btn ${imageFilter === 'ALL' ? 'mc-btn-accent' : 'mc-btn-outline'}`} style={{ padding: '0.4rem 0.9rem', fontSize: '0.8rem' }} onClick={() => setImageFilter('ALL')}>
                First 100 All
              </button>
            </div>
          </div>
          <div className="mc-grid-3">
            {(products || []).map((p) => (
              <div key={p.id} className="mc-card" style={{ padding: '1rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                <div style={{ fontSize: '0.76rem', color: 'var(--mc-burgundy)', fontWeight: 600 }}>{p.sku} • {p.imageStatus}</div>
                <strong>{p.name}</strong>
                {p.imageUrl && <img src={p.imageUrl} alt={p.name} referrerPolicy="no-referrer" style={{ width: '100%', height: 150, objectFit: 'contain', background: 'var(--mc-card)', borderRadius: 8 }} />}
                <input
                  className="mc-input"
                  style={{ padding: '0.45rem 0.7rem', fontSize: '0.8rem' }}
                  placeholder="Paste authorized image URL (https://...)"
                  value={customImageUrls[p.id] ?? p.imageUrl ?? ''}
                  onChange={(e) => setCustomImageUrls({ ...customImageUrls, [p.id]: e.target.value })}
                />
                <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
                  <button type="button" className="mc-btn mc-btn-accent" style={{ padding: '0.3rem 0.75rem', fontSize: '0.75rem' }} onClick={async () => {
                    const url = customImageUrls[p.id] ?? p.imageUrl ?? '';
                    if (!url) { showToast('Provide an authorized image URL first'); return; }
                    await api.patch(`/admin/products/${p.id}/image`, { imageUrl: url, imageStatus: 'VERIFIED', imageSource: 'Admin Verified' });
                    qc.invalidateQueries({ queryKey: ['admin-products'] });
                    qc.invalidateQueries({ queryKey: ['product-counts'] });
                    showToast('Image verified and published to storefront');
                  }}>Verify & Approve</button>
                  <button type="button" className="mc-btn mc-btn-outline" style={{ padding: '0.3rem 0.65rem', fontSize: '0.75rem' }} onClick={async () => {
                    await api.patch(`/admin/products/${p.id}/image`, { imageStatus: 'REQUIRES_IMAGE', imageUrl: '' });
                    qc.invalidateQueries({ queryKey: ['admin-products'] });
                    qc.invalidateQueries({ queryKey: ['product-counts'] });
                  }}>Flag Pending</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'importer' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* ZIP / XLSX / Multi-Country Upload Importer */}
          <div className="mc-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem', borderColor: 'var(--mc-caramel)' }}>
            <div>
              <span className="mc-badge mc-badge-blush" style={{ marginBottom: '0.4rem' }}>International Catalogue &amp; ZIP Media Importer</span>
              <h2 style={{ fontSize: '1.45rem', margin: 0 }}>Upload Country ZIP / CSV / JSON / JSONL / XLSX</h2>
              <p style={{ margin: '0.3rem 0 0', fontSize: '0.86rem', color: 'var(--mc-muted)' }}>
                Extracts archives securely (up to 200MB), auto-detects country &amp; currency, matches images strictly by SKU/GTIN/EAN/manifest, and queues unmatched images without random assignment.
              </p>
            </div>
            <div className="mc-grid-3">
              <input
                type="file"
                accept=".zip,.csv,.json,.jsonl,.xlsx"
                className="mc-input"
                onChange={(e) => {
                  setZipFile(e.target.files?.[0] || null);
                  setZipResult(null);
                }}
              />
              <select className="mc-select" value={zipCountry} onChange={(e) => setZipCountry(e.target.value)}>
                <option value="">Auto-detect country from archive</option>
                <option value="IN">India (IN • INR)</option>
                <option value="FR">France (FR • EUR)</option>
                <option value="IT">Italy (IT • EUR)</option>
                <option value="GB">United Kingdom (GB • GBP)</option>
                <option value="US">United States (US • USD)</option>
                <option value="DE">Germany (DE • EUR)</option>
                <option value="AE">UAE (AE • AED)</option>
                <option value="SG">Singapore (SG • SGD)</option>
                <option value="JP">Japan (JP • JPY)</option>
              </select>
              <label style={{ display: 'inline-flex', gap: '0.45rem', alignItems: 'center', fontSize: '0.84rem' }}>
                <input type="checkbox" checked={zipAutoApproveImg} onChange={(e) => setZipAutoApproveImg(e.target.checked)} />
                Verify matched SKU images automatically
              </label>
            </div>
            <div style={{ display: 'flex', gap: '0.65rem', flexWrap: 'wrap' }}>
              <button
                type="button"
                disabled={!zipFile || zipBusy}
                className="mc-btn mc-btn-outline"
                onClick={async () => {
                  if (!zipFile) return;
                  setZipBusy(true);
                  try {
                    const fd = new FormData();
                    fd.append('file', zipFile);
                    if (zipCountry) fd.append('countryCode', zipCountry);
                    fd.append('previewOnly', 'true');
                    fd.append('updateExisting', String(impUpdateExisting));
                    fd.append('autoApproveImages', String(zipAutoApproveImg));
                    const res = await api.post('/admin/catalog/import-file', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
                    setZipResult(unwrap<ZipImportPreviewResult>(res));
                  } catch (err: any) {
                    showToast(err?.response?.data?.message || 'ZIP preview failed');
                  } finally {
                    setZipBusy(false);
                  }
                }}
              >
                Inspect &amp; Preview ZIP
              </button>
              <button
                type="button"
                disabled={!zipFile || zipBusy}
                className="mc-btn mc-btn-accent"
                onClick={async () => {
                  if (!zipFile) return;
                  setZipBusy(true);
                  try {
                    const fd = new FormData();
                    fd.append('file', zipFile);
                    if (zipCountry) fd.append('countryCode', zipCountry);
                    fd.append('previewOnly', 'false');
                    fd.append('updateExisting', String(impUpdateExisting));
                    fd.append('autoApproveImages', String(zipAutoApproveImg));
                    const res = await api.post('/admin/catalog/import-file', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
                    setZipResult(unwrap<ZipImportPreviewResult>(res));
                    qc.invalidateQueries({ queryKey: ['admin-jobs'] });
                    qc.invalidateQueries({ queryKey: ['admin-products'] });
                    qc.invalidateQueries({ queryKey: ['product-counts'] });
                    qc.invalidateQueries({ queryKey: ['admin-unmatched-images'] });
                    qc.invalidateQueries({ queryKey: ['countries'] });
                    showToast('Archive committed to country catalogue');
                  } catch (err: any) {
                    showToast(err?.response?.data?.message || 'ZIP commit failed');
                  } finally {
                    setZipBusy(false);
                  }
                }}
              >
                {zipBusy ? 'Processing Archive...' : 'Approve & Import Archive'}
              </button>
            </div>
            {zipResult && (
              <div className="mc-linen-panel" style={{ padding: '1rem', fontSize: '0.84rem' }}>
                <div>
                  <strong>{zipResult.previewOnly ? 'Preview Summary' : 'Committed Summary'}:</strong>{' '}
                  Country <strong>{zipResult.detectedCountry}</strong> ({zipResult.detectedCurrency}) •
                  Records {zipResult.totalRecords} (Inserted {zipResult.insertedCount}, Skipped Dup {zipResult.skippedDuplicateCount}, Errors {zipResult.errorCount}) •
                  Matched Images: <strong>{zipResult.matchedImageCount}</strong> •
                  Unmatched Images Queued: <strong>{zipResult.unmatchedImageCount}</strong>
                </div>
                {zipResult.detectedBrands.length > 0 && (
                  <div style={{ marginTop: '0.35rem', color: 'var(--mc-muted)' }}>
                    Brands: {zipResult.detectedBrands.join(', ')} • Categories: {zipResult.detectedCategories.join(', ')}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Unmatched ZIP Images Review Queue */}
          {(unmatchedImages || []).length > 0 && (
            <div className="mc-card" style={{ padding: '1.5rem' }}>
              <h2 style={{ fontSize: '1.35rem', marginBottom: '0.75rem' }}>Unmatched ZIP Images Review ({unmatchedImages!.length})</h2>
              <p style={{ margin: '0 0 1rem', fontSize: '0.84rem', color: 'var(--mc-muted)' }}>
                Images whose filename did not match an imported SKU, GTIN, EAN, UPC, or manifest are isolated here for manual review.
              </p>
              <div className="mc-grid-3">
                {unmatchedImages!.map((ui) => (
                  <div key={ui.id} className="mc-linen-panel" style={{ padding: '0.85rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <img src={ui.imageDataUrl} alt={ui.fileName} style={{ width: '100%', height: 140, objectFit: 'contain', background: '#fff', borderRadius: 'var(--mc-radius-sm)' }} />
                    <div style={{ fontSize: '0.78rem' }}><strong>{ui.fileName}</strong> ({ui.countryCode})</div>
                    <div style={{ display: 'flex', gap: '0.4rem' }}>
                      <input
                        className="mc-input"
                        placeholder="Target Product ID"
                        value={assignProductIds[ui.id] || ''}
                        onChange={(e) => setAssignProductIds((prev) => ({ ...prev, [ui.id]: e.target.value }))}
                        style={{ padding: '0.3rem 0.5rem', fontSize: '0.78rem' }}
                      />
                      <button
                        type="button"
                        className="mc-btn mc-btn-accent"
                        style={{ padding: '0.3rem 0.65rem', fontSize: '0.75rem' }}
                        onClick={async () => {
                          const pid = Number(assignProductIds[ui.id]);
                          if (!pid) { showToast('Enter a valid Product ID'); return; }
                          await api.post(`/admin/catalog/unmatched-images/${ui.id}/assign`, { productId: pid });
                          qc.invalidateQueries({ queryKey: ['admin-unmatched-images'] });
                          showToast('Image assigned cleanly to product');
                        }}
                      >
                        Match
                      </button>
                      <button
                        type="button"
                        className="mc-btn mc-btn-outline"
                        style={{ padding: '0.3rem 0.65rem', fontSize: '0.75rem' }}
                        onClick={async () => {
                          await api.delete(`/admin/catalog/unmatched-images/${ui.id}`);
                          qc.invalidateQueries({ queryKey: ['admin-unmatched-images'] });
                        }}
                      >
                        Discard
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Data Boutique Dataset Connector */}
          {dataBoutique && (
            <div className="mc-card" style={{ padding: '1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '0.6rem' }}>
                <div>
                  <h2 style={{ fontSize: '1.35rem', margin: 0 }}>Data Boutique Catalog Connector</h2>
                  <div style={{ fontSize: '0.82rem', color: 'var(--mc-muted)', marginTop: '0.25rem' }}>{dataBoutique.message}</div>
                </div>
                <button
                  type="button"
                  className="mc-btn mc-btn-outline"
                  onClick={async () => {
                    try {
                      const res = await api.post('/admin/databoutique/sync');
                      qc.invalidateQueries({ queryKey: ['admin-databoutique'] });
                      showToast(res.data?.message || 'Data Boutique status checked');
                    } catch (err: any) {
                      showToast(err?.response?.data?.message || 'Sync error');
                    }
                  }}
                >
                  Sync Data Boutique Contracts
                </button>
              </div>
              {dataBoutique.datasets.length > 0 && (
                <div style={{ fontSize: '0.82rem', marginTop: '0.8rem' }}>
                  {dataBoutique.datasets.map((d) => (
                    <div key={d.contractId} style={{ padding: '0.45rem 0', borderTop: '1px solid var(--mc-border)' }}>
                      <strong>{d.title}</strong> • {d.geographyCode} • {d.sourceWebsite} • Status: {d.ingestStatus}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="mc-grid-2" style={{ gap: '2rem', alignItems: 'start' }}>
            <div className="mc-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
              <h2 style={{ fontSize: '1.4rem' }}>Quick Inline Paste Importer (JSON / CSV)</h2>
            <div className="mc-grid-2">
              <select className="mc-select" value={impSource} onChange={(e) => setImpSource(e.target.value)}>
                {(sources || []).map((s) => <option key={s.code} value={s.code}>{s.name}</option>)}
              </select>
              <select className="mc-select" value={impFormat} onChange={(e) => setImpFormat(e.target.value as any)}>
                <option value="JSON">JSON</option>
                <option value="CSV">CSV</option>
              </select>
            </div>
            <input
              type="file"
              accept=".json,.csv"
              className="mc-input"
              onChange={async (e) => {
                const f = e.target.files?.[0];
                if (f) {
                  setImpFormat(f.name.toLowerCase().endsWith('.csv') ? 'CSV' : 'JSON');
                  setImpContent(await f.text());
                }
              }}
            />
            <textarea
              rows={8}
              className="mc-textarea"
              value={impContent}
              onChange={(e) => setImpContent(e.target.value)}
              placeholder={impFormat === 'JSON'
                ? '[{"sku":"AMZ-901","name":"Study Booklight","categorySlug":"study-workspace","price":499}]'
                : 'sku,name,categorySlug,price\nNYK-901,Gentle Gel Cleanser,skincare,399'}
            />
            <label style={{ display: 'flex', gap: '0.45rem', alignItems: 'center', fontSize: '0.86rem' }}>
              <input type="checkbox" checked={impUpdateExisting} onChange={(e) => setImpUpdateExisting(e.target.checked)} />
              Update existing products on SKU / sourceProductId match
            </label>
            <div style={{ display: 'flex', gap: '0.65rem' }}>
              <button type="button" disabled={impBusy} className="mc-btn mc-btn-outline" onClick={() => runImport(true)}>Preview & Validate</button>
              <button type="button" disabled={impBusy} className="mc-btn mc-btn-accent" onClick={() => runImport(false)}>{impBusy ? 'Importing...' : 'Approve & Batch Import'}</button>
            </div>

            {impResult && (
              <div className="mc-linen-panel" style={{ padding: '1rem', fontSize: '0.84rem' }}>
                <strong>Result ({impResult.previewOnly ? 'Preview' : 'Committed'}):</strong> Total {impResult.totalRecords} • Inserted {impResult.insertedCount} • Updated {impResult.updatedCount} • Skipped Dup {impResult.skippedDuplicateCount} • Errors {impResult.errorCount}
                {(impResult.rows || []).slice(0, 50).map((r: any) => (
                  <div key={r.rowIndex} style={{ borderTop: '1px solid var(--mc-border)', paddingTop: '0.3rem', marginTop: '0.3rem' }}>
                    Row {r.rowIndex} [{r.sku}]: <strong>{r.status}</strong> — {r.message}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mc-card" style={{ padding: '1.5rem' }}>
            <h2 style={{ fontSize: '1.4rem', marginBottom: '0.8rem' }}>Import Job History</h2>
            {(jobs || []).map((j) => (
              <div key={j.id} style={{ padding: '0.65rem 0', borderTop: '1px solid var(--mc-border)', fontSize: '0.85rem' }}>
                <strong>{j.sourcePlatform} ({j.format})</strong> — {j.status}
                <div style={{ color: 'var(--mc-muted)' }}>Inserted: {j.insertedCount}, Skipped Dup: {j.skippedDuplicateCount}, Errors: {j.errorCount}</div>
              </div>
            ))}
          </div>
        </div>
        </div>
      )}

      {tab === 'categories' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
          <div className="mc-grid-2" style={{ gap: '1.5rem', alignItems: 'start' }}>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                await api.post('/admin/categories', { name: catName, purposeGroup: catGroup, description: catName, heroHeading: catName + '.', heroItalicAccent: 'Curated with care.', editorialDescription: catName });
                setCatName('');
                qc.invalidateQueries({ queryKey: ['categories'] });
                showToast('Editorial Category created');
              }}
              className="mc-card"
              style={{ padding: '1.4rem', display: 'flex', flexDirection: 'column', gap: '0.8rem' }}
            >
              <h2 style={{ fontSize: '1.3rem' }}>Add Dynamic Editorial Category</h2>
              <input required className="mc-input" placeholder="Category Name" value={catName} onChange={(e) => setCatName(e.target.value)} />
              <input className="mc-input" placeholder="Purpose Group" value={catGroup} onChange={(e) => setCatGroup(e.target.value)} />
              <button type="submit" className="mc-btn mc-btn-accent">Create Category</button>
            </form>
            <div className="mc-card" style={{ padding: '1.4rem' }}>
              {(categories || []).map((c) => (
                <div key={c.id} style={{ padding: '0.55rem 0', borderBottom: '1px solid var(--mc-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem' }}>
                  <div>
                    <strong>{c.name}</strong> <span className="mc-badge" style={{ marginLeft: '0.4rem' }}>{c.slug}</span>
                  </div>
                  <button type="button" className="mc-btn mc-btn-outline" style={{ padding: '0.25rem 0.6rem', fontSize: '0.75rem' }} onClick={() => setPendingDeleteCategoryId(c.id)}>
                    Delete
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="mc-grid-2" style={{ gap: '1.5rem', alignItems: 'start' }}>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const kws = colKeywords.split(',').map((k) => k.trim()).filter(Boolean);
                await api.post('/admin/collections', {
                  categorySlug: colCategorySlug.trim(),
                  title: colTitle.trim(),
                  subtitle: colSubtitle.trim(),
                  description: colSubtitle.trim(),
                  filterParamsJson: JSON.stringify({ categories: [colCategorySlug.trim()], keywords: kws }),
                  active: true,
                });
                setColTitle(''); setColSubtitle(''); setColKeywords('');
                qc.invalidateQueries({ queryKey: ['admin-collections'] });
                showToast('Editorial Collection added');
              }}
              className="mc-card"
              style={{ padding: '1.4rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}
            >
              <h2 style={{ fontSize: '1.3rem' }}>Add Editorial Collage Collection</h2>
              <input required className="mc-input" placeholder="Category Slug (e.g. fashion, beauty)" value={colCategorySlug} onChange={(e) => setColCategorySlug(e.target.value)} />
              <input required className="mc-input" placeholder="Collection Title (e.g. Linen Resort Edit)" value={colTitle} onChange={(e) => setColTitle(e.target.value)} />
              <input className="mc-input" placeholder="Short Subtitle" value={colSubtitle} onChange={(e) => setColSubtitle(e.target.value)} />
              <input required className="mc-input" placeholder="Filter Keywords (comma separated: linen,dress,summer)" value={colKeywords} onChange={(e) => setColKeywords(e.target.value)} />
              <button type="submit" className="mc-btn mc-btn-accent">Publish Collage Collection</button>
            </form>
            <div className="mc-card" style={{ padding: '1.4rem', maxHeight: 360, overflowY: 'auto' }}>
              <h2 style={{ fontSize: '1.3rem', marginBottom: '0.6rem' }}>Active Editorial Collections ({(adminCollections || []).length})</h2>
              {(adminCollections || []).map((c) => (
                <div key={c.id} style={{ padding: '0.45rem 0', borderBottom: '1px solid var(--mc-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.5rem', fontSize: '0.84rem' }}>
                  <span><strong>{c.title}</strong> ({c.categorySlug})</span>
                  <button type="button" className="mc-btn mc-btn-outline" style={{ padding: '0.2rem 0.5rem', fontSize: '0.72rem' }} onClick={async () => {
                    await api.delete(`/admin/collections/${c.id}`);
                    qc.invalidateQueries({ queryKey: ['admin-collections'] });
                  }}>Remove</button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'sources' && (
        <div className="mc-grid-3">
          {(sources || []).map((s) => (
            <div key={s.id} className="mc-card" style={{ padding: '1.2rem' }}>
              <strong>{s.name}</strong>
              <div style={{ fontSize: '0.82rem', color: 'var(--mc-muted)', margin: '0.3rem 0 0.7rem' }}>
                {s.connectionStatus} • {s.importMethod} • {(counts?.byRetailer?.[s.code] ?? 0).toLocaleString('en-IN')} listings
              </div>
              <button type="button" className="mc-btn mc-btn-outline" style={{ padding: '0.3rem 0.7rem', fontSize: '0.76rem' }} onClick={async () => {
                const next = s.connectionStatus === 'ACTIVE' ? 'CONFIGURED_FEED_PENDING' : 'ACTIVE';
                await api.patch(`/admin/sources/${s.id}`, { connectionStatus: next });
                qc.invalidateQueries({ queryKey: ['sources'] });
              }}>Toggle Status</button>
            </div>
          ))}
        </div>
      )}

      {tab === 'inventory' && (
        <div className="mc-card" style={{ padding: '1.2rem' }}>
          {(products || []).map((p) => (
            <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.55rem 0', borderBottom: '1px solid var(--mc-border)' }}>
              <span><strong>{p.name}</strong> ({p.sku})</span>
              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <span>Stock: <strong>{p.stockQuantity}</strong></span>
                <button type="button" className="mc-btn mc-btn-outline" style={{ padding: '0.25rem 0.65rem', fontSize: '0.76rem' }} onClick={async () => {
                  await api.patch(`/admin/products/${p.id}/stock`, { stockQuantity: p.stockQuantity + 10, reason: 'Admin restock +10' });
                  qc.invalidateQueries({ queryKey: ['admin-products'] });
                }}>+10 Stock</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {tab === 'orders' && (
        <div className="mc-card" style={{ padding: '1.2rem' }}>
          {(orders || []).map((o) => (
            <div key={o.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.65rem 0', borderBottom: '1px solid var(--mc-border)' }}>
              <div><strong>{o.orderNumber}</strong> • {o.status} • {formatINR(o.totalAmount)}</div>
              <button type="button" className="mc-btn mc-btn-outline" style={{ padding: '0.25rem 0.7rem', fontSize: '0.76rem' }} onClick={async () => {
                await api.patch(`/admin/orders/${o.id}`, { trackingStatus: 'SHIPPED' });
                qc.invalidateQueries({ queryKey: ['admin-orders'] });
              }}>Mark Shipped</button>
            </div>
          ))}
        </div>
      )}

      {tab === 'users' && (
        <div className="mc-card" style={{ padding: '1.2rem' }}>
          {(users || []).map((u) => (
            <div key={u.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.55rem 0', borderBottom: '1px solid var(--mc-border)' }}>
              <span><strong>{u.fullName}</strong> ({u.email}) — {u.role}</span>
              <span className="mc-badge mc-badge-blush">{u.enabled ? 'Enabled' : 'Disabled'}</span>
            </div>
          ))}
        </div>
      )}

      {tab === 'lifecycle' && (
        <div className="mc-card" style={{ padding: '1.2rem' }}>
          {(lifecycle || []).map((lr) => (
            <div key={lr.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.65rem 0', borderBottom: '1px solid var(--mc-border)' }}>
              <span>#{lr.id} <strong>{lr.requestType}</strong> • Product #{lr.productId} • {lr.status}</span>
              <button type="button" className="mc-btn mc-btn-outline" style={{ padding: '0.25rem 0.7rem', fontSize: '0.76rem' }} onClick={async () => {
                await api.patch(`/admin/lifecycle/${lr.id}`, { status: 'REVIEWED_BY_ADMIN' });
                qc.invalidateQueries({ queryKey: ['admin-lifecycle'] });
              }}>Mark Reviewed</button>
            </div>
          ))}
        </div>
      )}

      {tab === 'compatibility' && (
        <div className="mc-grid-2" style={{ gap: '1.5rem', alignItems: 'start' }}>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              await api.post('/admin/compatibility/rules', { ruleCode, domain: 'ELECTRONICS', title: ruleTitle, description: ruleTitle, conditionJson: '{}', severity: 'WARNING', recommendedAction: ruleAction, active: true });
              setRuleCode(''); setRuleTitle(''); setRuleAction('');
              qc.invalidateQueries({ queryKey: ['compat-rules'] });
            }}
            className="mc-card"
            style={{ padding: '1.4rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}
          >
            <h2 style={{ fontSize: '1.3rem' }}>Add Compatibility Rule</h2>
            <input required className="mc-input" placeholder="Rule Code" value={ruleCode} onChange={(e) => setRuleCode(e.target.value)} />
            <input required className="mc-input" placeholder="Rule Title" value={ruleTitle} onChange={(e) => setRuleTitle(e.target.value)} />
            <input required className="mc-input" placeholder="Recommended Action" value={ruleAction} onChange={(e) => setRuleAction(e.target.value)} />
            <button type="submit" className="mc-btn mc-btn-accent">Save Rule</button>
          </form>
          <div className="mc-card" style={{ padding: '1.4rem' }}>
            {(rules || []).map((r) => (
              <div key={r.id} style={{ padding: '0.6rem 0', borderBottom: '1px solid var(--mc-border)' }}>
                <strong>{r.ruleCode}</strong> ({r.domain}) — {r.title}
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'analytics' && analytics && (
        <div className="mc-grid-2" style={{ gap: '1.5rem' }}>
          <div className="mc-card" style={{ padding: '1.4rem' }}>
            <h2 style={{ fontSize: '1.3rem', marginBottom: '0.8rem' }}>Missions by Purpose ({analytics.totalMissions})</h2>
            {Object.entries(analytics.missionsByPurpose || {}).map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0', borderBottom: '1px solid var(--mc-border)' }}>
                <span>{k}</span><strong>{String(v)}</strong>
              </div>
            ))}
          </div>
          <div className="mc-card" style={{ padding: '1.4rem' }}>
            <h2 style={{ fontSize: '1.3rem', marginBottom: '0.8rem' }}>AI Providers Used</h2>
            {Object.entries(analytics.missionsByAiProvider || {}).map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.4rem 0', borderBottom: '1px solid var(--mc-border)' }}>
                <span>{k}</span><strong>{String(v)}</strong>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'reviews' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div className="mc-card" style={{ padding: '1.2rem' }}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '0.8rem' }}>Customer Received-Product Photo Moderation ({(reviewPhotos || []).length})</h2>
            {(reviewPhotos || []).length === 0 ? (
              <p style={{ color: 'var(--mc-muted)' }}>No customer review photos uploaded yet.</p>
            ) : (
              <div className="mc-grid-3">
                {(reviewPhotos || []).map((rp) => (
                  <div key={rp.id} className="mc-linen-panel" style={{ padding: '0.9rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <img src={rp.imageDataUrl} alt={rp.caption || 'Customer review'} style={{ width: '100%', height: 160, objectFit: 'cover', borderRadius: 'var(--mc-radius-sm)' }} />
                    <div style={{ fontSize: '0.78rem', color: 'var(--mc-muted)' }}>
                      Product #{rp.productId} • Order #{rp.orderId || 'N/A'} • Status: <strong>{rp.moderationStatus}</strong>
                    </div>
                    {rp.caption && <div style={{ fontSize: '0.84rem' }}>{rp.caption}</div>}
                    <div style={{ display: 'flex', gap: '0.45rem' }}>
                      <button type="button" className="mc-btn mc-btn-accent" style={{ padding: '0.3rem 0.7rem', fontSize: '0.76rem' }} onClick={async () => {
                        await api.patch(`/admin/review-photos/${rp.id}`, { moderationStatus: 'APPROVED' });
                        qc.invalidateQueries({ queryKey: ['admin-review-photos'] });
                        showToast('Customer photo approved');
                      }}>Approve</button>
                      <button type="button" className="mc-btn mc-btn-outline" style={{ padding: '0.3rem 0.7rem', fontSize: '0.76rem' }} onClick={async () => {
                        await api.patch(`/admin/review-photos/${rp.id}`, { moderationStatus: 'REJECTED' });
                        qc.invalidateQueries({ queryKey: ['admin-review-photos'] });
                        showToast('Customer photo rejected');
                      }}>Reject</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mc-card" style={{ padding: '1.2rem' }}>
            <h2 style={{ fontSize: '1.25rem', marginBottom: '0.8rem' }}>Customer Written Reviews ({(reviews || []).length})</h2>
            {(reviews || []).length === 0 ? <p style={{ color: 'var(--mc-muted)' }}>No customer reviews submitted yet.</p> : (reviews || []).map((r) => (
              <div key={r.id} style={{ padding: '0.6rem 0', borderBottom: '1px solid var(--mc-border)' }}>
                <strong>{r.rating}/5</strong> — {r.title}: {r.comment}
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === 'settings' && (
        <div className="mc-card" style={{ padding: '1.4rem' }}>
          <h2 style={{ fontSize: '1.3rem', marginBottom: '0.6rem' }}>System &amp; Payment Configuration</h2>
          {paymentConfig && (
            <div className="mc-linen-panel" style={{ padding: '1rem', marginBottom: '1rem', fontSize: '0.88rem', lineHeight: 1.6 }}>
              <strong>Active Payment Gateway:</strong> {paymentConfig.activeProvider} ({paymentConfig.mode})<br />
              Razorpay Configured: {String(paymentConfig.razorpayConfigured)} • Paytm Configured: {String(paymentConfig.paytmConfigured)} • Merchant UPI VPA Configured: {String(paymentConfig.upiConfigured)} • Webhook Configured: {String(paymentConfig.webhookConfigured)}<br />
              Supported Methods: {(paymentConfig.methods || []).join(', ')}
            </div>
          )}
          <p style={{ color: 'var(--mc-muted)', fontSize: '0.88rem' }}>
            AI provider, Razorpay credentials, and admin bootstrap are driven securely via environment variables (`.env`). Secrets are never exposed to the frontend.
          </p>
          {(settings || []).map((s) => (
            <div key={s.settingKey} style={{ padding: '0.5rem 0', borderBottom: '1px solid var(--mc-border)' }}>
              <strong>{s.settingKey}</strong>: {s.settingValue}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
