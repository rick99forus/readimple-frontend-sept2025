import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiCall } from '../utils/api'; // Use dynamic API
import { AVATARS, BORDER_STYLES } from '../constants/avatars'; // Import avatar constants
import AdvancedSearch from './AdvancedSearch';

const GENRES = [
  'Fiction', 'Fantasy', 'History', 'Science', 'Romance', 'Mystery',
  'Biography', 'Horror', 'Adventure', 'Poetry'
];

const filterUniqueBooks = (books, excludeIds = new Set()) => {
  const seen = new Set(excludeIds);
  return books.filter(book => book.coverImage && !seen.has(book.id) && seen.add(book.id));
};

function highlightMatch(text, query) {
  if (!query) return text;
  const regex = new RegExp(`(${query})`, 'ig');
  return text.replace(regex, '<mark>$1</mark>');
}

const getPreferredGenres = () => JSON.parse(localStorage.getItem('preferredGenres') || '[]');

// NEW: Helper function to get user profile for avatar display
const getUserProfile = () => {
  try {
    return JSON.parse(localStorage.getItem('profile') || '{}');
  } catch {
    return {};
  }
};

const Header = () => {
  const [searchInput, setSearchInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [suggestedRow, setSuggestedRow] = useState([]);
  const [randomColumn, setRandomColumn] = useState([]);
  const [searchResults, setSearchResults] = useState([]);
  const [genreRows, setGenreRows] = useState([]);
  const [showResults, setShowResults] = useState(false);
  const [showSearchOverlay, setShowSearchOverlay] = useState(false);
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);
  
  // NEW: State for profile avatar
  const [userProfile, setUserProfile] = useState(getUserProfile());
  
  const debounceRef = useRef();
  const navigate = useNavigate();

  // NEW: Listen for profile changes
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'profile') {
        setUserProfile(getUserProfile());
      }
    };

    const handleProfileUpdate = () => {
      setUserProfile(getUserProfile());
    };

    // Listen for localStorage changes from other tabs
    window.addEventListener('storage', handleStorageChange);
    
    // Listen for focus events to catch same-tab changes
    window.addEventListener('focus', handleProfileUpdate);
    
    // Custom event for profile updates within the same tab
    window.addEventListener('profileUpdated', handleProfileUpdate);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('focus', handleProfileUpdate);
      window.removeEventListener('profileUpdated', handleProfileUpdate);
    };
  }, []);

  useEffect(() => {
    if (showSearchOverlay) fetchInitialBooks();
  }, [showSearchOverlay]);

  useEffect(() => {
    if (!showSearchOverlay) return;
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') setShowSearchOverlay(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showSearchOverlay]);

  const fetchInitialBooks = async () => {
    try {
      const sugg = await apiCall('/api/books/hero-slideshow', { method: 'GET' });
      let rowBooks = sugg.data.items || [];
      rowBooks = rowBooks.sort(() => Math.random() - 0.5);
      setSuggestedRow(rowBooks.slice(0, 8));

      const rand = await apiCall('/api/books/new-releases', { method: 'GET' });
      let colBooks = rand.data.items || [];
      colBooks = colBooks.sort(() => Math.random() - 0.5);
      const excludeIds = new Set(rowBooks.slice(0, 8).map(b => b.id));
      setRandomColumn(filterUniqueBooks(colBooks, excludeIds).slice(0, 12));
    } catch {
      setSuggestedRow([]);
      setRandomColumn([]);
    }
  };

  const fetchGenreRows = async () => {
    try {
      const genresToShow = GENRES.slice(0, 3);
      const rows = await Promise.all(
        genresToShow.map(async genre => {
          const res = await apiCall(`/api/books/genre/${genre.toLowerCase()}`, { method: 'GET' });
          let books = res.data.items || [];
          books = books.sort(() => Math.random() - 0.5);
          const excludeIds = new Set(searchResults.map(b => b.id));
          return {
            genre,
            books: filterUniqueBooks(books, excludeIds).slice(0, 8)
          };
        })
      );
      setGenreRows(rows);
    } catch {
      setGenreRows([]);
    }
  };

  const handleSearchChange = (e) => {
    const value = e.target.value;
    setSearchInput(value);
    setShowResults(false);
    setLoading(false);
    clearTimeout(debounceRef.current);

    if (!value) {
      setShowResults(false);
      setSearchResults([]);
      setLoading(false);
      fetchInitialBooks();
      return;
    }

    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await apiCall(`/api/books/search?q=${encodeURIComponent(value)}`, { method: 'GET' });
        let results = [];
        if (res.data.results) {
          results = Object.values(res.data.results)
            .flat()
            .filter(book => book.title && book.author && book.coverImage);
        }
        const preferredGenres = getPreferredGenres();
        if (preferredGenres.length >= 3) {
          results = results.filter(book => book.genres?.some(g => preferredGenres.includes(g)));
        }
        results = results.sort(() => Math.random() - 0.5);
        setSearchResults(filterUniqueBooks(results).slice(0, 10));
        setShowResults(true);
        setLoading(false);
        fetchGenreRows();
      } catch {
        setSearchResults([]);
        setShowResults(true);
        setLoading(false);
        setGenreRows([]);
      }
    }, 800);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
  };

  const handleSearchBookClick = (book) => {
    setShowSearchOverlay(false);
    navigate('/discover', {
      state: { book }
    });
  };

  // NEW: Handle profile icon click
  const handleProfileClick = () => {
    navigate('/profile');
  };

  // NEW: Handle advanced search click
  const handleSearchClick = () => {
    setShowAdvancedSearch(true);
  };

  // NEW: Get user's selected avatar with fallback
  const getUserAvatar = () => {
    if (userProfile.avatarId) {
      const selectedAvatar = AVATARS.find(avatar => avatar.id === userProfile.avatarId);
      if (selectedAvatar) {
        return selectedAvatar;
      }
    }
    // Fallback to default avatar
    return AVATARS[0];
  };

  // NEW: Get user's border style with fallback
  const getUserAvatarStyle = () => {
    const selectedAvatar = getUserAvatar(); // Use the avatar here
    const borderStyle = BORDER_STYLES.find(style => style.name === userProfile.avatarBorderStyle) || BORDER_STYLES[0];
    const borderColor = userProfile.avatarBorderColor || '#fb923c';
    
    return {
      ...borderStyle.style,
      borderColor: borderColor,
      className: borderStyle.className
    };
  };

  const renderLoading = () => (
    <div className="flex justify-center items-center mt-2 mb-2">
      <div className="w-4 h-4 bg-orange-400 rounded-full animate-bounce"></div>
    </div>
  );

  const renderRowCarousel = (books) => {
    const uniqueBooks = filterUniqueBooks(books);
    return (
      <div className="w-full overflow-x-auto flex space-x-3 pb-2 scrollbar-hide">
        {uniqueBooks.map((book, idx) => (
          <div
            key={book.id}
            className="flex-shrink-0 w-20 cursor-pointer"
            onClick={() => handleSearchBookClick(book)}
          >
            <img src={book.coverImage} alt={book.title} className="w-20 h-28 object-cover rounded shadow" />
            <div
              className="font-bold text-black truncate"
              dangerouslySetInnerHTML={{ __html: highlightMatch(book.title, searchInput) }}
            />
          </div>
        ))}
      </div>
    );
  };

  const renderColumn = (books) => {
    const uniqueBooks = filterUniqueBooks(books);
    return (
      <div className="w-full flex flex-col gap-3">
        {uniqueBooks.map((book, idx) => (
          <div
            key={book.id}
            className="flex items-center gap-3 cursor-pointer hover:bg-neutral-100 rounded p-2 transition"
            onClick={() => handleSearchBookClick(book)}
          >
            <img src={book.coverImage} alt={book.title} className="w-12 h-16 object-cover rounded shadow" />
            <div>
              <div
                className="font-bold text-black truncate"
                dangerouslySetInnerHTML={{ __html: highlightMatch(book.title, searchInput) }}
              />
              <div
                className="text-orange-400 text-sm truncate"
                dangerouslySetInnerHTML={{ __html: highlightMatch(book.author, searchInput) }}
              />
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderGenreRows = () => (
    <div className="w-full mt-6">
      {genreRows.map(row => (
        <div key={row.genre} className="mb-4">
          <div className="text-orange-400 font-bold mb-2">{row.genre}</div>
          {renderRowCarousel(row.books)}
        </div>
      ))}
    </div>
  );

  // NEW: Get avatar and style for header display
  const userAvatar = getUserAvatar();
  const avatarStyle = getUserAvatarStyle();

  return (
    <>
      {/* Fixed Header - Enhanced positioning */}
      <header 
        className="fixed top-0 left-0 right-0 z-[200] w-full bg-white border-b border-neutral-200 shadow-sm flex px-4 py-2 h-14 justify-between items-center gap-4"
        style={{
          minHeight: '3.5rem',
          maxHeight: '3.5rem',
          boxShadow: '0 1px 6px rgba(251, 146, 60, 0.1)',
        }}
      >
        <button className="text-orange-400 font-extrabold text-lg drop-shadow-md " onClick={() => navigate('/')} aria-label="Home">
          Read<i className="text-black">imple</i>
        </button>
        
        {/* NEW: Updated header buttons with profile icon */}
        <div className="flex items-center gap-2">
          {/* Search Button */}
          <button
            className="header-search-btn p-2 rounded-full hover:bg-neutral-100 transition-colors duration-200"
            aria-label="Search"
            onClick={handleSearchClick} // Changed from setShowSearchOverlay(true)
          >
            <svg className="w-5 h-5 text-orange-400" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
              <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2.5"/>
              <line x1="16.5" y1="16.5" x2="21" y2="21" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
            </svg>
          </button>
          
          {/* NEW: Profile Avatar Button */}
          <button 
            className="profile-btn p-1 rounded-full hover:bg-neutral-100 transition-all duration-200 hover:scale-105"
            aria-label="Profile"
            onClick={handleProfileClick}
            title={`${userProfile.username || userAvatar.label} - Go to Profile`}
          >
            <div 
              className={`w-8 h-8 rounded-full overflow-hidden ${avatarStyle.className} transition-all duration-200`}
              style={{
                ...avatarStyle,
                borderWidth: '2px',
              }}
            >
              <img
                src={userAvatar.src}
                alt={userAvatar.label}
                className="w-full h-full object-cover"
                draggable={false}
              />
            </div>
          </button>
        </div>
      </header>

      {/* Search Overlay - Fixed position with higher z-index */}
      {showSearchOverlay && (
        <div className="fixed inset-0 backdrop-blur-sm z-[300] flex flex-col items-center pt-8 pb-2 px-2 overflow-y-auto min-h-screen bg-white">
          <span className='w-full flex h-4 justify-center items-center px-4'>
            <form onSubmit={handleSearchSubmit} className="w-full max-w-full mx-auto flex items-center justify-between gap-1">
              <input
                type="text"
                value={searchInput}
                onChange={handleSearchChange}
                placeholder="Find a book..."
                className="w-full px-4 py-2 rounded-lg bg-white text-black focus:outline-none border border-neutral-300 focus:border-orange-400 transition-colors duration-200"
                autoComplete="off"
                autoFocus
              />
              {searchInput && (
                <button
                  className="text-orange-400 font-bold px-3 py-1 rounded hover:bg-neutral-100 transition-colors duration-200"
                  onClick={() => setSearchInput('')}
                  tabIndex={0}
                  aria-label="Clear search"
                  type="button"
                >
                  Clear
                </button>
              )}
              {loading && renderLoading()}
            </form>
            <button
              className="text-3xl text-orange-400 font-bold w-1/4 hover:scale-110 transition-transform duration-200"
              aria-label="Close search"
              onClick={() => setShowSearchOverlay(false)}
              type="button"
            >
              &larr;
            </button>
          </span>
          <div className="w-full max-w-lg mx-auto mt-4">
            {!searchInput && (
              <>
                {suggestedRow.length > 0 && (
                  <>
                    <div className="text-orange-400 font-bold mb-2">Suggested</div>
                    {renderRowCarousel(suggestedRow)}
                  </>
                )}
                {randomColumn.length > 0 && (
                  <>
                    <div className="text-orange-400 font-bold mt-4 mb-2">Discover More</div>
                    {renderColumn(randomColumn)}
                  </>
                )}
              </>
            )}
            {searchInput && !loading && showResults && (
              <>
                <div className="text-orange-400 font-bold mb-2">Top Results</div>
                {searchResults.length > 0 ? renderColumn(searchResults) : <div className="text-neutral-400">No results found.</div>}
                {genreRows.length > 0 && renderGenreRows()}
              </>
            )}
          </div>
        </div>
      )}
      {showAdvancedSearch && (
        <AdvancedSearch
          onBookSelect={(book) => {
            // Navigate to discover page with selected book
            navigate('/discover', {
              state: { book, fromSearch: true }
            });
            setShowAdvancedSearch(false);
          }}
          onClose={() => setShowAdvancedSearch(false)}
        />
      )}
    </>
  );
};

export default Header;