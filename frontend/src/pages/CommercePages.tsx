import React, { useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ShoppingBag, Trash2, ExternalLink, CheckCircle2, AlertTriangle, Truck, Recycle, Wrench, RefreshCw, Calendar, Tag, QrCode, Smartphone } from 'lucide-react';
import { api, unwrap, formatINR } from '../services/api';
import { useCart } from '../context/CartContext';
import { ProductCard } from '../components/ProductCard';
import { Product } from '../types';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { PageHeader } from '../components/PageHeader';

export const CartPage: React.FC = () => {
  const { cart, updateCartItem, removeCartItem } = useCart();
  const navigate = useNavigate();
  const [pendingRemoveId, setPendingRemoveId] = useState<number | null>(null);
  const active = cart?.activeItems || [];
  const saved = cart?.savedForLaterItems || [];
  const externalGroups = cart?.externalRetailerGroups || [];

  return (
    <div className="mc-container" style={{ padding: '2.5rem 1.5rem 3.5rem' }}>
      <PageHeader
        title="Shopping Bag"
        subtitle="MissionCart separates native-checkout inventory from external retailer carts for complete transparency."
        breadcrumbs={[{ label: 'Bag' }]}
      />

      <ConfirmDialog
        open={pendingRemoveId !== null}
        title="Remove from bag?"
        message="Are you sure you want to remove this item from your shopping bag?"
        confirmLabel="Yes, Remove"
        cancelLabel="Keep Item"
        onConfirm={() => { if (pendingRemoveId !== null) removeCartItem(pendingRemoveId); setPendingRemoveId(null); }}
        onCancel={() => setPendingRemoveId(null)}
      />

      {active.length === 0 && saved.length === 0 ? (
        <div className="mc-linen-panel" style={{ padding: '3rem', textAlign: 'center' }}>
          <ShoppingBag size={30} style={{ color: 'var(--mc-burgundy)', marginBottom: '0.6rem' }} />
          <h3>Your bag is empty</h3>
          <Link to="/products" className="mc-btn mc-btn-primary" style={{ marginTop: '0.8rem' }}>Explore Products</Link>
        </div>
      ) : (
        <div className="mc-grid-2" style={{ gap: '2rem', alignItems: 'start' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {active.map((item) => (
              <div key={item.id} className="mc-card" style={{ padding: '1.1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
                <div style={{ display: 'flex', gap: '0.9rem', alignItems: 'center' }}>
                  <div style={{ width: 72, height: 72, borderRadius: 'var(--mc-radius-sm)', overflow: 'hidden', background: 'var(--mc-surface)', display: 'grid', placeItems: 'center' }}>
                    {item.product.imageStatus === 'VERIFIED' && item.product.imageUrl ? (
                      <img src={item.product.imageUrl} alt={item.product.name} referrerPolicy="no-referrer" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : <span style={{ fontSize: '0.7rem', color: 'var(--mc-muted)' }}>No Photo</span>}
                  </div>
                  <div>
                    <span className="mc-badge" style={{ marginBottom: '0.25rem' }}>{item.product.sourcePlatform.replace(/_/g, ' ')}</span>
                    <Link to={`/products/${item.product.slug}`} style={{ display: 'block', fontWeight: 700 }}>{item.product.name}</Link>
                    {(item.selectedSize || item.selectedColor) && (
                      <div style={{ fontSize: '0.76rem', color: 'var(--mc-burgundy)', fontWeight: 600 }}>
                        {item.selectedSize ? `Size: ${item.selectedSize}` : ''}
                        {item.selectedSize && item.selectedColor ? ' • ' : ''}
                        {item.selectedColor ? `Color: ${item.selectedColor}` : ''}
                      </div>
                    )}
                    <div style={{ fontSize: '0.86rem', color: 'var(--mc-muted)' }}>{item.unitPrice && item.unitPrice > 0 ? `${formatINR(item.unitPrice)} each` : 'Price unavailable'}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={item.quantity}
                    onChange={(e) => updateCartItem(item.id, Number(e.target.value))}
                    className="mc-input"
                    style={{ width: 64, padding: '0.35rem 0.5rem' }}
                  />
                  <strong>{item.lineTotal && item.lineTotal > 0 ? formatINR(item.lineTotal) : 'Unavailable'}</strong>
                  <button type="button" className="mc-btn mc-btn-outline" style={{ padding: '0.35rem 0.7rem', fontSize: '0.78rem' }} onClick={() => updateCartItem(item.id, undefined, true)}>
                    Save later
                  </button>
                  <button type="button" onClick={() => setPendingRemoveId(item.id)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--mc-muted)' }}>
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}

            {saved.length > 0 && (
              <div style={{ marginTop: '1.5rem' }}>
                <h3 style={{ fontSize: '1.25rem', marginBottom: '0.75rem' }}>Saved for Later ({saved.length})</h3>
                {saved.map((item) => (
                  <div key={item.id} className="mc-linen-panel" style={{ padding: '0.9rem 1.1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                    <span>{item.product.name} ({formatINR(item.unitPrice)})</span>
                    <button type="button" className="mc-btn mc-btn-outline" style={{ padding: '0.35rem 0.85rem', fontSize: '0.8rem' }} onClick={() => updateCartItem(item.id, undefined, false)}>
                      Move to Bag
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="mc-card" style={{ padding: '1.5rem' }}>
            <h2 style={{ fontSize: '1.45rem', marginBottom: '1rem' }}>Bag Summary</h2>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <span style={{ color: 'var(--mc-muted)' }}>MissionCart Native Subtotal</span>
              <strong>{formatINR(cart?.nativeSubtotal)}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.85rem' }}>
              <span style={{ color: 'var(--mc-muted)' }}>External Retailers Estimated Subtotal</span>
              <strong>{formatINR(cart?.externalSubtotal)}</strong>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '0.85rem', borderTop: '1px solid var(--mc-border)', fontSize: '1.15rem', marginBottom: '1.25rem' }}>
              <span>Combined Total</span>
              <strong>{formatINR(cart?.grandTotal)}</strong>
            </div>
            {externalGroups.length > 0 && (
              <p style={{ fontSize: '0.82rem', color: 'var(--mc-muted)', marginBottom: '1rem' }}>
                External retailer items ({externalGroups.map((g) => g.sourceName).join(', ')}) will be grouped separately at checkout.
              </p>
            )}
            <button type="button" className="mc-btn mc-btn-accent" style={{ width: '100%' }} onClick={() => navigate('/checkout')}>
              Proceed to Checkout
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export const CheckoutPage: React.FC = () => {
  const { cart, refreshCart, showToast } = useCart();
  const navigate = useNavigate();
  const [coupon, setCoupon] = useState('');
  const [line1, setLine1] = useState('Room 204, Indiranagar Residency');
  const [city, setCity] = useState('Bengaluru');
  const [stateName, setStateName] = useState('Karnataka');
  const [postalCode, setPostalCode] = useState('560038');
  const [recipientName, setRecipientName] = useState('Ananya Sharma');
  const [phone, setPhone] = useState('+91 98765 43210');
  const [selectedGateway, setSelectedGateway] = useState<'RAZORPAY' | 'PAYTM' | 'UPI_QR'>('RAZORPAY');
  const [initResult, setInitResult] = useState<any>(null);
  const [qrOverride, setQrOverride] = useState<any>(null);
  const [liveStatus, setLiveStatus] = useState<any>(null);
  const [processing, setProcessing] = useState(false);

  const { data: paymentConfig } = useQuery({
    queryKey: ['payment-config'],
    queryFn: async () => unwrap<any>(await api.get('/payments/config')),
  });

  const nativeItems = (cart?.activeItems || []).filter((i) => i.nativeCheckoutEligible);
  const externalGroups = cart?.externalRetailerGroups || [];

  const handleInitNativeCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    setProcessing(true);
    try {
      const res = await api.post('/checkout', {
        shippingAddress: { recipientName, phone, line1, city, state: stateName, postalCode, country: 'India' },
        couponCode: coupon || null,
        idempotencyKey: `mc-${Date.now()}`,
        provider: selectedGateway === 'PAYTM' ? 'PAYTM' : 'RAZORPAY',
      });
      setInitResult(unwrap(res));
      setQrOverride(null);
      setLiveStatus(null);
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Unable to initiate checkout.');
    } finally {
      setProcessing(false);
    }
  };

  const handleRefreshQr = async () => {
    if (!initResult) return;
    try {
      const res = await api.post('/payments/qr', {
        orderId: initResult.order.id,
        provider: selectedGateway === 'PAYTM' ? 'PAYTM' : 'RAZORPAY',
      });
      setQrOverride(unwrap(res));
      showToast('Fresh order-specific UPI QR generated');
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Unable to generate UPI QR.');
    }
  };

  const handleCheckStatus = async () => {
    if (!initResult) return;
    try {
      const res = await api.get(`/payments/${initResult.order.id}/status`);
      const st = unwrap<any>(res);
      setLiveStatus(st);
      showToast(`Payment status: ${st.paymentStatus}`);
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Unable to check payment status.');
    }
  };

  const handleVerifyPayment = async (simulateFailure: boolean, rzpPayload?: { razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }) => {
    if (!initResult) return;
    setProcessing(true);
    try {
      const res = await api.post('/payments/verify', {
        orderId: initResult.order.id,
        razorpayOrderId: rzpPayload?.razorpay_order_id || initResult.payment.providerOrderId,
        razorpayPaymentId: rzpPayload?.razorpay_payment_id || 'demo_pay_verified',
        razorpaySignature: rzpPayload?.razorpay_signature || '',
        simulateFailure,
      });
      const detail = unwrap<{ order: { id: number; status: string } }>(res);
      await refreshCart();
      if (simulateFailure) {
        showToast('Payment failed or cancelled — inventory was not deducted.');
      } else {
        showToast('Payment verified and order confirmed!');
        navigate(`/orders/${detail.order.id}`);
      }
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Payment verification failed.');
    } finally {
      setProcessing(false);
    }
  };

  const launchRazorpayCheckout = async () => {
    if (!initResult) return;
    if (initResult.demoMode) {
      await handleVerifyPayment(false);
      return;
    }
    const existingScript = document.getElementById('razorpay-checkout-js');
    if (!existingScript) {
      await new Promise<void>((resolve, reject) => {
        const s = document.createElement('script');
        s.id = 'razorpay-checkout-js';
        s.src = 'https://checkout.razorpay.com/v1/checkout.js';
        s.onload = () => resolve();
        s.onerror = () => reject(new Error('Failed to load Razorpay Checkout SDK'));
        document.body.appendChild(s);
      });
    }
    const RazorpayCtor = (window as any).Razorpay;
    if (!RazorpayCtor) {
      showToast('Razorpay SDK unavailable');
      return;
    }
    const rzp = new RazorpayCtor({
      key: initResult.razorpayKeyId,
      amount: initResult.amountPaise,
      currency: 'INR',
      name: 'MissionCart',
      description: `Order ${initResult.order.orderNumber}`,
      order_id: initResult.payment.providerOrderId,
      prefill: { name: recipientName, contact: phone },
      theme: { color: '#7F2548' },
      handler: (response: any) => handleVerifyPayment(false, response),
      modal: { ondismiss: () => handleVerifyPayment(true) },
    });
    rzp.open();
  };

  const activeQrUrl = qrOverride?.qrCodeUrl || initResult?.payment?.qrCodeUrl;
  const activeUpiUri = qrOverride?.upiIntentUri || initResult?.payment?.upiIntentUri;
  const activeQrExpiry = qrOverride?.qrExpiresAt || initResult?.payment?.qrExpiresAt;

  return (
    <div className="mc-container" style={{ padding: '2.5rem 1.5rem 3.5rem' }}>
      <PageHeader
        title="Split-Aware Checkout"
        subtitle="MissionCart processes only MissionCart-stocked & verified seller inventory natively via Razorpay, Paytm PG, or Dynamic UPI QR. External retailer items remain grouped transparently."
        breadcrumbs={[{ label: 'Bag', to: '/cart' }, { label: 'Checkout' }]}
      />

      <div className={nativeItems.length > 0 ? 'mc-grid-2' : undefined} style={{ gap: '2rem', alignItems: 'start' }}>
        {/* Flow A: Native Checkout — only show full payment form when nativeItems exist */}
        <div className="mc-card" style={{ padding: '1.6rem', marginBottom: nativeItems.length === 0 ? '1.5rem' : undefined }}>
          <span className="mc-badge mc-badge-blush" style={{ marginBottom: '0.6rem' }}>Flow A • MissionCart Native Checkout</span>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Native Stock ({nativeItems.length} item(s))</h2>
          {paymentConfig && nativeItems.length > 0 && (
            <div style={{ fontSize: '0.78rem', color: 'var(--mc-muted)', marginBottom: '1rem' }}>
              Gateway Status: <strong>{paymentConfig.mode}</strong> • Active: <strong>{paymentConfig.activeProvider}</strong> • Razorpay: {paymentConfig.razorpayConfigured ? 'Configured' : 'Local Demo'} • Paytm PG: {paymentConfig.paytmConfigured ? 'Configured' : 'Local Demo'}
            </div>
          )}

          {nativeItems.length === 0 ? (
            <div className="mc-linen-panel" style={{ padding: '1rem', fontSize: '0.9rem', color: 'var(--mc-muted)' }}>
              Your bag contains no MissionCart Direct or Native Seller items, so MissionCart native checkout &amp; payment forms are not needed for these items. Complete external brand purchases directly using Flow B below, or browse <Link to="/products?sourceType=MISSIONCART_NATIVE_SELLER" style={{ color: 'var(--mc-burgundy)', fontWeight: 600 }}>MissionCart Direct inventory</Link>.
            </div>
          ) : !initResult ? (
            <form onSubmit={handleInitNativeCheckout} style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              <input className="mc-input" required value={recipientName} onChange={(e) => setRecipientName(e.target.value)} placeholder="Recipient Full Name" />
              <input className="mc-input" required value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Phone (+91...)" />
              <input className="mc-input" required value={line1} onChange={(e) => setLine1(e.target.value)} placeholder="Address Line 1" />
              <div className="mc-grid-3">
                <input className="mc-input" required value={city} onChange={(e) => setCity(e.target.value)} placeholder="City" />
                <input className="mc-input" required value={stateName} onChange={(e) => setStateName(e.target.value)} placeholder="State" />
                <input className="mc-input" required value={postalCode} onChange={(e) => setPostalCode(e.target.value)} placeholder="PIN Code" />
              </div>
              <input className="mc-input" value={coupon} onChange={(e) => setCoupon(e.target.value)} placeholder="Coupon (try WELCOME10 or MISSION250)" />

              <div>
                <div style={{ fontSize: '0.82rem', fontWeight: 600, marginBottom: '0.4rem' }}>Select Indian Payment Method</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                  {([
                    { id: 'RAZORPAY', title: 'Razorpay', desc: 'UPI / Cards / NetBanking' },
                    { id: 'PAYTM', title: 'Paytm PG', desc: 'Paytm UPI / Wallet / QR' },
                    { id: 'UPI_QR', title: 'Dynamic UPI QR', desc: 'Scan / GPay Intent' },
                  ] as const).map((gw) => (
                    <button
                      key={gw.id}
                      type="button"
                      onClick={() => setSelectedGateway(gw.id)}
                      className="mc-linen-panel"
                      style={{
                        padding: '0.65rem',
                        textAlign: 'left',
                        cursor: 'pointer',
                        border: selectedGateway === gw.id ? '2px solid var(--mc-burgundy)' : '1px solid var(--mc-border)',
                        background: selectedGateway === gw.id ? '#FAF0F3' : undefined,
                      }}
                    >
                      <div style={{ fontWeight: 700, fontSize: '0.84rem', color: 'var(--mc-chocolate)' }}>{gw.title}</div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--mc-muted)' }}>{gw.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div style={{ padding: '0.85rem', background: 'var(--mc-surface)', borderRadius: 'var(--mc-radius-sm)', fontSize: '0.88rem' }}>
                Native Subtotal: <strong>{formatINR(cart?.nativeSubtotal)}</strong> (Free shipping at ₹999+, else ₹79)
              </div>
              <button type="submit" disabled={processing} className="mc-btn mc-btn-accent">
                {processing ? 'Preparing Server Order...' : 'Create Order & Proceed to Payment'}
              </button>
            </form>
          ) : (
            <div className="mc-linen-panel" style={{ padding: '1.25rem' }}>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '0.6rem' }}>
                <span className="mc-badge mc-badge-caramel">
                  {initResult.demoMode ? 'Local Demo Mode (No Real Charge)' : `${initResult.payment?.provider || 'GATEWAY'} • ${initResult.paymentMode}`}
                </span>
                {liveStatus && <span className="mc-badge mc-badge-blush">Live Status: {liveStatus.paymentStatus}</span>}
              </div>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '0.4rem' }}>Order {initResult.order.orderNumber}</h3>
              <p style={{ fontSize: '0.86rem', color: 'var(--mc-muted)', marginBottom: '0.85rem' }}>{initResult.notice}</p>
              <div style={{ fontSize: '0.9rem', marginBottom: '1rem' }}>
                <div>Subtotal: {formatINR(initResult.order.subtotal)}</div>
                <div>Shipping: {formatINR(initResult.order.shippingFee)}</div>
                <div>Applicable Taxes (GST): {formatINR(initResult.order.taxAmount)}</div>
                <div>Discount: -{formatINR(initResult.order.discountAmount)}</div>
                <strong style={{ fontSize: '1.15rem' }}>Total Verified Payable: {formatINR(initResult.order.totalAmount)}</strong>
              </div>

              {activeQrUrl && (
                <div className="mc-card" style={{ padding: '1rem', marginBottom: '1rem', display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center' }}>
                  <img src={activeQrUrl} alt={`Dynamic UPI QR for ${initResult.order.orderNumber}`} style={{ width: 138, height: 'auto', borderRadius: 8, border: '1px solid var(--mc-border)' }} />
                  <div style={{ flex: 1, minWidth: 200 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontWeight: 700, fontSize: '0.92rem' }}>
                      <QrCode size={15} color="var(--mc-burgundy)" /> Order-Specific Dynamic UPI QR
                    </div>
                    <p style={{ fontSize: '0.78rem', color: 'var(--mc-muted)', margin: '0.3rem 0 0.6rem' }}>
                      {initResult.demoMode
                        ? 'Local demo preview QR (no live merchant VPA configured — complete via Demo Payment button).'
                        : 'Scan with Google Pay, PhonePe, Paytm, or any BHIM UPI app.'}
                      {activeQrExpiry && <> Expires {new Date(activeQrExpiry).toLocaleTimeString('en-IN')}.</>}
                    </p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem' }}>
                      {activeUpiUri && (
                        <a href={activeUpiUri} className="mc-btn mc-btn-outline" style={{ padding: '0.32rem 0.7rem', fontSize: '0.76rem' }}>
                          <Smartphone size={13} /> Open UPI / GPay App
                        </a>
                      )}
                      <button type="button" onClick={handleRefreshQr} className="mc-btn mc-btn-outline" style={{ padding: '0.32rem 0.7rem', fontSize: '0.76rem' }}>
                        <RefreshCw size={13} /> Refresh QR
                      </button>
                      <button type="button" onClick={handleCheckStatus} className="mc-btn mc-btn-outline" style={{ padding: '0.32rem 0.7rem', fontSize: '0.76rem' }}>
                        Check Status
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.65rem' }}>
                <button type="button" disabled={processing} className="mc-btn mc-btn-accent" onClick={launchRazorpayCheckout}>
                  <CheckCircle2 size={15} /> {initResult.demoMode ? 'Complete Demo Payment' : `Pay with ${initResult.payment?.provider || 'Gateway'}`}
                </button>
                <button type="button" disabled={processing} className="mc-btn mc-btn-outline" onClick={() => handleVerifyPayment(true)}>
                  <AlertTriangle size={15} /> Simulate Failed Payment
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Flow B: External Retailer Grouped Checkout */}
        <div className="mc-card" style={{ padding: '1.6rem' }}>
          <span className="mc-badge mc-badge-caramel" style={{ marginBottom: '0.6rem' }}>Flow B • External Retailer Checkout</span>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>Grouped by Retailer ({externalGroups.length})</h2>
          <p style={{ fontSize: '0.86rem', color: 'var(--mc-muted)', marginBottom: '1.25rem' }}>
            Each external marketplace manages its own cart, payment, shipping, and returns independently.
          </p>

          {externalGroups.length === 0 ? (
            <p style={{ color: 'var(--mc-muted)' }}>No external marketplace items in your bag.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {externalGroups.map((g) => (
                <div key={g.sourceCode} className="mc-linen-panel" style={{ padding: '1rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                    <div>
                      <strong>{g.sourceName}</strong>
                      {g.sourceType && <span className="mc-badge" style={{ marginLeft: '0.45rem', fontSize: '0.65rem' }}>{g.sourceType.replace(/_/g, ' ')}</span>}
                    </div>
                    <strong>{g.subtotal > 0 ? formatINR(g.subtotal) : 'Price on retailer site'}</strong>
                  </div>
                  {g.items.map((it) => (
                    <div key={it.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.6rem', fontSize: '0.86rem', padding: '0.4rem 0', borderTop: '1px solid var(--mc-border)' }}>
                      <div>
                        <span>{it.product.name} × {it.quantity}</span>
                        {(it.selectedSize || it.selectedColor) && (
                          <div style={{ fontSize: '0.74rem', color: 'var(--mc-burgundy)' }}>
                            {it.selectedSize ? `Size: ${it.selectedSize}` : ''}
                            {it.selectedSize && it.selectedColor ? ' • ' : ''}
                            {it.selectedColor ? `Color: ${it.selectedColor}` : ''}
                          </div>
                        )}
                      </div>
                      {it.product.sourceUrl ? (
                        <a href={it.product.sourceUrl} target="_blank" rel="noopener noreferrer" className="mc-badge mc-badge-blush" style={{ whiteSpace: 'nowrap' }}>
                          {g.sourceType === 'MANUFACTURER' ? 'Buy on Brand Site' : `Buy on ${g.sourceName}`} <ExternalLink size={11} />
                        </a>
                      ) : (
                        <span className="mc-badge">Sample Record (Feed Pending)</span>
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const OrdersPage: React.FC = () => {
  const { data: orders, isLoading } = useQuery({
    queryKey: ['orders'],
    queryFn: async () => unwrap<any[]>(await api.get('/orders')),
  });

  return (
    <div className="mc-container" style={{ padding: '2.5rem 1.5rem 3.5rem' }}>
      <PageHeader
        title="Your Orders"
        subtitle="Verified server-side order history & tracking."
        breadcrumbs={[{ label: 'Orders' }]}
      />
      {isLoading ? <p>Loading orders...</p> : (orders || []).length === 0 ? (
        <div className="mc-linen-panel" style={{ padding: '2.5rem', textAlign: 'center' }}>
          <h3>No orders placed yet</h3>
          <Link to="/products" className="mc-btn mc-btn-primary">Start Shopping</Link>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {(orders || []).map((entry) => (
            <Link key={entry.order.id} to={`/orders/${entry.order.id}`} className="mc-card" style={{ padding: '1.25rem', display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '1rem' }}>
              <div>
                <div style={{ display: 'flex', gap: '0.45rem', marginBottom: '0.35rem' }}>
                  <span className="mc-badge mc-badge-blush">{entry.order.status}</span>
                  <span className="mc-badge">{entry.order.checkoutMode}</span>
                </div>
                <strong style={{ fontSize: '1.1rem' }}>{entry.order.orderNumber}</strong>
                <div style={{ fontSize: '0.84rem', color: 'var(--mc-muted)' }}>
                  {entry.items.length} item(s) • Tracking: {entry.order.trackingNumber || 'Pending'} ({entry.order.trackingStatus})
                </div>
              </div>
              <strong style={{ fontSize: '1.2rem' }}>{formatINR(entry.order.totalAmount)}</strong>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
};

export const OrderDetailPage: React.FC = () => {
  const { id } = useParams();
  const qc = useQueryClient();
  const { showToast } = useCart();
  const [confirmAction, setConfirmAction] = useState<'cancel' | 'refund' | null>(null);
  const [photoItemId, setPhotoItemId] = useState<number | null>(null);
  const [photoRating, setPhotoRating] = useState(5);
  const [photoCaption, setPhotoCaption] = useState('');
  const [photoDataUrl, setPhotoDataUrl] = useState('');
  const [photoConsent, setPhotoConsent] = useState(true);
  const [photoBusy, setPhotoBusy] = useState(false);
  const { data, isLoading } = useQuery({
    queryKey: ['order', id],
    queryFn: async () => unwrap<any>(await api.get(`/orders/${id}`)),
    enabled: Boolean(id),
  });
  const { data: invoice } = useQuery({
    queryKey: ['order-invoice', id],
    queryFn: async () => unwrap<any>(await api.get(`/orders/${id}/invoice`)),
    enabled: Boolean(id),
  });

  if (isLoading) return <div className="mc-container" style={{ padding: '3rem 1.5rem' }}>Loading order...</div>;
  if (!data) return <div className="mc-container" style={{ padding: '3rem 1.5rem' }}>Order not found.</div>;

  const canCancel = data.order.trackingStatus !== 'SHIPPED' && data.order.trackingStatus !== 'DELIVERED' && data.order.status !== 'CANCELLED';
  const canRefund = (data.payment?.status === 'CAPTURED' || data.payment?.status === 'DEMO_CAPTURED') && data.order.refundStatus === 'NONE';

  return (
    <div className="mc-container" style={{ padding: '2.5rem 1.5rem 3.5rem', maxWidth: 920 }}>
      <PageHeader
        title={`Order ${data.order.orderNumber}`}
        breadcrumbs={[{ label: 'Orders', to: '/orders' }, { label: data.order.orderNumber }]}
      />

      <ConfirmDialog
        open={confirmAction !== null}
        title={confirmAction === 'cancel' ? 'Cancel this order?' : 'Request a refund?'}
        message={confirmAction === 'cancel'
          ? 'This will cancel your order. This action cannot be undone once processed.'
          : 'A refund request will be submitted. Processing may take 5-7 business days.'}
        confirmLabel={confirmAction === 'cancel' ? 'Yes, Cancel Order' : 'Yes, Request Refund'}
        cancelLabel="Go Back"
        onConfirm={async () => {
          if (confirmAction === 'cancel') {
            await api.post(`/orders/${data.order.id}/cancel`, { reason: 'Customer requested cancellation' });
            qc.invalidateQueries({ queryKey: ['order', id] });
            showToast('Order cancelled');
          } else {
            await api.post(`/orders/${data.order.id}/refund`, { reason: 'Customer requested refund' });
            qc.invalidateQueries({ queryKey: ['order', id] });
            showToast('Refund workflow updated');
          }
          setConfirmAction(null);
        }}
        onCancel={() => setConfirmAction(null)}
      />

      <span className="mc-badge mc-badge-blush" style={{ marginBottom: '0.6rem' }}><Truck size={13} /> {data.order.trackingStatus}</span>
      <p style={{ color: 'var(--mc-muted)', marginBottom: '0.5rem' }}>
        Status: <strong>{data.order.status}</strong> • Mode: {data.order.checkoutMode} • Tracking: {data.order.trackingNumber || 'Pending'}
      </p>
      <p style={{ fontSize: '0.84rem', color: 'var(--mc-muted)', marginBottom: '1.8rem' }}>
        {data.order.deliveryEstimateNote} • Refund Status: <strong>{data.order.refundStatus}</strong>
      </p>

      <div className="mc-card" style={{ padding: '1.4rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.9rem' }}>
          <h2 style={{ fontSize: '1.35rem' }}>Immutable Purchase Invoice {invoice ? `(${invoice.invoiceNumber})` : ''}</h2>
          <button type="button" className="mc-btn mc-btn-outline" style={{ padding: '0.35rem 0.85rem', fontSize: '0.8rem' }} onClick={() => window.print()}>
            Print Invoice
          </button>
        </div>
        {(data.items || []).map((it: any) => (
          <div key={it.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', padding: '0.55rem 0', borderTop: '1px solid var(--mc-border)', flexWrap: 'wrap' }}>
            <div>
              <span>{it.productName} ({it.selectedSize ? `${it.selectedSize} / ` : ''}{it.sku}) × {it.quantity} @ {formatINR(it.unitPrice)}</span>
              {(it.selectedSize || it.selectedColor) && (
                <span className="mc-badge" style={{ marginLeft: '0.45rem', fontSize: '0.68rem' }}>
                  {[it.selectedSize, it.selectedColor].filter(Boolean).join(' • ')}
                </span>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
              {(data.order.status === 'CONFIRMED' || data.order.status === 'DELIVERED') && (
                <button
                  type="button"
                  className="mc-btn mc-btn-outline"
                  style={{ padding: '0.25rem 0.65rem', fontSize: '0.74rem' }}
                  onClick={() => {
                    setPhotoItemId(it.id);
                    setPhotoCaption('');
                    setPhotoDataUrl('');
                  }}
                >
                  Upload Received Photo
                </button>
              )}
              <strong>{formatINR(it.lineTotal)}</strong>
            </div>
          </div>
        ))}
        {photoItemId !== null && (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!photoDataUrl) {
                showToast('Please select a photo file first.');
                return;
              }
              setPhotoBusy(true);
              try {
                await api.post(`/orders/${data.order.id}/items/${photoItemId}/review-photo`, {
                  rating: photoRating,
                  title: 'Verified buyer photo review',
                  comment: photoCaption || 'Received product photo shared by buyer',
                  caption: photoCaption,
                  imageDataUrl: photoDataUrl,
                  consentGranted: photoConsent,
                });
                showToast('Customer photo uploaded to product review gallery!');
                setPhotoItemId(null);
              } catch (err: any) {
                showToast(err?.response?.data?.message || 'Unable to upload photo');
              } finally {
                setPhotoBusy(false);
              }
            }}
            className="mc-linen-panel"
            style={{ padding: '1rem', marginTop: '0.8rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}
          >
            <strong style={{ fontSize: '0.94rem' }}>Share Received Product Photo (Customer Photos Gallery)</strong>
            <input
              type="file"
              accept="image/*"
              required
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                const reader = new FileReader();
                reader.onload = () => setPhotoDataUrl(String(reader.result || ''));
                reader.readAsDataURL(file);
              }}
            />
            <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap' }}>
              <select className="mc-select" value={photoRating} onChange={(e) => setPhotoRating(Number(e.target.value))} style={{ width: 130 }}>
                <option value={5}>5 Stars</option>
                <option value={4}>4 Stars</option>
                <option value={3}>3 Stars</option>
                <option value={2}>2 Stars</option>
                <option value={1}>1 Star</option>
              </select>
              <input className="mc-input" style={{ flex: 1 }} placeholder="Describe fit, quality, or packaging received..." value={photoCaption} onChange={(e) => setPhotoCaption(e.target.value)} />
            </div>
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem' }}>
              <input type="checkbox" checked={photoConsent} onChange={(e) => setPhotoConsent(e.target.checked)} required />
              I consent to display this photo under “Customer Photos — Verified Purchase” (never replaces official packshots).
            </label>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button type="submit" disabled={photoBusy} className="mc-btn mc-btn-accent" style={{ padding: '0.4rem 0.9rem', fontSize: '0.82rem' }}>
                {photoBusy ? 'Uploading...' : 'Publish Buyer Photo'}
              </button>
              <button type="button" className="mc-btn mc-btn-outline" style={{ padding: '0.4rem 0.9rem', fontSize: '0.82rem' }} onClick={() => setPhotoItemId(null)}>
                Cancel
              </button>
            </div>
          </form>
        )}
        <div style={{ borderTop: '1px solid var(--mc-border)', paddingTop: '0.75rem', marginTop: '0.5rem', fontSize: '0.9rem', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Subtotal</span><span>{formatINR(data.order.subtotal)}</span></div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Shipping</span><span>{formatINR(data.order.shippingFee)}</span></div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Taxes (GST)</span><span>{formatINR(data.order.taxAmount)}</span></div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}><span>Discount</span><span>-{formatINR(data.order.discountAmount)}</span></div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.15rem', paddingTop: '0.4rem', borderTop: '1px solid var(--mc-border)' }}>
            <strong>Total Paid</strong>
            <strong>{formatINR(data.order.totalAmount)}</strong>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.5rem' }}>
        <Link to="/lifecycle" className="mc-btn mc-btn-outline"><Recycle size={15} /> Repair / Exchange / Rent / Resell</Link>
        {canCancel && (
          <button type="button" className="mc-btn mc-btn-outline" onClick={() => setConfirmAction('cancel')}>Cancel Order</button>
        )}
        {canRefund && (
          <button type="button" className="mc-btn mc-btn-accent" onClick={() => setConfirmAction('refund')}>Request Refund</button>
        )}
      </div>

      {data.auditLogs?.length > 0 && (
        <div className="mc-linen-panel" style={{ padding: '1.2rem' }}>
          <h3 style={{ fontSize: '1.1rem', marginBottom: '0.6rem' }}>Payment Audit Trail</h3>
          {data.auditLogs.map((l: any) => (
            <div key={l.id} style={{ fontSize: '0.82rem', padding: '0.35rem 0', borderTop: '1px solid var(--mc-border)', color: 'var(--mc-muted)' }}>
              <strong>{l.eventType}</strong> ({l.status}) — {l.details}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export const WishlistPage: React.FC = () => {
  const { wishlist, toggleWishlist, addToCart } = useCart();
  const [pendingRemoveId, setPendingRemoveId] = useState<number | null>(null);

  return (
    <div className="mc-container" style={{ padding: '2.5rem 1.5rem 3.5rem' }}>
      <PageHeader
        title={`Saved Wishlist (${wishlist.length})`}
        subtitle="Saved items persist on your device and sync automatically when you sign in."
        breadcrumbs={[{ label: 'Wishlist' }]}
      />

      <ConfirmDialog
        open={pendingRemoveId !== null}
        title="Remove from wishlist?"
        message="Are you sure you want to remove this item from your wishlist?"
        confirmLabel="Yes, Remove"
        cancelLabel="Keep Item"
        onConfirm={() => { if (pendingRemoveId !== null) toggleWishlist(pendingRemoveId); setPendingRemoveId(null); }}
        onCancel={() => setPendingRemoveId(null)}
      />

      {wishlist.length === 0 ? (
        <div className="mc-linen-panel" style={{ padding: '2.5rem', textAlign: 'center' }}>
          <p style={{ color: 'var(--mc-muted)' }}>No saved items yet.</p>
          <Link to="/products" className="mc-btn mc-btn-primary">Browse Products</Link>
        </div>
      ) : (
        <div className="mc-grid-4">
          {wishlist.map((p) => (
            <div key={p.id} style={{ position: 'relative' }}>
              <ProductCard product={p} />
              <div style={{ display: 'flex', gap: '0.4rem', padding: '0 0.5rem 0.5rem' }}>
                <button
                  type="button"
                  className="mc-btn mc-btn-accent"
                  style={{ flex: 1, fontSize: '0.78rem', padding: '0.4rem 0.5rem' }}
                  onClick={() => addToCart(p.id, 1)}
                >
                  <ShoppingBag size={12} /> Move to Bag
                </button>
                <button
                  type="button"
                  className="mc-btn mc-btn-outline"
                  style={{ fontSize: '0.78rem', padding: '0.4rem 0.6rem' }}
                  onClick={() => setPendingRemoveId(p.id)}
                  aria-label="Remove from wishlist"
                >
                  <Trash2 size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export const LifecycleManagerPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const qc = useQueryClient();
  const { showToast } = useCart();

  const [tab, setTab] = useState<'REPAIR' | 'EXCHANGE' | 'RENT' | 'RESELL'>((searchParams.get('type') as any) || 'REPAIR');
  const [productId, setProductId] = useState(searchParams.get('productId') || '');
  const [issueOrReason, setIssueOrReason] = useState('');
  const [condition, setCondition] = useState('Gently Used');
  const [rentalDays, setRentalDays] = useState('7');
  const [askingPrice, setAskingPrice] = useState('');

  const { data: productsData } = useQuery({
    queryKey: ['lifecycle-products'],
    queryFn: async () => unwrap<{ items: Product[] }>(await api.get('/products?size=65')),
  });
  const { data: requests } = useQuery({
    queryKey: ['lifecycle-requests'],
    queryFn: async () => unwrap<any[]>(await api.get('/lifecycle')),
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productId) { showToast('Select a product'); return; }
    try {
      await api.post(`/lifecycle/${tab.toLowerCase()}`, {
        productId: Number(productId),
        issueOrReason,
        condition,
        rentalDays: Number(rentalDays || 7),
        askingPrice: askingPrice ? Number(askingPrice) : null,
      });
      setIssueOrReason('');
      qc.invalidateQueries({ queryKey: ['lifecycle-requests'] });
      showToast(`${tab} request logged in transparent queue`);
    } catch (err: any) {
      showToast(err?.response?.data?.message || 'Unable to submit lifecycle request.');
    }
  };

  return (
    <div className="mc-container" style={{ padding: '2.5rem 1.5rem 3.5rem' }}>
      <PageHeader
        title="Lifecycle Manager"
        subtitle="Manage repairs, exchanges, short-term rentals, and resale listings. External service-provider adapters are transparently queued until connected."
        breadcrumbs={[{ label: 'Lifecycle' }]}
      />

      <div className="mc-grid-2" style={{ gap: '2rem', alignItems: 'start' }}>
        <form onSubmit={handleSubmit} className="mc-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem' }}>
            {([
              { id: 'REPAIR', icon: Wrench },
              { id: 'EXCHANGE', icon: RefreshCw },
              { id: 'RENT', icon: Calendar },
              { id: 'RESELL', icon: Tag },
            ] as const).map((t) => (
              <button key={t.id} type="button" onClick={() => setTab(t.id)} className={`mc-btn ${tab === t.id ? 'mc-btn-primary' : 'mc-btn-outline'}`} style={{ padding: '0.45rem 0.9rem', fontSize: '0.82rem' }}>
                <t.icon size={14} /> {t.id}
              </button>
            ))}
          </div>

          <select className="mc-select" required value={productId} onChange={(e) => setProductId(e.target.value)}>
            <option value="">Select Product...</option>
            {(productsData?.items || []).map((p) => (
              <option key={p.id} value={p.id}>{p.name} ({formatINR(p.price)})</option>
            ))}
          </select>

          <textarea className="mc-textarea" rows={3} required value={issueOrReason} onChange={(e) => setIssueOrReason(e.target.value)} placeholder={tab === 'RESELL' ? 'Describe item condition and inclusions...' : `Describe your ${tab.toLowerCase()} reason...`} />

          {tab === 'RENT' && (
            <input type="number" min={1} max={90} className="mc-input" value={rentalDays} onChange={(e) => setRentalDays(e.target.value)} placeholder="Rental days" />
          )}
          {tab === 'RESELL' && (
            <div className="mc-grid-2">
              <select className="mc-select" value={condition} onChange={(e) => setCondition(e.target.value)}>
                <option>Like New</option>
                <option>Gently Used</option>
                <option>Fair</option>
              </select>
              <input type="number" min={50} className="mc-input" value={askingPrice} onChange={(e) => setAskingPrice(e.target.value)} placeholder="Asking price (₹)" />
            </div>
          )}

          <button type="submit" className="mc-btn mc-btn-accent">Submit {tab} Request</button>
        </form>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          <h2 style={{ fontSize: '1.5rem' }}>Active Lifecycle Records ({(requests || []).length})</h2>
          {(requests || []).map((r) => (
            <div key={r.id} className="mc-linen-panel" style={{ padding: '1rem 1.2rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                <span className="mc-badge mc-badge-burgundy">{r.requestType}</span>
                <span className="mc-badge">{r.status}</span>
              </div>
              <strong>{r.productName}</strong>
              <div style={{ fontSize: '0.85rem', color: 'var(--mc-muted)', marginTop: '0.25rem' }}>
                Estimate: {formatINR(r.estimatedValue)} • {r.details?.issueOrReason}
              </div>
              <div style={{ fontSize: '0.74rem', color: 'var(--mc-muted)', marginTop: '0.25rem' }}>
                Queue: {r.providerAdapterStatus}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
