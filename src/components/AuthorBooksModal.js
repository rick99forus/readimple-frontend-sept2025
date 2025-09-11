// filepath: src/components/AuthorBooksModal.js
import React from 'react';
import ReactDOM from 'react-dom';

/**
 * Props:
 * - open: boolean
 * - author: string | null
 * - data: { bio?: string, photo?: string, books?: Book[] } | null
 * - onClose: () => void
 * - navigate: react-router navigate (for clicking a book)
 */
export default function AuthorBooksModal({ open, author, data, onClose, navigate }) {
  const closeBtnRef = React.useRef(null);

  // Lock body scroll when open
  React.useEffect(() => {
    const el = document.documentElement;
    if (open) el.classList.add('overflow-hidden');
    return () => el.classList.remove('overflow-hidden');
  }, [open]);

  // Focus close button on open + ESC to close
  React.useEffect(() => {
    if (!open) return;
    closeBtnRef.current?.focus();
    const onKey = (e) => {
      if (e.key === 'Escape') onClose?.();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  const books = Array.isArray(data?.books) ? data.books : [];
  const bio = typeof data?.bio === 'string' ? data.bio : '';
  const photo = data?.photo;

  // Portal root (fallback to body)
  const portalTarget = document.getElementById('modal-root') || document.body;

  return ReactDOM.createPortal(
    <div
      className="fixed inset-0 z-[1000]"
      role="dialog"
      aria-modal="true"
      aria-label={`Books by ${author || 'author'}`}
    >
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Panel (full screen; scroll only inside this) */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute inset-0 overflow-y-auto overscroll-contain">
          {/* Sticky header */}
          <header className="sticky top-0 z-10">
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 border-b border-black/5">
              <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <span className="inline-flex items-center justify-center w-11 h-11 rounded-xl ring-1 ring-black/5 bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-md overflow-hidden">
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
                  <div className="min-w-0">
                    <h2 className="text-lg sm:text-xl font-extrabold tracking-tight text-neutral-900 truncate">
                      {author || 'Author'}
                    </h2>
                    <p className="text-[11px] text-neutral-500">
                      {books.length} {books.length === 1 ? 'book' : 'books'}
                    </p>
                  </div>
                </div>

                <button
                  ref={closeBtnRef}
                  onClick={onClose}
                  className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-white text-neutral-700 ring-1 ring-black/5 shadow hover:bg-neutral-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
                  aria-label="Close author books"
                  title="Close"
                >
                  <svg viewBox="0 0 24 24" className="w-5 h-5">
                    <path d="M6 6l12 12M18 6l-12 12" className="stroke-current" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>

              {/* Bio (collapsible look without state—kept short in header) */}
              <div className="max-w-6xl mx-auto px-4 pb-3">
                {bio ? (
                  <p className="text-sm text-neutral-700 italic line-clamp-2">{bio}</p>
                ) : (
                  <div className="h-4 w-2/3 rounded bg-neutral-100" aria-hidden="true" />
                )}
              </div>
            </div>
          </header>

          {/* Content */}
          <main className="max-w-6xl mx-auto px-4 py-4">
            {books.length === 0 ? (
              <div className="text-neutral-400 text-sm py-16 text-center">No books found for this author.</div>
            ) : (
              <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {books.map((book, idx) => (
                  <button
                    key={book.id || `${author}-${idx}`}
                    onClick={() => navigate('/discover', { state: { book } })}
                    className="group relative rounded-2xl overflow-hidden ring-1 ring-black/5 bg-neutral-200 shadow-md focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-300"
                    style={{ aspectRatio: '2 / 3' }}
                    title={`${book.title}${book.author ? ' — ' + book.author : ''}`}
                    aria-label={`Open ${book.title} by ${book.author || 'Unknown'}`}
                  >
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

                    {/* Gradient title band */}
                    <div className="absolute inset-x-0 bottom-0 p-2 pt-10 bg-gradient-to-t from-black/75 via-black/30 to-transparent">
                      <h4 className="text-white text-[12px] font-semibold leading-tight line-clamp-2">
                        {book.title}
                      </h4>
                      {book.author && (
                        <p className="text-white/80 text-[10px] leading-tight line-clamp-1">
                          {book.author}
                        </p>
                      )}
                    </div>

                    {/* Sheen */}
                    <div className="pointer-events-none absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-white/10 to-transparent" />
                  </button>
                ))}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>,
    portalTarget
  );
}
