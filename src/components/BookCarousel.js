import React, { useRef, useEffect } from 'react';

export default function BookCarousel({ books = [], onBookClick }) {
  const scrollRef = useRef(null);

  // Remove duplicates and only use books with cover images
  const filterUniqueBooks = (books) => {
    const seen = new Set();
    return books.filter(book => book.coverImage && !seen.has(book.id) && seen.add(book.id));
  };
  const displayBooks = filterUniqueBooks(books);

  // For infinite carousel: repeat books 3x
  const infiniteBooks = [...displayBooks, ...displayBooks, ...displayBooks];

  // On mount, scroll to the middle set
  useEffect(() => {
    const el = scrollRef.current;
    if (el && displayBooks.length > 0) {
      const bookWidth = 128 + 16; // 8rem + 1rem (gap)
      el.scrollLeft = displayBooks.length * bookWidth;
    }
  }, [books.length, displayBooks.length]);

  // Infinite scroll logic
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const bookWidth = 128 + 16;
    const totalBooks = displayBooks.length;
    const handleScroll = () => {
      if (el.scrollLeft <= bookWidth) {
        el.scrollLeft = totalBooks * bookWidth + el.scrollLeft;
      } else if (el.scrollLeft >= (totalBooks * 2 * bookWidth)) {
        el.scrollLeft = el.scrollLeft - totalBooks * bookWidth;
      }
    };
    el.addEventListener('scroll', handleScroll, { passive: true });
    return () => el.removeEventListener('scroll', handleScroll);
  }, [books.length, displayBooks.length]);

  if (!books.length) return null;

  return (
    <div className="relative w-full h-full overflow-hidden">
      <div
        ref={scrollRef}
        className="flex justify-center items-center w-full space-x-4 py-2 shadow-lg bg-inherit h-auto text-black overflow-x-auto scrollbar-hide"
        tabIndex={0}
        aria-label="Book carousel"
        style={{
          scrollbarWidth: 'none',
          msOverflowStyle: 'none',
        }}
      >
        {infiniteBooks.map((book, idx) => (
          <div
            key={`${book.id}-${idx}`}
            onClick={() => onBookClick(book)}
            tabIndex={0}
            aria-label={`Book: ${book.title} by ${book.author || 'Unknown'}`}
            title={`${book.title}${book.author ? ' by ' + book.author : ''}`}
          >
            {book.coverImage
              ? (
                <img
                  src={book.coverImage}
                  alt={book.title}
                  loading="lazy"
                  onError={e => { e.target.onerror = null; e.target.src = '/fallback-cover.png'; }}
                  className="w-32 h-48 object-cover rounded-lg shadow"
                  style={{ minWidth: '8rem', minHeight: '12rem' }}
                />
              )
              : (
                <div className="w-32 h-48 flex items-center justify-center bg-gray-800 rounded shadow text-xs text-gray-400" style={{ minWidth: '8rem', minHeight: '12rem' }}>
                  No Image
                </div>
              )
            }
            <div className="mt-2 text-center text-sm font-semibold truncate">{book.title}</div>
            {book.author && (
              <div className="text-xs text-gray-400 text-center truncate">{book.author}</div>
            )}
          </div>
        ))}
      </div>
      {/* Hide scrollbar for Chrome, Safari, Opera */}
      <style>
        {`
          .scrollbar-hide::-webkit-scrollbar {
            display: none;
          }
        `}
      </style>
    </div>
  );
}