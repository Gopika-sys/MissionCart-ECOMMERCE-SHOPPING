import React, { useEffect, useState } from 'react';
import { Link, useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Search, ExternalLink, Heart, ShoppingBag, ShieldCheck, CheckCircle2, Recycle, X } from 'lucide-react';
import { api, unwrap, formatINR, formatCurrency } from '../services/api';
import { Category, FashionFacets, Product, ProductCounts, RetailerSource, ReviewPhoto, DataBoutiqueStatus } from '../types';
import { ProductCard } from '../components/ProductCard';
import { PageHeader } from '../components/PageHeader';
import { useCart } from '../context/CartContext';
import { useCountry } from '../context/CountryContext';

function toEditorialSlug(rawSlug: string): string {
  const s = rawSlug.toLowerCase();
  if (s === 'skincare' || s === 'personal-care') return 'beauty';
  if (s === 'home-decor' || s === 'kitchen' || s === 'storage-organization') return 'home-living';
  if (s === 'groceries') return 'grocery';
  return s;
}

export const ExplorePage: React.FC = () => {
  const { data: productsData } = useQuery({
    queryKey: ['explore-verified'],
    queryFn: async () => unwrap<{ items: Product[] }>(await api.get('/products?verifiedImagesOnly=true&size=12')),
  });
  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => unwrap<Category[]>(await api.get('/categories')),
  });
  const { data: counts } = useQuery({
    queryKey: ['product-counts'],
    queryFn: async () => unwrap<ProductCounts>(await api.get('/products/count')),
  });

  return (
    <div className="mc-container" style={{ padding: '2.5rem 1.5rem 3.5rem' }}>
      <PageHeader
        title="Explore by Purpose & Aesthetic"
        subtitle={`Browse ${counts ? counts.imageVerifiedProducts.toLocaleString('en-IN') : ''} verified-photo products paired with attribute-checked compatibility rules.`}
        breadcrumbs={[{ label: 'Discover' }]}
      />

      {/* Editorial Asymmetric Mosaic */}
      <div className="mc-grid-3" style={{ marginBottom: '3.5rem' }}>
        {[
          { title: 'Calm Study & Remote Desk', img: '/verified-media/hero_workspace.jpg', query: 'study', bg: 'var(--mc-card)' },
          { title: 'Hostel & First Apartment', img: '/verified-media/hero_kitchen.jpg', query: 'hostel', bg: 'var(--mc-blush)' },
          { title: 'Oily-Skin Morning & Night', img: '/verified-media/hero_skincare.jpg', query: 'skincare', bg: '#F1E6DB' },
        ].map((card) => (
          <Link key={card.title} to={`/products?q=${card.query}`} className="mc-card" style={{ overflow: 'hidden', background: card.bg }}>
            <div style={{ height: 240, overflow: 'hidden' }}>
              <img src={card.img} alt={card.title} referrerPolicy="no-referrer" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
            <div style={{ padding: '1.25rem' }}>
              <h3 style={{ fontSize: '1.35rem', marginBottom: '0.3rem' }}>{card.title}</h3>
              <span style={{ fontSize: '0.84rem', color: 'var(--mc-burgundy)', fontWeight: 600 }}>Explore matching catalogue →</span>
            </div>
          </Link>
        ))}
      </div>

      <h2 style={{ fontSize: '2rem', marginBottom: '1.25rem' }}>Verified Photograph Collection</h2>
      <div className="mc-grid-4" style={{ marginBottom: '3.5rem' }}>
        {(productsData?.items || []).map((p) => (
          <ProductCard key={p.id} product={p} />
        ))}
      </div>

      <h2 style={{ fontSize: '1.9rem', marginBottom: '1rem' }}>Browse Editorial Categories</h2>
      <div className="mc-grid-4">
        {(categories || []).map((c) => (
          <Link key={c.id} to={`/categories/${toEditorialSlug(c.slug)}`} className="mc-linen-panel" style={{ padding: '1.2rem' }}>
            <div style={{ fontSize: '0.72rem', color: 'var(--mc-burgundy)', fontWeight: 700, textTransform: 'uppercase' }}>{c.purposeGroup || 'Category'}</div>
            <h3 style={{ fontSize: '1.15rem', margin: '0.3rem 0' }}>{c.name}</h3>
            <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--mc-muted)' }}>{c.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
};

export const ProductsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { marketCountry } = useCountry();
  const [q, setQ] = useState(searchParams.get('q') || '');
  const [pageSize, setPageSize] = useState(24);
  const [compareList, setCompareList] = useState<Product[]>([]);
  const activeCountry = (searchParams.get('country') || marketCountry || 'IN').toUpperCase();

  const selectedCategories = (searchParams.get('categories') || searchParams.get('category') || '').split(',').filter(Boolean);
  const selectedSources = (searchParams.get('sources') || searchParams.get('source') || '').split(',').filter(Boolean);
  const sort = searchParams.get('sort') || 'relevance';
  const minPrice = searchParams.get('minPrice') || '';
  const maxPrice = searchParams.get('maxPrice') || '';
  const gender = searchParams.get('gender') || '';
  const garmentType = searchParams.get('garmentType') || '';
  const occasion = searchParams.get('occasion') || '';
  const clothingSize = searchParams.get('clothingSize') || '';
  const color = searchParams.get('color') || '';
  const material = searchParams.get('material') || '';
  const fit = searchParams.get('fit') || '';
  const pattern = searchParams.get('pattern') || '';
  const brand = searchParams.get('brand') || '';
  const sourceType = searchParams.get('sourceType') || '';
  const verifiedDiscountOnly = searchParams.get('verifiedDiscountOnly') === 'true';
  const inStockOnly = searchParams.get('inStockOnly') === 'true';

  useEffect(() => {
    setPageSize(24);
  }, [searchParams.toString()]);

  const { data: counts } = useQuery({
    queryKey: ['product-counts'],
    queryFn: async () => unwrap<ProductCounts>(await api.get('/products/count')),
  });
  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => unwrap<Category[]>(await api.get('/categories')),
  });
  const { data: sources } = useQuery({
    queryKey: ['sources'],
    queryFn: async () => unwrap<RetailerSource[]>(await api.get('/sources')),
  });
  const { data: facets } = useQuery({
    queryKey: ['product-facets'],
    queryFn: async () => unwrap<FashionFacets>(await api.get('/products/facets')),
  });

  const { data: result, isLoading } = useQuery({
    queryKey: ['products', searchParams.toString(), pageSize, activeCountry],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchParams.get('q')) params.set('q', searchParams.get('q')!);
      if (brand) params.set('brand', brand);
      if (selectedCategories.length > 0) params.set('categories', selectedCategories.join(','));
      if (selectedSources.length > 0) params.set('sources', selectedSources.join(','));
      if (sourceType) params.set('sourceType', sourceType);
      if (minPrice) params.set('minPrice', minPrice);
      if (maxPrice) params.set('maxPrice', maxPrice);
      if (gender) params.set('gender', gender);
      if (garmentType) params.set('garmentType', garmentType);
      if (occasion) params.set('occasion', occasion);
      if (clothingSize) params.set('clothingSize', clothingSize);
      if (color) params.set('color', color);
      if (material) params.set('material', material);
      if (fit) params.set('fit', fit);
      if (pattern) params.set('pattern', pattern);
      if (verifiedDiscountOnly) params.set('verifiedDiscountOnly', 'true');
      if (inStockOnly) params.set('inStockOnly', 'true');
      if (searchParams.get('verifiedImagesOnly') === 'true') params.set('verifiedImagesOnly', 'true');
      params.set('country', activeCountry);
      params.set('sort', sort);
      params.set('page', '0');
      params.set('size', String(pageSize));
      return unwrap<{ items: Product[]; totalElements: number }>(await api.get(`/products?${params.toString()}`));
    },
  });

  const toggleMulti = (paramKey: string, legacyKey: string, value: string, current: string[]) => {
    const next = new URLSearchParams(searchParams);
    next.delete(legacyKey);
    const updated = current.includes(value) ? current.filter((v) => v !== value) : [...current, value];
    if (updated.length > 0) next.set(paramKey, updated.join(','));
    else next.delete(paramKey);
    setSearchParams(next);
  };

  const updateParam = (k: string, v: string) => {
    const next = new URLSearchParams(searchParams);
    if (v) next.set(k, v);
    else next.delete(k);
    setSearchParams(next);
  };

  const toggleCompare = (p: Product) => {
    setCompareList((curr) => {
      if (curr.some((x) => x.id === p.id)) return curr.filter((x) => x.id !== p.id);
      if (curr.length >= 3) return [...curr.slice(1), p];
      return [...curr, p];
    });
  };

  const items = result?.items || [];
  const totalMatched = result?.totalElements ?? 0;

  return (
    <div className="mc-container" style={{ padding: '2.5rem 1.5rem 3.5rem' }}>
      <PageHeader
        title="Unified Multi-Source Catalogue"
        subtitle={counts ? `${counts.totalImportedProducts.toLocaleString('en-IN')} Products in Catalogue across verified retailers & open feeds.` : 'Browse verified multi-source products.'}
        breadcrumbs={[{ label: 'Catalogue' }]}
      />
      <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'flex-end', gap: '1rem', marginBottom: '1.6rem' }}>
        <div>
          <span className="mc-badge mc-badge-blush" style={{ marginBottom: '0.45rem' }}>
            {counts ? `${counts.totalImportedProducts.toLocaleString('en-IN')} Products in Catalogue` : 'Live Catalogue'}
          </span>
          <p style={{ margin: 0, color: 'var(--mc-muted)' }}>
            Showing {items.length.toLocaleString('en-IN')} of {totalMatched.toLocaleString('en-IN')} matching listings.
          </p>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            updateParam('q', q.trim());
          }}
          style={{ display: 'flex', gap: '0.5rem', minWidth: 280 }}
        >
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search title, brand, tag..." className="mc-input" />
          <button type="submit" className="mc-btn mc-btn-accent"><Search size={15} /></button>
        </form>
      </div>

      {/* All-Gender Fashion & Multi-Source Filters */}
      <div className="mc-linen-panel" style={{ padding: '1.2rem', marginBottom: '2rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem', alignItems: 'center' }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--mc-burgundy)', marginRight: '0.4rem' }}>
            Fashion Style (Optional):
          </span>
          {[
            { label: 'All Styles', val: '' },
            { label: "Women's", val: 'WOMEN' },
            { label: "Men's", val: 'MEN' },
            { label: 'Unisex & Gender-Neutral', val: 'UNISEX' },
          ].map((g) => (
            <button
              key={g.label}
              type="button"
              onClick={() => updateParam('gender', g.val)}
              className={`mc-badge ${gender === g.val ? 'mc-badge-burgundy' : ''}`}
              style={{ cursor: 'pointer', background: gender === g.val ? undefined : 'var(--mc-surface)' }}
            >
              {g.label}
            </button>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.65rem', alignItems: 'center' }}>
          <select value={garmentType} onChange={(e) => updateParam('garmentType', e.target.value)} className="mc-select" aria-label="Clothing Type">
            <option value="">All Clothing Types</option>
            {(facets?.garmentTypes || []).map((gt) => <option key={gt} value={gt}>{gt}</option>)}
          </select>
          <select value={clothingSize} onChange={(e) => updateParam('clothingSize', e.target.value)} className="mc-select" aria-label="Clothing Size">
            <option value="">All Sizes</option>
            {(facets?.sizes || ['XS', 'S', 'M', 'L', 'XL', 'XXL', '28', '30', '32', '34', '36']).map((sz) => <option key={sz} value={sz}>{sz}</option>)}
          </select>
          <select value={brand} onChange={(e) => updateParam('brand', e.target.value)} className="mc-select" aria-label="Brand">
            <option value="">All Brands</option>
            {(facets?.brands || []).map((b) => <option key={b} value={b}>{b}</option>)}
          </select>
          <select value={occasion} onChange={(e) => updateParam('occasion', e.target.value)} className="mc-select" aria-label="Occasion">
            <option value="">All Occasions</option>
            {(facets?.occasions || []).map((o) => <option key={o} value={o}>{o}</option>)}
          </select>
          <select value={material} onChange={(e) => updateParam('material', e.target.value)} className="mc-select" aria-label="Material">
            <option value="">All Materials</option>
            {(facets?.materials || []).map((m) => <option key={m} value={m}>{m}</option>)}
          </select>
          <select value={fit} onChange={(e) => updateParam('fit', e.target.value)} className="mc-select" aria-label="Fit">
            <option value="">All Fits</option>
            {(facets?.fits || []).map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
          <select value={pattern} onChange={(e) => updateParam('pattern', e.target.value)} className="mc-select" aria-label="Pattern">
            <option value="">All Patterns</option>
            {(facets?.patterns || []).map((pt) => <option key={pt} value={pt}>{pt}</option>)}
          </select>
          <select value={sourceType} onChange={(e) => updateParam('sourceType', e.target.value)} className="mc-select" aria-label="Source Classification">
            <option value="">All Source Types</option>
            <option value="MANUFACTURER">Official Brands</option>
            <option value="MARKETPLACE">Marketplaces</option>
            <option value="MISSIONCART_NATIVE_SELLER">MissionCart Native</option>
            <option value="PRODUCT_INFORMATION_DATABASE">Open Product Info DB</option>
          </select>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.65rem', alignItems: 'center' }}>
          <input type="number" min={0} className="mc-input" placeholder="Min Price (₹)" value={minPrice} onChange={(e) => updateParam('minPrice', e.target.value)} />
          <input type="number" min={0} className="mc-input" placeholder="Max Price (₹)" value={maxPrice} onChange={(e) => updateParam('maxPrice', e.target.value)} />
          <input type="text" className="mc-input" placeholder="Color (e.g. Black, Rose)" value={color} onChange={(e) => updateParam('color', e.target.value)} />
          <select value={sort} onChange={(e) => updateParam('sort', e.target.value)} className="mc-select" aria-label="Sort order">
            <option value="relevance">Sort: Relevance</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
            <option value="rating_desc">Top Rated</option>
            <option value="newest">Newest Arrivals</option>
          </select>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', cursor: 'pointer' }}>
            <input type="checkbox" checked={inStockOnly} onChange={(e) => updateParam('inStockOnly', e.target.checked ? 'true' : '')} />
            In Stock Only
          </label>
          <label style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.8rem', cursor: 'pointer' }}>
            <input type="checkbox" checked={verifiedDiscountOnly} onChange={(e) => updateParam('verifiedDiscountOnly', e.target.checked ? 'true' : '')} />
            Verified Discounts
          </label>
          <button type="button" className="mc-btn mc-btn-outline" onClick={() => { setQ(''); setSearchParams({}); }}>
            Clear All Filters
          </button>
        </div>

        <div>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--mc-burgundy)', marginBottom: '0.45rem' }}>
            Categories (Multi-Select)
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
            {(categories || []).map((c) => {
              const active = selectedCategories.includes(c.slug);
              return (
                <button
                  key={c.slug}
                  type="button"
                  onClick={() => toggleMulti('categories', 'category', c.slug, selectedCategories)}
                  className={`mc-badge ${active ? 'mc-badge-burgundy' : ''}`}
                  style={{ cursor: 'pointer', background: active ? undefined : 'var(--mc-surface)' }}
                >
                  {c.name}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--mc-burgundy)', marginBottom: '0.45rem' }}>
            Retailer & Catalog Sources (Multi-Select)
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.4rem' }}>
            {(sources || []).map((s) => {
              const active = selectedSources.includes(s.code);
              const count = counts?.byRetailer?.[s.code];
              return (
                <button
                  key={s.code}
                  type="button"
                  onClick={() => toggleMulti('sources', 'source', s.code, selectedSources)}
                  className={`mc-badge ${active ? 'mc-badge-burgundy' : ''}`}
                  style={{ cursor: 'pointer', background: active ? undefined : 'var(--mc-surface)' }}
                >
                  {s.name}{count ? ` (${count.toLocaleString('en-IN')})` : ''}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Product Grid */}
      {isLoading ? (
        <div className="mc-grid-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="mc-card" style={{ height: 380, background: 'var(--mc-card)', opacity: 0.7 }} />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="mc-linen-panel" style={{ padding: '3rem', textAlign: 'center' }}>
          <h3>No matching verified-photo items</h3>
          <p style={{ color: 'var(--mc-muted)' }}>Try adjusting your search keywords, category, or retailer chips.</p>
          <button type="button" className="mc-btn mc-btn-accent" onClick={() => { setQ(''); setSearchParams({}); }}>Reset Filters</button>
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
                Load 24 More Products ({(totalMatched - items.length).toLocaleString('en-IN')} remaining)
              </button>
            </div>
          )}
        </>
      )}

      {/* Side-by-side Compare Strip */}
      {compareList.length > 0 && (
        <div style={{ position: 'fixed', bottom: '1rem', left: '50%', transform: 'translateX(-50%)', zIndex: 70, width: 'min(920px, 94vw)', background: 'var(--mc-surface)', border: '2px solid var(--mc-burgundy)', borderRadius: 'var(--mc-radius-md)', padding: '1rem', boxShadow: 'var(--mc-shadow-lift)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem' }}>
            <strong style={{ color: 'var(--mc-burgundy)' }}>Product Comparison ({compareList.length}/3)</strong>
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
                  {c.price !== null && c.price > 0 ? formatINR(c.price) : 'Price pending feed'}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export const SearchResultsPage: React.FC = () => <ProductsPage />;

export const CategoriesPage: React.FC = () => {
  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => unwrap<Category[]>(await api.get('/categories')),
  });
  const { data: counts } = useQuery({
    queryKey: ['product-counts'],
    queryFn: async () => unwrap<ProductCounts>(await api.get('/products/count')),
  });

  return (
    <div className="mc-container" style={{ padding: '2.5rem 1.5rem 3.5rem' }}>
      <PageHeader
        title="Catalogue Categories"
        subtitle={`Purpose-grouped categories spanning ${counts ? counts.totalImportedProducts.toLocaleString('en-IN') : ''} catalogue records.`}
        breadcrumbs={[{ label: 'Categories' }]}
      />
      <div className="mc-grid-3">
        {(categories || []).map((c) => (
          <Link key={c.id} to={`/categories/${toEditorialSlug(c.slug)}`} className="mc-card" style={{ padding: '1.6rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.7rem' }}>
              <span className="mc-badge mc-badge-blush">{c.purposeGroup}</span>
              {counts?.byCategory?.[c.name] !== undefined && (
                <span className="mc-badge mc-badge-caramel">{counts.byCategory[c.name].toLocaleString('en-IN')} items</span>
              )}
            </div>
            <h2 style={{ fontSize: '1.45rem', marginBottom: '0.4rem' }}>{c.name}</h2>
            <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--mc-muted)' }}>{c.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
};

export const ProductDetailPage: React.FC = () => {
  const { id } = useParams();
  const { addToCart, toggleWishlist, wishlist } = useCart();
  const [selectedImageUrl, setSelectedImageUrl] = useState<string | null>(null);
  const [selectedVariantId, setSelectedVariantId] = useState<number | null>(null);

  const { data: product, isLoading } = useQuery({
    queryKey: ['product', id],
    queryFn: async () => unwrap<Product>(await api.get(`/products/${id}`)),
    enabled: Boolean(id),
  });

  const { data: alternatives } = useQuery({
    queryKey: ['product-alts', product?.id],
    queryFn: async () => unwrap<{ budget: Product[]; balanced: Product[]; premium: Product[] }>(await api.get(`/products/${product!.id}/alternatives`)),
    enabled: Boolean(product?.id),
  });

  const { data: customerPhotos } = useQuery({
    queryKey: ['product-customer-photos', product?.id],
    queryFn: async () => unwrap<ReviewPhoto[]>(await api.get(`/products/${product!.id}/customer-photos`)),
    enabled: Boolean(product?.id),
  });

  useEffect(() => {
    setSelectedImageUrl(null);
    if (product?.variants && product.variants.length > 0) {
      const def = product.variants.find((v) => v.defaultVariant && v.stockQuantity > 0)
        || product.variants.find((v) => v.stockQuantity > 0)
        || product.variants[0];
      setSelectedVariantId(def.id);
    } else {
      setSelectedVariantId(null);
    }
  }, [product?.id]);

  if (isLoading) return <div className="mc-container" style={{ padding: '3rem 1.5rem' }}>Loading product details...</div>;
  if (!product) return <div className="mc-container" style={{ padding: '3rem 1.5rem' }}>Product not found.</div>;

  const isSaved = wishlist.some((w) => w.id === product.id);
  const isNative = product.productType === 'MISSIONCART_DIRECT' || product.productType === 'SELLER_MANAGED';
  const isInfoDb = product.sourceType === 'PRODUCT_INFORMATION_DATABASE';
  const variants = product.variants || [];
  const activeVariant = variants.find((v) => v.id === selectedVariantId) || null;
  const effectivePrice = activeVariant?.price ?? product.price;
  const effectiveOriginalPrice = activeVariant?.originalPrice ?? product.originalPrice;
  const hasVerifiedPrice = effectivePrice !== null && effectivePrice > 0 && product.priceStatus !== 'UNAVAILABLE' && product.priceStatus !== 'EXPIRED';
  const effectiveStock = activeVariant ? activeVariant.stockQuantity : product.stockQuantity;

  const gallery = (() => {
    const out: { url: string; label: string }[] = [];
    const seen = new Set<string>();
    const add = (url?: string | null, label?: string | null) => {
      if (!url || seen.has(url)) return;
      seen.add(url);
      out.push({ url, label: (label || 'PRODUCT_VIEW').replace(/_/g, ' ') });
    };
    if (product.imageStatus === 'VERIFIED') {
      add(product.imageUrl, product.imageType || 'MAIN PACKSHOT');
      (product.additionalImages || []).forEach((img) => {
        if (img.imageStatus === 'VERIFIED') add(img.imageUrl, img.imageType || 'GALLERY');
      });
    }
    return out;
  })();

  const mainPhotoUrl = selectedImageUrl || activeVariant?.imageUrl || gallery[0]?.url || product.imageUrl;

  return (
    <div className="mc-container" style={{ padding: '2.5rem 1.5rem' }}>
      <PageHeader
        title={product.name}
        subtitle={`Brand: ${product.brandName || 'Curated'} • SKU: ${product.sku} • Category: ${product.categoryName || 'General'}`}
        breadcrumbs={[{ label: 'Catalogue', to: '/products' }, { label: product.name }]}
      />

      <div className="mc-grid-2" style={{ gap: '2.5rem', alignItems: 'start', marginBottom: '3.5rem' }}>
        <div>
          <div className="mc-card" style={{ overflow: 'hidden', aspectRatio: '1 / 1', background: '#FAF6F0', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem' }}>
            {product.imageStatus === 'VERIFIED' && mainPhotoUrl ? (
              <img src={mainPhotoUrl} alt={product.name} referrerPolicy="no-referrer" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
            ) : (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--mc-muted)' }}>
                <div style={{ fontWeight: 600 }}>Awaiting Verified Product Photo</div>
                <div style={{ fontSize: '0.84rem', marginTop: '0.3rem' }}>Administrators can upload or approve a photo in the Admin Image Queue.</div>
              </div>
            )}
          </div>
          {gallery.length > 1 && (
            <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', marginTop: '0.75rem' }}>
              {gallery.map((g) => (
                <button
                  key={g.url}
                  type="button"
                  onClick={() => setSelectedImageUrl(g.url)}
                  style={{
                    width: 68,
                    padding: '0.25rem',
                    borderRadius: 'var(--mc-radius-sm)',
                    border: mainPhotoUrl === g.url ? '2px solid var(--mc-burgundy)' : '1px solid var(--mc-border)',
                    background: '#FAF6F0',
                    cursor: 'pointer',
                    textAlign: 'center',
                  }}
                >
                  <img src={g.url} alt={g.label} referrerPolicy="no-referrer" style={{ width: '100%', height: 52, objectFit: 'contain' }} />
                  <div style={{ fontSize: '0.62rem', color: 'var(--mc-muted)', marginTop: '0.15rem', textTransform: 'capitalize' }}>{g.label.toLowerCase()}</div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.75rem' }}>
            <span className="mc-badge mc-badge-ivory">{product.sourcePlatform.replace(/_/g, ' ')}</span>
            {product.sourceType && <span className="mc-badge">{product.sourceType.replace(/_/g, ' ')}</span>}
            {product.gender && <span className="mc-badge mc-badge-blush">{product.gender}</span>}
            {product.garmentType && <span className="mc-badge mc-badge-blush">{product.garmentType}</span>}
            <span className="mc-badge mc-badge-caramel">{product.dataVerificationStatus.replace(/_/g, ' ')}</span>
          </div>

          <h1 style={{ fontSize: 'clamp(1.85rem, 3vw, 2.65rem)', marginBottom: '0.5rem' }}>{product.name}</h1>
          <div style={{ fontSize: '0.92rem', color: 'var(--mc-muted)', marginBottom: '1.1rem' }}>
            Brand: <strong>{product.brandName || 'Curated'}</strong> • SKU: {activeVariant?.variantSku || product.sku} • Category: {product.categoryName}
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem', marginBottom: '1.25rem', flexWrap: 'wrap' }}>
            {hasVerifiedPrice ? (
              <>
                <span style={{ fontSize: '2rem', fontWeight: 700 }}>{formatCurrency(effectivePrice, product.currency)}</span>
                {product.priceVerified && effectiveOriginalPrice && effectiveOriginalPrice > effectivePrice && (
                  <span style={{ fontSize: '1.1rem', color: 'var(--mc-muted)', textDecoration: 'line-through' }}>{formatCurrency(effectiveOriginalPrice, product.currency)}</span>
                )}
                <span className="mc-badge mc-badge-blush">{product.priceStatus || (product.priceVerified ? 'VERIFIED' : 'ESTIMATED')}</span>
              </>
            ) : (
              <span style={{ fontSize: '1.05rem', fontWeight: 600, color: 'var(--mc-burgundy)' }}>
                {isInfoDb ? 'Open Product Database Reference — No merchant price' : 'Price unavailable — requires retailer confirmation'}
              </span>
            )}
            <span style={{ fontSize: '0.82rem', color: effectiveStock > 0 ? 'var(--mc-caramel)' : '#B91C1C', fontWeight: 700 }}>
              {effectiveStock > 0 ? `${product.availabilityStatus.replace('_', ' ')} (${effectiveStock})` : 'OUT OF STOCK'}
            </span>
          </div>

          {variants.length > 0 && (
            <div className="mc-linen-panel" style={{ padding: '1rem', marginBottom: '1.3rem' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--mc-burgundy)', marginBottom: '0.55rem' }}>
                Select Variant {activeVariant?.size ? `• Size ${activeVariant.size}` : ''} {activeVariant?.color ? `• ${activeVariant.color}` : ''}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.45rem' }}>
                {variants.map((v) => {
                  const isSel = v.id === activeVariant?.id;
                  const oos = v.stockQuantity <= 0 || v.availabilityStatus === 'OUT_OF_STOCK';
                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setSelectedVariantId(v.id)}
                      style={{
                        padding: '0.42rem 0.78rem',
                        borderRadius: 'var(--mc-radius-pill)',
                        border: isSel ? '2px solid var(--mc-burgundy)' : '1px solid var(--mc-border)',
                        background: isSel ? 'var(--mc-blush)' : 'var(--mc-surface)',
                        opacity: oos ? 0.55 : 1,
                        cursor: 'pointer',
                        fontSize: '0.82rem',
                        fontWeight: isSel ? 700 : 500,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                      }}
                    >
                      {v.colorHex && <span style={{ width: 10, height: 10, borderRadius: '50%', background: v.colorHex, border: '1px solid rgba(0,0,0,0.2)' }} />}
                      {[v.size, v.color, v.variantName].filter(Boolean).filter((x, i, a) => a.indexOf(x) === i).join(' / ') || v.variantSku}
                      {oos ? ' (Sold Out)' : ''}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <p style={{ fontSize: '1rem', color: 'var(--mc-chocolate)', marginBottom: '1.4rem' }}>{product.description}</p>

          {isInfoDb && (
            <div className="mc-linen-panel" style={{ padding: '0.9rem 1rem', fontSize: '0.84rem', marginBottom: '1.2rem', borderLeft: '3px solid var(--mc-burgundy)' }}>
              <strong>Product Information Database:</strong> {product.sourcePlatform.replace(/_/g, ' ')} provides ingredient and barcode metadata only. MissionCart keeps information references outside checkout carts.
            </div>
          )}

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.6rem' }}>
            {!isInfoDb && hasVerifiedPrice && (
              <button
                type="button"
                disabled={effectiveStock <= 0}
                className="mc-btn mc-btn-accent"
                onClick={() => addToCart(product.id, 1, undefined, activeVariant?.id, activeVariant?.size || undefined, activeVariant?.color || undefined)}
              >
                <ShoppingBag size={16} /> {effectiveStock > 0 ? 'Add to MissionCart Bag' : 'Variant Out of Stock'}
              </button>
            )}
            <button type="button" className="mc-btn mc-btn-outline" onClick={() => toggleWishlist(product.id, product)}>
              <Heart size={16} fill={isSaved ? 'var(--mc-burgundy)' : 'none'} /> {isSaved ? 'Saved' : 'Wishlist'}
            </button>
            {!isNative && product.sourceUrl && (
              <a href={product.sourceUrl} target="_blank" rel="noopener noreferrer" className="mc-btn mc-btn-outline">
                {product.sourceType === 'MANUFACTURER' ? 'Official Brand Site' : `Buy on ${product.sourcePlatform.replace(/_/g, ' ')}`} <ExternalLink size={15} />
              </a>
            )}
          </div>

          {(product.material || product.fit || product.occasion || product.sleeveLength || product.pattern || product.careInstructions) && (
            <div className="mc-card" style={{ padding: '1.1rem', marginBottom: '1.2rem' }}>
              <h3 style={{ fontSize: '1.08rem', marginBottom: '0.6rem' }}>Garment &amp; Material Details</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.86rem' }}>
                {product.gender && <div><span style={{ color: 'var(--mc-muted)' }}>Style: </span><strong>{product.gender}</strong></div>}
                {product.garmentType && <div><span style={{ color: 'var(--mc-muted)' }}>Type: </span><strong>{product.garmentType}</strong></div>}
                {product.occasion && <div><span style={{ color: 'var(--mc-muted)' }}>Occasion: </span><strong>{product.occasion}</strong></div>}
                {product.material && <div><span style={{ color: 'var(--mc-muted)' }}>Material: </span><strong>{product.material}</strong></div>}
                {product.fit && <div><span style={{ color: 'var(--mc-muted)' }}>Fit: </span><strong>{product.fit}</strong></div>}
                {product.sleeveLength && <div><span style={{ color: 'var(--mc-muted)' }}>Sleeve: </span><strong>{product.sleeveLength}</strong></div>}
                {product.pattern && <div><span style={{ color: 'var(--mc-muted)' }}>Pattern: </span><strong>{product.pattern}</strong></div>}
                {product.careInstructions && <div style={{ gridColumn: '1 / -1' }}><span style={{ color: 'var(--mc-muted)' }}>Care: </span><strong>{product.careInstructions}</strong></div>}
              </div>
            </div>
          )}

          {product.sizeChart && Object.keys(product.sizeChart).length > 0 && (
            <details className="mc-card" style={{ padding: '1rem', marginBottom: '1.2rem' }}>
              <summary style={{ cursor: 'pointer', fontWeight: 700, fontSize: '0.96rem', color: 'var(--mc-burgundy)' }}>
                Brand Size Chart
              </summary>
              <div style={{ marginTop: '0.75rem', fontSize: '0.84rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: '0.5rem' }}>
                {Object.entries(product.sizeChart).map(([sz, meas]) => (
                  <div key={sz} className="mc-linen-panel" style={{ padding: '0.5rem' }}>
                    <strong>{sz}</strong>: {typeof meas === 'object' ? JSON.stringify(meas) : String(meas)}
                  </div>
                ))}
              </div>
            </details>
          )}

          {!isNative && !product.sourceUrl && !isInfoDb && (
            <div className="mc-linen-panel" style={{ padding: '0.9rem 1rem', fontSize: '0.84rem', marginBottom: '1.4rem' }}>
              <ShieldCheck size={15} style={{ verticalAlign: 'text-bottom', marginRight: '0.35rem', color: 'var(--mc-burgundy)' }} />
              External sample record pending live {product.sourcePlatform.replace(/_/g, ' ')} affiliate/API feed connection.
            </div>
          )}

          {product.specifications && Object.keys(product.specifications).length > 0 && (
            <div className="mc-card" style={{ padding: '1.1rem', marginBottom: '1.2rem' }}>
              <h3 style={{ fontSize: '1.08rem', marginBottom: '0.6rem' }}>Structured Specifications & Attributes</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.86rem' }}>
                {Object.entries(product.specifications).map(([k, v]) => (
                  <div key={k} style={{ padding: '0.35rem 0', borderBottom: '1px solid var(--mc-border)' }}>
                    <span style={{ color: 'var(--mc-muted)' }}>{k}: </span>
                    <strong>{String(v)}</strong>
                  </div>
                ))}
              </div>
            </div>
          )}

          {product.imageStatus === 'VERIFIED' && (
            <div style={{ fontSize: '0.8rem', color: 'var(--mc-muted)', marginBottom: '1rem' }}>
              <CheckCircle2 size={13} style={{ verticalAlign: 'text-bottom', marginRight: '0.25rem', color: 'var(--mc-burgundy)' }} />
              Image Source: {product.imageSource} • License: {product.imageLicense} • Attribution: {product.imageAttribution}
            </div>
          )}

          {product.lifecycleOptions && product.lifecycleOptions.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
              <span style={{ fontSize: '0.84rem', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.35rem' }}>
                <Recycle size={15} color="var(--mc-burgundy)" /> Lifecycle eligible:
              </span>
              {product.lifecycleOptions.map((opt) => (
                <Link key={opt} to={`/lifecycle?productId=${product.id}&type=${opt}`} className="mc-badge mc-badge-blush" style={{ cursor: 'pointer' }}>
                  {opt}
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>

      {customerPhotos && customerPhotos.length > 0 && (
        <section style={{ marginBottom: '3rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
            <div>
              <h2 style={{ fontSize: '1.7rem', marginBottom: '0.2rem' }}>Customer Photos — Verified Purchase</h2>
              <p style={{ margin: 0, fontSize: '0.84rem', color: 'var(--mc-muted)' }}>
                Real parcel &amp; product photos uploaded by verified buyers (kept separate from official brand packshots).
              </p>
            </div>
            <span className="mc-badge mc-badge-blush">{customerPhotos.length} buyer photo(s)</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(175px, 1fr))', gap: '1rem' }}>
            {customerPhotos.map((cp) => (
              <div key={cp.id} className="mc-card" style={{ overflow: 'hidden', padding: '0.65rem' }}>
                <div style={{ aspectRatio: '1 / 1', borderRadius: 'var(--mc-radius-sm)', overflow: 'hidden', background: 'var(--mc-card)', marginBottom: '0.5rem' }}>
                  <img src={cp.imageDataUrl} alt={cp.caption || `Verified buyer photo for ${product.name}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
                <span className="mc-badge mc-badge-caramel" style={{ fontSize: '0.65rem' }}>Verified Purchase</span>
                {cp.caption && <p style={{ margin: '0.35rem 0 0', fontSize: '0.78rem', color: 'var(--mc-chocolate)' }}>{cp.caption}</p>}
              </div>
            ))}
          </div>
        </section>
      )}

      {alternatives && (alternatives.budget.length > 0 || alternatives.balanced.length > 0 || alternatives.premium.length > 0) && (
        <section>
          <h2 style={{ fontSize: '1.9rem', marginBottom: '1.2rem' }}>Comparable Alternatives in {product.categoryName}</h2>
          <div className="mc-grid-4">
            {[...alternatives.budget, ...alternatives.balanced, ...alternatives.premium].slice(0, 4).map((alt) => (
              <ProductCard key={alt.id} product={alt} variant="compact" />
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

export const RetailersPage: React.FC = () => {
  const { marketCountry } = useCountry();
  const { data: sources } = useQuery({
    queryKey: ['sources'],
    queryFn: async () => unwrap<RetailerSource[]>(await api.get('/sources')),
  });
  const { data: counts } = useQuery({
    queryKey: ['product-counts'],
    queryFn: async () => unwrap<ProductCounts>(await api.get('/products/count')),
  });
  const { data: luxuryStatus } = useQuery({
    queryKey: ['luxury-status', marketCountry],
    queryFn: async () => unwrap<DataBoutiqueStatus>(await api.get(`/sources/luxury-status?country=${marketCountry}`)),
  });

  return (
    <div className="mc-container" style={{ padding: '2.5rem 1.5rem 3.5rem' }}>
      <PageHeader
        title="13 Partner Retailer Ecosystems + Open Catalog Sources"
        subtitle="MissionCart integrates configuration-driven catalog adapters for India's leading general, fashion, skincare, desk, and electronics ecosystems alongside active open barcode catalogues."
        breadcrumbs={[{ label: 'Retailers' }]}
      />

      <div className="mc-grid-3">
        {(sources || []).map((s) => {
          const itemCount = counts?.byRetailer?.[s.code] || 0;
          const isActive = s.nativeCheckout || s.connectionStatus.startsWith('ACTIVE');
          return (
            <div key={s.id} className="mc-card" style={{ padding: '1.4rem', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '1rem' }}>
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.6rem', gap: '0.5rem' }}>
                  <h2 style={{ fontSize: '1.25rem' }}>{s.name}</h2>
                  <span className={`mc-badge ${isActive ? 'mc-badge-burgundy' : 'mc-badge-caramel'}`}>
                    {s.nativeCheckout ? 'Native Active' : s.connectionStatus === 'ACTIVE_OPEN_DATASET' ? 'Open Feed Active' : 'Feed Pending'}
                  </span>
                </div>
                <div style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--mc-burgundy)', marginBottom: '0.4rem' }}>
                  {s.categoryFocus} • {itemCount.toLocaleString('en-IN')} listing(s)
                </div>
                <p style={{ fontSize: '0.86rem', color: 'var(--mc-muted)', margin: '0 0 0.7rem' }}>{s.supportedCategories}</p>
                <div style={{ fontSize: '0.78rem', color: 'var(--mc-muted)' }}>
                  <div><strong>Import:</strong> {s.importMethod}</div>
                  <div><strong>Images:</strong> {s.imageSourcingMethod}</div>
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '0.75rem', borderTop: '1px solid var(--mc-border)' }}>
                <Link to={`/products?source=${s.code}`} className="mc-btn mc-btn-outline" style={{ padding: '0.4rem 0.9rem', fontSize: '0.82rem' }}>
                  Filter Products
                </Link>
                {s.officialWebsite.startsWith('http') && !s.officialWebsite.includes('missioncart.local') && (
                  <a href={s.officialWebsite} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.82rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem', color: 'var(--mc-burgundy)', fontWeight: 600 }}>
                    Official Site <ExternalLink size={13} />
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {luxuryStatus && (
        <section style={{ marginTop: '3.25rem' }}>
          <div className="mc-linen-panel" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '0.5rem' }}>
              <h2 style={{ fontSize: '1.5rem', margin: 0 }}>International Luxury Brand Connectors (Data Boutique Collection)</h2>
              <span className="mc-badge mc-badge-burgundy">{luxuryStatus.luxuryBrands.length} Brands</span>
            </div>
            <p style={{ margin: '0 0 0.65rem', fontSize: '0.88rem', color: 'var(--mc-muted)' }}>
              {luxuryStatus.message} Active filter country: <strong>{marketCountry}</strong>. Full datasets exclude proprietary media until paired with authorized brand photography or admin ZIP uploads.
            </p>
            <div className="mc-grid-4" style={{ marginTop: '1rem' }}>
              {luxuryStatus.luxuryBrands.map((lb) => (
                <div key={lb.code} className="mc-card" style={{ padding: '0.95rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.4rem', alignItems: 'center', marginBottom: '0.35rem' }}>
                    <strong style={{ fontSize: '0.94rem' }}>{lb.name}</strong>
                    <span className={`mc-badge ${lb.productCount > 0 ? 'mc-badge-burgundy' : 'mc-badge-ivory'}`} style={{ fontSize: '0.66rem' }}>
                      {lb.productCount > 0 ? `${lb.productCount} active` : 'Dataset Pending'}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--mc-muted)', marginBottom: '0.4rem' }}>
                    Countries: {lb.availableCountries.length > 0 ? lb.availableCountries.join(', ') : 'Awaiting authorized country dataset'}
                  </div>
                  <a href={lb.officialWebsite} target="_blank" rel="noopener noreferrer" style={{ fontSize: '0.74rem', color: 'var(--mc-burgundy)', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}>
                    Official Site <ExternalLink size={11} />
                  </a>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
};
