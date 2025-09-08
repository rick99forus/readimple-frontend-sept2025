import React, { useEffect, useRef } from 'react';

export default function BottomSheet({
  open,
  onClose,
  title = 'Details',
  children,
  headerActions,
  footer,
}) {
  const sheetRef = useRef(null);
  const scrollRef = useRef(null);

  // Lock body scroll while open
  useEffect(() => {
    if (!open) return;
    const body = document.body;
    const prevOverflow = body.style.overflow;
    body.style.overflow = 'hidden';
    return () => { body.style.overflow = prevOverflow; };
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[2000] bg-black/50 backdrop-blur-sm flex items-end sm:items-center sm:justify-center"
      role="dialog"
      aria-modal="true"
      aria-label={title}
      onClick={(e) => { if (e.target === e.currentTarget) onClose?.(); }}
    >
      <div
        ref={sheetRef}
        className="w-full sm:max-w-2xl sm:rounded-2xl bg-white text-black shadow-2xl ring-1 ring-black/5 max-h-[85vh] overflow-hidden"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200">
          <h3 className="text-base font-extrabold tracking-tight">{title}</h3>
          <div className="flex items-center gap-2">
            {headerActions}
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

        <div className="relative">
          <div
            ref={scrollRef}
            data-bottomsheet-scroll
            className="overflow-y-auto"
            style={{
              maxHeight: footer ? 'calc(85vh - 56px - 64px)' : 'calc(85vh - 56px)',
              overscrollBehavior: 'contain',
              WebkitOverflowScrolling: 'touch',
            }}
          >
            {children}
          </div>

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