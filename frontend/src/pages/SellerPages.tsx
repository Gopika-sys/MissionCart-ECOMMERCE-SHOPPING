import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Trash2 } from 'lucide-react';
import { api, unwrap, formatINR } from '../services/api';
import { useCart } from '../context/CartContext';
import { PageHeader } from '../components/PageHeader';
import { ConfirmDialog } from '../components/ConfirmDialog';

export const SellerDashboardPage: React.FC = () => {
  const qc = useQueryClient();
  const { showToast } = useCart();
  const [pendingDeleteId, setPendingDeleteId] = useState<number | null>(null);

  const { data: products } = useQuery({
    queryKey: ['seller-products'],
    queryFn: async () => unwrap<any[]>(await api.get('/seller/products')),
  });

  return (
    <div className="mc-container" style={{ padding: '2.5rem 1.5rem 3.5rem' }}>
      <PageHeader
        title="Seller Dashboard"
        subtitle="Manage MissionCart native seller submissions, stock levels, and fulfillment."
        breadcrumbs={[{ label: 'Seller Portal' }]}
        actions={<Link to="/seller/submit" className="mc-btn mc-btn-accent">Submit New Product</Link>}
      />

      <ConfirmDialog
        open={pendingDeleteId !== null}
        title="Delete seller listing?"
        message="Are you sure you want to remove this product listing from your seller studio?"
        confirmLabel="Yes, Delete"
        cancelLabel="Keep Item"
        onConfirm={async () => {
          if (pendingDeleteId !== null) {
            await api.delete(`/seller/products/${pendingDeleteId}`);
            qc.invalidateQueries({ queryKey: ['seller-products'] });
            showToast('Seller listing deleted');
          }
          setPendingDeleteId(null);
        }}
        onCancel={() => setPendingDeleteId(null)}
      />

      <div className="mc-grid-4" style={{ marginBottom: '2rem' }}>
        <Link to="/seller/submit" className="mc-card" style={{ padding: '1.3rem' }}><h3>Product Submission</h3><p style={{ color: 'var(--mc-muted)', fontSize: '0.86rem' }}>List native MissionCart inventory</p></Link>
        <Link to="/seller/inventory" className="mc-card" style={{ padding: '1.3rem' }}><h3>Inventory ({(products || []).length})</h3><p style={{ color: 'var(--mc-muted)', fontSize: '0.86rem' }}>Manage stock &amp; approval state</p></Link>
        <Link to="/seller/orders" className="mc-card" style={{ padding: '1.3rem' }}><h3>Seller Orders</h3><p style={{ color: 'var(--mc-muted)', fontSize: '0.86rem' }}>Fulfillment queue</p></Link>
        <Link to="/seller/earnings" className="mc-card" style={{ padding: '1.3rem' }}><h3>Sales &amp; Earnings</h3><p style={{ color: 'var(--mc-muted)', fontSize: '0.86rem' }}>INR settlement overview</p></Link>
      </div>

      <div className="mc-card" style={{ padding: '1.4rem' }}>
        <h2 style={{ fontSize: '1.35rem', marginBottom: '0.8rem' }}>Your Submitted Products</h2>
        {(products || []).length === 0 ? (
          <p style={{ color: 'var(--mc-muted)' }}>No seller products submitted yet.</p>
        ) : (
          (products || []).map((p) => (
            <div key={p.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', padding: '0.65rem 0', borderBottom: '1px solid var(--mc-border)' }}>
              <span><strong>{p.name}</strong> ({p.sku})</span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <span>{formatINR(p.price)} • {p.approved ? 'Approved' : 'Awaiting Admin Approval'}</span>
                <button
                  type="button"
                  className="mc-btn mc-btn-outline"
                  style={{ padding: '0.3rem 0.65rem', fontSize: '0.76rem' }}
                  onClick={() => setPendingDeleteId(p.id)}
                  aria-label="Delete seller product"
                >
                  <Trash2 size={13} /> Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export const SellerSubmitProductPage: React.FC = () => {
  const qc = useQueryClient();
  const { showToast } = useCart();
  const [sku, setSku] = useState('');
  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('1');
  const [missionTags, setMissionTags] = useState('daily-essentials');

  const { data: categories } = useQuery({ queryKey: ['categories'], queryFn: async () => unwrap<any[]>(await api.get('/categories')) });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.post('/seller/products', {
      sku, name, price: Number(price), categoryId: Number(categoryId), description, missionTags, stockQuantity: 10, imageStatus: 'REQUIRES_IMAGE',
    });
    setSku(''); setName(''); setPrice(''); setDescription('');
    qc.invalidateQueries({ queryKey: ['seller-products'] });
    showToast('Submitted for admin verification & approval');
  };

  return (
    <div className="mc-container" style={{ padding: '2.5rem 1.5rem 3.5rem', maxWidth: 680 }}>
      <PageHeader title="Submit Seller Product" breadcrumbs={[{ label: 'Seller', to: '/seller' }, { label: 'Submit Product' }]} />
      <form onSubmit={submit} className="mc-card" style={{ padding: '1.6rem', display: 'flex', flexDirection: 'column', gap: '0.95rem' }}>
        <input required className="mc-input" placeholder="SKU (e.g. KORA-MAT-01)" value={sku} onChange={(e) => setSku(e.target.value)} />
        <input required className="mc-input" placeholder="Product Name" value={name} onChange={(e) => setName(e.target.value)} />
        <input required type="number" className="mc-input" placeholder="Selling Price (INR)" value={price} onChange={(e) => setPrice(e.target.value)} />
        <select className="mc-select" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
          {(categories || []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <input className="mc-input" placeholder="Mission tags (comma separated)" value={missionTags} onChange={(e) => setMissionTags(e.target.value)} />
        <textarea required rows={3} className="mc-textarea" placeholder="Accurate product description" value={description} onChange={(e) => setDescription(e.target.value)} />
        <button type="submit" className="mc-btn mc-btn-accent">Submit for Admin Approval</button>
      </form>
    </div>
  );
};

export const SellerInventoryPage: React.FC = () => <SellerDashboardPage />;
export const SellerOrdersPage: React.FC = () => {
  const { data: sellerOrders, isLoading } = useQuery({
    queryKey: ['seller-orders'],
    queryFn: async () => unwrap<any[]>(await api.get('/seller/orders')),
  });
  return (
    <div className="mc-container" style={{ padding: '2.5rem 1.5rem 3.5rem' }}>
      <PageHeader title="Seller Order Fulfillment" subtitle="Verified orders containing your MissionCart-managed SKUs after native payment confirmation." breadcrumbs={[{ label: 'Seller', to: '/seller' }, { label: 'Orders' }]} />
      {isLoading ? <p>Loading seller orders...</p> : (sellerOrders || []).length === 0 ? (
        <div className="mc-linen-panel" style={{ padding: '2rem', textAlign: 'center', color: 'var(--mc-muted)' }}>
          No confirmed customer orders include your SKUs yet.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {(sellerOrders || []).map((ord) => (
            <div key={ord.orderId} className="mc-card" style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                <div>
                  <strong>{ord.orderNumber}</strong>
                  <span className="mc-badge mc-badge-blush" style={{ marginLeft: '0.5rem', fontSize: '0.7rem' }}>{ord.status}</span>
                  <span className="mc-badge" style={{ marginLeft: '0.35rem', fontSize: '0.7rem' }}>{ord.trackingStatus}</span>
                </div>
                <strong>{formatINR(ord.sellerSubtotal)}</strong>
              </div>
              {(ord.items || []).map((item: any) => (
                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.45rem 0', borderTop: '1px solid var(--mc-border)', fontSize: '0.86rem' }}>
                  <span>
                    {item.productName} ({item.sku}) × {item.quantity}
                    {(item.selectedSize || item.selectedColor) && (
                      <span className="mc-badge mc-badge-ivory" style={{ marginLeft: '0.4rem', fontSize: '0.66rem' }}>
                        {[item.selectedSize, item.selectedColor].filter(Boolean).join(' • ')}
                      </span>
                    )}
                  </span>
                  <strong>{formatINR(item.lineTotal)}</strong>
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export const SellerEarningsPage: React.FC = () => {
  const { data: earnings, isLoading } = useQuery({
    queryKey: ['seller-earnings'],
    queryFn: async () => unwrap<any>(await api.get('/seller/earnings')),
  });
  return (
    <div className="mc-container" style={{ padding: '2.5rem 1.5rem 3.5rem' }}>
      <PageHeader title="Sales & Earnings (INR)" subtitle="Live INR settlements computed from confirmed MissionCart native orders." breadcrumbs={[{ label: 'Seller', to: '/seller' }, { label: 'Earnings' }]} />
      {isLoading ? <p>Loading earnings...</p> : earnings && (
        <div className="mc-grid-3">
          <div className="mc-card" style={{ padding: '1.3rem' }}><div style={{ fontSize: '0.78rem', color: 'var(--mc-muted)', textTransform: 'uppercase' }}>Orders Fulfilled</div><div className="mc-serif" style={{ fontSize: '1.9rem', color: 'var(--mc-burgundy)' }}>{earnings.orderCount ?? 0}</div></div>
          <div className="mc-card" style={{ padding: '1.3rem' }}><div style={{ fontSize: '0.78rem', color: 'var(--mc-muted)', textTransform: 'uppercase' }}>Units Sold</div><div className="mc-serif" style={{ fontSize: '1.9rem', color: 'var(--mc-burgundy)' }}>{earnings.unitsSold ?? 0}</div></div>
          <div className="mc-card" style={{ padding: '1.3rem' }}><div style={{ fontSize: '0.78rem', color: 'var(--mc-muted)', textTransform: 'uppercase' }}>Gross Sales</div><div className="mc-serif" style={{ fontSize: '1.9rem', color: 'var(--mc-burgundy)' }}>{formatINR(earnings.grossRevenueInr ?? 0)}</div></div>
        </div>
      )}
    </div>
  );
};
