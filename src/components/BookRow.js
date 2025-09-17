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
                <div className="relative w-32 h-52 rounded-2xl overflow-hidden shadow-md ring-1 ring-black/5 bg-neutral-200 flex flex-col items-center">
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
                      className="w-24 h-36 object-cover rounded shadow mb-2 mt-2"
                      style={{ minWidth: '6rem', minHeight: '9rem' }}
                    />
                  ) : (
                    <div className="w-24 h-36 flex items-center justify-center bg-gray-200 rounded shadow text-xs text-gray-400 mb-2 mt-2">
                      No Image
                    </div>
                  )}
                  {/* Title & Author below cover */}
                  <div className="w-full px-1 pb-1">
                    <div
                      className="font-bold text-black text-sm text-center truncate w-full"
                      title={book.title}
                      dangerouslySetInnerHTML={{ __html: highlightMatch(book.title, searchTerm) }}
                    />
                    {book.author && (
                      <div
                        className="text-neutral-400 text-xs text-center truncate w-full"
                        title={book.author}
                        dangerouslySetInnerHTML={{ __html: highlightMatch(book.author, searchTerm) }}
                      />
                    )}
                  </div>
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
