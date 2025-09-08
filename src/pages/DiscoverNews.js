import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { apiCall } from '../utils/api';
import { getWorldCatLink } from '../utils/worldcatLink';
import { reverseGeocode } from '../utils/reverseGeocode';
import BottomSheet from '../components/BottomSheet';
import { MERCHANTS, AVATARS, GENRE_GRADIENTS, GENRE_ACCENTS } from '../constants/appConstants';
import dayjs from 'dayjs'; // npm install dayjs

// Helper for ASIN validation
// eslint-disable-next-line
const isValidASIN = id => id && !/^\d{10,13}$/.test(id);

// Helper for checking if a URL is reachable (best effort)
async function checkUrlExists(url) {
  try {
    await fetch(url, { method: 'HEAD', mode: 'no-cors' });
    return true;
  } catch {
    return false;
  }
}

// --- Buy Button with fallback ---
// eslint-disable-next-line
function BuyButtonWithFallback({ merchant, buyUrl, searchUrl }) {
  const [broken, setBroken] = useState(false);
  const [checking, setChecking] = useState(false);

  const handleClick = async e => {
    e.preventDefault();
    setChecking(true);
    const ok = await checkUrlExists(buyUrl);
    setChecking(false);
    if (ok) {
      window.open(buyUrl, '_blank', 'noopener,noreferrer');
    } else {
      setBroken(true);
    }
  };

  return (
    <div className="flex flex-col items-center">
      <button
        onClick={handleClick}
        disabled={checking}
        className={`flex items-center gap-2 px-4 py-2 rounded-md font-semibold text-white shadow transition-colors duration-200 ${merchant.color} hover:brightness-110 disabled:opacity-60`}
        title={`Buy on ${merchant.name}`}
      >
        <img src={merchant.logo} alt={merchant.name} className="w-5 h-5" />
        {checking ? 'Checking...' : `Buy on ${merchant.name}`}
      </button>
      {broken && (
        <div className="mt-2 text-xs text-red-600 text-center">
          Link unavailable.{' '}
          <a
            href={searchUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="underline text-blue-700"
          >
            Search on {merchant.name}
          </a>
        </div>
      )}
    </div>
  );
}

// Helper to render merchant logo background
// eslint-disable-next-line
function MerchantLogoBg({ merchant, children }) {
  if (merchant.color?.startsWith('bg-')) {
    // Tailwind class
    return (
      <div
        className={`flex items-center justify-center rounded-2xl mb-4 shadow-xl ${merchant.color}`}
        style={{ width: 60, height: 60, minWidth: 60, minHeight: 60, maxWidth: 60, maxHeight: 60 }}
      >
        {children}
      </div>
    );
  }
  // Inline color (hex, rgb, etc)
  return (
    <div
      className="flex items-center justify-center rounded-2xl mb-4 shadow-xl"
      style={{ background: merchant.color, width: 60, height: 60, minWidth: 60, minHeight: 60, maxWidth: 60, maxHeight: 60 }}
    >
      {children}
    </div>
  );
}

const PAGE_SIZE = 8; // fetch 6 at a time
const MARKER_COLORS = { buy: '#2563eb', borrow: '#4f46e5' }; // blue / indigo

const BOOKS_PER_PAGE = 8;
const BOOKS_TO_SHOW = 12;

export default function DiscoverNews({ setShowTabBar, setShowHeader }) {
  // Core state
  const [books, setBooks] = useState([]);
  const [selectedBook, setSelectedBook] = useState(null);
  const [summarySections, setSummarySections] = useState([]);
  const [openSheet, setOpenSheet] = useState(false);

  // Profile / UI
  const [profile, setProfile] = useState(() => JSON.parse(localStorage.getItem('profile') || '{}'));
  const [isLiked, setIsLiked] = useState(false);
  const [isChangingBook, setIsChangingBook] = useState(false);
  const [isBookTransitioning, setIsBookTransitioning] = useState(false);

  // AI bits
  // eslint-disable-next-line
  const [authorInsights, setAuthorInsights] = useState('');
  const [bookQuotes, setBookQuotes] = useState('');
  // eslint-disable-next-line
  const [authorBooks, setAuthorBooks] = useState([]);

  // Nearby & maps
  const [userLocation, setUserLocation] = useState(null);
  // eslint-disable-next-line
  const [userGeo, setUserGeo] = useState({});
  const [mapUrl, setMapUrl] = useState('');
  // eslint-disable-next-line
  const [locationError, setLocationError] = useState('');
  // eslint-disable-next-line
  const [locationPrompted, setLocationPrompted] = useState(false);

  // BUY / BORROW modal + tabs
  const [showBuyBorrowModal, setShowBuyBorrowModal] = useState(null); // 'buy' | 'borrow' | null
  const [buyTab, setBuyTab] = useState('inStore'); // 'inStore' | 'online'

  // In-store (buy) pagination
  const [buyLocations, setBuyLocations] = useState([]); // appended pages
  const [buyPage, setBuyPage] = useState(0);
  const [buyHasMore, setBuyHasMore] = useState(true);
  const [buyLoading, setBuyLoading] = useState(false);

  // Borrow (libraries) pagination
  const [nearbyLibraries, setNearbyLibraries] = useState([]); // appended pages
  const [libPage, setLibPage] = useState(0);
  const [libHasMore, setLibHasMore] = useState(true);
  const [libLoading, setLibLoading] = useState(false);

  // Online buy options (untouched)
  // eslint-disable-next-line
  const [onlineBuyOptions, setOnlineBuyOptions] = useState([]);
  const [bookLinks, setBookLinks] = useState(null);

  // Refs
  const location = useLocation();
  const navigate = useNavigate();
  const bottomSheetContentRef = useRef(null);
  const avatarId = profile.avatarId;
  // eslint-disable-next-line
  const borderStyle = profile.avatarBorderStyle || 'solid';
  // eslint-disable-next-line
  const avatarObj = AVATARS.find(a => a.id === avatarId) || AVATARS[0];

  const genreKey = useMemo(
    () => (selectedBook?._genre || selectedBook?.genres?.[0] || 'default').toLowerCase(),
    [selectedBook]
  );
  const genreGradient = GENRE_GRADIENTS[genreKey] || GENRE_GRADIENTS.default;
  // eslint-disable-next-line
  const genreAccent = GENRE_ACCENTS[genreKey] || GENRE_ACCENTS.default;

  const [teasers, setTeasers] = useState({}); // bookId: teaser
// eslint-disable-next-line
  const [currentPage, setCurrentPage] = useState(0);
  const TOP_BOOKS_PER_PAGE = 4; // or 3, set how many books per page you want
  // eslint-disable-next-line
  const pagedBooks = useMemo(() => {
    const start = currentPage * BOOKS_PER_PAGE;
    return books.slice(start, start + BOOKS_PER_PAGE);
  }, [books, currentPage]);
// eslint-disable-next-line
  const totalPages = Math.max(1, Math.ceil(books.length / BOOKS_PER_PAGE));

  const topBooks = useMemo(() => books.slice(0, BOOKS_TO_SHOW), [books]);

  // Get paged books for the river (excluding lead book)
  // eslint-disable-next-line
  const pagedTopBooks = useMemo(() => {
    const start = 1 + currentPage * TOP_BOOKS_PER_PAGE;
    return topBooks.slice(start, start + TOP_BOOKS_PER_PAGE);
  }, [topBooks, currentPage]);

  const TEASER_TTL_DAYS = 7;

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

  useEffect(() => {
    let isMounted = true;
    async function fetchTeasers() {
      const teaserMap = {};
      for (const book of topBooks) {
        if (!book || !book.id) continue;
        let teaser = getTeaserFromCache(book.id);
        if (!teaser) {
          try {
            const res = await apiCall('/api/books/ai-teaser', {
              method: 'POST',
              data: {
                title: book.title,
                author: book.author,
                summary: book.summary
              }
            });
            teaser = res.data.teaser || '';
            setTeaserInCache(book.id, teaser);
          } catch {
            teaser = '';
          }
        }
        teaserMap[book.id] = teaser;
      }
      if (isMounted) setTeasers(teaserMap);
    }
    if (topBooks.length) fetchTeasers();
    return () => { isMounted = false; };
  }, [topBooks]); // Only run when topBooks changes

  // Header/tab bar
  useEffect(() => {
    setShowHeader?.(true);
    setShowTabBar?.(true);
  }, [setShowHeader, setShowTabBar]);
  useEffect(() => {
    setShowTabBar && setShowTabBar(!openSheet);
  }, [openSheet, setShowTabBar]);

  // Fetch books (home-batch) with mixed genres
  async function fetchBooksAndScrollTop() {
    let genres = [];
    if (profile.genres?.length) {
      genres = profile.genres;
    } else {
      genres = JSON.parse(localStorage.getItem('preferredGenres') || '["fiction","history","fantasy","science","biography"]');
    }
    const ALL_GENRES = [
      "fiction", "fantasy", "mystery", "romance", "biography", "thriller", "self-help",
      "history", "science", "horror", "adventure", "classic", "poetry", "children", "education", "health", "cookbook"
    ];
    const extraGenres = ALL_GENRES.filter(g => !genres.includes(g));
    const randomExtras = extraGenres.sort(() => 0.5 - Math.random()).slice(0, 3);
    const mixedGenres = [...genres, ...randomExtras];

    try {
      const res = await apiCall('/api/books/home-batch', {
        method: 'GET',
        params: { genres: mixedGenres.map(g => g.toLowerCase()).join(',') }
      });
      const allBooks = [];
      const genreData = res.data.genres || [];
      for (const genreObj of genreData) {
        const booksFetched = genreObj.books || [];
        allBooks.push(...booksFetched.map(b => ({ ...b, _genre: genreObj.genre })));
      }
      // Shuffle for variety and deduplicate
      const seen = new Set();
      const deduped = [];
      for (const b of allBooks.sort(() => 0.5 - Math.random())) {
        if (!seen.has(b.id)) {
          deduped.push(b);
          seen.add(b.id);
        }
      }
      setBooks(prev => {
        const lead = selectedBook || deduped[0];
        const filtered = deduped.filter(b => b.id !== lead.id);
        return [lead, ...filtered].slice(0, BOOKS_TO_SHOW);
      });
      setSelectedBook(prev => prev || (deduped.length ? deduped[0] : null));
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) {
      console.error('Failed to fetch books:', e);
      setBooks([]);
    }
  }

  useEffect(() => {
    fetchBooksAndScrollTop();
    // eslint-disable-next-line
  }, [profile]);

  // AI summary (cached by volume id)
  useEffect(() => {
    async function fetchSummary() {
      if (!selectedBook) return;
      const cacheKey = `summary_${selectedBook.id}`;
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        try {
          setSummarySections(JSON.parse(cached));
          return;
        } catch {}
      }
      try {
        const res = await apiCall('/api/books/ai-summary-dynamic', {
          method: 'POST',
          data: selectedBook
        });
        const sections = res.data.sections || [];
        setSummarySections(sections);
        localStorage.setItem(cacheKey, JSON.stringify(sections));
      } catch (error) {
        console.error('Failed to fetch summary:', error);
        setSummarySections([]);
      }
    }
    fetchSummary();
  }, [selectedBook]);

  // Author insights (cached)
  useEffect(() => {
    async function fetchAuthorInsights() {
      if (!selectedBook) return;
      const cacheKey = `author_insights_${selectedBook.author}_${selectedBook.title}`;
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        setAuthorInsights(cached);
        return;
      }
      try {
        const res = await apiCall('/api/books/ai-author-insights', {
          method: 'POST',
          data: { author: selectedBook.author, bookTitle: selectedBook.title }
        });
        const insights = res.data.details || '';
        setAuthorInsights(insights);
        localStorage.setItem(cacheKey, insights);
      } catch (error) {
        console.error('Failed to fetch author insights:', error);
        setAuthorInsights('');
      }
    }
    fetchAuthorInsights();
  }, [selectedBook]);

  // Book quotes (cached)
  useEffect(() => {
    async function fetchBookQuotes() {
      if (!selectedBook) return;
      const cacheKey = `book_quotes_${selectedBook.title}_${selectedBook.author}`;
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        setBookQuotes(cached);
        return;
      }
      try {
        const res = await apiCall('/api/books/ai-book-quotes', {
          method: 'POST',
          data: { bookTitle: selectedBook.title, author: selectedBook.author }
        });
        const quotes = res.data.quotes || '';
        setBookQuotes(quotes);
        localStorage.setItem(cacheKey, quotes);
      } catch (error) {
        console.error('Failed to fetch book quotes:', error);
        setBookQuotes('');
      }
    }
    fetchBookQuotes();
  }, [selectedBook]);

  // Author's other books (cached 24h)
  useEffect(() => {
    async function fetchAuthorBooks() {
      if (!selectedBook?.author) {
        setAuthorBooks([]);
        return;
      }
      const cacheKey = `author_books_${selectedBook.author}`;
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        try {
          const items = JSON.parse(cached);
          const filtered = items
            .filter(book => book.title?.toLowerCase() !== selectedBook.title?.toLowerCase())
            .slice(0, 12);
          setAuthorBooks(filtered);
          return;
        } catch {}
      }
      try {
        const res = await apiCall(`/api/books/author/${encodeURIComponent(selectedBook.author)}`, { method: 'GET' });
        const items = res.data.items || [];
        const filtered = items
          .filter(book => book.title?.toLowerCase() !== selectedBook.title?.toLowerCase())
          .slice(0, 12);
        setAuthorBooks(filtered);
        localStorage.setItem(cacheKey, JSON.stringify(items));
        setTimeout(() => localStorage.removeItem(cacheKey), 24 * 60 * 60 * 1000);
      } catch (error) {
        console.error('Failed to fetch author books:', error);
        setAuthorBooks([]);
      }
    }
    fetchAuthorBooks();
  }, [selectedBook]);

  // Liked state
  useEffect(() => {
    if (!selectedBook) return;
    const liked = JSON.parse(localStorage.getItem('likedBooks') || '[]');
    setIsLiked(liked.includes(selectedBook.id));
  }, [selectedBook]);

  // Keep profile in sync across tabs
  useEffect(() => {
    const onStorage = () => setProfile(JSON.parse(localStorage.getItem('profile') || '{}'));
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  // Auto-scroll bottom sheet to top on book change
  useEffect(() => {
    if (bottomSheetContentRef.current) bottomSheetContentRef.current.scrollTop = 0;
  }, [selectedBook]);

  // Handle navigation-passed book
  useEffect(() => {
    if (location.state?.book) {
      const navBook = location.state.book;
      setSelectedBook(navBook);
      setBooks(prevBooks => {
        // Remove any duplicate of navBook from the list
        const filtered = prevBooks.filter(b => b.id !== navBook.id);
        // Place navBook at the front
        return [navBook, ...filtered].slice(0, BOOKS_TO_SHOW);
      });
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  // Refs to avoid stale closures and to preserve a "lead" book from navigation (scan/search/home)
  const selectedBookRef = useRef(null);
  useEffect(() => { selectedBookRef.current = selectedBook; }, [selectedBook]);

  const navLeadRef = useRef(null);
  const navLeadHandledRef = useRef(false);

  // When a book is passed via router state, make it the lead and open the sheet
  useEffect(() => {
    const navBook = location?.state?.book;
    if (!navBook || navLeadHandledRef.current) return;

    navLeadRef.current = navBook;
    navLeadHandledRef.current = true;

    // Put nav book first in list
    setBooks(prev => {
      const filtered = (prev || []).filter(b => b.id !== navBook.id);
      return [navBook, ...filtered];
    });
    setSelectedBook(navBook);
    setOpenSheet(true);

    // Clear the router state to avoid re-handling on renders
    navigate('.', { replace: true, state: null });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location?.state]);

  // Replace your fetchBooksAndScrollTop with this version to preserve nav lead
  async function fetchBooksAndScrollTop() {
    let genres = [];
    if (profile.genres?.length) {
      genres = profile.genres;
    } else {
      try {
        genres = JSON.parse(localStorage.getItem('preferredGenres') || '["fiction","history","fantasy","science","biography"]');
      } catch {
        genres = ["fiction", "history", "fantasy", "science", "biography"];
      }
    }

    const ALL_GENRES = [
      "fiction", "fantasy", "mystery", "romance", "biography", "thriller", "self-help",
      "history", "science", "horror", "adventure", "classic", "poetry", "children", "education", "health", "cookbook"
    ];
    const extraGenres = ALL_GENRES.filter(g => !genres.includes(g));
    const randomExtras = extraGenres.sort(() => 0.5 - Math.random()).slice(0, 3);
    const mixedGenres = [...genres, ...randomExtras];

    try {
      const res = await apiCall('/api/books/home-batch', {
        method: 'GET',
        params: { genres: mixedGenres.map(g => g.toLowerCase()).join(',') }
      });

      const allBooks = [];
      const genreData = res.data?.genres || [];
      for (const g of genreData) {
        const items = g.books || [];
        allBooks.push(...items.map(b => ({ ...b, _genre: g.genre })));
      }

      // Shuffle + dedupe
      const seen = new Set();
      const deduped = [];
      for (const b of allBooks.sort(() => Math.random() - 0.5)) {
        if (!seen.has(b.id)) {
          seen.add(b.id);
          deduped.push(b);
        }
      }

      // Preserve nav lead or current selection
      const lead = navLeadRef.current || selectedBookRef.current || deduped[0] || null;
      const rest = lead ? deduped.filter(b => b.id !== lead.id) : deduped;

      setBooks([...(lead ? [lead] : []), ...rest].slice(0, BOOKS_TO_SHOW));

      // Only set selection if nothing selected yet and no nav lead present
      if (!navLeadRef.current && !selectedBookRef.current && lead) {
        setSelectedBook(lead);
      }

      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (e) {
      console.error('Failed to fetch books:', e);
      setBooks([]);
    }
  }

  // Replace your handleBookChange with this version to release nav lead on manual pick
  // Removed duplicate declaration of handleBookChange

  // ————— Location request helper —————
  const requestLocation = () => {
    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser.');
      return;
    }
    setLocationPrompted(true);
    navigator.geolocation.getCurrentPosition(
      async pos => {
        const { latitude, longitude } = pos.coords;
        const loc = { lat: latitude, lng: longitude };
        setUserLocation(loc);
        try {
          const geo = await reverseGeocode(latitude, longitude);
          setUserGeo(geo);
        } catch {}
      },
      err => setLocationError(`Location error: ${err?.message || 'Permission denied'}`),
      { timeout: 10000 }
    );
  };

  // ————— Fetch Google Places via backend proxy (paginated) —————
  const cleanName = (s) => /^[A-Za-z0-9\s,'\-&.]+$/.test(s || '');

  async function fetchPlaces(kind, page) {
    if (!userLocation) return { items: [], hasMore: false };
    try {
      const res = await apiCall('/api/places/nearby', {
        method: 'POST',
        data: {
          lat: userLocation.lat,
          lng: userLocation.lng,
          type: kind,           // 'buy' or 'borrow'
          page,                  // zero-based page
          pageSize: PAGE_SIZE    // 6 at a time
        }
      });

      let items = res.data.locations || [];
      // fallback to client-side batching if server returns full set:
      if (!Array.isArray(items)) items = [];
      // basic filtering
      items = items
        .filter(loc => cleanName(loc.name))
        .filter(loc => kind === 'borrow' ? (loc.type || '').toLowerCase().includes('library')
       : (loc.type || '').toLowerCase().includes('book') || (loc.types || []).some(t => t.includes('book')));

      // If server ignored page/pageSize, slice here:
      const start = page * PAGE_SIZE;
      const clientSlice = items.length > PAGE_SIZE ? items.slice(start, start + PAGE_SIZE) : items;
      const hasMore = clientSlice.length === PAGE_SIZE && (items.length > start + PAGE_SIZE);

      return { items: clientSlice, hasMore: hasMore || (res.data.hasMore ?? false) };
    } catch (e) {
      console.error('Failed to fetch /api/places/nearby:', e);
      return { items: [], hasMore: false };
    }
  }

  // ————— Map builder with multiple markers —————
  async function buildMap(kind) {
    if (!userLocation) return;
    const list = kind === 'borrow' ? nearbyLibraries : buyLocations;
    if (!list || list.length === 0) {
      setMapUrl('');
      return;
    }
    // show pins for the most recent "page" (up to 6)
    const recent = list.slice(-PAGE_SIZE);
    const labels = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const markers = recent
      .filter(l => typeof l.lat === 'number' && typeof l.lng === 'number')
      .map((l, i) => ({
        lat: l.lat,
        lng: l.lng,
        label: labels[i % labels.length],
        color: MARKER_COLORS[kind === 'borrow' ? 'borrow' : 'buy']
      }));
    try {
      const params = {
        lat: userLocation.lat,
        lng: userLocation.lng,
        zoom: 13,
        size: '800x300',
        markers: JSON.stringify(markers) // backend should parse this
      };
      const res = await apiCall('/api/maps/static', { method: 'GET', params });
      setMapUrl(res.data.url);
    } catch (e) {
      console.error('Failed to fetch static map:', e);
    }
  }

  // ————— When modal opens, fetch first page for the active tab —————
  useEffect(() => {
    async function initModal() {
      if (!showBuyBorrowModal) return;
      if (!userLocation) {
        requestLocation();
        return;
      }
      if (showBuyBorrowModal === 'buy') {
        // reset states
        setBuyLocations([]);
        setBuyPage(0);
        setBuyHasMore(true);
        // online options (unchanged)
        setOnlineBuyOptions([]);
        // initial loads depending on tab
        if (buyTab === 'inStore') {
          setBuyLoading(true);
          const { items, hasMore } = await fetchPlaces('buy', 0);
          setBuyLocations(items);
          setBuyHasMore(hasMore || items.length === PAGE_SIZE);
          setBuyLoading(false);
          buildMap('buy');
        } else {
          // online options from your existing endpoint (leave as-is)
          try {
            const res = await apiCall('/api/books/online-buy', {
              method: 'POST',
              data: {
                title: selectedBook?.title,
                author: selectedBook?.author,
                isbn: selectedBook?.isbn || selectedBook?.isbn_13 || selectedBook?.isbn13,
                amazonAffiliateId: process.env.REACT_APP_AMAZON_AFFILIATE_ID
              }
            });
            setOnlineBuyOptions(res.data.options || []);
          } catch {
            setOnlineBuyOptions([]);
          }
        }
      } else if (showBuyBorrowModal === 'borrow') {
        setNearbyLibraries([]);
        setLibPage(0);
        setLibHasMore(true);
        setLibLoading(true);
        const { items, hasMore } = await fetchPlaces('borrow', 0);
        setNearbyLibraries(items);
        setLibHasMore(hasMore || items.length === PAGE_SIZE);
        setLibLoading(false);
        buildMap('borrow');
      }
    }
    initModal();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showBuyBorrowModal, userLocation, buyTab, selectedBook]);

  // Rebuild map when lists change
  // eslint-disable-next-line
  useEffect(() => { if (showBuyBorrowModal === 'buy' && buyTab === 'inStore') buildMap('buy'); /* eslint-disable-next-line */ }, [buyLocations]);
  useEffect(() => { if (showBuyBorrowModal === 'borrow') buildMap('borrow'); /* eslint-disable-next-line */ }, [nearbyLibraries]);

  // Fetch Google Books details when modal opens
  useEffect(() => {
    if (!showBuyBorrowModal || !selectedBook?.id) return;
    setBookLinks(null);
    apiCall(`/api/books/details/${selectedBook.id}`, { method: 'GET' })
      .then(res => {
        const data = res.data || res;
        const isbn = selectedBook?.isbn_13 || selectedBook?.isbn13 || selectedBook?.isbn;
        setBookLinks({
          buyLink: data.saleInfo?.buyLink,
          saleInfo: data.saleInfo,
          accessInfo: data.accessInfo,
          previewLink: data.volumeInfo?.previewLink || data.accessInfo?.webReaderLink,
          infoLink: data.volumeInfo?.infoLink,
          worldCatLink: data.accessInfo?.worldCatLink || (isbn ? getWorldCatLink(isbn) : undefined),
        });
      })
      .catch(() => setBookLinks({}));
  }, [showBuyBorrowModal, selectedBook]);

  // OpenLibrary availability
  const [openLibraryAvailability, setOpenLibraryAvailability] = useState(null);
  useEffect(() => {
    setOpenLibraryAvailability(null);
    const isbn = selectedBook?.isbn_13 || selectedBook?.isbn13 || selectedBook?.isbn;
    if (!isbn) return;
    apiCall(`/api/books/openlibrary-availability/${isbn}`, { method: 'GET' })
      .then(res => setOpenLibraryAvailability(res.data || res))
      .catch(() => setOpenLibraryAvailability(null));
  }, [selectedBook]);
  // refresh OL availability when modal opens
  const [refreshing, setRefreshing] = useState(false);

  // Actions
  const handleBookOpen = (book) => {
    let recent = JSON.parse(localStorage.getItem('recentlyOpenedBooks') || '[]');
    recent = recent.filter(b => b.id !== book.id);
    recent.unshift({ id: book.id, title: book.title, author: book.author, coverImage: book.coverImage });
    localStorage.setItem('recentlyOpenedBooks', JSON.stringify(recent.slice(0, 3)));
  };

  const handleAddToList = () => {
    if (!selectedBook) return;
    let liked = JSON.parse(localStorage.getItem('likedBooks') || '[]');
    if (liked.includes(selectedBook.id)) {
      liked = liked.filter(id => id !== selectedBook.id);
      setIsLiked(false);
    } else {
      liked.push(selectedBook.id);
      setIsLiked(true);
      localStorage.setItem(`bookData:${selectedBook.id}`, JSON.stringify(selectedBook));
    }
    localStorage.setItem('likedBooks', JSON.stringify(liked));
  };

  const handleBookChange = async (newBook, scrollToTop = true) => {
    if (!newBook) return;

    if (newBook.id === selectedBookRef.current?.id) {
      setOpenSheet(v => !v);
      return;
    }
    if (isChangingBook) return;

    setIsChangingBook(true);
    setIsBookTransitioning(true);
    try {
      // Manual selection: release nav lead so future fetches don't force the scanned book
      navLeadRef.current = null;

      await new Promise(r => setTimeout(r, 150));

      setBooks(prev => {
        const filtered = (prev || []).filter(b => b.id !== newBook.id);
        return [newBook, ...filtered];
      });

      setSelectedBook(newBook);
      setOpenSheet(true);

      if (scrollToTop) {
        const scroller = document.querySelector('[data-bottomsheet-scroll]');
        scroller?.scrollTo?.({ top: 0, behavior: 'smooth' });
      }

      await new Promise(r => setTimeout(r, 200));
    } finally {
      setIsBookTransitioning(false);
      setIsChangingBook(false);
    }
    handleBookOpen(newBook);
  };

  // Load-more handlers
  const loadMoreBuy = async () => {
    if (buyLoading || !buyHasMore) return;
    setBuyLoading(true);
    const nextPage = buyPage + 1;
    const { items, hasMore } = await fetchPlaces('buy', nextPage);
    setBuyLocations(prev => [...prev, ...items]);
    setBuyPage(nextPage);
    setBuyHasMore(hasMore || items.length === PAGE_SIZE);
    setBuyLoading(false);
  };
// eslint-disable-next-line
  const loadMoreBorrow = async () => {
    if (libLoading || !libHasMore) return;
    setLibLoading(true);
    const nextPage = libPage + 1;
    const { items, hasMore } = await fetchPlaces('borrow', nextPage);
    setNearbyLibraries(prev => [...prev, ...items]);
    setLibPage(nextPage);
    setLibHasMore(hasMore || items.length === PAGE_SIZE);
    setLibLoading(false);
  };

  return (
    <>
      {/* Accent animation */}
      <style>{`
        @keyframes genreGlow {
          0%, 100% { box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
          50% { box-shadow: 0 4px 16px rgba(251,146,60,0.3); }
        }
        .genre-pulse { animation: genreGlow 2s ease-in-out infinite; }
      `}</style>

      <div className="w-full min-h-screen h-fit bg-white flex flex-col items-center relative z-0">
        {/* BG wash when sheet open */}
        <div
          className="fixed top-0 left-0 w-full min-h-[calc(100vh - 56px)] z-10 transition-all duration-700"
          style={{ background: openSheet ? genreGradient : 'transparent', opacity: openSheet ? 1 : 0, pointerEvents: 'none', transition: 'all 0.7s cubic-bezier(0.4,0,0.2,1)' }}
        />

        {/* Top Books Redesign */}
        <div className="min-h-screen w-full bg-white">
          {/* Header / Masthead */}
          <div className="sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-neutral-200 px-4 py-3">
            <div className="flex items-center justify-between">
              <div className="text-xl font-extrabold tracking-tight">Discover</div>
              <div className="text-xs text-neutral-500">For you</div>
            </div>
          </div>

{/* Lead Story (first book) */}
{topBooks.length > 0 && (() => {
  const lead = topBooks[0];
  const genreKey = (lead._genre || lead.categories?.[0] || 'default').toLowerCase();
  // eslint-disable-next-line
  const accent = (GENRE_ACCENTS[genreKey] || GENRE_ACCENTS.default);
  const teaser = typeof teasers?.[lead.id] === 'string' ? teasers[lead.id] : null;
  

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
          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/30 to-transparent" />
          <div
            className="absolute top-2 left-2 text-[11px] font-semibold px-2 py-1 rounded-full capitalize bg-white/90 text-black/80 shadow genre-pulse"
            
          >
            {lead._genre || lead.categories?.[0] || 'Books'}
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-4">
          <h1 className="text-[20px] leading-snug font-extrabold text-white drop-shadow-sm line-clamp-3">
            {lead.title}
          </h1>
          {teaser ? (
            <p className="text-[13px] text-white/90 mt-2 line-clamp-3">
              {teaser}
            </p>
          ) : (
            <div className="mt-2 space-y-2">
              <div className="h-3 w-11/12 rounded bg-white/30 animate-pulse" />
              <div className="h-3 w-10/12 rounded bg-white/25 animate-pulse" />
              <div className="h-3 w-8/12 rounded bg-white/20 animate-pulse" />
            </div>
          )}
          <div className="mt-3 flex items-center gap-2 text-[11px] text-white/80">
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

{/* River (rest of books) */}
<div className="divide-y divide-neutral-100">
  {topBooks.slice(1).map((b, idx) => {
    const isFeature = ((idx + 1) % 4 === 0);
    const genreKey = (b._genre || b.categories?.[0] || 'default').toLowerCase();
    // eslint-disable-next-line
    const accent = (GENRE_ACCENTS[genreKey] || GENRE_ACCENTS.default);
    const teaser = typeof teasers?.[b.id] === 'string' ? teasers[b.id] : null;

    if (isFeature) {
      // Feature card
      return (
        <article
          key={b.id}
          className="py-4 active:opacity-95"
          onClick={() => handleBookChange(b)}
          role="button"
          aria-label={`Open ${b.title}`}
        >
          <div className="relative w-full">
            <div className="relative mx-0 overflow-hidden">
              <div className="relative w-full aspect-[16/9] sm:aspect-[21/9] bg-neutral-200">
                <img
                  src={b.coverImage || '/default-cover.png'}
                  alt={b.title}
                  className="absolute inset-0 w-full h-full object-cover"
                  loading="lazy"
                />
                <div
                  className="absolute inset-0"
                  style={{
                    background: `linear-gradient(to top, rgba(0,0,0,0.82), rgba(0,0,0,0.35) 45%, transparent 80%)`,
                  }}
                />
                <div
                  className="absolute top-2 left-4 text-[11px] font-semibold px-2 py-1 rounded-full capitalize bg-white/90 text-black/80 shadow"
                >
                  {b._genre || b.categories?.[0] || 'Books'}
                </div>
                <div className="absolute left-0 right-0 bottom-0 px-4 pb-4">
                  <h3 className="text-[18px] sm:text-[20px] font-extrabold leading-snug text-white line-clamp-3 drop-shadow">
                    {b.title}
                  </h3>
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
          </div>
        </article>
      );
    }

    // Compact card
    return (
      <article
        key={b.id}
        className="px-4 py-4 active:bg-neutral-50"
        onClick={() => handleBookChange(b)}
        role="button"
        aria-label={`Open ${b.title}`}
      >
        <div className="flex gap-3">
          <div className="relative w-24 h-32 flex-shrink-0 rounded-xl overflow-hidden border border-neutral-200 bg-neutral-100">
            <img
              src={b.coverImage || '/default-cover.png'}
              alt={b.title}
              className="absolute inset-0 w-full h-full object-cover"
              loading="lazy"
            />
            <div
              className="absolute top-1.5 left-1.5 text-[10px] font-semibold px-1.5 py-0.5 rounded-full capitalize shadow bg-white/90 text-black/80"
            >
              {b._genre || b.categories?.[0] || 'Books'}
            </div>
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-[16px] leading-snug font-extrabold text-neutral-900 line-clamp-2">
              {b.title}
            </h2>
            {teaser ? (
              <p className="text-[13px] text-neutral-700 mt-1 line-clamp-3">
                {teaser}
              </p>
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
              <span className="ml-auto inline-flex items-center justify-center w-7 h-7 rounded-full bg-neutral-100 text-neutral-700">
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth="2">
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

{/* Refresh Button */}
<div className="flex justify-center items-center py-6">
  <button
    onClick={async () => {
      if (refreshing) return;
      setRefreshing(true);
      try {
        await fetchBooksAndScrollTop();
      } finally {
        setRefreshing(false);
      }
    }}
    disabled={refreshing}
    className="group relative inline-flex items-center gap-2 px-6 py-3 rounded-full
               bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600
               text-white font-semibold shadow-lg
               transition-all active:scale-[0.98]
               focus:outline-none focus:ring-2 focus:ring-orange-300
               disabled:opacity-70 disabled:cursor-not-allowed"
    aria-live="polite"
  >
    {/* subtle glow */}
    <span className="pointer-events-none absolute -inset-1 rounded-full bg-orange-500/20 blur-md opacity-0 group-hover:opacity-100 transition-opacity" />

    {/* sheen sweep */}
    <span className="pointer-events-none absolute inset-0 overflow-hidden rounded-full">
      <span className="absolute left-[-150%] top-0 h-full w-[150%]
                       bg-gradient-to-r from-transparent via-white/30 to-transparent
                       transition-transform duration-700 ease-out
                       group-hover:translate-x-[200%]" />
    </span>

    {/* icon */}
    <span className="inline-flex h-5 w-5 items-center justify-center">
      <svg
        viewBox="0 0 24 24"
        className={`h-5 w-5 ${refreshing ? 'animate-spin' : 'group-hover:rotate-45'} transition-transform`}
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v6h6M20 20v-6h-6" />
        <path strokeLinecap="round" strokeLinejoin="round" d="M20 9a8 8 0 10.001 6.001" />
      </svg>
    </span>

    <span>{refreshing ? 'Refreshing…' : 'Refresh Books'}</span>
  </button>
</div>

<BottomSheet
  open={openSheet}
  onClose={() => setOpenSheet(false)}
  title={selectedBook?.title || 'Details'}
>
  <div
    className="relative z-10"
    style={{
      paddingBottom: '88px',
      transition: 'all 0.5s cubic-bezier(0.4, 0, 0.2, 1)',
      opacity: isBookTransitioning ? 0.7 : 1,
      filter: isBookTransitioning ? 'blur(2px)' : 'blur(0px)',
      transform: isBookTransitioning ? 'translateY(10px) scale(0.98)' : 'translateY(0px) scale(1)',
    }}
  >
    {/* Book header */}
    <div className="text-center pt-4 px-4 flex justify-center items-center gap-4">
      <img
        src={selectedBook?.coverImage || '/default-cover.png'}
        alt={selectedBook?.title || 'Selected Book'}
        className="w-32 h-48 mb-2 rounded-lg shadow-lg mx-0"
      />
      <div className="min-w-0">
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

    {/* Summary */}
    <div className="gap-4 px-6 py-4 border-b-2 border-neutral-100 border-solid">
      <div className="font-bold mb-1 text-lg" style={{ color: '#f97316' }}>
        Book Summary
      </div>
      {summarySections.length === 0 ? (
        <div className="text-base text-neutral-400 font-medium mb-2">Loading summary...</div>
      ) : (
        summarySections.map((section, idx) => (
          <div key={`${section.subtitle || 'section'}-${idx}`} className="mb-4">
            <div className="font-bold text-black text-lg mb-1">{section.subtitle}</div>
            <div className="text-base text-neutral-900">{section.content}</div>
          </div>
        ))
      )}
      <div className="mt-4 text-xs text-gray-500 italic">
        <span className="font-semibold text-orange-500">AI Notice:</span> Some summaries are generated by AI.
      </div>
    </div>

    {/* Quotes */}
    <div className="gap-4 px-6 py-4">
      <div className="font-bold mb-1 text-lg" style={{ color: '#f97316' }}>Popular Quotes</div>
      <div className="text-base text-neutral-500 mb-2 italic" style={{ whiteSpace: 'pre-line' }}>
        {bookQuotes || 'No quotes found.'}
      </div>
    </div>
  </div>
</BottomSheet>

{/* Fixed Footer CTA — shows Buy/Borrow buttons for the selected book */}
{selectedBook && (
  <div className="fixed bottom-3 left-0 right-0 z-[2000] px-4">
    <div className="max-w-3xl mx-auto">
      <div className="rounded-2xl shadow-lg ring-1 ring-black/5 overflow-hidden bg-white">
        <div className="flex items-center gap-3 px-3 py-2">
          <img
            src={selectedBook.coverImage || '/default-cover.png'}
            alt={selectedBook.title}
            className="w-10 h-14 object-cover rounded-md border border-neutral-200"
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

{/* Buy/Borrow BottomSheet Modal (refreshed, mobile-first) */}
<BottomSheet
  open={showBuyBorrowModal !== null}
  onClose={() => setShowBuyBorrowModal(null)}
>
  {/* ===== BUY CONTENT ===== */}
  {showBuyBorrowModal === 'buy' && (
    <>
      {/* Sticky book header */}
      <div className="sticky top-0 z-20 bg-white/95 backdrop-blur border-b border-neutral-100 px-4 pt-3 pb-2">
        <div className="flex items-center gap-3">
          <img
            src={selectedBook?.coverImage || '/default-cover.png'}
            alt={selectedBook?.title || 'Book'}
            className="w-10 h-14 rounded-md object-cover border border-neutral-200"
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

        {/* Segmented tabs (single Online for now, ready for more) */}
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
          {/* To enable later:
          <button
            className={`flex-1 py-2 rounded-full text-sm font-medium transition-colors ${
              buyTab === 'inStore' ? 'bg-white shadow text-neutral-900' : 'text-neutral-600'
            }`}
            onClick={() => setBuyTab('inStore')}
            aria-pressed={buyTab === 'inStore'}
          >
            In-Store
          </button>
          */}
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
              .sort((a, b) => (a.isDirect === b.isDirect ? 0 : a.isDirect ? -1 : 1)) // direct links first
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
            {/* More merchants will be avaible soon */ }
            {onlineBuyOptions.length === 0 && (
              <div className="col-span-full text-center text-sm text-neutral-500 italic py-6">
                No online purchase options found.
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )}
</BottomSheet>

        </div>
        

     </div>
    </>  
  );
}
