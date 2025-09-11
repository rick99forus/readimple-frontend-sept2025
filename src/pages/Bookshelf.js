// filepath: src/pages/Bookshelf.js
import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiCall } from '../utils/api';
import ExpandableBio from '../components/ExpandableBio'; // Adjust path if needed
/* ============================ LocalStorage helpers ============================ */
function safeParse(json, fallback) {
  try { return JSON.parse(json); } catch { return fallback; }
}
function getLocalLikes() {
  const ids = safeParse(localStorage.getItem('likedBooks'), []);
  // De-dup and keep truthy
  return Array.from(new Set((ids || []).filter(Boolean)));
}
function getBookData(bookId) {
  return safeParse(localStorage.getItem(`bookData:${bookId}`), {});
}
function getLikedBooks() {
  try {
    return JSON.parse(localStorage.getItem('likedBooks') || '[]');
  } catch {
    return [];
  }
}

/* ============================ Normalization helpers =========================== */
// Turn any categories/genres shape into a clean array of labels
function getNormalizedGenres(book) {
  // Priority: _genre (your synthetic), then genres, then categories
  let raw = book?._genre ?? book?.genres ?? book?.categories ?? [];
  // If it’s a string, split on common separators
  if (typeof raw === 'string') {
    raw = raw
      .split(/[,/|;>]+/g)
      .map(s => s.trim())
      .filter(Boolean);
  }
  // If it’s not an array, make it one
  if (!Array.isArray(raw)) raw = [raw].filter(Boolean);

  // Tidy: collapse whitespace, title-case-ish, drop very long labels
  const cleaned = raw
    .map(x => (x ?? '').toString().trim())
    .filter(Boolean)
    .map(label => label.length > 80 ? label.slice(0, 80) + '…' : label)
    .map(label => label.charAt(0).toUpperCase() + label.slice(1));

  return cleaned.length ? cleaned : ['Other'];
}
// eslint-disable-next-line 
function titleCase(s) {
  return (s ?? '')
    .toString()
    .toLowerCase()
    .replace(/\b\w/g, ch => ch.toUpperCase());
}

function uniqBy(arr, keyFn) {
  const seen = new Set();
  const out = [];
  for (const item of arr) {
    const k = keyFn(item);
    if (!seen.has(k)) {
      seen.add(k);
      out.push(item);
    }
  }
  return out;
}

/* ============================ Grouping & Segments ============================= */
function groupBooksByGenre(books) {
  const map = new Map();
  for (const book of books) {
    const genres = getNormalizedGenres(book);
    const uniqueGenres = Array.from(new Set(genres)); // avoid double insert
    for (const g of uniqueGenres) {
      const key = g || 'Other';
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(book);
    }
  }
  // Sort each shelf a touch (optional: by rating, recency, etc.)
  for (const [k, arr] of map) {
    map.set(k, uniqBy(arr, b => b.id)); // de-dupe by id inside a shelf
  }
  return map;
}

function pickTopAuthors(books, minCount = 2, limit = 3) {
  const byAuthor = new Map();
  for (const b of books) {
    const a = (b.author || 'Unknown').trim();
    if (!byAuthor.has(a)) byAuthor.set(a, []);
    byAuthor.get(a).push(b);
  }
  const clusters = [...byAuthor.entries()]
    .filter(([, list]) => list.length >= minCount && (list[0]?.author || 'Unknown') !== 'Unknown')
    .sort((a, b) => b[1].length - a[1].length) // most books first
    .slice(0, limit);
  return clusters;
}

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

function uniqAuthors(books) {
  const seen = new Set();
  return books
    .map(b => b.author)
    .filter(a => a && !seen.has(a) && seen.add(a));
}

/* ================================ Page ======================================= */
export default function Bookshelf() {
  const navigate = useNavigate();
  const [showAllGenre, setShowAllGenre] = useState(null);
  const [likedBooks, setLikedBooks] = useState([]);
  const [authorData, setAuthorData] = useState({}); // { author: { bio, books } }

  useEffect(() => {
    try {
      setLikedBooks(JSON.parse(localStorage.getItem('likedBooks') || '[]'));
    } catch {
      setLikedBooks([]);
    }
  }, []);

  // Fetch author bios and books for unique authors
  useEffect(() => {
    const authors = uniqAuthors(likedBooks);
    authors.forEach(async (author) => {
      if (authorData[author]) return;
      try {
        const [bioRes, booksRes] = await Promise.all([
          apiCall('/api/books/ai-author-bio', { method: 'POST', data: { author } }),
          apiCall(`/api/books/author-books/${encodeURIComponent(author)}`, { method: 'GET' }),
        ]);
        setAuthorData(prev => ({
          ...prev,
          [author]: {
            bio: bioRes.data?.bio || '',
            books: booksRes.data?.books || [],
          }
        }));
      } catch {
        setAuthorData(prev => ({
          ...prev,
          [author]: { bio: '', books: [] }
        }));
      }
    });
    // eslint-disable-next-line
  }, [likedBooks]);

  // Listen for changes to likedBooks in localStorage
  React.useEffect(() => {
    const onStorage = () => setLikedBooks(getLikedBooks());
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // Optionally, update on mount
  React.useEffect(() => {
    setLikedBooks(getLikedBooks());
  }, []);

  const likedIds = getLocalLikes();

  // Build book list safely, unique by id, and prefer filled data
  const books = useMemo(() => {
    const raw = likedIds.map(getBookData).filter(b => b && b.id);
    return uniqBy(raw, b => b.id);
  }, [likedIds]);

  const groupedMap = useMemo(() => groupBooksByGenre(books), [books]);
  const grouped = useMemo(() => Object.fromEntries(groupedMap), [groupedMap]);

  // “You may also like”: mix of same-genre sampling + random fallback
  const youMayLike = useMemo(() => {
    if (!books.length) return [];
    // Try: sample up to 8 from the largest genre cluster
    const biggest = [...groupedMap.entries()].sort((a, b) => b[1].length - a[1].length)[0]?.[1] ?? [];
    const pool = biggest.length >= 4 ? biggest : books;
    const copy = [...pool];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return uniqBy(copy, b => b.id).slice(0, 8);
  }, [books, groupedMap]);

  // Extra curated sections (add "life")
  const shortReads = useMemo(
    () => books.filter(b => (b.pageCount ?? 0) > 0 && b.pageCount <= 240).slice(0, 16),
    [books]
  );
  const highlyRated = useMemo(
    () => books
      .filter(b => (b.averageRating ?? 0) >= 4.2 || (b.ratingsCount ?? 0) >= 500)
      .slice(0, 16),
    [books]
  );
  const newerReleases = useMemo(() => {
    // Try parse publishedDate like "2019-03-01" or "2019"
    function yearOf(b) {
      const d = (b.publishedDate || '').toString();
      const m = d.match(/\d{4}/);
      return m ? parseInt(m[0], 10) : 0;
    }
    return books
      .map(b => ({ b, y: yearOf(b) }))
      .filter(({ y }) => y >= 2018)
      .sort((a, z) => z.y - a.y)
      .map(({ b }) => b)
      .slice(0, 16);
  }, [books]);

  const authorClusters = useMemo(() => pickTopAuthors(books, 2, 3), [books]);

  // “You may also like”: show a section below the bookshelf grid
  // Sample up to 8 books from the largest genre cluster or random fallback
  // You can display this as a horizontal scroll or grid
  const youMayLikeBooks = youMayLike; // Already computed

  // Short Reads section (books <= 240 pages)
  const shortReadsBooks = shortReads;

  // Highly Rated section (rating >= 4.2 or >= 500 ratings)
  const highlyRatedBooks = highlyRated;

  // Newer Releases section (published since 2018)
  const newerReleasesBooks = newerReleases;

  // Top Authors section (authors with at least 2 books, up to 3 clusters)
  const topAuthors = authorClusters;

  /* ========================== Show-all for a single genre ========================== */
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

  /* ================================= Render =================================== */
  return (
    <div className="min-h-screen w-full flex flex-col bg-white text-black px-4 py-4">
      {/* Header */}
      <div className="mx-auto w-full max-w-6xl mb-4">
        <div className="flex items-center justify-between rounded-2xl bg-white/80 backdrop-blur ring-1 ring-black/5 px-3 py-3">
          <div className="flex items-center gap-3 min-w-0">
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
      {likedBooks.length === 0 ? (
        <div className="text-center text-neutral-400 mt-8">
          No books in your bookshelf yet.<br />
          <span className="text-xs text-neutral-500 mt-1">Like books in Discover to add them here.</span>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-10">
          {likedBooks.map((book, idx) => (
            <div key={book.id || idx} className="cursor-pointer flex flex-col items-center hover:scale-105 transition-transform duration-200 bg-white rounded-lg p-3">
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
            </div>
          ))}
        </div>
      )}

      {/* You May Also Like */}
      {youMayLikeBooks.length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-bold mb-2 text-orange-600">You May Also Like</h2>
          <ShelfGrid
            books={youMayLikeBooks}
            onBookClick={book => navigate('/discover', { state: { book } })}
          />
        </div>
      )}

      {/* Short Reads */}
      {shortReadsBooks.length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-bold mb-2 text-orange-600">Short Reads</h2>
          <ShelfGrid
            books={shortReadsBooks}
            onBookClick={book => navigate('/discover', { state: { book } })}
          />
        </div>
      )}

      {/* Highly Rated */}
      {highlyRatedBooks.length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-bold mb-2 text-orange-600">Highly Rated</h2>
          <ShelfGrid
            books={highlyRatedBooks}
            onBookClick={book => navigate('/discover', { state: { book } })}
          />
        </div>
      )}

      {/* Newer Releases */}
      {newerReleasesBooks.length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-bold mb-2 text-orange-600">Newer Releases</h2>
          <ShelfGrid
            books={newerReleasesBooks}
            onBookClick={book => navigate('/discover', { state: { book } })}
          />
        </div>
      )}

      {/* Top Authors */}
      {topAuthors.length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-bold mb-2 text-orange-600">Top Authors</h2>
          {topAuthors.map(([author, books]) => (
            <div key={author} className="mb-6">
              <div className="font-semibold text-orange-700 mb-2">{author}</div>
              <ShelfGrid
                books={books}
                onBookClick={book => navigate('/discover', { state: { book } })}
              />
            </div>
          ))}
        </div>
      )}

      {/* === Author Spotlight (Bookshelf style) ===================================== */}
{likedBooks.length > 0 && (
  <div className="mt-10">
    <div className="flex items-center justify-between mb-3 px-1">
      <h2 className="text-xl font-extrabold tracking-tight">Author Spotlight</h2>
    </div>

    {uniqAuthors(likedBooks).map((author) => {
      const info = authorData[author] || {};
      const books = Array.isArray(info.books) ? info.books : [];
      const photo = info.photo;
      const bio = typeof info.bio === 'string' ? info.bio : '';

      return (
        <section
          key={author}
          className="mb-8 rounded-2xl ring-1 ring-black/5 bg-white shadow-sm overflow-hidden"
          aria-labelledby={`author-${author}-heading`}
        >
          {/* Header strip */}
          <div className="flex items-center justify-between px-3 py-3 bg-gradient-to-r from-amber-50 to-orange-50">
            <div className="flex items-center gap-3 min-w-0">
              <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl ring-1 ring-black/5 bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-md">
                {photo ? (
                  <img
                    src={photo}
                    alt={`${author}`}
                    className="w-10 h-10 rounded-xl object-cover"
                    onError={(e) => { e.currentTarget.src = '/avatar-fallback.png'; }}
                  />
                ) : (
                  <span className="text-sm font-bold">
                    {author?.slice(0, 1)?.toUpperCase() || 'A'}
                  </span>
                )}
              </span>
              <div className="min-w-0">
                <h3
                  id={`author-${author}-heading`}
                  className="text-lg font-bold text-neutral-900 truncate"
                  title={author}
                >
                  {author}
                </h3>
                <p className="text-[11px] text-neutral-500">Spotlight author</p>
              </div>
            </div>

            <button
              className="shrink-0 inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-orange-700 ring-1 ring-orange-200 hover:bg-orange-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
              onClick={() => navigate(`/author/${encodeURIComponent(author)}`)}
              aria-label={`See all books by ${author}`}
              title="See all"
            >
              See all
              <svg viewBox="0 0 24 24" className="w-3.5 h-3.5">
                <path d="M9 6l6 6-6 6" className="stroke-current" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>

          {/* Bio row */}
          <div className="px-3 pt-3">
            {bio ? (
              <ExpandableBio text={bio} lines={2} />
            ) : (
              <div className="h-5 w-2/3 rounded bg-neutral-100 animate-pulse" aria-hidden="true" />
            )}
          </div>

          {/* Horizontal book scroller */}
          <div className="mt-3 pb-3">
            <div className="flex gap-3 overflow-x-auto scroll-px-3 px-3 snap-x snap-mandatory">
              {books.slice(0, 12).map((book, idx) => (
                <button
                  key={book.id || idx}
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

                  {/* Gradient title band (matches BookRow/ShelfGrid) */}
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
)}

    </div>
  );
}
