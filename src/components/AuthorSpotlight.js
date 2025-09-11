// filepath: src/components/AuthorSpotlight.js
import React from 'react';
import { useNavigate } from 'react-router-dom';
import AuthorBooksModal from './AuthorBooksModal';
/* ============================ Small helpers ============================ */
function uniq(arr) {
  return Array.from(new Set(arr));
}


// If you already have your own uniqAuthors, remove this and pass that in instead.
function uniqAuthorsFromBooks(books = []) {
  return uniq(
    books
      .map(b => (b.author || '').trim())
      .filter(Boolean)
  );
}

// Tiny expandable bio with line-clamp
function ExpandableBio({ text = '', lines = 2 }) {
  const [open, setOpen] = React.useState(false);
  const clampClass = open ? '' : `line-clamp-${lines}`;
  if (!text) {
    return <div className="h-5 w-2/3 rounded bg-neutral-100 animate-pulse" aria-hidden="true" />;
  }
  return (
    <div className="text-sm text-neutral-700">
      <p className={`italic ${clampClass}`}>{text}</p>
      {text.length > 120 && (
        <button
          className="mt-1 text-xs font-semibold text-orange-700 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-300 rounded"
          onClick={() => setOpen(v => !v)}
        >
          {open ? 'Show less' : 'Show more'}
        </button>
      )}
    </div>
  );
}

/* ============================ Author Spotlight ============================ */
/**
 * Props:
 * - likedBooks: Array<Book> (use your deduped liked list; e.g., `books` in Bookshelf)
 * - authorData: Record<authorName, { bio?: string, photo?: string, books?: Book[] }>
 * - navigate: from react-router (pass the navigate instance from Bookshelf)
 */
export default function AuthorSpotlight({ likedBooks = [], authorData = {}, navigate, onOpenAuthor }) {
  
  if (!likedBooks.length) return null;

  const authors = uniqAuthorsFromBooks(likedBooks);
  if (!authors.length) return null;

  return (
    <div className="mt-2 grid gap-2 grid-cols-1 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
      <div className="flex items-center justify-between mb-3 px-1">
        <h2 className="text-xl font-extrabold tracking-tight">Author Spotlight</h2>
      </div>

      {authors.map((author) => {
        const info = authorData[author] || {};
        const books = Array.isArray(info.books) ? info.books : [];
        const photo = info.photo;
        const bio = typeof info.bio === 'string' ? info.bio : '';

        // If you want to hide authors without books yet, uncomment:
        // if (books.length === 0) return null;

        return (
          <section
            key={author}
            className="mb-8 rounded-2xl ring-1 ring-black/5 bg-white shadow-sm overflow-hidden"
            aria-labelledby={`author-${encodeURIComponent(author)}-heading`}
          >
            {/* Header strip */}
            <div className='border-b border-black/5'>
              <div className="flex items-center justify-between p-3 sm:p-4">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="w-11 h-11 rounded-xl bg-neutral-100 flex items-center justify-center overflow-hidden text-neutral-400 shrink-0">
                    {photo ? (
                      <img
                        src={photo}
                        alt={author || 'Author'}
                        className="w-11 h-11 object-cover"
                        onError={(e) => { e.currentTarget.src = '/avatar-fallback.png'; }}
                      />
                    ) : (
                      <span className="text-base font-bold">
                        {(author?.[0] || 'A').toUpperCase()}
                      </span>
                    )}
                  </span>
                  <h3
                    id={`author-${encodeURIComponent(author)}-heading`}
                    className="text-sm sm:text-base font-extrabold tracking-tight text-neutral-900 truncate"
                  >
                    {author || 'Author'}
                  </h3>
                </div>
            <button
                className="shrink-0 inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-orange-700 ring-1 ring-orange-200 hover:bg-orange-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
                onClick={() => (typeof onOpenAuthor === 'function'
                  ? onOpenAuthor(author, info)
                  : navigate(`/author/${encodeURIComponent(author)}`))}
                aria-label={`See all books by ${author}`}
                title="See all"
              >
                See all
                <svg viewBox="0 0 24 24" className="w-3.5 h-3.5">
                  <path d="M9 6l6 6-6 6" className="stroke-current" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
            </div>      

            {/* Bio row */}
            <div className="px-3 pt-3">
              <ExpandableBio text={bio} lines={2} />
            </div>

            {/* Horizontal book scroller */}
            <div className="mt-3 pb-3">
              <div className="flex gap-3 overflow-x-auto scroll-px-3 px-3 snap-x snap-mandatory">
                {books.slice(0, 12).map((book, idx) => (
                  <button
                    key={book.id || `${author}-${idx}`}
                    onClick={() => navigate('/discover', { state: { book } })}
                    className="group relative snap-start flex-shrink-0 w-32 rounded-2xl overflow-hidden ring-1 ring-black/5 bg-neutral-200 shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-300"
                    style={{ aspectRatio: '2 / 3' }}
                    title={`${book.title}${book.author ? ' — ' + book.author : ''}`}
                    aria-label={`Open ${book.title} by ${book.author || 'Unknown'}`}
                  >
                    {/* Cover */}
                    {book.coverImage ? (
                      <img
                        src={book.coverImage}
                        alt={book.title}
                        loading="lazy"
                        onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = '/fallback-cover.png'; }}
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                      />
                    ) : (
                      <div className="absolute inset-0 w-full h-full flex items-center justify-center text-neutral-400 text-xs bg-neutral-200">
                        No Image
                      </div>
                    )}

                    {/* Gradient title band (matches your BookRow/ShelfGrid) */}
                    <div className="absolute inset-x-0 bottom-0 p-2 pt-10 bg-gradient-to-t from-black/75 via-black/30 to-transparent">
                      <h4 className="text-white text-[12px] font-semibold leading-tight line-clamp-2">
                        {book.title}
                      </h4>
                      {book.author && (
                        <p className="text-white/80 text-[10px] leading-tight line-clamp-1">{book.author}</p>
                      )}
                    </div>

                    {/* Sheen */}
                    <div className="pointer-events-none absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-white/10 to-transparent" />
                  </button>
                ))}

                {books.length === 0 && (
                  <div className="text-neutral-400 text-xs py-6 px-3">No books found for this author.</div>
                )}
              </div>
            </div>
          </section>
        );
      })}
      
    </div>
    
  );

}

