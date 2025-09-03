import React from 'react';

export default function BookGrid({
  books = [],
  onBookClick,
  gridCols = 2,   // base columns on mobile
  maxRows,        // limit rows (cols * rows items)
}) {
  if (!books.length) return null;

  const perPage = maxRows ? Math.max(1, gridCols) * Math.max(1, maxRows) : undefined;
  const displayBooks = perPage ? books.slice(0, perPage) : books.slice(0, 8);

  // Map to concrete Tailwind classes so purge/JIT can see them
  const clamped = Math.min(4, Math.max(1, gridCols));
  const colPreset =
    {
      1: 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3',
      2: 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4',
      3: 'grid-cols-3 sm:grid-cols-3 md:grid-cols-4',
      4: 'grid-cols-4 sm:grid-cols-4 md:grid-cols-4',
    }[clamped];

  return (
    <div className={`grid ${colPreset} gap-4`}>
      {displayBooks.map((book, idx) => (
        <div
          key={book.id || idx}
          className="cursor-pointer flex flex-col items-center hover:scale-105 transition-transform duration-200 bg-white rounded-lg p-3"
          onClick={() => onBookClick?.(book)}
        >
          {book.coverImage ? (
            <img
              src={book.coverImage}
              alt={book.title}
              loading="lazy"
              onError={e => { e.currentTarget.onerror = null; e.currentTarget.src = '/fallback-cover.png'; }}
              className="w-24 h-36 object-cover rounded shadow mb-2"
            />
          ) : (
            <div className="w-24 h-36 flex items-center justify-center bg-gray-200 rounded shadow text-xs text-gray-400 mb-2">
              No Image
            </div>
          )}
          <div className="font-bold text-black text-sm text-center truncate w-full" title={book.title}>
            {book.title}
          </div>
          {book.author && (
            <div className="text-neutral-400 text-xs text-center truncate w-full" title={book.author}>
              {book.author}
            </div>
          )}
          {typeof book.rating === 'number' && (
            <div className="flex items-center mt-1">
              <span className="text-yellow-400 text-xs">★</span>
              <span className="text-xs text-gray-600 ml-1">{book.rating}</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
