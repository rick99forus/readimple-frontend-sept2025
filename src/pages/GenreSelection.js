// filepath: src/pages/GenreSelection.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTransition } from '../context/TransitionContext';

// Universal genre list (unchanged)
const ALL_GENRES = [
  'Fiction', 'Fantasy', 'History', 'Science', 'Romance', 'Mystery',
  'Biography', 'Horror', 'Adventure', 'Poetry', 'Thriller', 'Self-Help',
  'Children', 'Classic', 'Graphic Novel', 'Memoir', 'Dystopian', 'Crime',
  'Psychology', 'Philosophy', 'Spirituality', 'Business', 'Sci-Fi', 'Education',
  'Health', 'Travel', 'Cookbook'
];

// Gradients (kept compatible with your HeroSlideshow palette)
const GENRE_GRADIENTS = {
  Fiction:      'linear-gradient(210deg, #fffbe6 40%, #fbbf24 100%)',
  Fantasy:      'linear-gradient(210deg, #f3e8ff 40%, #8b5cf6 100%)',
  History:      'linear-gradient(210deg, #fef9c3 40%, #fbbf24 100%)',
  Science:      'linear-gradient(210deg, #e0f2fe 40%, #38bdf8 100%)',
  Romance:      'linear-gradient(210deg, #fce7f3 40%, #f472b6 100%)',
  Mystery:      'linear-gradient(210deg, #f1f5f9 40%, #64748b 100%)',
  Biography:    'linear-gradient(210deg, #d1fae5 40%, #34d399 100%)',
  Horror:       'linear-gradient(210deg, #fee2e2 40%, #ef4444 100%)',
  Adventure:    'linear-gradient(210deg, #fef3c7 40%, #facc15 100%)',
  Poetry:       'linear-gradient(210deg, #ecfccb 40%, #a3e635 100%)',
  Thriller:     'linear-gradient(210deg, #fee2e2 40%, #f87171 100%)',
  'Self-Help':  'linear-gradient(210deg, #fef9c3 40%, #fbbf24 100%)',
  Children:     'linear-gradient(210deg, #e0f2fe 40%, #38bdf8 100%)',
  Classic:      'linear-gradient(210deg, #f1f5f9 40%, #64748b 100%)',
  'Graphic Novel': 'linear-gradient(210deg, #f3e8ff 40%, #8b5cf6 100%)',
  Memoir:       'linear-gradient(210deg, #d1fae5 40%, #34d399 100%)',
  Dystopian:    'linear-gradient(210deg, #f1f5f9 40%, #64748b 100%)',
  Crime:        'linear-gradient(210deg, #fee2e2 40%, #ef4444 100%)',
  Psychology:   'linear-gradient(210deg, #ecfccb 40%, #a3e635 100%)',
  Philosophy:   'linear-gradient(210deg, #fef9c3 40%, #fbbf24 100%)',
  Spirituality: 'linear-gradient(210deg, #f3e8ff 40%, #8b5cf6 100%)',
  Business:     'linear-gradient(210deg, #fffbe6 40%, #fbbf24 100%)',
  'Sci-Fi':     'linear-gradient(210deg, #e0f2fe 40%, #38bdf8 100%)',
  Education:    'linear-gradient(210deg, #ecfccb 40%, #a3e635 100%)',
  Health:       'linear-gradient(210deg, #d1fae5 40%, #34d399 100%)',
  Travel:       'linear-gradient(210deg, #fce7f3 40%, #f472b6 100%)',
  Cookbook:     'linear-gradient(210deg, #fef9c3 40%, #fbbf24 100%)',
};

// Small inline book icon (currentColor)
const IconBook = ({ className = 'w-5 h-5' }) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
    <path d="M4 5a2 2 0 0 1 2-2h12v16H6a2 2 0 0 0-2 2V5Zm14 0H8v12h10V5Z" fill="currentColor" />
  </svg>
);

export default function GenreSelection({ setShowTabBar, setShowHeader, onComplete }) {
  const [selected, setSelected] = useState([]);
  const [isSaving, setIsSaving] = useState(false);
  const navigate = useNavigate();
  const { startTransition } = useTransition();

  // Hide nav chrome while here
  useEffect(() => {
    setShowTabBar?.(false);
    setShowHeader?.(false);
    return () => {
      setShowTabBar?.(true);
      setShowHeader?.(true);
    };
  }, [setShowTabBar, setShowHeader]);

  // If already configured, bounce to Home
  useEffect(() => {
    const hasSelectedGenres = localStorage.getItem('hasSelectedGenres') === 'true';
    const preferred = JSON.parse(localStorage.getItem('preferredGenres') || '[]');
    if (hasSelectedGenres && preferred.length >= 3) {
      navigate('/', { replace: true });
    }
  }, [navigate]);

  const handleToggle = (genre) => {
    setSelected(prev =>
      prev.includes(genre) ? prev.filter(g => g !== genre) : [...prev, genre]
    );
  };

  const handleSave = async (event) => {
    if (selected.length < 3 || isSaving) return;

    const rect = event.currentTarget.getBoundingClientRect();
    const ripplePos = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 };

    setIsSaving(true);
    try {
      localStorage.setItem('preferredGenres', JSON.stringify(selected));
      localStorage.setItem('hasSelectedGenres', 'true');

      onComplete?.();
      startTransition('up', ripplePos);

      // slight delay for visual feedback
      await new Promise(r => setTimeout(r, 750));
      navigate('/', { replace: true });
    } catch (e) {
      console.error('Error saving preferences:', e);
      setIsSaving(false);
    }
  };

  const ready = selected.length >= 3;

  return (
    <div className="bg-white text-black min-h-screen max-h-screen w-full flex flex-col overflow-hidden pb-[80px]">
      {/* Header (glassy card) */}
      <div className="flex-shrink-0 px-6 pt-5">
        <div className="max-w-2xl mx-auto rounded-2xl bg-white/80 supports-[backdrop-filter]:bg-white/60 backdrop-blur ring-1 ring-black/5 px-4 py-4">
          <div className="flex items-start gap-3">
            <span className="inline-flex items-center justify-center w-11 h-11 rounded-xl text-white bg-gradient-to-br from-amber-400 to-orange-500 ring-1 ring-white/20 shadow">
              <IconBook className="w-5 h-5 text-white/90" />
            </span>
            <div className="min-w-0">
              <h1 className="text-2xl font-extrabold tracking-tight text-neutral-900">Welcome to Readimple</h1>
              <p className="text-sm text-neutral-600">
                Choose at least <span className="font-bold text-orange-500">3 genres</span> to personalize your feed.
              </p>

              {/* Progress pill */}
              <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-neutral-100 text-neutral-700 px-3 py-1 text-xs ring-1 ring-black/5">
                <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full ${ready ? 'bg-green-500' : 'bg-orange-400'} text-white font-bold`}>
                  {ready ? '✓' : selected.length}
                </span>
                <span className="font-semibold">{ready ? 'Ready to continue!' : `${selected.length}/3 selected`}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Genres grid as rounded chips */}
      <div className="w-full flex-1 overflow-y-auto px-6 pt-4">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
            {ALL_GENRES.map((genre) => {
              const isActive = selected.includes(genre);
              return (
                <button
                  key={genre}
                  type="button"
                  onClick={() => handleToggle(genre)}
                  aria-pressed={isActive}
                  className={`group relative rounded-2xl px-4 py-3 text-sm font-semibold transition-all ring-1
                    ${isActive
                      ? 'ring-white/10 text-neutral-900 shadow-md scale-[1.02]'
                      : 'ring-black/10 text-orange-600 hover:bg-neutral-50 hover:shadow-sm'
                    }`}
                  style={{ background: isActive ? GENRE_GRADIENTS[genre] : '#fff' }}
                  title={genre}
                >
                  {/* subtle top sheen */}
                  <span className="pointer-events-none absolute inset-x-0 top-0 h-6 bg-gradient-to-b from-white/15 to-transparent rounded-t-2xl" />
                  <span className="relative z-[1]">{genre}</span>

                  {/* active check dot */}
                  {isActive && (
                    <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-orange-500 ring-2 ring-white" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Selected preview */}
          {selected.length > 0 && (
            <div className="mt-6 text-center">
              <p className="text-xs text-neutral-500 mb-2">Your selected genres</p>
              <div className="flex flex-wrap gap-2 justify-center">
                {selected.map(g => (
                  <span
                    key={g}
                    className="px-3 py-1 rounded-full bg-orange-100 text-orange-700 text-xs font-semibold ring-1 ring-orange-200"
                  >
                    {g}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Fixed bottom CTA */}
      <div className="flex-shrink-0 px-6 py-3 bg-white/90 backdrop-blur border-t border-neutral-200 fixed bottom-0 left-0 right-0">
        <div className="max-w-md mx-auto">
          <button
            type="button"
            onClick={handleSave}
            disabled={!ready || isSaving}
            className={`w-full relative overflow-hidden rounded-full px-6 py-4 text-sm font-semibold text-white ring-1 ring-black/5 transition-all
              ${ready && !isSaving
                ? 'bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 active:scale-[0.99] shadow-md'
                : 'bg-neutral-300 text-neutral-600 cursor-not-allowed'
              }`}
          >
            {/* inline loading dots */}
            {isSaving ? (
              <span className="inline-flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-white animate-bounce" />
                <span className="w-2 h-2 rounded-full bg-white animate-bounce [animation-delay:.15s]" />
                <span className="w-2 h-2 rounded-full bg-white animate-bounce [animation-delay:.3s]" />
              </span>
            ) : (
              <span>{ready ? 'Continue to Home' : 'Select at least 3 genres'}</span>
            )}
          </button>

          {ready && (
            <p className="text-center text-[11px] text-neutral-500 mt-2">
              You can change your preferences anytime in Profile.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
