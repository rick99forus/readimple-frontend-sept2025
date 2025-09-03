// filepath: src/components/ContinueRow.js
import React, { useEffect, useState } from 'react';
import ContinueRowSkeleton from './skeletons/ContinueRowSkeleton';

const EMPTY_SLOTS = 2; // adjust to show more/less cards

const ContinueRow = ({ onClick }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const recent = JSON.parse(localStorage.getItem('recentlyOpenedBooks') || '[]');
    setItems(recent.slice(0, EMPTY_SLOTS));
    setLoading(false);
  }, []);

  if (loading) return <ContinueRowSkeleton />;

  // Make sure we always render exactly EMPTY_SLOTS cards by filling with nulls
  const display = [...items];
  while (display.length < EMPTY_SLOTS) display.push(null);

  return (
    <div
      className="flex gap-4 overflow-x-auto no-scrollbar snap-x snap-mandatory pb-1"
      style={{
        WebkitMaskImage:
          'linear-gradient(to right, transparent, black 8px, black calc(100% - 8px), transparent)',
        maskImage:
          'linear-gradient(to right, transparent, black 8px, black calc(100% - 8px), transparent)',
      }}
      aria-label="Continue reading"
    >
      {display.map((item, idx) =>
        item ? (
          <article key={item.id || idx} className="flex-shrink-0 snap-start w-32">
            <button
              onClick={() => onClick?.(item)}
              className="group block text-left w-full focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-300 rounded-2xl"
              aria-label={`Resume ${item.title} by ${item.author}`}
              title={`${item.title} — ${item.author}`}
            >
              <div className="relative w-full h-52 rounded-2xl overflow-hidden shadow-md ring-1 ring-black/5 bg-neutral-200">
                {/* Cover */}
                <img
                  src={item.coverImage}
                  alt={item.title}
                  loading="lazy"
                  onError={(e) => {
                    e.currentTarget.onerror = null;
                    e.currentTarget.src = '/fallback-cover.png';
                  }}
                  className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                />

                {/* Gradient title band */}
                <div className="absolute inset-x-0 bottom-0 p-2 pt-10 bg-gradient-to-t from-black/75 via-black/30 to-transparent">
                  <h3 className="text-white text-[13px] font-semibold leading-tight line-clamp-2">
                    {item.title}
                  </h3>
                  <p className="text-white/80 text-[11px] line-clamp-1">{item.author}</p>
                </div>

                {/* Continue pill */}
                <span className="absolute top-2 right-1/2 translate-x-[50%] inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold text-white bg-orange-500/85 shadow-md ring-1 ring-white/10">
                  {/* Play/continue icon */}
                  <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" aria-hidden="true">
                    <path d="M8 6l10 6-10 6V6z" className="fill-current" />
                  </svg>
                  Continue
                </span>

                {/* Subtle top sheen */}
                <div className="pointer-events-none absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-white/10 to-transparent" />
              </div>
            </button>
          </article>
        ) : (
          <article
            key={`empty-${idx}`}
            className="flex-shrink-0 snap-start w-32"
            aria-hidden="true"
          >
            <div className="relative w-full h-52 rounded-2xl border border-dashed border-neutral-300 bg-neutral-50/80 ring-1 ring-black/5">
              <div className="absolute inset-0 flex flex-col items-center justify-center p-3 text-neutral-400">
                <div className="w-10 h-10 rounded-xl bg-neutral-200 flex items-center justify-center mb-2 shadow-inner">
                  {/* Plus icon */}
                  <svg viewBox="0 0 24 24" className="w-5 h-5">
                    <path d="M12 5v14M5 12h14" className="stroke-current" strokeWidth="2" />
                  </svg>
                </div>
                <p className="text-[11px] text-center leading-snug">
                  Open a book to continue
                </p>
              </div>
            </div>
          </article>
        )
      )}
    </div>
  );
};

export default ContinueRow;
