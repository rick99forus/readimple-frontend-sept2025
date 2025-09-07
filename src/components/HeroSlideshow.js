import React, { useEffect, useState, useCallback, useRef } from 'react';
import { apiCall } from '../utils/api';

const GENRE_GRADIENTS = {
  fiction: 'linear-gradient(210deg, #fffbe6 40%, #ffffff 100%)',
  fantasy: 'linear-gradient(210deg, #f3e8ff 40%, #ffffff 100%)',
  'sci-fi': 'linear-gradient(210deg, #e0f2fe 40%, #ffffff 100%)',
  romance: 'linear-gradient(210deg, #fce7f3 40%, #ffffff 100%)',
  mystery: 'linear-gradient(210deg, #f1f5f9 40%, #ffffff 100%)',
  biography: 'linear-gradient(210deg, #d1fae5 40%, #ffffff 100%)',
  thriller: 'linear-gradient(210deg, #fee2e2 40%, #ffffff 100%)',
  'self-help': 'linear-gradient(210deg, #f0f9ff 40%, #ffffff 100%)',
  history: 'linear-gradient(210deg, #fef9c3 40%, #ffffff 100%)',
  science: 'linear-gradient(210deg, #e0f2fe 40%, #ffffff 100%)',
  horror: 'linear-gradient(210deg, #fee2e2 40%, #ffffff 100%)',
  adventure: 'linear-gradient(210deg, #fef3c7 40%, #ffffff 100%)',
  classic: 'linear-gradient(210deg, #f1f5f9 40%, #ffffff 100%)',
  poetry: 'linear-gradient(210deg, #f0fdf4 40%, #ffffff 100%)',
  children: 'linear-gradient(210deg, #ecfdf5 40%, #ffffff 100%)',
  education: 'linear-gradient(210deg, #fef3c7 40%, #ffffff 100%)',
  health: 'linear-gradient(210deg, #ecfdf5 40%, #ffffff 100%)',
  cookbook: 'linear-gradient(210deg, #fef3c7 40%, #ffffff 100%)',
  'graphic novel': 'linear-gradient(210deg, #f3e8ff 40%, #ffffff 100%)',
  psychology: 'linear-gradient(210deg, #f0fdf4 40%, #ffffff 100%)',
  philosophy: 'linear-gradient(210deg, #fef9c3 40%, #ffffff 100%)',
  spirituality: 'linear-gradient(210deg, #f3e8ff 40%, #ffffff 100%)',
  crime: 'linear-gradient(210deg, #fee2e2 40%, #ffffff 100%)',
  dystopian: 'linear-gradient(210deg, #f1f5f9 40%, #ffffff 100%)',
  default: 'linear-gradient(210deg, #f8fafc 40%, #ffffff 100%)',
};

const AUTO_MS = 8000;

const HeroSlideshow = ({ onBookClick }) => {
  const [books, setBooks] = useState([]);
  const [current, setCurrent] = useState(0);
  const [loading, setLoading] = useState(true);
  // eslint-disable-next-line
  const [userGenres, setUserGenres] = useState([]);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [apiError, setApiError] = useState(null);

  // UX: auto-advance progress + pause
  const [progress, setProgress] = useState(0);
  const pausedRef = useRef(false);
  const rafRef = useRef(null);
  const startTsRef = useRef(0);

  // Touch/swipe
  const touchStartX = useRef(0);
  const touchDeltaX = useRef(0);

  // Prefetch next/prev images
  const prefetch = useCallback((src) => {
    if (!src) return;
    const img = new Image();
    img.src = src;
  }, []);

  useEffect(() => {
    const fetchHeroBooks = async () => {
      try {
        setLoading(true);
        setApiError(null);

        // Choose up to 5 genres (profile, URL, fallback)
        let genresToUse = ['fiction', 'fantasy', 'mystery', 'romance', 'biography'];
        try {
          const preferred = JSON.parse(localStorage.getItem('preferredGenres') || '[]');
          if (preferred.length >= 3) {
            genresToUse = preferred.slice(0, 5);
          } else {
            const params = new URLSearchParams(window.location.search);
            const urlGenres = params.get('genres');
            if (urlGenres) genresToUse = urlGenres.split(',').slice(0, 5);
          }
        } catch {}

        setUserGenres(genresToUse);

        const response = await apiCall('/api/books/hero-slideshow', {
          method: 'GET',
          params: { genres: genresToUse.map(g => g.toLowerCase()).join(',') },
          timeout: 15000,
        });

        const heroBooks = response?.data?.items || [];
        const validBooks = heroBooks.filter(b =>
          b?.coverImage &&
          b.coverImage.includes('books.google.com') &&
          !b.coverImage.includes('no-img') &&
          b?.title && b?.author
        );

        setBooks(validBooks);
        setCurrent(0);
      } catch (error) {
        setApiError('API did not return valid JSON. Check backend server and API URL.');
        setBooks([]);
      } finally {
        setLoading(false);
      }
    };
    fetchHeroBooks();
  }, []);

  // Auto-advance with progress bar
  const startTicker = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    startTsRef.current = performance.now();
    setProgress(0);

    const tick = (ts) => {
      if (pausedRef.current) {
        startTsRef.current = ts - (progress / 100) * AUTO_MS;
      } else {
        const elapsed = ts - startTsRef.current;
        const pct = Math.min(100, (elapsed / AUTO_MS) * 100);
        setProgress(pct);
        if (pct >= 100) {
          // go next
          setProgress(0);
          setTimeout(() => navigateToSlide((current + 1) % Math.max(1, books.length)), 0);
          return;
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    // eslint-disable-next-line
  }, [books.length, current, progress]);

  useEffect(() => {
    if (books.length <= 1) return;
    startTicker();
    return () => cancelAnimationFrame(rafRef.current);
  }, [books.length, current, startTicker]);

  // Pause on hover/focus
  const setPaused = (v) => {
    pausedRef.current = v;
  };

  // Keyboard navigation
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'ArrowLeft') navigateToSlide((current - 1 + books.length) % Math.max(1, books.length));
      if (e.key === 'ArrowRight') navigateToSlide((current + 1) % Math.max(1, books.length));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line
  }, [books.length, current]);

  // Swipe gestures
  const onTouchStart = (e) => {
    setPaused(true);
    touchStartX.current = e.touches[0].clientX;
    touchDeltaX.current = 0;
  };
  const onTouchMove = (e) => {
    touchDeltaX.current = e.touches[0].clientX - touchStartX.current;
  };
  const onTouchEnd = () => {
    const dx = touchDeltaX.current;
    setPaused(false);
    if (Math.abs(dx) > 40) {
      if (dx > 0) navigateToSlide((current - 1 + books.length) % Math.max(1, books.length));
      else navigateToSlide((current + 1) % Math.max(1, books.length));
    }
    touchStartX.current = 0;
    touchDeltaX.current = 0;
  };

  const navigateToSlide = useCallback((newIndex) => {
    if (isTransitioning || newIndex === current) return;
    setIsTransitioning(true);
    // small delay to let the scale/blur animate
    setTimeout(() => {
      setCurrent(newIndex);
      // prefetch neighbors
      const nextIdx = (newIndex + 1) % Math.max(1, books.length);
      const prevIdx = (newIndex - 1 + books.length) % Math.max(1, books.length);
      prefetch(books[nextIdx]?.coverImage);
      prefetch(books[prevIdx]?.coverImage);
      setTimeout(() => setIsTransitioning(false), 120);
    }, 150);
  }, [isTransitioning, current, books, prefetch]);

  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'preferredGenres') window.location.reload();
    };
    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64 w-full bg-white text-black rounded-lg">
        <div className="text-gray-500 text-lg font-semibold">Your new reads are coming...</div>
      </div>
    );
  }

  if (apiError) {
    return (
      <div className="flex flex-col items-center justify-center h-64 w-full bg-white text-black rounded-lg">
        <div className="text-red-500 text-lg font-semibold mb-2">{apiError}</div>
        <div className="text-gray-400 text-sm">Please ensure the backend server is running and reachable.</div>
      </div>
    );
  }

  if (books.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 w-full bg-white text-black rounded-lg">
        <div className="text-gray-500 text-lg font-semibold mb-2">No books found for your preferences</div>
        <div className="text-gray-400 text-sm">Try updating your preferred genres in Profile</div>
      </div>
    );
  }

  const book = books[current];
  const genre = (book._genre || book.genres?.[0] || 'default').toLowerCase();
  const bgGradient = GENRE_GRADIENTS[genre] || GENRE_GRADIENTS.default;

  return (
    // eslint-disable-next-line
    <section
      role="region"
      aria-roledescription="carousel"
      aria-label="Featured books"
      aria-live="polite"
      className="relative w-full overflow-hidden rounded-lg"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      <div
        className="home-hero-slideshow w-full overflow-hidden relative py-4 flex text-center items-center justify-center"
        style={{
          background: bgGradient,
          minHeight: '16rem',
          color: '#222',
          transition: 'all 0.6s cubic-bezier(0.4, 0, 0.2, 1)',
          transform: isTransitioning ? 'scale(0.985)' : 'scale(1)',
          opacity: isTransitioning ? 0.92 : 1,
        }}
        onClick={() => onBookClick?.(book)}
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* Prev */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            navigateToSlide((current - 1 + books.length) % books.length);
          }}
          disabled={isTransitioning}
          className={`absolute left-2 top-1/2 -translate-y-1/2 bg-white/50 hover:bg-white/70 text-black w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center shadow-lg z-20 transition-all duration-300 ${isTransitioning ? 'opacity-50 cursor-not-allowed' : 'hover:scale-110'}`}
          aria-label="Previous"
        >
          <svg viewBox="0 0 24 24" className="w-6 h-6" aria-hidden="true"><path d="M15 6l-6 6 6 6" className="stroke-current" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>

        {/* Cover */}
        <div className="flex justify-center items-start pl-6 md:pl-8 py-4 md:py-0 select-none">
          <div className="relative">
            {/* subtle halo */}
            <div className="absolute -inset-2 rounded-xl bg-black/5 blur-xl" />
            <img
              src={book.coverImage}
              alt={book.title}
              className="min-w-28 min-h-40 max-w-28 max-h-40 md:min-w-52 md:min-h-72 md:max-w-52 md:max-h-72 object-cover rounded-lg shadow-xl transition-all duration-500"
              style={{ filter: isTransitioning ? 'blur(1px) brightness(0.92)' : 'blur(0px) brightness(1)' }}
              onError={(e) => { e.currentTarget.src = '/fallback-cover.png'; }}
              draggable="false"
            />
            {/* top sheen */}
            <div className="pointer-events-none absolute inset-x-0 top-0 h-12 bg-gradient-to-b from-white/10 to-transparent rounded-lg" />
          </div>
        </div>

        {/* Info */}
        <div className="flex flex-col justify-center items-center md:items-start px-2 md:px-8 py-2 md:py-0">
          <h2 className="text-xl md:text-2xl font-extrabold line-clamp-2 mb-1 md:mb-2 max-w-[78vw] md:max-w-[40vw]">
            {book.title}
          </h2>
          <p className="text-gray-600 text-sm md:text-base mb-2 font-medium line-clamp-1 max-w-[78vw] md:max-w-[40vw]">
            by {book.author}
          </p>
          <div className="flex items-center justify-center md:justify-start">
            <span className="inline-flex items-center gap-2 bg-white/60 text-black px-3 py-1.5 rounded-full text-xs md:text-sm font-semibold capitalize ring-1 ring-black/5">
              {/* tiny book icon */}
              <svg viewBox="0 0 24 24" className="w-4 h-4" aria-hidden="true">
                <path d="M12 6c-2.2-1.2-4.6-1.2-7 0v11.5c2.4-1.2 4.8-1.2 7 0m0-11.5c2.2-1.2 4.6-1.2 7 0v11.5c-2.4-1.2-4.8-1.2-7 0" className="stroke-current" strokeWidth="1.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {genre}
            </span>
          </div>
        </div>

        {/* Next */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            navigateToSlide((current + 1) % books.length);
          }}
          disabled={isTransitioning}
          className={`absolute right-2 top-1/2 -translate-y-1/2 bg-white/50 hover:bg-white/70 text-black w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center shadow-lg z-20 transition-all duration-300 ${isTransitioning ? 'opacity-50 cursor-not-allowed' : 'hover:scale-110'}`}
          aria-label="Next"
        >
          <svg viewBox="0 0 24 24" className="w-6 h-6" aria-hidden="true"><path d="M9 6l6 6-6 6" className="stroke-current" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/></svg>
        </button>

        {/* Dots */}
        {books.length > 1 && (
          <div
            className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2 rounded-full bg-white/50 backdrop-blur px-2 py-1 ring-1 ring-black/5"
            style={{ transition: 'all 0.3s', opacity: isTransitioning ? 0.7 : 1 }}
          >
            {books.map((b, i) => {
              const active = i === current;
              return (
                <button
                  key={`${b.id}-dot`}
                  onClick={(e) => { e.stopPropagation(); navigateToSlide(i); }}
                  className={`h-2 rounded-full transition-all ${active ? 'w-6 bg-gray-700' : 'w-2 bg-white hover:w-4'} ring-1 ring-black/5`}
                  aria-label={`Go to slide ${i + 1}: ${b.title}`}
                />
              );
            })}
          </div>
        )}

        {/* Auto progress bar */}
        {books.length > 1 && (
          <div className="absolute left-0 right-0 bottom-0 h-1 bg-black/5">
            <div
              className="h-full bg-gray-700 transition-[width] duration-100 ease-linear"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}

        {/* Screen reader announcement */}
        <span className="sr-only" aria-live="polite">
          Slide {current + 1} of {books.length}: {book.title} by {book.author}
        </span>
      </div>
    </section>
  );
};

export default HeroSlideshow;
