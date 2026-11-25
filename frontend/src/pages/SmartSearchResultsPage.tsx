import React, { useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Sparkles, AlertTriangle, ArrowRight, Globe, Scale } from 'lucide-react';
import { api, unwrap, formatCurrency } from '../services/api';
import { useCountry } from '../context/CountryContext';
import { SmartSearchResponse } from '../types';
import { PageHeader } from '../components/PageHeader';
import { EditorialCollectionGallery } from '../components/EditorialCollectionGallery';
import { ProductCard } from '../components/ProductCard';

export const SmartSearchResultsPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { marketCountry } = useCountry();
  const q = searchParams.get('q') || '';

  const { data: result, isLoading } = useQuery({
    queryKey: ['smart-ai-search', q, marketCountry],
    enabled: Boolean(q.trim()),
    queryFn: async () =>
      unwrap<SmartSearchResponse>(await api.post('/ai/search', { query: q.trim(), countryCode: marketCountry })),
  });

  useEffect(() => {
    if (!result) return;
    if (result.intentType === 'CATEGORY_SEARCH' && result.targetCategorySlug) {
      navigate(`/categories/${result.targetCategorySlug}`, { replace: true });
    } else if (result.intentType === 'PURPOSE_MISSION' && result.missionPlan?.id) {
      navigate(`/mission-result/${result.missionPlan.id}`, { replace: true });
    }
  }, [result, navigate]);

  return (
    <div className="mc-container" style={{ padding: '2.5rem 1.5rem 4rem' }}>
      <PageHeader
        title={`Smart Search: "${q}"`}
        subtitle="MissionCart interprets product intent, category taxonomy, exact budget mode, and country availability."
        breadcrumbs={[{ label: 'AI Search' }]}
      />

      {isLoading && <p style={{ color: 'var(--mc-muted)' }}>Analyzing intent and querying verified catalogue...</p>}

      {result && (
        <>
          <div className="mc-linen-panel" style={{ padding: '1.25rem', marginBottom: '1.75rem', display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', alignItems: 'center' }}>
              <span className="mc-badge mc-badge-burgundy">
                <Sparkles size={12} /> {result.intentType.replace(/_/g, ' ')}
              </span>
              <span className="mc-badge mc-badge-ivory">
                <Globe size={12} /> Country: {result.resolvedCountryCode}
              </span>
              {result.parsedBudget?.maxPrice && (
                <span className="mc-badge mc-badge-blush">
                  {result.parsedBudget.budgetType === 'PER_PRODUCT_MAX_PRICE' ? 'Max per item' : 'Total bundle budget'}:{' '}
                  {formatCurrency(result.parsedBudget.maxPrice, result.parsedBudget.currency)}
                </span>
              )}
              {result.targetCategorySlug && (
                <Link to={`/categories/${result.targetCategorySlug}`} className="mc-badge mc-badge-caramel">
                  Open {result.targetCategorySlug} Editorial <ArrowRight size={11} />
                </Link>
              )}
            </div>
            <p style={{ margin: 0, fontSize: '0.96rem' }}>{result.explanation}</p>
            {result.parsedBudget?.ambiguous && result.parsedBudget?.clarificationQuestion && (
              <div style={{ fontSize: '0.84rem', color: 'var(--mc-burgundy)', fontWeight: 600 }}>
                Clarification: {result.parsedBudget.clarificationQuestion}
              </div>
            )}
          </div>

          {result.datasetPending && (
            <div className="mc-card" style={{ padding: '1.5rem', marginBottom: '2rem', borderColor: 'var(--mc-burgundy)', background: '#FAF0F3' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, color: 'var(--mc-burgundy)', marginBottom: '0.4rem' }}>
                <AlertTriangle size={17} /> Country Dataset Pending / Empty Result
              </div>
              <p style={{ margin: '0 0 0.9rem', fontSize: '0.9rem' }}>{result.explanation}</p>
              <Link to="/products" className="mc-btn mc-btn-outline" style={{ fontSize: '0.82rem' }}>
                Browse Available Products
              </Link>
            </div>
          )}

          {result.categoryPreview && result.categoryPreview.collections?.length > 0 && (
            <EditorialCollectionGallery
              categorySlug={result.categoryPreview.requestedSlug}
              collections={result.categoryPreview.collections}
              countryCode={result.resolvedCountryCode}
            />
          )}

          {result.intentType === 'COMPARISON_SEARCH' && result.matchedProducts.length > 0 && (
            <div className="mc-card" style={{ padding: '1.35rem', marginBottom: '2rem', overflowX: 'auto' }}>
              <h2 style={{ fontSize: '1.3rem', marginBottom: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <Scale size={18} color="var(--mc-burgundy)" /> Side-by-Side Verified Comparison
              </h2>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.88rem' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--mc-border)', textAlign: 'left' }}>
                    <th style={{ padding: '0.6rem' }}>Product</th>
                    <th style={{ padding: '0.6rem' }}>Brand</th>
                    <th style={{ padding: '0.6rem' }}>Price</th>
                    <th style={{ padding: '0.6rem' }}>Source</th>
                    <th style={{ padding: '0.6rem' }}>Rating</th>
                  </tr>
                </thead>
                <tbody>
                  {result.matchedProducts.slice(0, 4).map((p) => (
                    <tr key={p.id} style={{ borderBottom: '1px solid var(--mc-border)' }}>
                      <td style={{ padding: '0.6rem', fontWeight: 600 }}><Link to={`/products/${p.slug}`}>{p.name}</Link></td>
                      <td style={{ padding: '0.6rem' }}>{p.brandName || '—'}</td>
                      <td style={{ padding: '0.6rem', fontWeight: 700 }}>{p.price ? formatCurrency(p.price, p.currency) : 'Pending'}</td>
                      <td style={{ padding: '0.6rem' }}>{p.sourcePlatform.replace(/_/g, ' ')}</td>
                      <td style={{ padding: '0.6rem' }}>{p.rating ? `${p.rating} (${p.reviewCount})` : 'Unrated'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {result.matchedProducts.length > 0 && (
            <div className="mc-grid-4">
              {result.matchedProducts.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};
