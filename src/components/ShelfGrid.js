export default function ShelfGrid({ books = [], onBookClick }) {
  if (!books.length) return null;
  return (
    <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 gap-2">
  {books.map((book, idx) => (
    <div key={`${book.id}-${idx}`} className="book-row-item">
      <button
        onClick={() => onBookClick?.(book)}
        tabIndex={0}
        aria-label={`Book: ${book.title} by ${book.author || 'Unknown'}`}
        title={`${book.title}${book.author ? ' by ' + book.author : ''}`}
        className="group block w-full focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-300 rounded-2xl"
      >
        {/* Card frame */}
        <div className="relative mx-auto w-32 h-52 rounded-2xl overflow-hidden shadow-md ring-1 ring-black/5 bg-white flex flex-col items-center">
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
              // Keep your existing highlight function/term if present
              dangerouslySetInnerHTML={{
                __html: typeof highlightMatch === 'function'
                  ? highlightMatch(book.title, searchTerm)
                  : book.title
              }}
            />
            {book.author && (
              <div
                className="text-neutral-400 text-xs text-center truncate w-full"
                title={book.author}
                dangerouslySetInnerHTML={{
                  __html: typeof highlightMatch === 'function'
                    ? highlightMatch(book.author, searchTerm)
                    : book.author
                }}
              />
            )}
          </div>
        </div>
      </button>
    </div>
  ))}
</div>

  );
}