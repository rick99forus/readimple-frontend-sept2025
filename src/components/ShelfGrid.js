export default function ShelfGrid({ books = [], onBookClick }) {
  if (!books.length) return null;
  return (
    <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 gap-1">
      {books.map((book, idx) => (
        <button
          key={book.id || idx}
          onClick={() => onBookClick(book)}
          className="group block w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-300 rounded-2xl"
          title={`${book.title}${book.author ? ' — ' + book.author : ''}`}
          aria-label={`Open ${book.title} by ${book.author || 'Unknown'}`}
        >
          <div
            className="relative w-full rounded-2xl overflow-hidden shadow-md ring-1 ring-black/5 bg-neutral-200"
            style={{ paddingTop: '150%' }} // 2:3 aspect ratio
          >
            {book.coverImage ? (
              <img
                src={book.coverImage}
                alt={book.title}
                loading="lazy"
                onError={e => { e.currentTarget.onerror = null; e.currentTarget.src = '/fallback-cover.png'; }}
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
              />
            ) : (
              <div className="absolute inset-0 w-full h-full flex items-center justify-center text-neutral-400 text-xs bg-neutral-200">
                No Image
              </div>
            )}
            <div className="absolute inset-x-0 bottom-0 p-2 pt-10 bg-gradient-to-t from-black/75 via-black/30 to-transparent">
              <h3 className="text-white text-[13px] font-semibold leading-tight line-clamp-2">
                {book.title}
              </h3>
              {book.author && (
                <p className="text-white/80 text-[11px] line-clamp-1">{book.author}</p>
              )}
            </div>
            <div className="pointer-events-none absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-white/10 to-transparent" />
          </div>
        </button>
      ))}
    </div>
  );
}