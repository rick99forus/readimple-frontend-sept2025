import React, { useRef, useEffect, useState } from 'react';
import SkeletonCard from './SkeletonCard';
import './BookRow.css';

function highlightMatch(text, query) {
  if (!query) return text;
  const regex = new RegExp(`(${query})`, 'ig');
  return text.replace(regex, '<mark class="bg-orange-300 text-black px-0.5 rounded-sm">$1</mark>');
}

function BookRow({ books = [], onBookClick, searchTerm = '' }) {
  const scrollRef = useRef(null);
  const [scrollTimeout, setScrollTimeout] = useState(null);

  // Remove duplicates and only use books with cover images
  const filterUniqueBooks = (arr) => {
    const seen = new Set();
    return arr.filter(b => b?.coverImage && !seen.has(b.id) && seen.add(b.id));
  };
  const displayBooks = filterUniqueBooks(books);

  // Repeat 3x for infinite carousel
  const infiniteBooks = [...displayBooks, ...displayBooks, ...displayBooks];

  // On mount, scroll to the middle set
  useEffect(() => {
    const el = scrollRef.current;
    if (el && displayBooks.length > 0) {
      const cardWidth = 128 + 16; // 8rem + gap
      el.scrollLeft = displayBooks.length * cardWidth;
    }
  }, [books.length, displayBooks.length]);

  // Infinite scroll logic
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const cardWidth = 128 + 16;
    const total = displayBooks.length;

    const handleScroll = () => {
      if (scrollTimeout) clearTimeout(scrollTimeout);
      setScrollTimeout(setTimeout(() => {}, 900));

      // wraparound
      if (el.scrollLeft <= cardWidth) {
        el.scrollLeft = total * cardWidth + el.scrollLeft;
      } else if (el.scrollLeft >= total * 2 * cardWidth) {
        el.scrollLeft = el.scrollLeft - total * cardWidth;
      }
    };

    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => {
      el.removeEventListener('scroll', handleScroll);
      if (scrollTimeout) clearTimeout(scrollTimeout);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scrollTimeout, books.length]);

  return (
    <div className="book-row-container">
      {/* Carousel */}
      <div
        ref={scrollRef}
        className="book-row-scroll no-scrollbar"
        tabIndex={0}
        aria-label="Book carousel"
        style={{
          WebkitMaskImage:
            'linear-gradient(to right, transparent, black 8px, black calc(100% - 8px), transparent)',
          maskImage:
            'linear-gradient(to right, transparent, black 8px, black calc(100% - 8px), transparent)',
        }}
      >
        {books.length === 0 ? (
          Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
        ) : (
          infiniteBooks.map((book, idx) => (
            <div key={`${book.id}-${idx}`} className="book-row-item">
              <button
                onClick={() => onBookClick?.(book)}
                tabIndex={0}
                aria-label={`Book: ${book.title} by ${book.author || 'Unknown'}`}
                title={`${book.title}${book.author ? ' by ' + book.author : ''}`}
                className="group block w-full focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-300 rounded-2xl"
              >
                {/* Card frame */}
                <div className="relative w-32 h-52 rounded-2xl overflow-hidden shadow-md ring-1 ring-black/5 bg-neutral-200">
                  {/* Cover */}
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
                    <div className="absolute inset-0 w-full h-full flex items-center justify-center bg-neutral-200 text-neutral-400 text-xs">
                      No Image
                    </div>
                  )}

                  {/* Gradient title band (same style vibe as Continue) */}
                  <div className="absolute inset-x-0 bottom-0 p-2 pt-10 bg-gradient-to-t from-black/75 via-black/30 to-transparent">
                    <div
                      className="text-white text-[13px] font-semibold leading-tight line-clamp-2"
                      dangerouslySetInnerHTML={{ __html: highlightMatch(book.title, searchTerm) }}
                    />
                    {book.author && (
                      <div
                        className="text-white/80 text-[11px] line-clamp-1"
                        dangerouslySetInnerHTML={{ __html: highlightMatch(book.author, searchTerm) }}
                      />
                    )}
                  </div>

                  {/* subtle top sheen */}
                  <div className="pointer-events-none absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-white/10 to-transparent" />
                </div>
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default BookRow;
