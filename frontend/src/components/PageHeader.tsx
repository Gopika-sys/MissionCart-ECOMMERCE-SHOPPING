import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronRight } from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  to?: string;
}

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  breadcrumbs?: BreadcrumbItem[];
  fallbackTo?: string;
  actions?: React.ReactNode;
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  breadcrumbs = [],
  fallbackTo = '/',
  actions,
}) => {
  const navigate = useNavigate();

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate(fallbackTo);
    }
  };

  return (
    <div style={{ marginBottom: '1.5rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '0.65rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={handleBack}
            className="mc-btn mc-btn-outline"
            style={{ padding: '0.38rem 0.85rem', fontSize: '0.84rem' }}
          >
            <ArrowLeft size={15} /> Back
          </button>

          {breadcrumbs.length > 0 && (
            <nav aria-label="Breadcrumb" style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.82rem', color: 'var(--mc-muted)', flexWrap: 'wrap' }}>
              <Link to="/" style={{ color: 'var(--mc-muted)' }}>Home</Link>
              {breadcrumbs.map((crumb, idx) => (
                <React.Fragment key={`${crumb.label}-${idx}`}>
                  <ChevronRight size={13} />
                  {crumb.to ? (
                    <Link to={crumb.to} style={{ color: 'var(--mc-muted)' }}>{crumb.label}</Link>
                  ) : (
                    <span style={{ color: 'var(--mc-burgundy)', fontWeight: 600 }}>{crumb.label}</span>
                  )}
                </React.Fragment>
              ))}
            </nav>
          )}
        </div>
        {actions && <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>{actions}</div>}
      </div>

      <h1 className="mc-serif" style={{ margin: 0, fontSize: 'clamp(1.65rem, 3vw, 2.25rem)', color: 'var(--mc-chocolate)' }}>
        {title}
      </h1>
      {subtitle && (
        <p style={{ margin: '0.35rem 0 0', color: 'var(--mc-muted)', fontSize: '0.96rem', maxWidth: 720 }}>
          {subtitle}
        </p>
      )}
    </div>
  );
};
