import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, useReducedMotion } from 'framer-motion';
import { useQuery } from '@tanstack/react-query';
import {
  Sparkles, ArrowRight, CheckCircle2, ShieldCheck, Recycle, Layers, Compass,
  Sliders, Globe, Users, AlertCircle
} from 'lucide-react';
import { api, unwrap } from '../services/api';
import { useCountry } from '../context/CountryContext';
import { HomepageEditorialData, Product, ProductCounts, SmartSearchResponse } from '../types';
import { ProductCard } from '../components/ProductCard';
import { EditorialCollectionGallery } from '../components/EditorialCollectionGallery';

const EXAMPLE_PROMPTS = [
  {
    label: 'Skincare routine under ₹2,000',
    prompt: 'Build a skincare routine under ₹2,000.',
    budget: '2000',
  },
  {
    label: 'Designer handbag in France',
    prompt: 'Find a designer handbag in France.',
    budget: '',
  },
  {
    label: 'Five-day travel plan',
    prompt: 'Help me plan a five-day trip under ₹7,000.',
    budget: '7000',
  },
  {
    label: 'Milk products under ₹1,000',
    prompt: 'Milk products under ₹1,000',
    budget: '1000',
  },
  {
    label: "Women's dresses under ₹3,000",
    prompt: "Women's dresses under ₹3,000",
    budget: '3000',
  },
  {
    label: 'Beauty category',
    prompt: 'Beauty',
    budget: '',
  },
];

const MARQUEE_ASSETS = [
  { src: '/verified-media/hero_workspace.jpg', label: 'Minimal Workspace', alt: 'Minimal workspace desk with coffee and notebook' },
  { src: '/verified-media/elec_kettle.jpg', label: 'Modern Home', alt: 'Stainless electric kettle' },
  { src: '/verified-media/fash_sneakers.png', label: 'Streetwear & Footwear', alt: 'Minimal white leather sneakers' },
  { src: '/verified-media/skin_dropper.jpg', label: 'Beauty Ritual', alt: 'Glass dropper skincare bottle' },
  { src: '/verified-media/home_vase.jpg', label: 'Soft Living', alt: 'Hand-glazed porcelain vase' },
  { src: '/verified-media/elec_headphones.jpg', label: 'Deep Focus Audio', alt: 'Over-ear wireless headphones' },
  { src: '/verified-media/fit_mat.jpg', label: 'Fitness & Wellness', alt: 'Rolled yoga mat' },
  { src: '/verified-media/kit_mug.jpg', label: 'Everyday Essentials', alt: 'Stoneware coffee cup' },
];

const SHOWCASE_MARKET_CODES = ['IN', 'FR', 'IT', 'GB', 'US', 'JP'];

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const shouldReduceMotion = useReducedMotion();
  const { countries, marketCountry, deliveryCountry, activeCountryObj, setModalOpen, selectCountries } = useCountry();

  const [prompt, setPrompt] = useState('');
  const [missionPrompt, setMissionPrompt] = useState('');
  const [budget, setBudget] = useState('');
  const [planning, setPlanning] = useState(false);
  const [planError, setPlanError] = useState<string | null>(null);
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterSaved, setNewsletterSaved] = useState(false);

  const { data: countsData } = useQuery({
    queryKey: ['product-counts'],
    queryFn: async () => unwrap<ProductCounts>(await api.get('/products/count')),
  });

  const { data: homeEditorial } = useQuery({
    queryKey: ['home-editorial', marketCountry],
    queryFn: async () => unwrap<HomepageEditorialData>(await api.get(`/home/editorial?country=${marketCountry}`)),
  });

  const { data: featuredData, isLoading: loadingProducts } = useQuery({
    queryKey: ['featured-country-products', marketCountry],
    queryFn: async () => unwrap<{ items: Product[] }>(await api.get(`/products?country=${marketCountry}&verifiedImagesOnly=true&size=8`)),
  });

  const runSmartSearch = async (queryText: string, budgetVal?: string) => {
    const clean = queryText.trim();
    if (!clean) {
      setPlanError('Tell us what you are looking for or planning so MissionCart can match real products.');
      return;
    }
    setPlanError(null);
    setPlanning(true);
    try {
      const res = await api.post('/ai/search', {
        query: clean,
        countryCode: marketCountry,
        budget: budgetVal ? Number(budgetVal) : null,
      });
      const data = unwrap<SmartSearchResponse>(res);
      if (data.intentType === 'CATEGORY_SEARCH' && data.targetCategorySlug) {
        navigate(`/categories/${data.targetCategorySlug}`);
        return;
      }
      if (data.intentType === 'PURPOSE_MISSION' && data.missionPlan?.id) {
        navigate(`/mission-result/${data.missionPlan.id}`);
        return;
      }
      navigate(`/ai-search?q=${encodeURIComponent(clean)}`);
    } catch (err: any) {
      setPlanError(err?.response?.data?.message || 'Unable to process search right now.');
    } finally {
      setPlanning(false);
    }
  };

  useEffect(() => {
    setPlanError(null);
  }, [marketCountry]);

  const featuredProducts = featuredData?.items || [];
  const totalInActiveCountry = homeEditorial?.totalCountryProducts ?? activeCountryObj.productCount ?? 0;
  const globalVerified = countsData?.imageVerifiedProducts ?? 0;
  const internationalShowcase = SHOWCASE_MARKET_CODES
    .map((code) => countries.find((c) => c.code === code))
    .filter((c): c is NonNullable<typeof c> => Boolean(c));

  return (
    <div>
      {/* 2. COUNTRY SELECTION INDICATOR BAR */}
      <div style={{ background: 'var(--mc-surface)', borderBottom: '1px solid var(--mc-border)', padding: '0.55rem 0' }}>
        <div className="mc-container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.6rem', fontSize: '0.82rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
            <Globe size={14} color="var(--mc-burgundy)" />
            <span>
              Active Market: <strong>{activeCountryObj.flagEmoji} {activeCountryObj.name}</strong> ({activeCountryObj.currencyCode} {activeCountryObj.currencySymbol})
            </span>
            <span className="mc-badge mc-badge-ivory" style={{ fontSize: '0.68rem' }}>
              {totalInActiveCountry > 0 ? `Catalogue Available (${totalInActiveCountry.toLocaleString('en-IN')})` : 'Dataset Pending'}
            </span>
            {deliveryCountry !== marketCountry && (
              <span className="mc-badge mc-badge-blush" style={{ fontSize: '0.68rem' }}>Delivering to: {deliveryCountry}</span>
            )}
          </div>
          <button type="button" onClick={() => setModalOpen(true)} style={{ background: 'none', border: 'none', color: 'var(--mc-burgundy)', fontWeight: 700, cursor: 'pointer', fontSize: '0.8rem', textDecoration: 'underline' }}>
            Switch Country ({countries.length} Markets)
          </button>
        </div>
      </div>

      {/* Informative Banner when foreign country has no imported dataset yet */}
      {homeEditorial && homeEditorial.totalCountryProducts === 0 && (
        <div style={{ background: '#FAF0F3', borderBottom: '1px solid var(--mc-burgundy)', padding: '0.9rem 0' }}>
          <div className="mc-container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.55rem', fontSize: '0.88rem', color: 'var(--mc-chocolate)' }}>
              <AlertCircle size={16} color="var(--mc-burgundy)" />
              <span>
                Your selected shopping market ({activeCountryObj.flagEmoji} <strong>{activeCountryObj.name}</strong>) is being prepared. You can explore available worldwide products or check back when more catalogues are available.
              </span>
            </div>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button type="button" className="mc-btn mc-btn-outline" style={{ padding: '0.32rem 0.8rem', fontSize: '0.78rem' }} onClick={() => selectCountries('IN', deliveryCountry)}>
                Explore India Catalogue (🇮🇳)
              </button>
              <Link to="/retailers" className="mc-btn mc-btn-accent" style={{ padding: '0.32rem 0.8rem', fontSize: '0.78rem' }}>
                Data Boutique Status
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* 3 & 4. CENTERED EDITORIAL HERO + AI SHOPPING SEARCH */}
      <section
        style={{
          padding: '4.2rem 1.5rem 3.5rem',
          background: 'linear-gradient(180deg, #F6EFE6 0%, var(--mc-ivory) 100%)',
          borderBottom: '1px solid var(--mc-border)',
          textAlign: 'center',
        }}
      >
        <div className="mc-container" style={{ maxWidth: 960 }}>
          <motion.div
            initial={shouldReduceMotion ? false : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55 }}
          >
            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.15rem' }}>
              <span className="mc-badge mc-badge-blush">
                <Sparkles size={12} /> {homeEditorial?.collections?.length || 14} Editorial Collections
                {globalVerified > 0 ? ` • ${globalVerified.toLocaleString('en-IN')} Verified Products` : ''}
              </span>
              <span className="mc-badge mc-badge-ivory">
                {activeCountryObj.flagEmoji} {activeCountryObj.name} • {activeCountryObj.currencyCode} {activeCountryObj.currencySymbol}
              </span>
            </div>

            <h1
              style={{
                fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif",
                fontWeight: 700,
                fontSize: 'clamp(2.65rem, 5.6vw, 4.45rem)',
                lineHeight: 1.05,
                letterSpacing: '-0.025em',
                color: 'var(--mc-chocolate)',
                marginBottom: '1.1rem',
              }}
            >
              Your world. Your style.
              <br />
              <em
                style={{
                  fontFamily: "'Fraunces', 'Cormorant Garamond', Georgia, serif",
                  fontStyle: 'italic',
                  fontWeight: 400,
                  color: 'var(--mc-burgundy)',
                }}
              >
                Your MissionCart.
              </em>
            </h1>

            <p style={{ maxWidth: 650, margin: '0 auto 2rem', fontSize: '1.08rem', color: 'var(--mc-muted)', lineHeight: 1.65 }}>
              Discover thoughtful collections, explore global brands and find everything you need for life&apos;s next chapter.
            </p>

            {/* AI Shopping Search Bar */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                runSmartSearch(prompt, budget);
              }}
              className="mc-card"
              style={{
                maxWidth: 780,
                margin: '0 auto 1.25rem',
                padding: '1rem',
                background: 'rgba(255, 255, 255, 0.96)',
                boxShadow: 'var(--mc-shadow-lift)',
                borderColor: 'var(--mc-caramel)',
                textAlign: 'left',
              }}
            >
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 160px auto', gap: '0.65rem', alignItems: 'center' }} className="mc-hero-controls">
                <input
                  id="hero-ai-search"
                  type="text"
                  className="mc-input"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder='Try "Beauty", "Milk products under ₹1,000", "Build a skincare routine", or any product...'
                  aria-label="AI Shopping Search"
                />
                <input
                  type="number"
                  min={100}
                  className="mc-input"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  placeholder={`Budget (${activeCountryObj.currencySymbol})`}
                  aria-label="Optional Budget"
                />
                <button type="submit" disabled={planning} className="mc-btn mc-btn-accent" style={{ whiteSpace: 'nowrap' }}>
                  {planning ? 'Searching...' : 'Search with AI'} <ArrowRight size={16} />
                </button>
              </div>
              {planError && <p style={{ color: 'var(--mc-burgundy)', fontSize: '0.84rem', margin: '0.55rem 0 0' }}>{planError}</p>}
            </form>

            {/* Example Prompt Pills */}
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '0.45rem' }}>
              {EXAMPLE_PROMPTS.map((ex) => (
                <button
                  key={ex.label}
                  type="button"
                  onClick={() => {
                    setPrompt(ex.prompt);
                    setBudget(ex.budget);
                  }}
                  className="mc-badge"
                  style={{ cursor: 'pointer', padding: '0.38rem 0.85rem', background: 'var(--mc-surface)' }}
                >
                  {ex.label}
                </button>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* 5. INFINITE PAUSE-ON-HOVER EDITORIAL IMAGE MARQUEE */}
      <section aria-label="Curated Visual Showcase" style={{ padding: '1.85rem 0', borderBottom: '1px solid var(--mc-border)', background: 'var(--mc-surface)', overflow: 'hidden' }}>
        <div className="mc-marquee-wrap" tabIndex={0}>
          <div className="mc-marquee-track">
            {[...MARQUEE_ASSETS, ...MARQUEE_ASSETS].map((item, idx) => (
              <div
                key={`${item.label}-${idx}`}
                style={{
                  width: idx % 2 === 0 ? 210 : 265,
                  height: idx % 3 === 0 ? 175 : 155,
                  borderRadius: 'var(--mc-radius-md)',
                  overflow: 'hidden',
                  position: 'relative',
                  flexShrink: 0,
                  border: '1px solid var(--mc-border)',
                }}
              >
                <img src={item.src} alt={item.alt} referrerPolicy="no-referrer" loading="lazy" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                <span style={{ position: 'absolute', bottom: '0.55rem', left: '0.55rem', background: 'rgba(43,34,32,0.84)', color: 'var(--mc-ivory)', fontSize: '0.72rem', padding: '0.2rem 0.65rem', borderRadius: 'var(--mc-radius-pill)', border: '1px solid rgba(198,155,109,0.5)' }}>
                  {item.label}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 6. LARGE EDITORIAL COLLECTIONS COLLAGE SHOWCASE */}
      <section style={{ padding: '4.25rem 0 2.5rem' }}>
        <div className="mc-container">
          <div style={{ textAlign: 'center', maxWidth: 740, margin: '0 auto 2.5rem' }}>
            <h2
              style={{
                fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif",
                fontWeight: 700,
                fontSize: 'clamp(2.15rem, 4.2vw, 3.35rem)',
                lineHeight: 1.08,
                color: 'var(--mc-chocolate)',
                marginBottom: '0.65rem',
              }}
            >
              Explore our collections.
              <br />
              <em style={{ fontFamily: "'Fraunces', Georgia, serif", fontStyle: 'italic', fontWeight: 400, color: 'var(--mc-burgundy)' }}>
                Find your kind of everything.
              </em>
            </h2>
            <p style={{ margin: 0, fontSize: '1rem', color: 'var(--mc-muted)' }}>
              Carefully curated products, beautiful collections and brands worth discovering.
            </p>
          </div>

          {homeEditorial && (
            <EditorialCollectionGallery
              categorySlug="home-featured"
              collections={homeEditorial.collections}
              countryCode={marketCountry}
            />
          )}
        </div>
      </section>

      {/* 7. SHOP BY CATEGORY (10 EDITORIAL CATEGORY TILES) */}
      <section style={{ padding: '3.75rem 0', background: 'var(--mc-surface)', borderTop: '1px solid var(--mc-border)', borderBottom: '1px solid var(--mc-border)' }}>
        <div className="mc-container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
            <div>
              <span style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.09em', color: 'var(--mc-burgundy)', fontWeight: 700 }}>Shop by Category</span>
              <h2 style={{ fontSize: 'clamp(1.9rem, 3.2vw, 2.75rem)', marginTop: '0.3rem', marginBottom: 0 }}>Individual editorial worlds.</h2>
            </div>
            <Link to="/categories" className="mc-btn mc-btn-outline">All Categories <ArrowRight size={15} /></Link>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '1rem' }}>
            {(homeEditorial?.categories || []).map((cat) => (
              <Link key={cat.title} to={`/categories/${cat.routeSlug}`} className="mc-card" style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ height: 160, background: '#FAF6F0', overflow: 'hidden', position: 'relative' }}>
                    <img src={cat.imageUrl} alt={cat.title} loading="lazy" referrerPolicy="no-referrer" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    <span className="mc-badge mc-badge-ivory" style={{ position: 'absolute', top: '0.55rem', right: '0.55rem', fontSize: '0.67rem' }}>
                      {cat.productCount > 0 ? `${cat.productCount.toLocaleString('en-IN')} items` : 'Explore'}
                    </span>
                  </div>
                  <div style={{ padding: '1rem' }}>
                    <h3 style={{ fontSize: '1.18rem', marginBottom: '0.3rem', color: 'var(--mc-chocolate)' }}>{cat.title}</h3>
                    <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--mc-muted)' }}>{cat.description}</p>
                  </div>
                </div>
                <div style={{ padding: '0 1rem 0.9rem', fontSize: '0.8rem', fontWeight: 700, color: 'var(--mc-burgundy)', display: 'inline-flex', alignItems: 'center', gap: '0.3rem' }}>
                  Explore {cat.title} <ArrowRight size={13} />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* 8. COUNTRY-BASED INTERNATIONAL COLLECTIONS */}
      <section style={{ padding: '4rem 0' }}>
        <div className="mc-container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
            <div>
              <span style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.09em', color: 'var(--mc-burgundy)', fontWeight: 700 }}>Global Markets</span>
              <h2 style={{ fontSize: 'clamp(1.95rem, 3.2vw, 2.8rem)', marginTop: '0.3rem', marginBottom: '0.3rem' }}>
                Discover the world of <em className="mc-editorial" style={{ fontStyle: 'italic', color: 'var(--mc-burgundy)' }}>style.</em>
              </h2>
              <p style={{ margin: 0, color: 'var(--mc-muted)', fontSize: '0.94rem' }}>
                Switch between all {countries.length} global ISO markets. Unimported luxury datasets are labelled honestly until synced via Data Boutique or ZIP upload.
              </p>
            </div>
            <button type="button" className="mc-btn mc-btn-accent" onClick={() => setModalOpen(true)}>
              <Globe size={15} /> Explore Global Shopping
            </button>
          </div>

          <div className="mc-grid-3">
            {internationalShowcase.map((c) => {
              const isSelected = marketCountry === c.code;
              return (
                <div
                  key={c.code}
                  className="mc-card"
                  style={{
                    padding: '1.35rem',
                    background: isSelected ? '#FAF0F3' : 'var(--mc-surface)',
                    borderColor: isSelected ? 'var(--mc-burgundy)' : 'var(--mc-border)',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    gap: '0.85rem',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
                      <span style={{ fontSize: '1.9rem', lineHeight: 1 }}>{c.flagEmoji}</span>
                      <span className="mc-badge mc-badge-blush">{c.currencyCode} {c.currencySymbol}</span>
                    </div>
                    <h3 style={{ fontSize: '1.3rem', marginBottom: '0.25rem' }}>{c.name}</h3>
                    <div style={{ fontSize: '0.8rem', color: 'var(--mc-muted)' }}>
                      {c.datasetAvailable
                        ? `Catalogue Available (${c.productCount.toLocaleString('en-IN')} verified products)`
                        : 'Dataset Pending (Authorized feed / ZIP ready)'}
                    </div>
                  </div>
                  <button
                    type="button"
                    className={`mc-btn ${isSelected ? 'mc-btn-accent' : 'mc-btn-outline'}`}
                    style={{ width: '100%', padding: '0.45rem 0.9rem', fontSize: '0.82rem' }}
                    onClick={() => selectCountries(c.code, deliveryCountry)}
                  >
                    {isSelected ? `Active Market (${c.code})` : `Switch to ${c.name}`}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* 9 & 10. FASHION & BEAUTY EDITORIAL HIGHLIGHTS */}
      {homeEditorial && (homeEditorial.fashionCollections.length > 0 || homeEditorial.beautyCollections.length > 0) && (
        <section style={{ padding: '3.5rem 0', background: 'var(--mc-surface)', borderTop: '1px solid var(--mc-border)', borderBottom: '1px solid var(--mc-border)' }}>
          <div className="mc-container">
            {homeEditorial.fashionCollections.length > 0 && (
              <div style={{ marginBottom: '2.5rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <h2 style={{ fontSize: '1.85rem', margin: 0 }}>
                    Fashion Edit <em className="mc-editorial" style={{ fontStyle: 'italic', color: 'var(--mc-burgundy)' }}>Collections</em>
                  </h2>
                  <Link to="/categories/fashion" style={{ color: 'var(--mc-burgundy)', fontWeight: 700, fontSize: '0.86rem' }}>
                    Open Fashion Editorial →
                  </Link>
                </div>
                <EditorialCollectionGallery categorySlug="fashion" collections={homeEditorial.fashionCollections} countryCode={marketCountry} />
              </div>
            )}

            {homeEditorial.beautyCollections.length > 0 && (
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '0.75rem' }}>
                  <h2 style={{ fontSize: '1.85rem', margin: 0 }}>
                    Beauty Ritual <em className="mc-editorial" style={{ fontStyle: 'italic', color: 'var(--mc-burgundy)' }}>Collections</em>
                  </h2>
                  <Link to="/categories/beauty" style={{ color: 'var(--mc-burgundy)', fontWeight: 700, fontSize: '0.86rem' }}>
                    Open Beauty Editorial →
                  </Link>
                </div>
                <EditorialCollectionGallery categorySlug="beauty" collections={homeEditorial.beautyCollections} countryCode={marketCountry} />
              </div>
            )}
          </div>
        </section>
      )}

      {/* 11. FEATURED BRANDS GALLERY */}
      {homeEditorial && homeEditorial.featuredBrands.length > 0 && (
        <section style={{ padding: '3.25rem 0' }}>
          <div className="mc-container">
            <h2 style={{ fontSize: '1.75rem', marginBottom: '0.4rem' }}>Featured Brands in {activeCountryObj.name}</h2>
            <p style={{ margin: '0 0 1.25rem', fontSize: '0.9rem', color: 'var(--mc-muted)' }}>
              Verified active brands plus international luxury houses connected via Data Boutique.
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.6rem' }}>
              {homeEditorial.featuredBrands.map((b) => (
                <Link
                  key={b.name}
                  to={`/products?brand=${encodeURIComponent(b.name)}&country=${marketCountry}`}
                  className="mc-card"
                  style={{ padding: '0.65rem 1.05rem', display: 'inline-flex', alignItems: 'center', gap: '0.45rem', background: 'var(--mc-surface)' }}
                >
                  <strong style={{ fontSize: '0.88rem' }}>{b.name}</strong>
                  <span className={`mc-badge ${b.status === 'ACTIVE' ? 'mc-badge-blush' : 'mc-badge-ivory'}`} style={{ fontSize: '0.64rem' }}>
                    {b.status === 'ACTIVE' ? 'Available' : 'Coming Soon'}
                  </span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* 12. FEATURED CURATED PRODUCTS UNDERNEATH */}
      <section style={{ padding: '4rem 0', background: 'var(--mc-background-secondary)', borderTop: '1px solid var(--mc-border)', borderBottom: '1px solid var(--mc-border)' }}>
        <div className="mc-container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
            <div>
              <span className="mc-badge mc-badge-blush" style={{ marginBottom: '0.5rem' }}><CheckCircle2 size={12} /> Curated Catalogue in {activeCountryObj.flagEmoji} {activeCountryObj.name}</span>
              <h2 style={{ fontSize: 'clamp(1.9rem, 3.2vw, 2.75rem)', margin: 0 }}>Curated Catalogue Highlights</h2>
            </div>
            <Link to={`/products?country=${marketCountry}`} className="mc-btn mc-btn-accent">
              Browse {totalInActiveCountry > 0 ? `${totalInActiveCountry.toLocaleString('en-IN')} ` : ''}Products <ArrowRight size={15} />
            </Link>
          </div>
          {loadingProducts ? (
            <div className="mc-grid-4">
              {Array.from({ length: 4 }).map((_, i) => <div key={i} className="mc-card" style={{ height: 350, background: 'var(--mc-card)', opacity: 0.7 }} />)}
            </div>
          ) : featuredProducts.length === 0 ? (
            <div className="mc-linen-panel" style={{ padding: '2.5rem', textAlign: 'center' }}>
              <h3 style={{ marginBottom: '0.4rem' }}>Dataset Pending for {activeCountryObj.flagEmoji} {activeCountryObj.name}</h3>
              <p style={{ color: 'var(--mc-muted)', marginBottom: '1rem' }}>
                No products have been imported for {activeCountryObj.name} yet. Switch markets or upload an authorized ZIP / Data Boutique archive.
              </p>
              <button type="button" className="mc-btn mc-btn-outline" onClick={() => setModalOpen(true)}>Choose Market</button>
            </div>
          ) : (
            <div className="mc-grid-4">
              {featuredProducts.slice(0, 8).map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* 13. AI MISSIONCART SHOWCASE & HOW IT WORKS */}
      <section style={{ padding: '4.5rem 0' }}>
        <div className="mc-container">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: '1.5rem', marginBottom: '2.25rem' }}>
            <div style={{ maxWidth: 640 }}>
              <span style={{ fontSize: '0.78rem', textTransform: 'uppercase', letterSpacing: '0.09em', color: 'var(--mc-burgundy)', fontWeight: 700 }}>MissionCart Intelligence</span>
              <h2 style={{ fontSize: 'clamp(1.95rem, 3.4vw, 2.85rem)', marginTop: '0.35rem', marginBottom: '0.4rem' }}>
                Don&apos;t just search. <em className="mc-editorial" style={{ fontStyle: 'italic', color: 'var(--mc-burgundy)' }}>Tell us what you&apos;re planning.</em>
              </h2>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                runSmartSearch(missionPrompt, budget);
              }}
              style={{ display: 'flex', gap: '0.5rem', flex: '1 1 320px', maxWidth: 460 }}
            >
              <input className="mc-input" placeholder="Plan a hostel move-in or kitchen setup..." value={missionPrompt} onChange={(e) => setMissionPrompt(e.target.value)} />
              <button type="submit" className="mc-btn mc-btn-accent" style={{ whiteSpace: 'nowrap' }}>Plan Mission</button>
            </form>
          </div>

          <div className="mc-grid-5" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(195px, 1fr))', gap: '1rem' }}>
            {[
              { step: '01', icon: Compass, title: 'Describe your situation', desc: 'Share goals, budget currency, and items you already own.' },
              { step: '02', icon: Sparkles, title: 'MissionCart understands', desc: 'Disambiguates grocery vs beauty vs apparel and detects intent.' },
              { step: '03', icon: Layers, title: 'We discover suitable products', desc: 'Matches verified database records with compatibility checks.' },
              { step: '04', icon: Sliders, title: 'We optimize your budget', desc: 'Separates total bundle budget from per-item price ceilings.' },
              { step: '05', icon: ShieldCheck, title: 'Shop your personalized mission', desc: 'Native checkout plus grouped external brand handoff.' },
            ].map((item) => (
              <div key={item.step} className="mc-linen-panel" style={{ padding: '1.35rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.7rem' }}>
                  <span className="mc-serif" style={{ fontSize: '1.5rem', color: 'var(--mc-burgundy)' }}>{item.step}</span>
                  <item.icon size={18} color="var(--mc-caramel)" />
                </div>
                <h3 style={{ fontSize: '1.08rem', marginBottom: '0.35rem' }}>{item.title}</h3>
                <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--mc-muted)' }}>{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 14 & 15. SHARED SHOPPING + CIRCULAR LIFECYCLE */}
      <section style={{ padding: '3.25rem 0', background: 'var(--mc-surface)', borderTop: '1px solid var(--mc-border)' }}>
        <div className="mc-container mc-grid-2" style={{ gap: '1.5rem' }}>
          <div className="mc-linen-panel" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '0.9rem' }}>
            <div>
              <span className="mc-badge mc-badge-blush" style={{ marginBottom: '0.6rem' }}><Users size={12} /> Shared Missions</span>
              <h3 style={{ fontSize: '1.5rem', marginBottom: '0.4rem' }}>Collaborate live on household &amp; group setups.</h3>
              <p style={{ margin: 0, color: 'var(--mc-muted)', fontSize: '0.9rem' }}>Share room checklists with roommates or family so no item is bought twice.</p>
            </div>
            <Link to="/shared-missions" className="mc-btn mc-btn-outline" style={{ width: 'fit-content' }}>Open Shared Missions</Link>
          </div>
          <div className="mc-linen-panel" style={{ padding: '1.75rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '0.9rem' }}>
            <div>
              <span className="mc-badge mc-badge-caramel" style={{ marginBottom: '0.6rem' }}><Recycle size={12} /> Circular Lifecycle</span>
              <h3 style={{ fontSize: '1.5rem', marginBottom: '0.4rem' }}>Repair, exchange, rent &amp; resell past purchases.</h3>
              <p style={{ margin: 0, color: 'var(--mc-muted)', fontSize: '0.9rem' }}>Keep verified electronics and furniture useful well beyond the initial checkout.</p>
            </div>
            <Link to="/lifecycle" className="mc-btn mc-btn-outline" style={{ width: 'fit-content' }}>Open Lifecycle Manager</Link>
          </div>
        </div>
      </section>

      {/* 16. NEWSLETTER */}
      <section style={{ padding: '3.5rem 0', background: 'var(--mc-card)', borderTop: '1px solid var(--mc-border)' }}>
        <div className="mc-container">
          <div className="mc-card" style={{ padding: '2.2rem', display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: '1.5rem', borderColor: 'var(--mc-caramel)' }}>
            <div style={{ maxWidth: 500 }}>
              <h3 style={{ fontSize: '1.5rem', marginBottom: '0.35rem' }}>Curated purpose guides, once a month.</h3>
              <p style={{ margin: 0, color: 'var(--mc-muted)', fontSize: '0.92rem' }}>Seasonal edits for global style, hostel move-ins, and calm home setups.</p>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (newsletterEmail.trim()) setNewsletterSaved(true);
              }}
              style={{ display: 'flex', gap: '0.6rem', flex: '1 1 320px', maxWidth: 420 }}
            >
              <input type="email" required value={newsletterEmail} onChange={(e) => setNewsletterEmail(e.target.value)} placeholder="you@example.com" className="mc-input" />
              <button type="submit" className="mc-btn mc-btn-accent">{newsletterSaved ? 'Subscribed' : 'Subscribe'}</button>
            </form>
          </div>
        </div>
      </section>

      <style>{`
        @media (max-width: 720px) {
          .mc-hero-controls { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
};
