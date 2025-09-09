// filepath: src/pages/DiscoverNews.js
import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import dayjs from 'dayjs';
import relativeTime from 'dayjs/plugin/relativeTime';
import { apiCall } from '../utils/api';
import { getWorldCatLink } from '../utils/worldcatLink';
import BottomSheet from '../components/BottomSheet';
import { MERCHANTS, GENRE_GRADIENTS, GENRE_ACCENTS } from '../constants/appConstants';

dayjs.extend(relativeTime);

/* ============================== Config ============================== */
const TEASER_TTL_DAYS = 7;
const SEE_MORE_STEP = 8; // how many more stories appear per click
const HOOK_TTL_DAYS = 14;

/* ============================ Teaser cache ========================== */
function getTeaserFromCache(bookId) {
  const raw = localStorage.getItem(`teaser_${bookId}`);
  if (!raw) return null;
  try {
    const { teaser, expires } = JSON.parse(raw);
    if (expires && dayjs().isBefore(dayjs(expires))) return teaser;
    return null;
  } catch {
    return null;
  }
}
function setTeaserInCache(bookId, teaser) {
  const expires = dayjs().add(TEASER_TTL_DAYS, 'day').toISOString();
  localStorage.setItem(`teaser_${bookId}`, JSON.stringify({ teaser, expires }));
}

function getHookFromCache(bookId) {
  const raw = localStorage.getItem(`hook_${bookId}`);
  if (!raw) return null;
  try {
    const { phrase, expires } = JSON.parse(raw);
    if (expires && dayjs().isBefore(dayjs(expires))) return phrase;
    return null;
  } catch {
    return null;
  }
}
function setHookInCache(bookId, phrase) {
  const expires = dayjs().add(HOOK_TTL_DAYS, 'day').toISOString();
  localStorage.setItem(`hook_${bookId}`, JSON.stringify({ phrase, expires }));
}

function isRecentBook(book) {
  const year = parseInt((book.publishedDate || '').slice(0, 4), 10);
  return year && year >= (new Date().getFullYear() - 2);
}

/* ============================= Component ============================ */
export default function DiscoverNews({ setShowTabBar, setShowHeader }) {
  /* ---------- Core state ---------- */
  const [books, setBooks] = useState([]);
  const [selectedBook, setSelectedBook] = useState(null);
  const [openSheet, setOpenSheet] = useState(false);

  /* ---------- UI & profile ---------- */
  const [profile, setProfile] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('profile') || '{}');
    } catch {
      return {};
    }
  });

  /* ---------- AI content ---------- */
  const [summarySections, setSummarySections] = useState([]);
  const [bookQuotes, setBookQuotes] = useState('');

  /* ---------- Teasers (AI) ---------- */
  const [teasers, setTeasers] = useState({}); // { [bookId]: teaser }

  /* ---------- Hook phrases (AI) ---------- */
  const [hookPhrases, setHookPhrases] = useState({}); // { [bookId]: phrase }

  /* ---------- Buy modal ---------- */
  const [showBuyBorrowModal, setShowBuyBorrowModal] = useState(null); // 'buy' | null
  const [buyTab, setBuyTab] = useState('online');

  /* ---------- See more (river pagination) ---------- */
  const [visibleCount, setVisibleCount] = useState(9); // 1 lead + 8 river to start
  const visibleBooks = useMemo(() => books.slice(0, visibleCount), [books, visibleCount]);
  const hasMoreStories = visibleBooks.length < books.length;

  /* ---------- Refs & router ---------- */
  const location = useLocation();
  const navigate = useNavigate();
  const bottomSheetContentRef = useRef(null);

  /* ---------- Genre theming ---------- */
  const genreKey = useMemo(
    () => (selectedBook?._genre || selectedBook?.genres?.[0] || 'default').toLowerCase(),
    [selectedBook]
  );
  const genreGradient = GENRE_GRADIENTS[genreKey] || GENRE_GRADIENTS.default;

  /* ========================= Lifecycle/UI chrome ========================= */
  useEffect(() => {
    setShowHeader?.(true);
    setShowTabBar?.(true);
  }, [setShowHeader, setShowTabBar]);

  useEffect(() => {
    // Hide the tab bar when the sheet is open for a cleaner feel
    setShowTabBar?.(!openSheet);
  }, [openSheet, setShowTabBar]);

  useEffect(() => {
    const onStorage = () => {
      try {
        setProfile(JSON.parse(localStorage.getItem('profile') || '{}'));
      } catch {
        setProfile({});
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  /* ========================= Fetch: home-batch ========================= */
  async function fetchBooksInitial() {
    // Seed from profile or preferredGenres; add a few extras for variety
    let genres;
    try {
      genres = profile.genres?.length
        ? profile.genres
        : JSON.parse(localStorage.getItem('preferredGenres') || '["fiction","history","fantasy","science","biography"]');
    } catch {
      genres = ['fiction', 'history', 'fantasy', 'science', 'biography'];
    }

    const ALL_GENRES = [
      'fiction', 'fantasy', 'mystery', 'romance', 'biography', 'thriller', 'self-help',
      'history', 'science', 'horror', 'adventure', 'classic', 'poetry', 'children', 'education', 'health', 'cookbook'
    ];
    const extras = ALL_GENRES.filter(g => !genres.includes(g)).sort(() => Math.random() - 0.5).slice(0, 3);
    const mixedGenres = [...genres, ...extras];

    try {
      const res = await apiCall('/api/books/home-batch', {
        method: 'GET',
        params: { genres: mixedGenres.map(g => g.toLowerCase()).join(',') }
      });

      const all = [];
      const genreData = res.data?.genres || [];
      for (const g of genreData) {
        const items = g.books || [];
        all.push(...items.map(b => ({ ...b, _genre: g.genre })));
      }

      // Shuffle + dedupe by id
      const seen = new Set();
      const deduped = [];
      for (const b of all.sort(() => Math.random() - 0.5)) {
        if (!seen.has(b.id)) {
          seen.add(b.id);
          deduped.push(b);
        }
      }

      setBooks(deduped);
      setSelectedBook(prev => prev || deduped[0] || null);
    } catch (e) {
      console.error('Failed to fetch books:', e);
      setBooks([]);
    }
  }

  useEffect(() => {
    fetchBooksInitial();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile]);

  /* ====================== Handle nav-passed book (scan/search) ====================== */
  useEffect(() => {
    if (location.state?.book) {
      const navBook = location.state.book;
      setSelectedBook(navBook);
      setBooks(prev => {
        const filtered = (prev || []).filter(b => b.id !== navBook.id);
        return [navBook, ...filtered];
      });
      setOpenSheet(true);
      // Clear state to avoid duplicate handling
      navigate('.', { replace: true, state: null });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.state]);

  /* ======================= AI: teasers for visibleBooks ======================= */
  useEffect(() => {
    let isMounted = true;

    async function loadTeasers() {
      const map = {};
      for (const book of visibleBooks) {
        if (!book?.id) continue;
        let teaser = getTeaserFromCache(book.id);
        if (!teaser) {
          try {
            const res = await apiCall('/api/books/ai-teaser', {
              method: 'POST',
              data: { title: book.title, author: book.author, summary: book.summary }
            });
            teaser = res.data?.teaser || '';
            setTeaserInCache(book.id, teaser);
          } catch {
            teaser = '';
          }
        }
        map[book.id] = teaser;
      }
      if (isMounted) setTeasers(prev => ({ ...prev, ...map }));
    }

    if (visibleBooks.length) loadTeasers();
    return () => { isMounted = false; };
  }, [visibleBooks]);

  /* ======================= AI: hook phrases for visibleBooks ======================= */
  useEffect(() => {
    let isMounted = true;
    async function loadHooks() {
      const map = {};
      for (const book of visibleBooks) {
        if (!book?.id) continue;
        let phrase = getHookFromCache(book.id);
        if (!phrase) {
          try {
            const res = await apiCall('/api/books/ai-hook', {
              method: 'POST',
              data: {
                title: book.title,
                author: book.author,
                genre: book._genre || book.genres?.[0] || 'Unknown'
              }
            });
            phrase = res.data?.phrase || '';
            setHookInCache(book.id, phrase);
          } catch {
            phrase = '';
          }
        }
        map[book.id] = phrase;
      }
      if (isMounted) setHookPhrases(prev => ({ ...prev, ...map }));
    }
    if (visibleBooks.length) loadHooks();
    return () => { isMounted = false; };
  }, [visibleBooks]);

  /* ========================= AI: summary & quotes ========================= */
  useEffect(() => {
    async function fetchSummary() {
      if (!selectedBook?.id) return;
      const key = `summary_${selectedBook.id}`;
      const cached = localStorage.getItem(key);
      if (cached) {
        try {
          setSummarySections(JSON.parse(cached));
          return;
        } catch {}
      }
      try {
        const res = await apiCall('/api/books/ai-summary-dynamic', { method: 'POST', data: selectedBook });
        const sections = res.data?.sections || [];
        setSummarySections(sections);
        localStorage.setItem(key, JSON.stringify(sections));
      } catch (err) {
        console.error('Summary fetch error:', err);
        setSummarySections([]);
      }
    }
    fetchSummary();
  }, [selectedBook]);

  useEffect(() => {
    async function fetchBookQuotes() {
      if (!selectedBook?.title) return;
      const key = `book_quotes_${selectedBook.title}_${selectedBook.author}`;
      const cached = localStorage.getItem(key);
      if (cached) {
        setBookQuotes(cached);
        return;
      }
      try {
        const res = await apiCall('/api/books/ai-book-quotes', {
          method: 'POST',
          data: { bookTitle: selectedBook.title, author: selectedBook.author }
        });
        const quotes = res.data?.quotes || '';
        setBookQuotes(quotes);
        localStorage.setItem(key, quotes);
      } catch (err) {
        console.error('Quotes fetch error:', err);
        setBookQuotes('');
      }
    }
    fetchBookQuotes();
  }, [selectedBook]);

  /* ============================== Actions ============================== */
  const handleBookOpen = (book) => {
    try {
      let recent = JSON.parse(localStorage.getItem('recentlyOpenedBooks') || '[]');
      recent = recent.filter(b => b.id !== book.id);
      recent.unshift({ id: book.id, title: book.title, author: book.author, coverImage: book.coverImage });
      localStorage.setItem('recentlyOpenedBooks', JSON.stringify(recent.slice(0, 3)));
    } catch {}
  };

  const handleBookChange = (newBook) => {
    if (!newBook) return;
    if (newBook.id === selectedBook?.id) {
      setOpenSheet(v => !v);
      return;
    }
    setSelectedBook(newBook);
    setOpenSheet(true);
    handleBookOpen(newBook);
    // Auto-scroll the sheet’s content to top
    setTimeout(() => {
      bottomSheetContentRef.current?.scrollTo?.({ top: 0, behavior: 'smooth' });
    }, 0);
  };

  /* ================================ UI ================================ */
  return (
    <>
      {/* Accent gradient wash when the sheet is open */}
      <div
        className="fixed top-0 left-0 w-full min-h-[calc(100vh-56px)] z-10 transition-all duration-700"
        style={{
          background: openSheet ? genreGradient : 'transparent',
          opacity: openSheet ? 1 : 0,
          pointerEvents: 'none',
          transition: 'all 0.7s cubic-bezier(0.4,0,0.2,1)'
        }}
      />

      {/* ======= News-style feed ======= */}
      <div className="min-h-screen w-full bg-white">
        {/* Masthead */}
        <div className="sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-neutral-200 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="text-xl font-extrabold tracking-tight">Discover</div>
            <div className="text-xs text-neutral-500">For you</div>
          </div>
        </div>

        {/* Lead story */}
        {visibleBooks.length > 0 && (() => {
          const lead = visibleBooks[0];
          const teaser = typeof teasers?.[lead.id] === 'string' ? teasers[lead.id] : null;
          const kicker = `Books • ${(lead._genre || lead.categories?.[0] || 'General')}`;
          const stamp = lead.publishedDate && dayjs(lead.publishedDate).isValid()
            ? dayjs(lead.publishedDate).fromNow()
            : 'New';

          return (
            <article
              className="px-4 pt-3 pb-4 active:opacity-90"
              onClick={() => handleBookChange(lead)}
              role="button"
              aria-label={`Open ${lead.title}`}
            >
              <div className="relative rounded-2xl overflow-hidden shadow-sm bg-neutral-200">
                <div className="relative w-full aspect-[16/9] sm:aspect-[21/9] bg-neutral-100">
                  <img
                    src={lead.coverImage || '/default-cover.png'}
                    alt={lead.title}
                    className="absolute inset-0 w-full h-full object-cover"
                    loading="eager"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/35 to-transparent" />
                  <div className="absolute top-2 left-2 right-2 flex items-center gap-2">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-[11px] font-semibold bg-white/90 text-black/80 shadow">
                      {kicker}
                    </span>
                    <span className="text-[11px] text-white/80">{stamp}</span>
                  </div>
                </div>

                <div className="absolute bottom-0 left-0 right-0 p-4">
                  <h1 className="text-[20px] leading-snug font-extrabold text-white drop-shadow-sm line-clamp-3">
                    {lead.title}
                  </h1>
                  {teaser ? (
                    <p className="text-[13px] text-white/90 mt-2 line-clamp-3">{teaser}</p>
                  ) : (
                    <div className="mt-2 space-y-2">
                      <div className="h-3 w-11/12 rounded bg-white/30 animate-pulse" />
                      <div className="h-3 w-10/12 rounded bg-white/25 animate-pulse" />
                      <div className="h-3 w-8/12 rounded bg-white/20 animate-pulse" />
                    </div>
                  )}
                  <div className="mt-3 flex items-center gap-2 text-[11px] text-white/85">
                    <span>By {lead.author || 'Unknown'}</span>
                    <span className="opacity-60">•</span>
                    <span>{lead.publishedDate || 'Publication date n/a'}</span>
                    <span className="ml-auto inline-flex items-center gap-1 bg-white/10 backdrop-blur px-2 py-1 rounded-full">
                      <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                      Read
                    </span>
                  </div>
                </div>
              </div>
            </article>
          );
        })()}

        {/* River (rest of visible books) */}
        <div className="divide-y divide-neutral-100">
          {visibleBooks.slice(1).map((b, idx) => {
            const isFeature = ((idx + 1) % 4 === 0);
            const teaser = typeof teasers?.[b.id] === 'string' ? teasers[b.id] : null;
            const kicker = `Books • ${(b._genre || b.categories?.[0] || 'General')}`;
            const stamp = b.publishedDate && dayjs(b.publishedDate).isValid()
              ? dayjs(b.publishedDate).fromNow()
              : '';

            if (isFeature) {
              // Wide feature band
              return (
                <article
                  key={b.id}
                  className="py-4 active:opacity-95"
                  onClick={() => handleBookChange(b)}
                  role="button"
                  aria-label={`Open ${b.title}`}
                >
                  <div className="relative w-full">
                    <div className="relative w-full aspect-[16/9] sm:aspect-[21/9] bg-neutral-200 overflow-hidden rounded-xl">
                      <img
                        src={b.coverImage || '/default-cover.png'}
                        alt={b.title}
                        className="absolute inset-0 w-full h-full object-cover"
                        loading="lazy"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/35 to-transparent" />
                      <div className="absolute top-2 left-3 right-3 flex items-center gap-2">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-[11px] font-semibold bg-white/90 text-black/80 shadow">
                          {kicker}
                        </span>
                        {stamp && <span className="text-[11px] text-white/80">{stamp}</span>}
                      </div>
                      <div className="absolute left-0 right-0 bottom-0 px-4 pb-4">
                        <h3 className="text-[18px] sm:text-[20px] font-extrabold leading-snug text-white line-clamp-3 drop-shadow">
                          {b.title}
                        </h3>
                        <div className="mt-2 text-[13px] text-white/90 line-clamp-2">
                          {teaser || ''}
                        </div>
                        <div className="mt-3 flex items-center gap-2 text-[11px] text-white/80">
                          <span className="truncate">By {b.author || 'Unknown'}</span>
                          {b.publishedDate ? (
                            <>
                              <span className="opacity-60">•</span>
                              <span className="truncate">{b.publishedDate}</span>
                            </>
                          ) : null}
                          <span className="ml-auto inline-flex items-center gap-1 bg-white/10 backdrop-blur px-2 py-1 rounded-full">
                            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="2">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M9 6l6 6-6 6" />
                            </svg>
                            Read
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </article>
              );
            }

            // Compact news card
            return (
              <article
                key={b.id}
                className="px-4 py-4 active:bg-neutral-50"
                onClick={() => handleBookChange(b)}
                role="button"
                aria-label={`Open ${b.title}`}
              >
                <div className='flex flex-col gap-1 items-start mb-4 capitalize'>
                <span className='h-1 w-full bg-neutral-100 border border-none  mb-2'></span>
                {hookPhrases[b.id] && (
                        <span className="italic text-sm  w-auto">
                          {hookPhrases[b.id]}
                        </span>
                      )}
                      
                </div>
                <div className="flex gap-3">
                  <div className='flex flex-col gap-2 items-start'>
                  
                  {/* Thumb */}
                  <div className="relative w-24 h-32 flex-shrink-0 rounded-xl overflow-hidden border border-neutral-200 bg-neutral-100 flex-col">
                    <img
                      src={b.coverImage || '/default-cover.png'}
                      alt={b.title}
                      className="absolute inset-0 w-full h-full object-cover"
                      loading="lazy"
                    />
                  </div>
                  </div>
                  {/* Copy */}
                  <div className="min-w-0 flex-1">
                  
                    {/* Kicker row */}
                    <div className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-orange-600 font-semibold mb-0.5">
                      <span className="truncate">{kicker}</span>
                      
                    </div>

                    <h2 className="text-[16px] leading-snug font-extrabold text-neutral-900 line-clamp-2">
                      {b.title}
                    </h2>

                    {/* Teaser */}
                    {teaser ? (
                      <p className="text-[13px] text-neutral-700 mt-1 line-clamp-3">{teaser}</p>
                    ) : (
                      <div className="mt-1 space-y-2">
                        <div className="h-3 w-10/12 rounded bg-neutral-200 animate-pulse" />
                        <div className="h-3 w-8/12 rounded bg-neutral-200 animate-pulse" />
                      </div>
                    )}

                    <div className="mt-2 flex items-center text-[11px] text-neutral-500">
                      <span className="truncate">By {b.author || 'Unknown'}</span>
                      {b.pageCount ? <span className="px-2">·</span> : null}
                      {b.pageCount ? <span>{b.pageCount} pages</span> : null}
                      {b.publishedDate ? <span className="px-2">·</span> : null}
                      {b.publishedDate ? <span className="truncate">{b.publishedDate}</span> : null}

                      {/* CTA chevron */}
                      <span className="ml-auto inline-flex items-center justify-center w-8 h-8 rounded-xl bg-neutral-100 text-neutral-700 group-hover:bg-neutral-200 transition">
                        <svg viewBox="0 0 24 24" className="w-4.5 h-4.5" fill="none" stroke="currentColor" strokeWidth="2">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                        </svg>
                      </span>
                    </div>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        {/* See More (expands river; appends, doesn't reset) */}
        {hasMoreStories && (
          <div className="flex justify-center items-center py-6">
            <button
              onClick={() => setVisibleCount(c => c + SEE_MORE_STEP)}
              className="group relative inline-flex items-center gap-2 px-6 py-3 rounded-full
                         bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600
                         text-white font-semibold shadow-lg
                         transition-all active:scale-[0.98]
                         focus:outline-none focus:ring-2 focus:ring-orange-300"
              aria-label="See more stories"
            >
              <span className="pointer-events-none absolute -inset-1 rounded-full bg-orange-500/20 blur-md opacity-0 group-hover:opacity-100 transition-opacity" />
              <span className="pointer-events-none absolute inset-0 overflow-hidden rounded-full">
                <span className="absolute left-[-150%] top-0 h-full w-[150%]
                                 bg-gradient-to-r from-transparent via-white/30 to-transparent
                                 transition-transform duration-700 ease-out
                                 group-hover:translate-x-[200%]" />
              </span>
              <svg viewBox="0 0 24 24" className="h-5 w-5 transition-transform group-hover:translate-x-0.5" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-6-6h12" />
              </svg>
              <span>See more</span>
            </button>
          </div>
        )}
      </div>

      {/* ============================ Bottom Sheet ============================ */}
      <BottomSheet
        open={openSheet}
        onClose={() => setOpenSheet(false)}
        title={selectedBook?.title || 'Details'}
      >
        <div
          ref={bottomSheetContentRef}
          className="relative z-10"
          style={{ paddingBottom: '88px' }}
        >
          {/* Book header */}
          <div className="text-center pt-4 px-4 flex justify-center items-center gap-4">
            <img
              src={selectedBook?.coverImage || '/default-cover.png'}
              alt={selectedBook?.title || 'Selected Book'}
              className="w-28 h-40 md:w-32 md:h-48 mb-2 rounded-lg shadow-lg mx-0 object-cover"
              loading="lazy"
            />
            <div className="min-w-0 text-left">
              <h1 className="text-2xl font-bold text-neutral-900 line-clamp-2">
                {selectedBook?.title || 'Select a book'}
              </h1>
              <h2 className="text-sm text-neutral-700 line-clamp-3 italic">
                by {selectedBook?.author || 'Unknown Author'}
              </h2>
              <h2 className="text-xs text-neutral-500 mt-1 capitalize">
                {selectedBook?._genre || selectedBook?.genres?.[0] || 'Genre Unknown'}
              </h2>
            </div>
          </div>

          {/* --- Book Introduction (Teaser) --- */}
          {selectedBook?.id && teasers[selectedBook.id] && (
            <div className="px-6 py-3 mb-2 bg-orange-50 rounded-xl border border-orange-100 shadow-sm">
              <div className="font-bold text-orange-600 mb-1 text-base">Introduction</div>
              <div className="text-[15px] text-neutral-900 italic">{teasers[selectedBook.id]}</div>
            </div>
          )}

          {/* Summary */}
          <div className="gap-4 px-6 py-4 border-b-2 border-neutral-100 border-solid">
            <div className="font-bold mb-2 text-lg text-orange-500">More about the Book</div>
            {summarySections.length === 0 ? (
              <div className="text-base text-neutral-400 font-medium mb-2 pl-2">Loading summary…</div>
            ) : (
              summarySections.map((section, idx) => (
                <div key={`${section.subtitle || 'section'}-${idx}`} className="mb-4">
                  <div className="font-bold text-black text-lg mb-1">{section.subtitle}</div>
                  <div className="text-base text-neutral-900">{section.content}</div>
                </div>
              ))
            )}
            <div className="mt-4 text-xs text-gray-500 italic">
              <span className="font-semibold text-orange-500">AI Notice:</span> Some content is AI-generated and may contain minor errors.
            </div>
          </div>
          
        </div>
      </BottomSheet>
      
      {/* Fixed Footer CTA — shown only when the details sheet is open and no modal sits on top */}
      {openSheet && selectedBook && !showBuyBorrowModal && (
        <div className="fixed bottom-3 left-0 right-0 z-[2000] px-4">
          <div className="max-w-3xl mx-auto">
            <div className="rounded-2xl shadow-lg ring-1 ring-black/5 overflow-hidden bg-white">
              <div className="flex items-center gap-3 px-3 py-2">
                <img
                  src={selectedBook.coverImage || '/default-cover.png'}
                  alt={selectedBook.title}
                  className="w-10 h-14 object-cover rounded-md border border-neutral-200"
                  loading="lazy"
                />
                <div className="min-w-0 flex-1">
                  <div className="text-[13px] font-semibold text-neutral-900 truncate">
                    {selectedBook.title}
                  </div>
                  <div className="text-[11px] text-neutral-500 truncate">
                    by {selectedBook.author || 'Unknown'}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowBuyBorrowModal('buy')}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 shadow focus:outline-none focus:ring-2 focus:ring-orange-300"
                    aria-label="Buy options"
                  >
                    Buy
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Buy BottomSheet Modal (modern, online-first) */}
      <BottomSheet
        open={showBuyBorrowModal !== null}
        onClose={() => setShowBuyBorrowModal(null)}
        title={selectedBook?.title ? `Buy “${selectedBook.title}”` : 'Buy'}
      >
        {showBuyBorrowModal === 'buy' && (
          <>
            {/* Sticky header inside modal */}
            <div className="sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-neutral-100 px-4 pt-3 pb-2">
              <div className="flex items-center gap-3">
                <img
                  src={selectedBook?.coverImage || '/default-cover.png'}
                  alt={selectedBook?.title || 'Book'}
                  className="w-10 h-14 rounded-md object-cover border border-neutral-200"
                  loading="lazy"
                />
                <div className="min-w-0">
                  <div className="text-[15px] font-bold text-neutral-900 line-clamp-1">
                    {selectedBook?.title || 'Selected Book'}
                  </div>
                  <div className="text-[12px] text-neutral-500 line-clamp-1">
                    by {selectedBook?.author || 'Unknown'}
                  </div>
                </div>
              </div>

              {/* Tabs (single Online for now) */}
              <div className="mt-3 bg-neutral-200 rounded-full p-1 flex gap-1">
                <button
                  className={`flex-1 py-2 rounded-full text-sm font-medium transition-colors ${
                    buyTab === 'online' ? 'bg-white shadow text-neutral-900' : 'text-neutral-600'
                  }`}
                  onClick={() => setBuyTab('online')}
                  aria-pressed={buyTab === 'online'}
                >
                  Online
                </button>
                {/* In-Store can be added later */}
              </div>
            </div>

            {/* Online merchants */}
            {buyTab === 'online' && (
              <div className="px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
                <p className="text-xs text-neutral-500 italic mb-3">
                  Availability and prices may vary. Links open in a new tab.
                </p>

                <div className="grid gap-2.5" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}>
                  {Object.values(MERCHANTS)
                    .map(m => {
                      const link = m.getLink?.(selectedBook || {}) || m.homepage;
                      const isDirect = !!m.getLink && link && link !== m.homepage;
                      return { merchant: m, link, isDirect };
                    })
                    .sort((a, b) => (a.isDirect === b.isDirect ? 0 : a.isDirect ? -1 : 1)) // direct book links first
                    .map(({ merchant, link, isDirect }) => (
                      <a
                        key={merchant.name}
                        href={link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group p-3 rounded-2xl border border-neutral-200 bg-white shadow-sm hover:shadow-md active:shadow transition"
                        title={`Open ${merchant.name}`}
                      >
                        <div className="flex items-center gap-4 min-h-20">
                          <span className={`flex items-center justify-center w-12 h-12 rounded-xl ring-1 ring-black/5 ${merchant.color || 'bg-neutral-100'}`}>
                            <img
                              src={merchant.logo}
                              alt={merchant.name}
                              className="w-9 h-9 object-contain"
                              loading="lazy"
                            />
                          </span>
                          <div className="min-w-0 flex-1">
                            <div className="text-[15px] font-semibold text-neutral-900 line-clamp-1">
                              {merchant.name}
                            </div>
                            <div className="text-[12px] text-neutral-500 line-clamp-1">
                              {isDirect ? 'View Book' : 'Visit Store'}
                            </div>
                          </div>
                        </div>
                      </a>
                    ))}
                </div>
              </div>
            )}
          </>
        )}
      </BottomSheet>
    </>
  );
}
