import React, { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronLeft, ChevronRight, ArrowUpRight } from 'lucide-react';
import { useReducedMotion } from 'framer-motion';
import { EditorialCollectionCard } from '../types';

interface EditorialCollectionGalleryProps {
  categorySlug: string;
  collections: EditorialCollectionCard[];
  countryCode: string;
}

export const EditorialCollectionGallery: React.FC<EditorialCollectionGalleryProps> = ({
  categorySlug,
  collections,
  countryCode,
}) => {
  const railRef = useRef<HTMLDivElement | null>(null);
  const shouldReduceMotion = useReducedMotion();
  const [dragging, setDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollStart, setScrollStart] = useState(0);

  if (!collections || collections.length === 0) return null;

  const scrollByCards = (dir: -1 | 1) => {
    if (!railRef.current) return;
    const step = Math.max(300, railRef.current.clientWidth * 0.72);
    railRef.current.scrollBy({
      left: dir * step,
      behavior: shouldReduceMotion ? 'auto' : 'smooth',
    });
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!railRef.current) return;
    setDragging(true);
    setStartX(e.pageX - railRef.current.offsetLeft);
    setScrollStart(railRef.current.scrollLeft);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragging || !railRef.current) return;
    const x = e.pageX - railRef.current.offsetLeft;
    railRef.current.scrollLeft = scrollStart - (x - startX) * 1.15;
  };

  const stopDrag = () => setDragging(false);

  return (
    <section aria-label="Curated collections gallery" style={{ marginBottom: '3.25rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', gap: '0.75rem', flexWrap: 'wrap' }}>
        <div style={{ fontSize: '0.82rem', textTransform: 'uppercase', letterSpacing: '0.09em', fontWeight: 700, color: 'var(--mc-burgundy)' }}>
          {collections.length} Curated Collections • Scroll or Explore
        </div>
        <div style={{ display: 'flex', gap: '0.45rem' }}>
          <button
            type="button"
            aria-label="Scroll collections left"
            onClick={() => scrollByCards(-1)}
            className="mc-btn mc-btn-outline"
            style={{ width: 38, height: 38, padding: 0, borderRadius: '50%', display: 'grid', placeItems: 'center' }}
          >
            <ChevronLeft size={18} />
          </button>
          <button
            type="button"
            aria-label="Scroll collections right"
            onClick={() => scrollByCards(1)}
            className="mc-btn mc-btn-outline"
            style={{ width: 38, height: 38, padding: 0, borderRadius: '50%', display: 'grid', placeItems: 'center' }}
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      <div
        ref={railRef}
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === 'ArrowRight') scrollByCards(1);
          if (e.key === 'ArrowLeft') scrollByCards(-1);
        }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={stopDrag}
        onPointerLeave={stopDrag}
        style={{
          display: 'flex',
          gap: '1.15rem',
          overflowX: 'auto',
          paddingBottom: '0.9rem',
          scrollSnapType: 'x proximity',
          cursor: dragging ? 'grabbing' : 'grab',
          scrollbarWidth: 'thin',
        }}
      >
        {collections.map((col) => {
          const tiles = col.collageTiles || [];
          const gridCols = tiles.length >= 7 ? 3 : tiles.length >= 4 ? 3 : tiles.length >= 2 ? 2 : 1;
          const displayTiles = tiles.slice(0, tiles.length >= 7 ? 9 : tiles.length >= 4 ? 6 : tiles.length >= 2 ? 4 : 1);

          return (
            <Link
              key={col.slug}
              to={`/categories/${categorySlug}/collections/${col.slug}?country=${countryCode}`}
              className="mc-card mc-collage-card"
              draggable={false}
              style={{
                flex: '0 0 clamp(255px, 21.5vw, 310px)',
                scrollSnapAlign: 'start',
                overflow: 'hidden',
                background: 'var(--mc-surface)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                textDecoration: 'none',
                transition: shouldReduceMotion ? 'none' : 'transform 260ms ease, box-shadow 260ms ease, border-color 260ms ease',
              }}
            >
              {/* Multi-Tile Photo Collage */}
              <div
                style={{
                  padding: '0.75rem',
                  background: '#FAF6F0',
                  borderBottom: '1px solid var(--mc-border)',
                  aspectRatio: '3 / 3.4',
                  display: 'grid',
                  gridTemplateColumns: `repeat(${gridCols}, 1fr)`,
                  gap: '0.35rem',
                  alignContent: displayTiles.length === 0 ? 'center' : 'stretch',
                }}
              >
                {displayTiles.length === 0 ? (
                  <div
                    style={{
                      gridColumn: '1 / -1',
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      justifyContent: 'center',
                      textAlign: 'center',
                      padding: '1.25rem',
                      color: 'var(--mc-muted)',
                      background: 'var(--mc-ivory)',
                      borderRadius: 'var(--mc-radius-sm)',
                    }}
                  >
                    <div className="mc-serif" style={{ fontSize: '1.15rem', color: 'var(--mc-chocolate)', marginBottom: '0.35rem' }}>
                      {col.title}
                    </div>
                    <div style={{ fontSize: '0.76rem' }}>
                      Dataset pending for {countryCode}
                    </div>
                  </div>
                ) : (
                  displayTiles.map((tile, tIdx) => (
                    <div
                      key={`${col.slug}-${tile.productId}-${tIdx}`}
                      style={{
                        overflow: 'hidden',
                        borderRadius: '4px',
                        background: '#FFFFFF',
                        border: '1px solid rgba(43, 34, 32, 0.06)',
                        position: 'relative',
                        gridRow: displayTiles.length === 5 && tIdx === 0 ? 'span 2' : undefined,
                      }}
                    >
                      <img
                        src={tile.imageUrl}
                        alt={tile.name}
                        loading="lazy"
                        referrerPolicy="no-referrer"
                        draggable={false}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                          display: 'block',
                          transition: shouldReduceMotion ? 'none' : 'transform 380ms cubic-bezier(0.22, 1, 0.36, 1)',
                        }}
                      />
                    </div>
                  ))
                )}
              </div>

              {/* Editorial Footer Label */}
              <div style={{ padding: '1rem 1.05rem 1.1rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: '0.5rem' }}>
                <div style={{ minWidth: 0 }}>
                  <h3 style={{ fontSize: '1.16rem', margin: '0 0 0.2rem', color: 'var(--mc-chocolate)', lineHeight: 1.2 }}>
                    {col.title}
                  </h3>
                  <div style={{ fontSize: '0.78rem', color: 'var(--mc-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {col.subtitle || `${col.matchingProductCount} curated items`}
                  </div>
                </div>
                <span
                  className="mc-badge mc-badge-blush"
                  style={{ flexShrink: 0, fontSize: '0.69rem', display: 'inline-flex', alignItems: 'center', gap: '0.2rem' }}
                >
                  {col.matchingProductCount > 0 ? col.matchingProductCount : 'Explore'} <ArrowUpRight size={11} />
                </span>
              </div>
            </Link>
          );
        })}
      </div>

      <style>{`
        .mc-collage-card:hover {
          transform: translateY(-4px);
          border-color: var(--mc-caramel);
          box-shadow: var(--mc-shadow-lift);
        }
        .mc-collage-card:hover img {
          transform: scale(1.06);
        }
        @media (prefers-reduced-motion: reduce) {
          .mc-collage-card:hover { transform: none; }
          .mc-collage-card:hover img { transform: none; }
        }
      `}</style>
    </section>
  );
};
