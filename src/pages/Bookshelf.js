// filepath: src/pages/Bookshelf.js
import React, { useMemo, useState, useEffect, useCallback, useTransition } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiCall } from '../utils/api';
import ShelfGrid from '../components/ShelfGrid';
import { handleBookClick } from '../utils/navigation';

/* ============================ LocalStorage helpers ============================ */
function safeParse(json, fallback) {
  try { return JSON.parse(json); } catch { return fallback; }
}
function getLocalLikes() {
  const ids = safeParse(localStorage.getItem('likedBooks'), []);
  return Array.from(new Set((ids || []).filter(Boolean)));
}
function getBookData(bookId) {
  return safeParse(localStorage.getItem(`bookData:${bookId}`), {});
}
function getRecentlyOpened() {
  return safeParse(localStorage.getItem('recentlyOpenedBooks'), []);
}
function getReadingProgress() {
  return safeParse(localStorage.getItem('readingProgress'), {});
}

/* ============================ Normalization helpers =========================== */
function getNormalizedGenres(book) {
  let raw = book?._genre ?? book?.genres ?? book?.categories ?? [];
  if (typeof raw === 'string') {
    raw = raw.split(/[,/|;>]+/g).map(s => s.trim()).filter(Boolean);
  }
  if (!Array.isArray(raw)) raw = [raw].filter(Boolean);
  const cleaned = raw
    .map(x => (x ?? '').toString().trim())
    .filter(Boolean)
    .map(label => label.length > 80 ? label.slice(0, 80) + '…' : label)
    .map(label => label.charAt(0).toUpperCase() + label.slice(1));
  return cleaned.length ? cleaned : ['Other'];
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

function uniqAuthors(books) {
  const seen = new Set();
  return books
    .map(b => b.author)
    .filter(a => a && !seen.has(a) && seen.add(a));
}

/* ============================ Grouping & Segments ============================= */
function groupBooksByGenre(books) {
  const map = new Map();
  for (const book of books) {
    const genres = getNormalizedGenres(book);
    const uniqueGenres = Array.from(new Set(genres));
    for (const g of uniqueGenres) {
      const key = g || 'Other';
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(book);
    }
  }
  for (const [k, arr] of map) {
    map.set(k, uniqBy(arr, b => b.id));
  }
  return map;
}

/* ================================ Page ======================================= */
export default function Bookshelf() {
  const navigate = useNavigate();
  const [isPending, startTransition] = useTransition();

  const [showAllGenre, setShowAllGenre] = useState(null);
  const [likedIds, setLikedIds] = useState(getLocalLikes());
  const [books, setBooks] = useState([]);
  const [authorData, setAuthorData] = useState({});
  const [authorModal, setAuthorModal] = useState({ open: false, author: null, data: null });
  const [recentlyOpened, setRecentlyOpened] = useState(getRecentlyOpened());
  const [readingProgress, setReadingProgress] = useState(getReadingProgress());
  const [loadingBooks, setLoadingBooks] = useState(false);

  // Memoize expensive handlers
  const goDiscover = useCallback(() => navigate('/discover'), [navigate]);
  const handleOpenAuthor = useCallback((authorName, info) => {
    setAuthorModal({ open: true, author: authorName, data: info || {} });
  }, []);
  const handleCloseAuthor = useCallback(() => setAuthorModal({ open: false, author: null, data: null }), []);

  // Debounce localStorage updates to avoid blocking UI
  useEffect(() => {
    let timeout;
    const onStorage = () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        startTransition(() => {
          setLikedIds(getLocalLikes());
          const raw = getLocalLikes().map(getBookData).filter(b => b && b.id);
          setBooks(uniqBy(raw, b => b.id));
          setRecentlyOpened(getRecentlyOpened());
          setReadingProgress(getReadingProgress());
        });
      }, 50); // Debounce for 50ms
    };
    window.addEventListener('storage', onStorage);
    return () => {
      window.removeEventListener('storage', onStorage);
      clearTimeout(timeout);
    };
  }, []);

  // Initial load: fallback to backend if localStorage is empty
  useEffect(() => {
    setLoadingBooks(true);
    const raw = likedIds.map(getBookData).filter(b => b && b.id);
    if (raw.length > 0) {
      startTransition(() => {
        setBooks(uniqBy(raw, b => b.id));
        setLoadingBooks(false);
      });
    } else if (likedIds.length > 0) {
      // Fallback: fetch from backend
      apiCall('/api/books/by-ids', { method: 'POST', data: { ids: likedIds } })
        .then(res => {
          startTransition(() => {
            setBooks(uniqBy(res.data?.items || [], b => b.id));
          });
        })
        .catch(() => startTransition(() => setBooks([])))
        .finally(() => startTransition(() => setLoadingBooks(false)));
    } else {
      startTransition(() => {
        setBooks([]);
        setLoadingBooks(false);
      });
    }
  }, [likedIds]);

  // Memoize derived data
  const groupedMap = useMemo(() => groupBooksByGenre(books), [books]);
  const grouped = useMemo(() => Object.fromEntries(groupedMap), [groupedMap]);
  const totalGenres = useMemo(() => Object.keys(grouped || {}).length, [grouped]);
  const topGenres = useMemo(() => {
    const rows = Array.from(groupedMap.entries()).map(([name, arr]) => ({ name, count: arr.length }));
    return rows.sort((a, b) => b.count - a.count).slice(0, 8);
  }, [groupedMap]);
  const totalLiked = books.length;
  const totalAuthors = useMemo(() => uniqAuthors(books).length, [books]);

  // Author data fetch (async, non-blocking)
  useEffect(() => {
    const authors = uniqAuthors(books);
    authors.forEach(author => {
      if (authorData[author]) return;
      (async () => {
        try {
          const [bioRes, booksRes] = await Promise.all([
            apiCall('/api/books/ai-author-bio', { method: 'POST', data: { author } }),
            apiCall(`/api/books/author-books/${encodeURIComponent(author)}`, { method: 'GET' }),
          ]);
          setAuthorData(prev => ({
            ...prev,
            [author]: {
              bio: bioRes.data?.bio || '',
              books: Array.isArray(booksRes.data?.books) ? booksRes.data.books : [],
              photo: bioRes.data?.photo || '',
            }
          }));
        } catch {
          setAuthorData(prev => ({ ...prev, [author]: { bio: '', books: [] } }));
        }
      })();
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [books]);

  // Preload images for recently opened and genre books
  useEffect(() => {
    const preloadImages = (items) => {
      items.forEach(b => {
        const img = new window.Image();
        img.src = b.coverImage || '/fallback-cover.png';
      });
    };
    preloadImages(recentlyOpened || []);
    Object.values(grouped || {}).forEach(arr => preloadImages(arr.slice(0, 12)));
  }, [recentlyOpened, grouped]);

  // Skeleton loader for book covers
  const BookCover = React.memo(({ src, alt }) => (
    <div className="relative w-full" style={{ aspectRatio: '2/3', minHeight: 0 }}>
      <img
        src={src}
        alt={alt}
        className="absolute inset-0 w-full h-full object-cover"
        loading="lazy"
        style={{ transition: 'opacity 0.2s', background: '#f3f3f3' }}
        onError={e => { e.currentTarget.onerror = null; e.currentTarget.src = '/fallback-cover.png'; }}
      />
    </div>
  ));

  // Loader or empty state
  if (loadingBooks) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white text-black">
        <div className="text-lg text-neutral-400">Loading your bookshelf...</div>
      </div>
    );
  }

  if (showAllGenre) {
    const genreBooks = (grouped && grouped[showAllGenre]) ? grouped[showAllGenre] : [];
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
          books={books.filter(b => genreBooks.some(gb => gb.id === b.id))}
          emptyMessage={`No books found in ${showAllGenre}.`}
          onBookClick={book => handleBookClick(navigate, book)}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full flex flex-col bg-white text-black">
      <div className="relative px-4 pt-6 pb-4">
        <div className="mx-auto w-full max-w-6xl rounded-3xl p-5 shadow-[0_6px_30px_rgba(0,0,0,0.06)] ring-1 ring-black/5 bg-gradient-to-br from-orange-50 via-white to-amber-50">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <h1 className="text-xl font-extrabold tracking-tight text-neutral-900 truncate">Your Bookshelf</h1>
              <p className="text-[11px] text-neutral-500">Saved & liked — tap any book to jump back into Discover</p>
            </div>
            <button
              onClick={goDiscover}
              className="shrink-0 inline-flex items-center gap-2 rounded-full bg-orange-600 px-4 py-2 text-xs font-semibold text-white shadow hover:bg-orange-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300"
              title="Go to Discover"
            >
              Discover
              <svg viewBox="0 0 24 24" className="w-4 h-4" aria-hidden="true">
                <path d="M9 6l6 6-6 6" className="stroke-current" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>

          <div className="mt-4 grid grid-cols-3 divide-x divide-neutral-200 rounded-xl bg-white/70 backdrop-blur p-2 ring-1 ring-black/5">
            <Stat label="Liked" value={totalLiked} />
            <Stat label="Authors" value={totalAuthors} />
            <Stat label="Genres" value={totalGenres} />
          </div>

          {topGenres.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {topGenres.map(g => (
                <button
                  key={g.name}
                  onClick={() => setShowAllGenre(g.name)}
                  className="px-3 py-1.5 rounded-full bg-neutral-900/90 text-white text-xs font-semibold shadow-sm hover:bg-black"
                  title={`Open ${g.name}`}
                >
                  {g.name} <span className="opacity-80">• {g.count}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {recentlyOpened?.length > 0 && (
        <section className="px-4">
          <SectionHeader title="Recently Opened" />
          <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-1">
            {recentlyOpened.map((b, idx) => (
              <button
                key={b.id || idx}
                className="snap-start shrink-0 w-28 rounded-xl bg-white ring-1 ring-black/5 shadow hover:shadow-md transition-all overflow-hidden text-left"
                onClick={() => handleBookClick(navigate, b)}
                title={`${b.title} — ${b.author}`}
              >
                <BookCover src={b.coverImage || '/fallback-cover.png'} alt={b.title} />
                <div className="p-2">
                  <div className="text-[12px] font-semibold line-clamp-2">{b.title}</div>
                  <div className="text-[10px] text-neutral-500 line-clamp-1">{b.author}</div>
                </div>
              </button>
            ))}
          </div>
        </section>
      )}

      <div className="mt-5 space-y-6 px-2">
        {Object.entries(grouped || {}).map(([genre, items]) => {
          if (!items?.length) return null;
          return (
            <section key={genre} className="px-2">
              <SectionHeader
                title={genre}
                actionLabel="See all"
                onAction={() => setShowAllGenre(genre)}
              />
              <div className="flex gap-3 overflow-x-auto snap-x snap-mandatory pb-1">
                {items.slice(0, 12).map(book => (
                  <button
                    key={book.id}
                    onClick={() => handleBookClick(navigate, book)}
                    className="snap-start shrink-0 w-28 rounded-xl bg-white ring-1 ring-black/5 shadow hover:shadow-md transition-all overflow-hidden text-left"
                    title={`${book.title} — ${book.author || 'Unknown'}`}
                    aria-label={`Open ${book.title}`}
                  >
                    <div className="relative w-full" style={{ aspectRatio: '2/3', minHeight: 0 }}>
                      <BookCover src={book.coverImage || '/fallback-cover.png'} alt={book.title} />
                      {/* Optional gradient overlay for effect only */}
                      <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-black/80 via-black/30 to-transparent pointer-events-none" />
                    </div>
                    <div className="p-2">
                      <div className="text-[12px] font-semibold line-clamp-2">{book.title}</div>
                      {book.author && (
                        <div className="text-[10px] text-neutral-500 line-clamp-1">{book.author}</div>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </section>
          );
        })}
      </div>

      {books.length === 0 && (
        <div className="px-4 py-10 text-center">
          <div className="mx-auto w-full max-w-md rounded-3xl p-8 bg-neutral-50 ring-1 ring-black/5">
            <div className="text-2xl font-extrabold">Your shelf is empty</div>
            <p className="mt-2 text-sm text-neutral-600">Save books you love, then come back here to manage them.</p>
            <button
              onClick={goDiscover}
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-orange-600 px-5 py-2.5 text-sm font-semibold text-white shadow hover:bg-orange-700"
            >
              Discover books
              <svg viewBox="0 0 24 24" className="w-4 h-4"><path d="M9 6l6 6-6 6" className="stroke-current" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
          </div>
        </div>
      )}

      {books.length > 0 && (
        <div
          className="sticky bottom-3 self-center w-[calc(100%-1.5rem)] max-w-3xl px-3"
          style={{ paddingBottom: 'env(safe-area-inset-bottom)' }}
        >
          <div className="rounded-2xl bg-neutral-900 text-white shadow-xl ring-1 ring-black/10 flex items-center justify-between px-4 py-3">
            <div className="text-[13px]">
              <span className="font-semibold">Want more like these?</span> Explore fresh picks in Discover.
            </div>
            <button
              onClick={goDiscover}
              className="ml-3 inline-flex items-center gap-2 rounded-full bg-white text-neutral-900 px-3 py-1.5 text-xs font-semibold hover:bg-neutral-100"
            >
              Open Discover
              <svg viewBox="0 0 24 24" className="w-4 h-4"><path d="M9 6l6 6-6 6" className="stroke-current" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div className="px-3 py-2 text-center">
      <div className="text-xl font-extrabold tracking-tight">{value ?? 0}</div>
      <div className="text-[11px] text-neutral-500">{label}</div>
    </div>
  );
}

function SectionHeader({ title, actionLabel, onAction }) {
  return (
    <div className="flex items-center justify-between mb-2 px-1">
      <h2 className="text-lg font-extrabold tracking-tight">{title}</h2>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          className="text-xs font-semibold text-orange-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-300 rounded"
        >
          {actionLabel}
        </button>
      )}
    </div>
  );
}
