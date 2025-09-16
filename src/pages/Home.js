import React, { useEffect, useState, forwardRef } from 'react';
import { useNavigate } from 'react-router-dom';
import HeroSlideshow from '../components/HeroSlideshow';
import BookRow from '../components/BookRow';
import GreetingBar from '../components/GreetingBar';
import Section from '../components/Section';
import ContinueRow from '../components/ContinueRow';
import ContinueRowSkeleton from '../components/skeletons/ContinueRowSkeleton';
import { apiCall, fetchWithCache } from '../utils/api';
import BookGrid from '../components/BookGrid';
import { GENRE_GRADIENTS } from '../constants/appConstants';
import { handleBookClick } from '../utils/navigation';

const ALL_GENRES = [
  'fiction', 'fantasy', 'sci-fi', 'romance', 'mystery', 'biography', 'thriller', 'horror', 'adventure', 'poetry',
  'children', 'self-help', 'history', 'science', 'classic', 'memoir', 'crime', 'psychology', 'philosophy',
  'spirituality', 'business', 'graphic novel', 'dystopian'
];

const Home = forwardRef((props, ref) => {
  const [apiError, setApiError] = useState(null);
  const [loadingContinue, setLoadingContinue] = useState(false);
  const [continueReading, setContinueReading] = useState([]);
  const [genreRows, setGenreRows] = useState([]);
  const [loadingGenres, setLoadingGenres] = useState(true);
  const [newReleases, setNewReleases] = useState([]);
  const [loadingNewReleases, setLoadingNewReleases] = useState(true);
  const [browseRows, setBrowseRows] = useState([]);
  const navigate = useNavigate();

  // Fetch user's selected genres (always fresh)
  useEffect(() => {
    async function fetchGenresAndBooks() {
      setLoadingGenres(true);
      setApiError(null);
      try {
        let genres = [];
        try {
          genres = JSON.parse(localStorage.getItem('preferredGenres') || '[]');
        } catch {
          genres = [];
        }
        if (!genres.length) genres = ['fiction', 'history', 'self-help'];
        const res = await apiCall('/api/books/home-batch', {
          method: 'GET',
          params: { genres: genres.map(g => g.toLowerCase()).join(',') }
        });
        setGenreRows(res.data?.genres || []);
      } catch (e) {
        setApiError('Could not load books for your genres.');
        setGenreRows([]);
      } finally {
        setLoadingGenres(false);
      }
    }
    fetchGenresAndBooks();
  }, []);

  // Continue reading (cached)
  useEffect(() => {
    setLoadingContinue(true);
    fetchWithCache(`/api/books/me/reading`)
      .then(d => setContinueReading(d || []))
      .catch(() => setContinueReading([]))
      .finally(() => setLoadingContinue(false));
  }, []);

  // Fetch new releases for BookGrid (always fresh)
  useEffect(() => {
    setLoadingNewReleases(true);
    apiCall('/api/books/new-releases', { method: 'GET' })
      .then(res => setNewReleases(res.data?.items || []))
      .catch(() => setNewReleases([]))
      .finally(() => setLoadingNewReleases(false));
  }, []);

  // Fetch genres not selected by user for "Browse more books" (always fresh)
  useEffect(() => {
    let userGenres = [];
    try {
      userGenres = JSON.parse(localStorage.getItem('preferredGenres') || '[]');
    } catch {
      userGenres = [];
    }
    if (!userGenres.length) userGenres = ['fiction', 'history', 'self-help'];
    const notSelected = ALL_GENRES.filter(g => !userGenres.includes(g));
    const randomGenres = notSelected.sort(() => 0.5 - Math.random()).slice(0, 3);
    apiCall('/api/books/home-batch', {
      method: 'GET',
      params: { genres: randomGenres.join(',') }
    })
      .then(res => setBrowseRows(res.data?.genres || []))
      .catch(() => setBrowseRows([]));
  }, []);

  if (apiError) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-white text-black">
        <div className="text-red-500 text-lg font-semibold mb-2">
          {apiError}
        </div>
        <div className="text-gray-400 text-sm">
          Please ensure the backend server is running and reachable.
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white text-black min-h-screen">
      <div className="w-full max-w-4xl mx-auto flex flex-col items-start justify-center gap-y-1">
        <GreetingBar onEditName={() => {}} />
        <HeroSlideshow onBookClick={book => handleBookClick(navigate, book)} />

        <Section id="continue" title="Continue reading" show={loadingContinue || continueReading.length > 0}>
          {loadingContinue ? <ContinueRowSkeleton /> : (
            <ContinueRow onClick={book => handleBookClick(navigate, book)} />
          )}
        </Section>

        {loadingGenres ? (
          <div className="w-full text-center py-8 text-gray-400">Loading genres...</div>
        ) : (
          genreRows.map(({ genre, books }) => (
            <div key={genre} className="w-full">
              <Section
                id={`genre-${genre}`}
                title={genre.charAt(0).toUpperCase() + genre.slice(1)}
                show={true}
                style={{ background: GENRE_GRADIENTS[genre] || GENRE_GRADIENTS.default }}
              >
                <BookRow
                  books={books || []}
                  onBookClick={book => handleBookClick(navigate, book)}
                />
              </Section>
            </div>
          ))
        )}
        <Section id="new-releases" title="New Releases Books" show>
          {loadingNewReleases ? (
            <div className="w-full text-center py-8 text-gray-400">Loading new releases...</div>
          ) : (
            <BookGrid
              books={newReleases}
              onBookClick={book => handleBookClick(navigate, book)}
              gridCols={2}
              maxRows={3}
            />
          )}
        </Section>
        <Section id="browse" title="Browse more books" show>
          {browseRows.map(({ genre, books }) => (
            <div key={genre} className="w-full mb-6">
              <Section className='w-full px-0'
                id={`browse-${genre}`}
                title={genre.charAt(0).toUpperCase() + genre.slice(1)}
                show={true}
                style={{ background: GENRE_GRADIENTS[genre] || GENRE_GRADIENTS.default }}
              >
                <BookRow
                  books={books || []}
                  onBookClick={book => handleBookClick(navigate, book)}
                />
              </Section>
            </div>
          ))}
        </Section>
      </div>
    </div>
  );
});

export default Home;