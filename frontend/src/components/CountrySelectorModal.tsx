import React, { useEffect, useState } from 'react';
import { Globe, Search, CheckCircle2, AlertTriangle, X, Truck, Clock } from 'lucide-react';
import { useCountry } from '../context/CountryContext';
import { CountryView } from '../types';

const REGIONS = ['All', 'Asia', 'Europe', 'North America', 'South America', 'Africa', 'Oceania'];

function statusBadgeLabel(c: CountryView): { text: string; bg: string; color: string } {
  const st = c.availabilityStatus || (c.productCount >= 50 ? 'CATALOGUE_AVAILABLE' : c.productCount > 0 ? 'PARTIALLY_AVAILABLE' : c.popular ? 'DATASET_PENDING' : 'COMING_SOON');
  switch (st) {
    case 'CATALOGUE_AVAILABLE':
      return { text: `Catalogue Available (${c.productCount.toLocaleString('en-IN')})`, bg: 'var(--mc-blush)', color: 'var(--mc-burgundy)' };
    case 'PARTIALLY_AVAILABLE':
      return { text: `Partially Available (${c.productCount})`, bg: '#F7E7CE', color: '#7D4E1D' };
    case 'DATASET_PENDING':
      return { text: 'Dataset Pending', bg: 'var(--mc-ivory)', color: 'var(--mc-muted)' };
    default:
      return { text: 'Coming Soon', bg: '#F5EFE6', color: 'var(--mc-muted)' };
  }
}

export const CountrySelectorModal: React.FC = () => {
  const { countries, marketCountry, deliveryCountry, recentCountries, modalOpen, setModalOpen, selectCountries } = useCountry();
  const [search, setSearch] = useState('');
  const [selectedRegion, setSelectedRegion] = useState('All');
  const [pickedMarket, setPickedMarket] = useState(marketCountry);
  const [pickedDelivery, setPickedDelivery] = useState(deliveryCountry);

  useEffect(() => {
    if (modalOpen) {
      setPickedMarket(marketCountry);
      setPickedDelivery(deliveryCountry);
    }
  }, [modalOpen, marketCountry, deliveryCountry]);

  if (!modalOpen) return null;

  const q = search.trim().toLowerCase();
  const filtered = countries.filter((c) => {
    const matchRegion = selectedRegion === 'All' || (c.region || '').toLowerCase() === selectedRegion.toLowerCase();
    const matchSearch = !q
      || c.name.toLowerCase().includes(q)
      || c.code.toLowerCase().includes(q)
      || (c.iso3 || '').toLowerCase().includes(q)
      || c.currencyCode.toLowerCase().includes(q)
      || (c.dialCode || '').toLowerCase().includes(q);
    return matchRegion && matchSearch;
  });

  const popularDestinations = countries.filter((c) => c.popular);
  const recentCountryObjs = recentCountries
    .map((code) => countries.find((c) => c.code === code))
    .filter((c): c is CountryView => Boolean(c));

  const marketObj = countries.find((c) => c.code === pickedMarket);
  const deliveryObj = countries.find((c) => c.code === pickedDelivery);
  const crossBorderNotice = pickedMarket !== pickedDelivery;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="mc-country-modal-title"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 120,
        background: 'rgba(43, 34, 32, 0.58)',
        backdropFilter: 'blur(4px)',
        display: 'grid',
        placeItems: 'center',
        padding: '1rem',
      }}
    >
      <div
        className="mc-card"
        style={{
          width: 'min(900px, 100%)',
          maxHeight: '92vh',
          overflowY: 'auto',
          padding: '2rem',
          background: 'var(--mc-ivory)',
          border: '1px solid var(--mc-caramel)',
          position: 'relative',
        }}
      >
        <button
          type="button"
          aria-label="Close country selector"
          onClick={() => setModalOpen(false)}
          style={{
            position: 'absolute',
            top: '1.1rem',
            right: '1.1rem',
            background: 'var(--mc-surface)',
            border: '1px solid var(--mc-border)',
            borderRadius: '50%',
            width: 34,
            height: 34,
            display: 'grid',
            placeItems: 'center',
            cursor: 'pointer',
          }}
        >
          <X size={16} />
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--mc-burgundy)', fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.35rem' }}>
          <Globe size={14} /> Global ISO 3166 Markets ({countries.length} Countries &amp; Territories)
        </div>
        <h2 id="mc-country-modal-title" style={{ fontSize: 'clamp(1.7rem, 3.2vw, 2.35rem)', marginBottom: '0.4rem' }}>
          Where would you like to <em className="mc-editorial" style={{ fontStyle: 'italic', color: 'var(--mc-burgundy)' }}>shop?</em>
        </h2>
        <p style={{ margin: '0 0 1.15rem', color: 'var(--mc-muted)', fontSize: '0.94rem' }}>
          Choose your shopping destination to discover products, brands and prices available in your market.
        </p>

        {/* Search + Region Filters */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginBottom: '1.15rem' }}>
          <div style={{ position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'var(--mc-muted)' }} />
            <input
              type="search"
              className="mc-input"
              placeholder="Search any country, ISO code (FR, US, GB, JP), or currency (EUR, USD, GBP, INR)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: '2.5rem' }}
            />
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
            {REGIONS.map((reg) => {
              const active = selectedRegion === reg;
              return (
                <button
                  key={reg}
                  type="button"
                  onClick={() => setSelectedRegion(reg)}
                  className={`mc-badge ${active ? 'mc-badge-burgundy' : ''}`}
                  style={{ cursor: 'pointer', background: active ? undefined : 'var(--mc-surface)' }}
                >
                  {reg}
                </button>
              );
            })}
          </div>
        </div>

        {/* Recently Selected Countries */}
        {recentCountryObjs.length > 0 && (
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--mc-muted)', marginBottom: '0.35rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <Clock size={12} /> Recently Selected
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
              {recentCountryObjs.map((c) => (
                <button
                  key={`rec-${c.code}`}
                  type="button"
                  onClick={() => setPickedMarket(c.code)}
                  className={`mc-badge ${pickedMarket === c.code ? 'mc-badge-burgundy' : ''}`}
                  style={{ cursor: 'pointer', background: pickedMarket === c.code ? undefined : 'var(--mc-surface)' }}
                >
                  {c.flagEmoji} {c.name} ({c.currencyCode})
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Popular Destinations Strip */}
        {!q && selectedRegion === 'All' && popularDestinations.length > 0 && (
          <div style={{ marginBottom: '1rem' }}>
            <div style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--mc-burgundy)', marginBottom: '0.35rem' }}>
              Popular Shopping Destinations
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
              {popularDestinations.map((c) => (
                <button
                  key={`pop-${c.code}`}
                  type="button"
                  onClick={() => setPickedMarket(c.code)}
                  className={`mc-badge ${pickedMarket === c.code ? 'mc-badge-burgundy' : 'mc-badge-blush'}`}
                  style={{ cursor: 'pointer' }}
                >
                  {c.flagEmoji} {c.name} • {c.currencyCode} {c.currencySymbol}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Scrollable Grid of ALL Matching Countries */}
        <div style={{ fontSize: '0.74rem', color: 'var(--mc-muted)', marginBottom: '0.45rem' }}>
          Showing {filtered.length} of {countries.length} global markets
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(215px, 1fr))',
            gap: '0.6rem',
            maxHeight: 280,
            overflowY: 'auto',
            paddingRight: '0.25rem',
            marginBottom: '1.25rem',
          }}
        >
          {filtered.map((c) => {
            const active = pickedMarket === c.code;
            const st = statusBadgeLabel(c);
            return (
              <button
                key={c.code}
                type="button"
                onClick={() => setPickedMarket(c.code)}
                className="mc-card"
                style={{
                  padding: '0.8rem 0.9rem',
                  textAlign: 'left',
                  cursor: 'pointer',
                  background: active ? '#FAF0F3' : 'var(--mc-surface)',
                  border: active ? '2px solid var(--mc-burgundy)' : '1px solid var(--mc-border)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.25rem',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '1.35rem', lineHeight: 1 }}>{c.flagEmoji}</span>
                  <span className="mc-badge" style={{ fontSize: '0.67rem' }}>
                    {c.currencyCode} ({c.currencySymbol})
                  </span>
                </div>
                <div style={{ fontWeight: 700, fontSize: '0.92rem', color: 'var(--mc-chocolate)' }}>{c.name}</div>
                <div style={{ fontSize: '0.71rem', color: 'var(--mc-muted)' }}>
                  {c.code}{c.iso3 ? `/${c.iso3}` : ''} • {c.region || 'Global'} {c.dialCode ? `• ${c.dialCode}` : ''}
                </div>
                <div style={{ marginTop: '0.2rem' }}>
                  <span className="mc-badge" style={{ fontSize: '0.64rem', background: st.bg, color: st.color }}>
                    {c.datasetAvailable && <CheckCircle2 size={10} />} {st.text}
                  </span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Delivery Country Selection & Cross-Border Notice */}
        <div className="mc-linen-panel" style={{ padding: '0.95rem', marginBottom: '1.2rem', display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
            <label htmlFor="mc-delivery-country" style={{ fontSize: '0.84rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
              <Truck size={15} color="var(--mc-burgundy)" /> Delivery Country:
            </label>
            <select
              id="mc-delivery-country"
              className="mc-select"
              style={{ maxWidth: 280 }}
              value={pickedDelivery}
              onChange={(e) => setPickedDelivery(e.target.value)}
            >
              {countries.map((c) => (
                <option key={`del-${c.code}`} value={c.code}>{c.flagEmoji} {c.name} ({c.code})</option>
              ))}
            </select>
          </div>
          {crossBorderNotice && (
            <div style={{ fontSize: '0.79rem', color: 'var(--mc-burgundy)', display: 'flex', alignItems: 'flex-start', gap: '0.4rem' }}>
              <AlertTriangle size={14} style={{ flexShrink: 0, marginTop: 2 }} />
              <span>
                Selected shopping market: <strong>{marketObj?.name || pickedMarket}</strong> • Delivery destination: <strong>{deliveryObj?.name || pickedDelivery}</strong>. Cross-border eligibility depends on each brand &amp; Data Boutique dataset.
              </span>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button type="button" className="mc-btn mc-btn-outline" onClick={() => setModalOpen(false)}>
            Cancel
          </button>
          <button
            type="button"
            className="mc-btn mc-btn-accent"
            onClick={() => selectCountries(pickedMarket, pickedDelivery)}
          >
            Continue to {marketObj?.flagEmoji} {marketObj?.name || pickedMarket} ({marketObj?.currencyCode} {marketObj?.currencySymbol})
          </button>
        </div>
      </div>
    </div>
  );
};
