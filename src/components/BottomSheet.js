import React, { useEffect, useRef } from 'react';

export default function BottomSheet({
  open,
  onClose,
  title = 'Details',
  children,

  // Optional actions (kept for compatibility)
  headerActions,                 // ReactNode to render in header (right side)
  footer,                        // ReactNode to render in sticky footer

  // Convenience flags (kept for compatibility; unused by your flow)
  showBuyButton = false,
  onBuy,                         // () => void
  buyLabel = 'Buy',

  showFavoriteButton = false,
  isFavorite = false,
  onToggleFavorite,              // () => void
  favoriteLabel = 'Favorite',
}) {
  const sheetRef = useRef(null);
  const scrollRef = useRef(null);

  // Global body scroll lock with ref-counting
  useEffect(() => {
    if (!open) return;

    const w = window;
    const docEl = document.documentElement;
    const body = document.body;
    if (typeof w.__modalLockCount !== 'number') w.__modalLockCount = 0;

    if (w.__modalLockCount === 0) {
      // Save previous inline styles to restore later
      w.__modalPrevOverflow = body.style.overflow;
      w.__modalPrevPaddingRight = body.style.paddingRight;

      // Compensate for scrollbar to avoid layout shift on desktop
      const scrollBarWidth = window.innerWidth - docEl.clientWidth;
      if (scrollBarWidth > 0) {
        body.style.paddingRight = `${scrollBarWidth}px`;
      }
      body.style.overflow = 'hidden';
    }
    w.__modalLockCount += 1;

    return () => {
      w.__modalLockCount -= 1;
      if (w.__modalLockCount <= 0) {
        body.style.overflow = w.__modalPrevOverflow || '';
        body.style.paddingRight = w.__modalPrevPaddingRight || '';
        w.__modalPrevOverflow = undefined;
        w.__modalPrevPaddingRight = undefined;
        w.__modalLockCount = 0;
      }
    };
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  // Header right-side actions (kept for compatibility)
  const renderHeaderActions = () => {
    if (headerActions) return headerActions;

    const nodes = [];
    if (showFavoriteButton && typeof onToggleFavorite === 'function') {
      nodes.push(
        <button
          key="fav"
          onClick={onToggleFavorite}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-orange-300 ${
            isFavorite ? 'bg-red-50 text-red-600 ring-1 ring-red-200' : 'bg-neutral-100 text-neutral-800 hover:bg-neutral-200'
          }`}
          aria-pressed={isFavorite}
          aria-label={favoriteLabel}
          title={favoriteLabel}
        >
          <svg viewBox="0 0 24 24" className="w-4 h-4" aria-hidden="true" fill="currentColor">
            <path d="M12 21s-7-4.35-9.33-8A5.33 5.33 0 0 1 12 5.33 5.33 5.33 0 0 1 21.33 13c-2.33 3.65-9.33 8-9.33 8Z" />
          </svg>
          {favoriteLabel}
        </button>
      );
    }
    if (showBuyButton && typeof onBuy === 'function') {
      nodes.push(
        <button
          key="buy"
          onClick={onBuy}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-white bg-orange-500 hover:bg-orange-600 focus:outline-none focus:ring-2 focus:ring-orange-300"
          aria-label={buyLabel}
          title={buyLabel}
        >
          <svg viewBox="0 0 24 24" className="w-4 h-4" aria-hidden="true" fill="currentColor">
            <path d="M6 6h15l-2 9H8L6 6Zm-2 0h2l2 9h9M10 20a1 1 0 1 1 0-2 1 1 0 0 1 0 2Zm7 0a1 1 0 1 1 .001-2.001A1 1 0 0 1 17 20Z" />
          </svg>
          {buyLabel}
        </button>
      );
    }
    if (nodes.length) return <div className="flex items-center gap-2">{nodes}</div>;
    return null;
  };

  const hasFooter = Boolean(footer) || Boolean(showFavoriteButton) || Boolean(showBuyButton);

  // Prevent scroll chaining: allow scroll only inside the sheet's scroll area
  const handleOverlayWheel = (e) => {
    // Stop the wheel event from bubbling to the page
    e.stopPropagation();
    // If wheel happened outside scroll area, prevent page scroll
    if (!scrollRef.current || !scrollRef.current.contains(e.target)) {
      e.preventDefault();
    }
  };
  const handleOverlayTouchMove = (e) => {
    // Allow touches inside the scroll area, block the rest
    if (!scrollRef.current || !scrollRef.current.contains(e.target)) {
      e.preventDefault();
    }
  };

  return (
    <div
      className="fixed inset-0 z-[2000] bg-black/50 backdrop-blur-sm flex items-end sm:items-center sm:justify-center"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose?.();
      }}
      onWheel={handleOverlayWheel}
      onTouchMove={handleOverlayTouchMove}
    >
      <div
        ref={sheetRef}
        className="w-full sm:max-w-2xl sm:rounded-2xl bg-white text-black shadow-2xl ring-1 ring-black/5 max-h-[85vh] overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200">
          <h3 className="text-base font-extrabold tracking-tight">{title}</h3>
          <div className="flex items-center gap-2">
            {renderHeaderActions()}
            <button
              onClick={onClose}
              className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-white text-neutral-700 border border-neutral-200 hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-orange-300"
              aria-label="Close"
              title="Close"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5" aria-hidden="true">
                <path d="M6 6l12 12M18 6l-12 12" className="stroke-current" strokeWidth="2" fill="none" strokeLinecap="round" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content + optional sticky footer */}
        <div className="relative">
          <div
            ref={scrollRef}
            className="overflow-y-auto"
            style={{
              // Reserve space for header (56px) and optional footer (~64px)
              maxHeight: hasFooter ? 'calc(85vh - 56px - 64px)' : 'calc(85vh - 56px)',
              overscrollBehavior: 'contain',           // stop scroll chaining
              WebkitOverflowScrolling: 'touch',        // smooth iOS momentum scroll
            }}
          >
            {children}
          </div>

          {/* Optional sticky footer slot (kept for compatibility; not used by your current flow) */}
          {footer ? (
            <div className="sticky bottom-0 bg-white border-t border-neutral-200 px-4 py-3">
              {footer}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}