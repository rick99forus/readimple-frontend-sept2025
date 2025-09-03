// filepath: src/components/AdvancedSearch.js
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { apiCall } from '../utils/api';
import debounce from 'lodash.debounce'; // npm install lodash.debounce

const SEARCH_SUGGESTIONS = [
  'harry potter',
  'stephen king',
  'fantasy novels',
  'sci-fi classics',
  'bestsellers 2024',
  'mystery thriller',
  'historical fiction',
  'young adult'
];

const SEARCH_FILTERS = {
  genre: ['Fiction', 'Fantasy', 'Mystery', 'Romance', 'Science Fiction', 'Biography', 'History'],
  year: ['2024', '2023', '2022', '2021', '2020', '2019', '2018'],
  rating: ['4+ Stars', '3+ Stars', '2+ Stars']
};

export default function AdvancedSearch({ onBookSelect, onClose }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [selectedFilters, setSelectedFilters] = useState({});
  const [searchStats, setSearchStats] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [searchHistory, setSearchHistory] = useState([]);

  const inputRef = useRef();

  // Load search history & focus input
  useEffect(() => {
    const history = JSON.parse(localStorage.getItem('searchHistory') || '[]');
    setSearchHistory(history.slice(0, 5));
    inputRef.current?.focus();
  }, []);

  // Core search (non-debounced)
  const runSearch = useCallback(
    async (searchQuery, filters) => {
      if (!searchQuery?.trim()) {
        setResults([]);
        setSearchStats(null);
        setLoading(false);
        return;
      }
      try {
        const startTime = Date.now();
        const response = await apiCall('/api/books/advanced-search', {
          method: 'GET',
          params: { q: searchQuery, ...filters, limit: 25 }
        });
        const searchTime = Date.now() - startTime;

        setResults(response?.data?.results || []);
        setSearchStats({
          total: response?.data?.total || 0,
          searchTime,
          query: searchQuery
        });
        saveToSearchHistory(searchQuery);
      } catch (error) {
        console.error('Search error:', error);
        setResults([]);
        setSearchStats(null);
      } finally {
        setLoading(false);
      }
    },
    []
  );

  // Debounced wrapper
  const debouncedSearch = useCallback(debounce(runSearch, 500), [runSearch]);

  // Input change
  const handleSearchChange = (e) => {
    const value = e.target.value;
    setQuery(value);

    // Suggestions
    if (value.length >= 1) {
      const filtered = SEARCH_SUGGESTIONS.filter(s =>
        s.toLowerCase().includes(value.toLowerCase())
      );
      setSuggestions(filtered.slice(0, 5));
    } else {
      setSuggestions([]);
    }

    // Results
    if (value.trim().length >= 2) {
      setLoading(true);
      debouncedSearch(value, selectedFilters);
    } else {
      setResults([]);
      setLoading(false);
      setSearchStats(null);
    }
  };

  // Enter => immediate search
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      setLoading(true);
      debouncedSearch.cancel?.();
      runSearch(query, selectedFilters);
    }
    if (e.key === 'Escape') onClose?.();
  };

  // Save search to history
  const saveToSearchHistory = (searchQuery) => {
    const history = JSON.parse(localStorage.getItem('searchHistory') || '[]');
    const newHistory = [searchQuery, ...history.filter(h => h !== searchQuery)].slice(0, 10);
    localStorage.setItem('searchHistory', JSON.stringify(newHistory));
    setSearchHistory(newHistory.slice(0, 5));
  };

  // Toggle a single-select filter
  const handleFilterChange = (filterType, value) => {
    const next = { ...selectedFilters };
    if (next[filterType] === value) delete next[filterType];
    else next[filterType] = value;
    setSelectedFilters(next);

    if (query.trim()) {
      setLoading(true);
      debouncedSearch(query, next);
    }
  };

  // Suggestion / history click => immediate search
  const handleSuggestionClick = (text) => {
    setQuery(text);
    setSuggestions([]);
    setLoading(true);
    debouncedSearch.cancel?.();
    runSearch(text, selectedFilters);
  };

  // Clear search
  const clearSearch = () => {
    setQuery('');
    setResults([]);
    setSuggestions([]);
    setSearchStats(null);
    setSelectedFilters({});
    inputRef.current?.focus();
  };

  // Highlight term
  const highlightText = (text, term) => {
    if (!term || !text) return text;
    const safe = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${safe})`, 'gi');
    return text.replace(regex, '<mark class="bg-orange-200 text-orange-900 rounded px-0.5">$1</mark>');
  };

  return (
    <div
      className="fixed inset-0 z-40 flex items-start justify-center pt-[62px] bg-black/50 backdrop-blur-sm"
      onClick={(e) => {
        // close on backdrop click
        if (e.target === e.currentTarget) onClose?.();
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Advanced book search"
    >
      <div className="bg-white/90 supports-[backdrop-filter]:bg-white/80 backdrop-blur rounded-2xl shadow-2xl ring-1 ring-black/5 w-full max-w-5xl max-h-[calc(100vh-72px)] overflow-hidden mx-4">
        {/* Header */}
        <div className="p-4 border-b border-neutral-200">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl text-white bg-gradient-to-br from-amber-400 to-orange-500 ring-1 ring-white/20 shadow">
                {/* search icon */}
                <svg viewBox="0 0 24 24" className="w-4.5 h-4.5 text-white/90" aria-hidden="true">
                  <path d="M21 21l-4.35-4.35M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z"
                        className="stroke-current" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <h2 className="text-lg md:text-xl font-extrabold tracking-tight text-neutral-900">
                Search Books Globally
              </h2>
            </div>
            <button
              onClick={onClose}
              className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-white text-neutral-700 border border-neutral-200 hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-orange-300"
              aria-label="Close search"
              title="Close"
            >
              <svg viewBox="0 0 24 24" className="w-5 h-5"><path d="M6 6l12 12M18 6l-12 12" className="stroke-current" strokeWidth="2" fill="none" strokeLinecap="round"/></svg>
            </button>
          </div>

          {/* Search bar */}
          <div className="relative">
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={handleSearchChange}
              onKeyDown={handleKeyDown}
              placeholder="Search millions of books worldwide…"
              className="w-full px-4 py-3 pl-11 pr-28 text-[15px] border-2 border-neutral-200 rounded-xl focus:border-orange-400 focus:outline-none transition-colors"
              aria-label="Search input"
            />
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-neutral-400" viewBox="0 0 24 24" aria-hidden="true">
              <path d="M21 21l-4.35-4.35M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z"
                    className="stroke-current" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>

            {/* Right actions */}
            <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
              <button
                onClick={() => setShowFilters(v => !v)}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-neutral-100 text-neutral-800 hover:bg-neutral-200 ring-1 ring-black/5"
                aria-pressed={showFilters}
              >
                <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M3 4h18M6 12h12M10 20h4" className="stroke-current" strokeWidth="2" fill="none" strokeLinecap="round"/>
                </svg>
                Filters
                {Object.keys(selectedFilters).length > 0 && (
                  <span className="ml-1 inline-flex items-center justify-center min-w-[18px] h-[18px] text-[10px] rounded-full bg-orange-500 text-white px-1">
                    {Object.keys(selectedFilters).length}
                  </span>
                )}
              </button>
              {query && (
                <button
                  onClick={clearSearch}
                  className="inline-flex items-center px-2.5 py-1.5 rounded-lg text-xs font-semibold text-orange-600 hover:text-orange-700 bg-orange-50 hover:bg-orange-100 ring-1 ring-orange-200"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Suggestions / History */}
          {(suggestions.length > 0 || searchHistory.length > 0) && !loading && results.length === 0 && (
            <div className="mt-3 space-y-3">
              {suggestions.length > 0 && (
                <div>
                  <div className="text-xs text-neutral-500 mb-1">Suggestions</div>
                  <div className="flex flex-wrap gap-2">
                    {suggestions.map((s, i) => (
                      <button
                        key={`s-${i}`}
                        onClick={() => handleSuggestionClick(s)}
                        className="px-3 py-1.5 text-xs rounded-full bg-orange-100 text-orange-700 hover:bg-orange-200 transition"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {searchHistory.length > 0 && (
                <div>
                  <div className="text-xs text-neutral-500 mb-1">Recent searches</div>
                  <div className="flex flex-wrap gap-2">
                    {searchHistory.map((h, i) => (
                      <button
                        key={`h-${i}`}
                        onClick={() => handleSuggestionClick(h)}
                        className="px-3 py-1.5 text-xs rounded-full bg-neutral-100 text-neutral-700 hover:bg-neutral-200 transition"
                      >
                        {h}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Stats */}
          {searchStats && (
            <div className="mt-3 text-xs text-neutral-500 flex items-center justify-between">
              <span>{searchStats.total} results for “{searchStats.query}”</span>
              <span>{searchStats.searchTime} ms</span>
            </div>
          )}
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="p-4 bg-neutral-50 border-b border-neutral-200">
            <div className="grid gap-4 sm:grid-cols-2">
              {Object.entries(SEARCH_FILTERS).map(([type, options]) => (
                <div key={type}>
                  <div className="text-xs font-semibold text-neutral-700 mb-2 uppercase tracking-wide">{type}</div>
                  <div className="flex flex-wrap gap-2">
                    {options.map(option => {
                      const active = selectedFilters[type] === option;
                      return (
                        <button
                          key={option}
                          onClick={() => handleFilterChange(type, option)}
                          className={`px-3 py-1.5 text-xs rounded-full ring-1 transition
                            ${active
                              ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white ring-white/10'
                              : 'bg-white text-neutral-800 ring-black/10 hover:bg-neutral-50'}`}
                        >
                          {option}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="p-8 text-center">
            <div className="relative inline-flex">
              <div className="w-9 h-9 rounded-full border-4 border-orange-200 border-t-orange-500 animate-spin" />
            </div>
            <p className="text-neutral-600 mt-3 text-sm">Searching worldwide book databases…</p>
          </div>
        )}

        {/* Results */}
        <div className="flex-1 overflow-y-auto max-h-[60vh]">
          {results.length > 0 ? (
            <div className="p-4">
              {/* Grid of modern tiles (matches your BookRow/ContinueRow vibe) */}
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                {results.map((book, i) => (
                  <button
                    key={book.id || i}
                    onClick={() => onBookSelect?.(book)}
                    className="group block w-full text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-300 rounded-2xl"
                    title={`${book.title}${book.author ? ' — ' + book.author : ''}`}
                    aria-label={`Open ${book.title} by ${book.author || 'Unknown'}`}
                  >
                    <div
                      className="relative w-full rounded-2xl overflow-hidden shadow-md ring-1 ring-black/5 bg-neutral-200"
                      style={{ paddingTop: '150%' }} // 2:3 aspect
                    >
                      {/* Cover */}
                      <img
                        src={book.coverImage || '/placeholder-cover.png'}
                        alt={book.title}
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                        onError={(e) => { e.currentTarget.src = '/placeholder-cover.png'; }}
                        loading="lazy"
                      />

                      {/* Gradient title band */}
                      <div className="absolute inset-x-0 bottom-0 p-2 pt-10 bg-gradient-to-t from-black/75 via-black/30 to-transparent">
                        <h3
                          className="text-white text-[13px] font-semibold leading-tight line-clamp-2"
                          dangerouslySetInnerHTML={{ __html: highlightText(book.title, query) }}
                        />
                        {book.author && (
                          <p
                            className="text-white/80 text-[11px] line-clamp-1"
                            dangerouslySetInnerHTML={{ __html: highlightText(book.author, query) }}
                          />
                        )}
                      </div>

                      {/* sheen */}
                      <div className="pointer-events-none absolute inset-x-0 top-0 h-10 bg-gradient-to-b from-white/10 to-transparent" />
                    </div>

                    {/* Meta row */}
                    <div className="mt-2 text-[11px] text-neutral-600 space-y-0.5">
                      <div className="flex gap-2 flex-wrap">
                        {book.publishedDate && <span className="px-2 py-0.5 rounded-full bg-neutral-100 ring-1 ring-black/5">Published: {book.publishedDate}</span>}
                        {book.pageCount && <span className="px-2 py-0.5 rounded-full bg-neutral-100 ring-1 ring-black/5">{book.pageCount} pages</span>}
                        {Array.isArray(book.categories) && book.categories.length > 0 && (
                          <span className="px-2 py-0.5 rounded-full bg-orange-100 text-orange-700 ring-1 ring-orange-200">
                            {book.categories[0]}
                          </span>
                        )}
                      </div>

                      {/* Source & confidence */}
                      <div className="flex items-center justify-between mt-1">
                        <span className="text-[10px] text-neutral-400 capitalize">
                          Source: {book.source?.replace('_', ' ')}
                        </span>
                        {typeof book.confidence === 'number' && (
                          <div className="flex items-center gap-1">
                            <span className="text-[10px] text-neutral-400">Relevance</span>
                            <div className="w-14 h-1.5 bg-neutral-200 rounded-full overflow-hidden">
                              <div className="h-full bg-orange-500 rounded-full" style={{ width: `${book.confidence * 100}%` }} />
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            !loading && query && (
              <div className="p-10 text-center text-neutral-500">
                <svg className="w-14 h-14 mx-auto mb-3 text-neutral-300" viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6-4h6m2 5.291A7.962 7.962 0 0112 15c-2.34 0-4.29-1.2-5.5-3"
                        className="stroke-current" strokeWidth="1.8" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
                <h3 className="text-base font-semibold mb-1">No books found</h3>
                <p className="text-sm">Try adjusting your search terms or removing some filters.</p>
              </div>
            )
          )}
        </div>
      </div>
    </div>
  );
}
