// filepath: src/components/BookRow.js
import React, { useRef, useEffect, useState } from 'react';

function highlightMatch(text, query) {
  if (!query) return text;
  const regex = new RegExp(`(${query})`, 'ig');
  return text.replace(
    regex,
    '<mark class="bg-orange-300 text-black px-0.5 rounded-sm">$1</mark>'
  );
}

// Tunables to keep sizing consistent with grid cards
const CARD_HEIGHT = 200; // 16rem (h-64)
const COVER_HEIGHT = 160; // 10rem (h-40)

function SkeletonCard() {
  return (
    <div className="flex-shrink-0 px-1 py-3 w-28 sm:w-32">
      <div
        className="rounded-2xl ring-1 ring-black/5 shadow bg-white flex flex-col"
        style={{ height: CARD_HEIGHT }}
      >
        <div
          className="w-full overflow-hidden rounded-t-xl bg-neutral-200 animate-pulse"
          style={{ height: COVER_HEIGHT }}
          aria-hidden="true"
        />
        <div className="flex-1 rounded-b-xl bg-white px-2 py-2">
          <div className="h-3 w-5/6 bg-neutral-200 rounded mb-1.5" />
          <div className="h-2.5 w-1/2 bg-neutral-200 rounded" />
        </div>
      </div>
    </div>
  );
}

export default function BookRow({ books = [], onBookClick, searchTerm = '' }) {
  const scrollRef = useRef(null);
  const [scrollTimeout, setScrollTimeout] = useState(null);

  // De-dupe + require cover image
  const displayBooks = React.useMemo(() => {
    const seen = new Set();
    return (books || []).filter(b => {
      if (!b?.id || !b?.coverImage) return false;
      if (seen.has(b.id)) return false;
      seen.add(b.id);
      return true;
    });
  }, [books]);

  // Repeat 3x for infinite carousel
  const infiniteBooks = React.useMemo(
    () => [...displayBooks, ...displayBooks, ...displayBooks],
    [displayBooks]
  );

  // Compute card width + gap
  const getItemWidth = () => {
    const el = scrollRef.current;
    if (!el) return 140;
    const first = el.querySelector('[data-book-card="true"]');
    const style = getComputedStyle(el);
    const gapPx = parseFloat(style.columnGap || style.gap || '8') || 8; // gap-2
    if (first) {
      const rect = first.getBoundingClientRect();
      return rect.width + gapPx;
    }
    return 140;
  };

  // Start in the middle band
  useEffect(() => {
    const el = scrollRef.current;
    if (el && displayBooks.length > 0) {
      el.scrollLeft = displayBooks.length * getItemWidth();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayBooks.length]);

  // Infinite wraparound
  useEffect(() => {
    const el = scrollRef.current;
    if (!el || displayBooks.length === 0) return;
    const total = displayBooks.length;

    const handleScroll = () => {
      if (scrollTimeout) clearTimeout(scrollTimeout);
      setScrollTimeout(setTimeout(() => {}, 900));

      const cardWidth = getItemWidth();
      const band = total * cardWidth;

      if (el.scrollLeft <= cardWidth) {
        el.scrollLeft = el.scrollLeft + band;
      } else if (el.scrollLeft >= band * 2) {
        el.scrollLeft = el.scrollLeft - band;
      }
    };

    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      el.removeEventListener('scroll', handleScroll);
      if (scrollTimeout) clearTimeout(scrollTimeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scrollTimeout, displayBooks.length]);

  return (
    <div className="w-full">
      <div
        ref={scrollRef}
        className="
          flex gap-2 overflow-x-auto pb-1
          snap-x snap-mandatory
          [-webkit-overflow-scrolling:touch]
          scrollbar-thin scrollbar-thumb-neutral-300 hover:scrollbar-thumb-neutral-400
        "
        tabIndex={0}
        aria-label="Book carousel"
        style={{
          WebkitMaskImage:
            'linear-gradient(to right, transparent, black 12px, black calc(100% - 12px), transparent)',
          maskImage:
            'linear-gradient(to right, transparent, black 12px, black calc(100% - 12px), transparent)',
        }}
      >
        {displayBooks.length === 0
          ? Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)
          : infiniteBooks.map((book, idx) => (
              <div
                key={`${book.id}-${idx}`}
                className="flex-shrink-0 px-1 py-3 w-28 sm:w-32 snap-start"
                data-book-card="true"
              >
                <button
                  onClick={() => onBookClick?.(book)}
                  tabIndex={0}
                  aria-label={`Book: ${book.title} by ${book.author || 'Unknown'}`}
                  title={`${book.title}${book.author ? ' by ' + book.author : ''}`}
                  className="group block w-full focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-300 rounded-2xl"
                >
                  {/* Card: fixed height, flex-col so bottom fills remainder */}
                  <div
                    className="rounded-2xl ring-1 ring-black/5 shadow bg-white flex flex-col"
                    style={{ height: CARD_HEIGHT }}
                  >
                    {/* Top cover */}
                    <div
                      className="relative w-full overflow-hidden rounded-t-xl bg-neutral-200"
                      style={{ height: COVER_HEIGHT }}
                    >
                      {book.coverImage ? (
                        <img
                          src={book.coverImage}
                          alt={book.title}
                          loading="lazy"
                          onError={(e) => {
                            e.currentTarget.onerror = null;
                            e.currentTarget.src = '/fallback-cover.png';
                          }}
                          className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                        />
                      ) : (
                        <div className="absolute inset-0 w-full h-full flex items-center justify-center text-neutral-400 text-xs bg-neutral-200">
                          No Image
                        </div>
                      )}
                    </div>

                    {/* Bottom info fills remaining height */}
                    <div className="flex-1 rounded-b-xl bg-white px-2 py-2">
                      {typeof highlightMatch === 'function' ? (
                        <h3
                          className="text-[12px] font-semibold leading-tight text-neutral-900 line-clamp-1"
                          dangerouslySetInnerHTML={{
                            __html: highlightMatch(book.title, searchTerm),
                          }}
                        />
                      ) : (
                        <h3 className="text-[12px] font-semibold leading-tight text-neutral-900 line-clamp-2">
                          {book.title}
                        </h3>
                      )}

                      {book.author && (
                        typeof highlightMatch === 'function' ? (
                          <p
                            className="text-[11px] text-neutral-500 line-clamp-1 mt-0.5"
                            dangerouslySetInnerHTML={{
                              __html: highlightMatch(book.author, searchTerm),
                            }}
                          />
                        ) : (
                          <p className="text-[11px] text-neutral-500 line-clamp-1 mt-0.5">
                            {book.author}
                          </p>
                        )
                      )}
                    </div>
                  </div>
                </button>
              </div>
            ))}
      </div>
    </div>
  );
}
