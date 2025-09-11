// filepath: src/pages/Bookshelf.js
import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiCall } from '../utils/api';
import AuthorSpotlight from '../components/AuthorSpotlight';
import AuthorBooksModal from '../components/AuthorBooksModal';

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
    <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 gap-1">
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
  const [authorModal, setAuthorModal] = useState({
    open: false,
    author: null,
    data: null,
  });

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
            books: Array.isArray(booksRes.data?.books) ? booksRes.data.books : [],
            photo: bioRes.data?.photo || '',
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
  useEffect(() => {
    const onStorage = () => setLikedBooks(getLikedBooks());
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  useEffect(() => {
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

  // Author modal handlers
  const handleOpenAuthor = (authorName, info) => {
    setAuthorModal({ open: true, author: authorName, data: info || {} });
  };

  const handleCloseAuthor = () => {
    setAuthorModal({ open: false, author: null, data: null });
  };

  console.log('likedBooks:', likedBooks);
  console.log('authorData:', authorData);

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
        <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 gap-4 mb-10">
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
      {/* Author Spotlight */}
      <AuthorSpotlight
        likedBooks={likedBooks}
        authorData={authorData}
        navigate={navigate}
        onOpenAuthor={handleOpenAuthor}
      />

      {/* Author Books Modal */}
      <AuthorBooksModal
        open={authorModal.open}
        author={authorModal.author}
        data={authorModal.data}
        onClose={handleCloseAuthor}
        navigate={navigate}
      />
      
    </div>
    
  );
  
}
