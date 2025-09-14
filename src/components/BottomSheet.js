import React, { forwardRef } from 'react';

const BottomSheet = forwardRef(function BottomSheet(
  { open, onClose, title, children },
  ref
) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[2000] flex items-end justify-center bg-black/30 transition-all">
      <div
        className="w-full max-w-3xl mx-auto bg-white rounded-t-2xl shadow-lg ring-1 ring-black/5 overflow-hidden"
        style={{ maxHeight: '90vh', minHeight: '40vh', transition: 'all 0.3s' }}
      >
        <div className="sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-neutral-100 px-4 pt-4 pb-2 flex items-center justify-between">
          <div className="font-bold text-lg truncate">{title}</div>
          <button
            className="ml-2 px-3 py-1 rounded-full bg-neutral-100 text-neutral-700 text-xs font-semibold"
            onClick={onClose}
            aria-label="Close"
          >
            Close
          </button>
        </div>
        <div
          ref={ref} // <-- Attach the ref here!
          className="overflow-y-auto"
          style={{ maxHeight: 'calc(90vh - 56px)' }}
        >
          {children}
        </div>
      </div>
    </div>
  );
});

export default BottomSheet;