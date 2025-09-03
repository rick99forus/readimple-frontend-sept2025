// filepath: src/pages/Bookshelf.js
import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import BookRow from '../components/BookRow';

function getLocalLikes() {
  try { return JSON.parse(localStorage.getItem('likedBooks') || '[]'); } catch { return []; }
}
function getBookData(bookId) {
  try { return JSON.parse(localStorage.getItem(`bookData:${bookId}`) || '{}'); } catch { return {}; }
}

// Group books by genre/category (keeps original label casing for display)
function groupBooksByGenre(books) {
  const groups = {};
  for (const book of books) {
    const genres = book._genre
      ? [book._genre]
      : (book.genres?.length ? book.genres : (book.categories?.length ? book.categories : ['Other']));
    for (const g of genres) {
      const key = (g || 'Other').toString().trim() || 'Other';
      if (!groups[key]) groups[key] = [];
      groups[key].push(book);
    }
  }
  return groups;
}

/* === ShelfGrid: matching the BookRow/ContinueRow look (gradient title band) === */
function ShelfGrid({ books = [], onBookClick }) {
  if (!books.length) return null;
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
      {books.map((book, idx) => (
        <button
          key={book.id || idx}
          onClick={() => onBookClick?.(book)}
          className="group block w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-300 rounded-2xl"
          title={`${book.title}${book.author ? ' — ' + book.author : ''}`}
          aria-label={`Open ${book.title} by ${book.author || 'Unknown'}`}
        >
          <div
            className="relative w-full rounded-2xl overflow-hidden shadow-md ring-1 ring-black/5 bg-neutral-200"
            style={{ paddingTop: '150%' }} // 2:3 aspect ratio
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

            {/* Gradient title band (matches BookRow) */}
            <div className="absolute inset-x-0 bottom-0 p-2 pt-10 bg-gradient-to-t from-black/75 via-black/30 to-transparent">
              <h3 className="text-white text-[13px] font-semibold leading-tight line-clamp-2">
                {book.title}
              </h3>
              {book.author && (
                <p className="text-white/80 text-[11px] line-clamp-1">{book.author}</p>
              )}
            </div>

            {/* Sheen */}
            <div className="pointer-events-none absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-white/10 to-transparent" />
          </div>
        </button>
      ))}
    </div>
  );
}

export default function Bookshelf() {
  const navigate = useNavigate();
  const [showAllGenre, setShowAllGenre] = useState(null);

  // Load likes
  const likedIds = getLocalLikes();
  const books = useMemo(
    () => likedIds.map(getBookData).filter(b => b && b.id),
    [likedIds]
  );

  const grouped = useMemo(() => groupBooksByGenre(books), [books]);

  // Light “You may also like” using liked pool (kept from your original)
  const youMayLike = useMemo(() => {
    if (!books.length) return [];
    const copy = [...books];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy.slice(0, 8);
  }, [books]);

  // === Show-all view for a single genre (uses ShelfGrid for the gradient-band style) ===
  if (showAllGenre) {
    const genreBooks = grouped[showAllGenre] || [];
    return (
      <div className="min-h-screen w-full flex flex-col bg-white text-black px-4 py-4">
        <div className="flex items-center mb-4">
          <button
            className="mr-2 inline-flex items-center justify-center w-9 h-9 rounded-lg bg-white border border-neutral-200 text-neutral-700 hover:bg-neutral-50"
            onClick={() => setShowAllGenre(null)}
            aria-label="Back to bookshelf"
            title="Back"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5"><path d="M15 6l-6 6 6 6" className="stroke-current" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
          </button>
          <h2 className="text-2xl font-extrabold tracking-tight">{showAllGenre}</h2>
        </div>

        <ShelfGrid
          books={genreBooks}
          onBookClick={book => navigate('/discover', { state: { book } })}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex flex-col bg-white text-black px-4 py-4">
      {/* Header — branded as Bookshelf (your liked books gallery) */}
      <div className="mx-auto w-full max-w-6xl mb-4">
        <div className="flex items-center justify-between rounded-2xl bg-white/80 backdrop-blur ring-1 ring-black/5 px-3 py-3">
          <div className="flex items-center gap-3 min-w-0">
            {/* tiny gradient icon bubble (shelf/book icon) */}
            <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl text-white shadow-md ring-1 ring-white/20 bg-gradient-to-br from-amber-400 to-orange-500">
              <svg viewBox="0 0 24 24" className="w-5 h-5 text-white/90" aria-hidden="true">
                <path d="M3 5h14a2 2 0 0 1 2 2v10H5a2 2 0 0 1-2-2V5Z" className="fill-current opacity-90"/>
                <path d="M7 5v12M11 5v12M15 5v12" className="stroke-white/90" strokeWidth="1.6" fill="none" />
              </svg>
            </span>
            <div className="min-w-0">
              <h1 className="text-xl font-extrabold tracking-tight text-neutral-900 truncate">Bookshelf</h1>
              <p className="text-[11px] text-neutral-500">Your liked books live here</p>
            </div>
          </div>
        </div>
      </div>

      {books.length === 0 ? (
        <div className="text-center text-neutral-400 mt-8">
          No books in your bookshelf yet.
          <div className="text-xs text-neutral-500 mt-1">
            Mark books as “Interested” to add them here.
          </div>
        </div>
      ) : (
        <>
          {/* Genre rows — reuse your BookRow (already has gradient band) */}
          {Object.entries(grouped).map(([genre, genreBooks]) => (
            <div key={genre} className="mb-8">
              <div className="flex items-center justify-between mb-2 px-1">
                <h3 className="text-xl font-bold">{genre}</h3>
                {genreBooks.length > 4 && (
                  <button
                    className="text-orange-500 text-sm font-semibold underline"
                    onClick={() => setShowAllGenre(genre)}
                  >
                    Show all
                  </button>
                )}
              </div>
              <BookRow
                books={genreBooks.slice(0, 12)}
                onBookClick={book => navigate('/discover', { state: { book } })}
              />
            </div>
          ))}

          {/* You may also like — uses BookRow treatment as well */}
          {youMayLike.length > 0 && (
            <div className="mb-8">
              <div className="flex items-center justify-between mb-2 px-1">
                <h3 className="text-xl font-bold">You may also like</h3>
              </div>
              <BookRow
                books={youMayLike}
                onBookClick={book => navigate('/discover', { state: { book } })}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}
