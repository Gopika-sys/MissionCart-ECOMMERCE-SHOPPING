import React, { useEffect } from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmDialogProps {
  open: boolean;
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  loading?: boolean;
  onConfirm: () => void | Promise<void>;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  open,
  title = 'Confirm Removal',
  message,
  confirmLabel = 'Yes, Remove',
  cancelLabel = 'Keep Item',
  danger = true,
  loading = false,
  onConfirm,
  onCancel,
}) => {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, loading, onCancel]);

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="mc-confirm-title"
      onClick={() => !loading && onCancel()}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 120,
        background: 'rgba(43, 34, 32, 0.54)',
        backdropFilter: 'blur(3px)',
        display: 'grid',
        placeItems: 'center',
        padding: '1rem',
      }}
    >
      <div
        className="mc-card"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 420,
          padding: '1.5rem',
          background: 'var(--mc-surface)',
          border: '1px solid var(--mc-border)',
          boxShadow: 'var(--mc-shadow-lift)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <span
              style={{
                width: 36,
                height: 36,
                borderRadius: '50%',
                display: 'grid',
                placeItems: 'center',
                background: danger ? '#FCE8EC' : 'var(--mc-card)',
                color: danger ? 'var(--mc-burgundy)' : 'var(--mc-chocolate)',
                flexShrink: 0,
              }}
            >
              <AlertTriangle size={18} />
            </span>
            <h3 id="mc-confirm-title" className="mc-serif" style={{ margin: 0, fontSize: '1.25rem', color: 'var(--mc-chocolate)' }}>
              {title}
            </h3>
          </div>
          <button
            type="button"
            aria-label="Close confirmation dialog"
            disabled={loading}
            onClick={onCancel}
            style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--mc-muted)', padding: 4 }}
          >
            <X size={18} />
          </button>
        </div>

        <p style={{ margin: '1rem 0 1.4rem', color: 'var(--mc-chocolate)', fontSize: '0.95rem', lineHeight: 1.55 }}>
          {message}
        </p>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.65rem', flexWrap: 'wrap' }}>
          <button
            type="button"
            className="mc-btn mc-btn-outline"
            disabled={loading}
            onClick={onCancel}
          >
            {cancelLabel}
          </button>
          <button
            type="button"
            className="mc-btn mc-btn-primary"
            disabled={loading}
            onClick={onConfirm}
            style={danger ? { background: 'var(--mc-burgundy)', color: '#fff' } : undefined}
          >
            {loading ? 'Processing...' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};
