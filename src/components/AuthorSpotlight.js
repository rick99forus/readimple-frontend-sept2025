// filepath: src/components/AuthorSpotlight.js
import React from 'react';
import { useNavigate as useRouterNavigate } from 'react-router-dom';

/**
 * AuthorSpotlight (Mobile-first carousel)
 *
 * Props:
 * - likedBooks: Array<Book>
 * - authorData: Record<authorName, { bio?: string, photo?: string, books?: Book[] }>
 * - navigate: (optional) react-router navigate; if not provided we'll use useNavigate()
 * - onOpenAuthor?: (authorName, authorInfo) => void
 * - fetchAuthorBooks?: async (authorName: string) => Promise<Book[]>
 *
 * Notes:
 * - Shows one author per "slide" on mobile, 2 on md, 3 on lg (responsive).
 * - Lazy loads books for an author (if missing) when their slide comes into view.
 * - No external deps; uses native scroll + scroll-snap + buttons + dots.
 */

function uniq(arr) {
  return Array.from(new Set(arr));
}

function uniqAuthorsFromBooks(books = []) {
  return uniq(
    books
      .map(b => (b.author || '').trim())
      .filter(Boolean)
  );
}

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

/* =============== Tiny utils =============== */
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));
const useDebouncedCallback = (fn, delay = 120) => {
  const ref = React.useRef();
  React.useEffect(() => { ref.current = fn; }, [fn]);
  return React.useMemo(() => {
    let t;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => ref.current?.(...args), delay);
    };
  }, [delay]);
};

/* =============== Core Component =============== */
export default function AuthorSpotlight({
  likedBooks = [],
  authorData = {},
  navigate,
  onOpenAuthor,
  fetchAuthorBooks, // optional async loader per author
}) {
  // Move all hooks to the top!
  const internalNavigate = useRouterNavigate();
  const go = navigate || internalNavigate;

  const authors = uniqAuthorsFromBooks(likedBooks);
  const slides = authors.map(name => ({
    name,
    info: authorData[name] || {},
  }));

  const [activeIdx, setActiveIdx] = React.useState(0);
  const scrollerRef = React.useRef(null);
  const syncActiveFromScroll = useDebouncedCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    const children = Array.from(el.children);
    if (!children.length) return;
    const { scrollLeft } = el;
    let best = 0;
    let bestDelta = Infinity;
    children.forEach((child, i) => {
      const delta = Math.abs(child.offsetLeft - scrollLeft);
      if (delta < bestDelta) {
        bestDelta = delta;
        best = i;
      }
    });
    setActiveIdx(best);
  }, 80);

  // Lazy-load books for author when slide changes
  React.useEffect(() => {
    const curr = slides[activeIdx];
    if (!curr) return;
    const { name, info } = curr;
    const hasBooks = Array.isArray(info.books) && info.books.length > 0;
    if (!hasBooks && typeof fetchAuthorBooks === 'function') {
      fetchAuthorBooks(name).catch(() => {/* no-op */});
    }
  }, [activeIdx, slides, fetchAuthorBooks]);

  // Scroll helpers
  const scrollToIndex = (idx) => {
    const el = scrollerRef.current;
    if (!el) return;
    const children = Array.from(el.children);
    const target = children[idx];
    if (target) {
      target.scrollIntoView({ behavior: 'smooth', inline: 'start', block: 'nearest' });
    }
  };
  const goPrev = () => scrollToIndex(clamp(activeIdx - 1, 0, slides.length - 1));
  const goNext = () => scrollToIndex(clamp(activeIdx + 1, 0, slides.length - 1));
  const onKeyDown = (e) => {
    if (e.key === 'ArrowRight') { e.preventDefault(); goNext(); }
    if (e.key === 'ArrowLeft')  { e.preventDefault(); goPrev(); }
  };

  // Early returns after hooks
  if (!likedBooks.length) return null;
  if (!authors.length) return null;

  return (
    <section aria-labelledby="author-spotlight-heading" className="mt-4">
      <div className="flex items-center justify-between mb-2 px-1">
        <h2 id="author-spotlight-heading" className="text-xl font-extrabold tracking-tight">
          Author Spotlight
        </h2>

        {/* Arrows (hide if only 1 slide) */}
        {slides.length > 1 && (
          <div className="hidden sm:flex items-center gap-2">
            <button
              className="inline-flex items-center justify-center w-8 h-8 rounded-full ring-1 ring-black/10 bg-white hover:bg-neutral-50 focus-visible:ring-2 focus-visible:ring-orange-400"
              aria-label="Previous author"
              onClick={goPrev}
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4">
                <path d="M15 6l-6 6 6 6" className="stroke-current" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
            <button
              className="inline-flex items-center justify-center w-8 h-8 rounded-full ring-1 ring-black/10 bg-white hover:bg-neutral-50 focus-visible:ring-2 focus-visible:ring-orange-400"
              aria-label="Next author"
              onClick={goNext}
            >
              <svg viewBox="0 0 24 24" className="w-4 h-4">
                <path d="M9 6l6 6-6 6" className="stroke-current" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* Carousel (scroll-snap) */}
      <div
        ref={scrollerRef}
        role="region"
        aria-roledescription="carousel"
        aria-label="Author spotlight carousel"
        tabIndex={0}
        onKeyDown={onKeyDown}
        onScroll={syncActiveFromScroll}
        className="
          group/carousel
          grid auto-cols-[80%] sm:auto-cols-[65%] md:auto-cols-[48%] lg:auto-cols-[32%]
          grid-flow-col gap-3
          overflow-x-auto overscroll-x-contain
          snap-x snap-mandatory
          px-1 pb-2
          [-webkit-overflow-scrolling:touch]
          scrollbar-thin scrollbar-thumb-neutral-300 hover:scrollbar-thumb-neutral-400
        "
        style={{ scrollBehavior: 'smooth' }}
      >
        {slides.map(({ name, info }, idx) => {
          const books = Array.isArray(info.books) ? info.books : [];
          const photo = info.photo;
          const bio = typeof info.bio === 'string' ? info.bio : '';

          return (
            <article
              key={name || idx}
              className="
                snap-start
                rounded-2xl ring-1 ring-black/5 bg-white shadow-sm overflow-hidden
                focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400
              "
              aria-roledescription="slide"
              aria-label={`${name || 'Author'} (${idx + 1} of ${slides.length})`}
            >
              {/* Header */}
              <div className="border-b border-black/5">
                <div className="flex items-center justify-between p-3 sm:p-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-11 h-11 rounded-xl bg-neutral-100 flex items-center justify-center overflow-hidden text-neutral-400 shrink-0">
                      {photo ? (
                        <img
                          src={photo}
                          alt={name || 'Author'}
                          className="w-11 h-11 object-cover"
                          onError={(e) => { e.currentTarget.src = '/avatar-fallback.png'; }}
                        />
                      ) : (
                        <span className="text-base font-bold">
                          {(name?.[0] || 'A').toUpperCase()}
                        </span>
                      )}
                    </span>
                    <h3
                      className="text-sm sm:text-base font-extrabold tracking-tight text-neutral-900 truncate"
                      title={name || 'Author'}
                    >
                      {name || 'Author'}
                    </h3>
                  </div>

                  <button
                    className="shrink-0 inline-flex items-center gap-1 rounded-full bg-white px-3 py-1.5 text-xs font-semibold text-orange-700 ring-1 ring-orange-200 hover:bg-orange-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
                    onClick={() =>
                      (typeof onOpenAuthor === 'function'
                        ? onOpenAuthor(name, info)
                        : go(`/author/${encodeURIComponent(name)}`))
                    }
                    aria-label={`See all books by ${name}`}
                    title="See all"
                  >
                    See all
                    <svg viewBox="0 0 24 24" className="w-3.5 h-3.5">
                      <path d="M9 6l6 6-6 6" className="stroke-current" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>
                </div>
              </div>

              {/* Bio */}
              <div className="px-3 pt-3">
                <ExpandableBio text={bio} lines={2} />
              </div>

              {/* Books row (mini scroller) */}
              <div className="mt-3 pb-3">
                <div
                  className="
                    flex gap-3 overflow-x-auto scroll-px-3 px-3 snap-x snap-mandatory
                    [-webkit-overflow-scrolling:touch]
                  "
                  aria-label={`Books by ${name || 'author'}`}
                >
                  {books.slice(0, 12).map((book, bIdx) => (
                    <button
                      key={book.id || `${name}-${bIdx}`}
                      onClick={() => go('/discover', { state: { book } })}
                      className="
                        group relative snap-start flex-shrink-0 w-32
                        rounded-2xl overflow-hidden ring-1 ring-black/5 bg-neutral-200 shadow-md
                        focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-300
                      "
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

                      <div className="pointer-events-none absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-white/10 to-transparent" />
                    </button>
                  ))}

                  {(!books || books.length === 0) && (
                    <div className="text-neutral-400 text-xs py-6 px-3">
                      {typeof fetchAuthorBooks === 'function'
                        ? 'Loading books…'
                        : 'No books found for this author.'}
                    </div>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {/* Pagination dots (mobile visible) */}
      {slides.length > 1 && (
        <div className="mt-2 flex items-center justify-center gap-1.5 sm:gap-2">
          {slides.map((_, i) => (
            <button
              key={i}
              aria-label={`Go to author ${i + 1}`}
              onClick={() => scrollToIndex(i)}
              className={`
                h-2 rounded-full transition-all
                ${i === activeIdx ? 'bg-orange-600 w-6' : 'bg-neutral-300 w-2 hover:bg-neutral-400'}
              `}
            />
          ))}
        </div>
      )}
    </section>
  );
}
