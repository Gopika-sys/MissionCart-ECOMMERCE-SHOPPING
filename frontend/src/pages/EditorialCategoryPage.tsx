import React, { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Globe, Sparkles, X, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';
import { api, unwrap, formatCurrency } from '../services/api';
import { useCountry } from '../context/CountryContext';
import { EditorialCategoryPageData, Product } from '../types';
import { EditorialCollectionGallery } from '../components/EditorialCollectionGallery';
import { ProductCard } from '../components/ProductCard';

export const EditorialCategoryPage: React.FC = () => {
  const { slug = 'fashion', collectionSlug } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  const { marketCountry, deliveryCountry, activeCountryObj, setModalOpen } = useCountry();

  const effectiveCountry = (searchParams.get('country') || marketCountry || 'IN').toUpperCase();
  const [selectedSubcategory, setSelectedSubcategory] = useState(searchParams.get('q') || '');
  const [selectedBrand, setSelectedBrand] = useState(searchParams.get('brand') || '');
  const [gender, setGender] = useState(searchParams.get('gender') || '');
  const [minPrice, setMinPrice] = useState(searchParams.get('minPrice') || '');
  const [maxPrice, setMaxPrice] = useState(searchParams.get('maxPrice') || '');
  const [inStockOnly, setInStockOnly] = useState(false);
  const [sort, setSort] = useState('relevance');
  const [pageSize, setPageSize] = useState(24);
  const [compareList, setCompareList] = useState<Product[]>([]);

  useEffect(() => {
    setPageSize(24);
    setSelectedSubcategory(searchParams.get('q') || '');
    setSelectedBrand(searchParams.get('brand') || '');
    setGender(searchParams.get('gender') || '');
  }, [slug, collectionSlug, effectiveCountry]);

  const { data: editorial, isLoading: loadingEditorial } = useQuery({
    queryKey: ['editorial-category', slug, effectiveCountry],
    queryFn: async () => unwrap<EditorialCategoryPageData>(await api.get(`/categories/${slug}/editorial?country=${effectiveCountry}`)),
  });

  const { data: productsRes, isLoading: loadingProducts } = useQuery({
    queryKey: [
      'editorial-products', slug, collectionSlug, effectiveCountry,
      selectedSubcategory, selectedBrand, gender, minPrice, maxPrice, inStockOnly, sort, pageSize,
      editorial?.resolvedCategorySlugs?.join(','),
    ],
    enabled: Boolean(editorial),
    queryFn: async () => {
      if (collectionSlug && !selectedSubcategory && !selectedBrand && !gender && !minPrice && !maxPrice) {
        return unwrap<{ items: Product[]; totalElements: number }>(
          await api.get(`/categories/${slug}/collections/${collectionSlug}?country=${effectiveCountry}&size=${pageSize}&sort=${sort}`)
        );
      }
      const p = new URLSearchParams();
      if (editorial?.resolvedCategorySlugs?.length) {
        p.set('categories', editorial.resolvedCategorySlugs.join(','));
      }
      p.set('country', effectiveCountry);
      p.set('verifiedImagesOnly', 'true');
      if (selectedSubcategory) p.set('q', selectedSubcategory);
      if (selectedBrand) p.set('brand', selectedBrand);
      if (gender) p.set('gender', gender);
      if (minPrice) p.set('minPrice', minPrice);
      if (maxPrice) p.set('maxPrice', maxPrice);
      if (inStockOnly) p.set('inStockOnly', 'true');
      p.set('sort', sort);
      p.set('page', '0');
      p.set('size', String(pageSize));
      return unwrap<{ items: Product[]; totalElements: number }>(await api.get(`/products?${p.toString()}`));
    },
  });

  const activeCollection = collectionSlug
    ? editorial?.collections?.find((c) => c.slug === collectionSlug)
    : null;

  const items = productsRes?.items || [];
  const totalMatched = productsRes?.totalElements ?? 0;

  const toggleCompare = (p: Product) => {
    setCompareList((curr) => {
      if (curr.some((x) => x.id === p.id)) return curr.filter((x) => x.id !== p.id);
      return curr.length >= 3 ? [...curr.slice(1), p] : [...curr, p];
    });
  };

  if (loadingEditorial && !editorial) {
    return (
      <div className="mc-container" style={{ padding: '4rem 1.5rem', textAlign: 'center' }}>
        <div className="mc-serif" style={{ fontSize: '1.8rem', color: 'var(--mc-burgundy)' }}>Curating Editorial Experience...</div>
      </div>
    );
  }

  return (
    <div style={{ paddingBottom: '4.5rem' }}>
      {/* Centered Editorial Hero — Angela Giakas Template Club Inspired */}
      <section
        style={{
          padding: '3.6rem 1.5rem 2.75rem',
          background: 'linear-gradient(180deg, #F6EFE6 0%, var(--mc-ivory) 100%)',
          borderBottom: '1px solid var(--mc-border)',
          textAlign: 'center',
        }}
      >
        <div className="mc-container" style={{ maxWidth: 920 }}>
          <div style={{ display: 'flex', justifyContent: 'center', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
            <span className="mc-badge mc-badge-blush">
              <Sparkles size={12} /> {editorial?.collections?.length || 0} Curated Collections
            </span>
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="mc-badge mc-badge-ivory"
              style={{ cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}
            >
              <Globe size={12} color="var(--mc-burgundy)" />
              {activeCountryObj.flagEmoji} {activeCountryObj.name} ({activeCountryObj.currencyCode})
              {deliveryCountry !== effectiveCountry ? ` • Ships to ${deliveryCountry}` : ''}
            </button>
          </div>

          <h1
            style={{
              fontFamily: "'Plus Jakarta Sans', 'Inter', sans-serif",
              fontWeight: 700,
              fontSize: 'clamp(2.45rem, 5.2vw, 4.15rem)',
              lineHeight: 1.06,
              letterSpacing: '-0.025em',
              color: 'var(--mc-chocolate)',
              marginBottom: '1.1rem',
            }}
          >
            {activeCollection ? activeCollection.title : editorial?.heroHeading}
            <br />
            <em
              style={{
                fontFamily: "'Fraunces', 'Cormorant Garamond', Georgia, serif",
                fontStyle: 'italic',
                fontWeight: 400,
                color: 'var(--mc-burgundy)',
              }}
            >
              {activeCollection ? (activeCollection.subtitle || editorial?.name) : editorial?.heroItalicAccent}
            </em>
          </h1>

          <p style={{ maxWidth: 640, margin: '0 auto 1.75rem', fontSize: '1.05rem', color: 'var(--mc-muted)', lineHeight: 1.6 }}>
            {activeCollection?.description || editorial?.editorialDescription}
          </p>

          {activeCollection && (
            <div style={{ marginBottom: '1rem' }}>
              <Link to={`/categories/${slug}`} className="mc-btn mc-btn-outline" style={{ fontSize: '0.84rem' }}>
                <ArrowLeft size={14} /> All {editorial?.name} Collections
              </Link>
            </div>
          )}

          {/* Subcategory & Brand Quick Chips */}
          {(editorial?.subcategories?.length || 0) > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '0.42rem', marginTop: '1.15rem' }}>
              <button
                type="button"
                onClick={() => setSelectedSubcategory('')}
                className={`mc-badge ${!selectedSubcategory ? 'mc-badge-burgundy' : ''}`}
                style={{ cursor: 'pointer', background: !selectedSubcategory ? undefined : 'var(--mc-surface)' }}
              >
                All {editorial?.name}
              </button>
              {editorial!.subcategories.map((sub) => {
                const tok = sub.toLowerCase();
                const active = selectedSubcategory.toLowerCase() === tok;
                return (
                  <button
                    key={sub}
                    type="button"
                    onClick={() => setSelectedSubcategory(active ? '' : tok)}
                    className={`mc-badge ${active ? 'mc-badge-burgundy' : ''}`}
                    style={{ cursor: 'pointer', background: active ? undefined : 'var(--mc-surface)' }}
                  >
                    {sub}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <div className="mc-container" style={{ paddingTop: '2.5rem' }}>
        {/* Horizontal Angela-Giakas-Inspired Collage Gallery */}
        {!collectionSlug && editorial && (
          <EditorialCollectionGallery
            categorySlug={slug}
            collections={editorial.collections}
            countryCode={effectiveCountry}
          />
        )}

        {/* Featured Brands Row */}
        {editorial && editorial.featuredBrands.length > 0 && (
          <div style={{ marginBottom: '2rem', padding: '1rem 1.25rem', background: 'var(--mc-surface)', borderRadius: 'var(--mc-radius-md)', border: '1px solid var(--mc-border)', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '0.76rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--mc-burgundy)', marginRight: '0.4rem' }}>
              Featured Brands:
            </span>
            {editorial.featuredBrands.map((b) => {
              const active = selectedBrand === b;
              return (
                <button
                  key={b}
                  type="button"
                  onClick={() => setSelectedBrand(active ? '' : b)}
                  className={`mc-badge ${active ? 'mc-badge-burgundy' : ''}`}
                  style={{ cursor: 'pointer' }}
                >
                  {b}
                </button>
              );
            })}
          </div>
        )}

        {/* Functional Filter Bar Underneath Collections */}
        <div className="mc-linen-panel" style={{ padding: '1.1rem 1.25rem', marginBottom: '2rem', display: 'flex', flexWrap: 'wrap', gap: '0.7rem', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
            {(slug === 'fashion' || editorial?.resolvedCategorySlugs?.includes('fashion')) && (
              <>
                {[
                  { label: 'All Styles', val: '' },
                  { label: 'Women', val: 'WOMEN' },
                  { label: 'Men', val: 'MEN' },
                  { label: 'Unisex', val: 'UNISEX' },
                ].map((g) => (
                  <button
                    key={g.label}
                    type="button"
                    onClick={() => setGender(g.val)}
                    className={`mc-badge ${gender === g.val ? 'mc-badge-burgundy' : ''}`}
                    style={{ cursor: 'pointer', background: gender === g.val ? undefined : 'var(--mc-surface)' }}
                  >
                    {g.label}
                  </button>
                ))}
              </>
            )}
            <input type="number" min={0} className="mc-input" style={{ width: 120 }} placeholder={`Min (${activeCountryObj.currencySymbol})`} value={minPrice} onChange={(e) => setMinPrice(e.target.value)} />
            <input type="number" min={0} className="mc-input" style={{ width: 120 }} placeholder={`Max (${activeCountryObj.currencySymbol})`} value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} />
            <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.82rem', cursor: 'pointer' }}>
              <input type="checkbox" checked={inStockOnly} onChange={(e) => setInStockOnly(e.target.checked)} /> In Stock
            </label>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
            <span style={{ fontSize: '0.82rem', color: 'var(--mc-muted)' }}>
              {totalMatched.toLocaleString('en-IN')} verified products
            </span>
            <select className="mc-select" value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sort products" style={{ width: 170 }}>
              <option value="relevance">Relevance</option>
              <option value="price_asc">Price: Low to High</option>
              <option value="price_desc">Price: High to Low</option>
              <option value="newest">Newest Arrivals</option>
            </select>
          </div>
        </div>

        {/* Product Catalogue Underneath */}
        {loadingProducts ? (
          <div className="mc-grid-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="mc-card" style={{ height: 370, background: 'var(--mc-card)', opacity: 0.7 }} />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="mc-linen-panel" style={{ padding: '3rem 2rem', textAlign: 'center' }}>
            <AlertCircle size={28} color="var(--mc-burgundy)" style={{ marginBottom: '0.6rem' }} />
            <h2 style={{ fontSize: '1.45rem', marginBottom: '0.45rem' }}>
              {editorial?.hasDatasetForCountry === false
                ? `No imported ${editorial?.name} dataset for ${activeCountryObj.name} (${effectiveCountry}) yet`
                : 'No matching listings for current filters'}
            </h2>
            <p style={{ color: 'var(--mc-muted)', maxWidth: 560, margin: '0 auto 1.25rem' }}>
              {editorial?.hasDatasetForCountry === false
                ? `Your selected shopping market (${activeCountryObj.name}) is being prepared. You can explore available worldwide products or check back when more catalogues are available.`
                : 'Try clearing a price ceiling, subcategory chip, or brand filter.'}
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
              <button type="button" className="mc-btn mc-btn-accent" onClick={() => setModalOpen(true)}>
                Change Country ({activeCountryObj.flagEmoji})
              </button>
              <button
                type="button"
                className="mc-btn mc-btn-outline"
                onClick={() => {
                  setSelectedSubcategory('');
                  setSelectedBrand('');
                  setGender('');
                  setMinPrice('');
                  setMaxPrice('');
                  setSearchParams({});
                }}
              >
                Reset Filters
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="mc-grid-4">
              {items.map((p) => (
                <ProductCard
                  key={p.id}
                  product={p}
                  showCompareToggle
                  isCompared={compareList.some((c) => c.id === p.id)}
                  onToggleCompare={toggleCompare}
                />
              ))}
            </div>

            {items.length < totalMatched && (
              <div style={{ textAlign: 'center', marginTop: '2.5rem' }}>
                <button type="button" className="mc-btn mc-btn-primary" onClick={() => setPageSize((s) => s + 24)}>
                  Load 24 More ({(totalMatched - items.length).toLocaleString('en-IN')} remaining)
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Compare Bar */}
      {compareList.length > 0 && (
        <div style={{ position: 'fixed', bottom: '1rem', left: '50%', transform: 'translateX(-50%)', zIndex: 70, width: 'min(920px, 94vw)', background: 'var(--mc-surface)', border: '2px solid var(--mc-burgundy)', borderRadius: 'var(--mc-radius-md)', padding: '1rem', boxShadow: 'var(--mc-shadow-lift)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
            <strong style={{ color: 'var(--mc-burgundy)' }}><CheckCircle2 size={14} style={{ verticalAlign: 'text-bottom' }} /> Comparing {compareList.length}/3</strong>
            <button type="button" onClick={() => setCompareList([])} className="mc-btn mc-btn-outline" style={{ padding: '0.25rem 0.65rem', fontSize: '0.75rem' }}>
              <X size={13} /> Clear
            </button>
          </div>
          <div className="mc-grid-3" style={{ gap: '0.75rem' }}>
            {compareList.map((c) => (
              <div key={c.id} className="mc-linen-panel" style={{ padding: '0.7rem', fontSize: '0.8rem' }}>
                <div style={{ fontWeight: 700 }}>{c.name}</div>
                <div style={{ color: 'var(--mc-muted)' }}>{c.brandName} • {c.sourcePlatform.replace(/_/g, ' ')}</div>
                <div style={{ fontWeight: 700, color: 'var(--mc-burgundy)', marginTop: '0.25rem' }}>
                  {c.price && c.price > 0 ? formatCurrency(c.price, c.currency) : 'Price pending feed'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
