import React, { useState } from 'react';

// Universal genre list
const ALL_GENRES = [
  'Fiction', 'Fantasy', 'History', 'Science', 'Romance', 'Mystery',
  'Biography', 'Horror', 'Adventure', 'Poetry', 'Thriller', 'Self-Help',
  'Children', 'Classic', 'Graphic Novel', 'Memoir', 'Dystopian', 'Crime',
  'Psychology', 'Philosophy', 'Spirituality', 'Business', 'Sci-Fi', 'Education',
  'Health', 'Travel', 'Cookbook'
];

// Genre gradients for visual appeal
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

export default function GenreSelectorModal({ open, onSave }) {
  const [selected, setSelected] = useState(() => {
    // Load current preferences
    const saved = JSON.parse(localStorage.getItem('preferredGenres') || '[]');
    return saved.length ? saved : [];
  });
  
  const [isSaving, setIsSaving] = useState(false);

  const handleToggle = (genre) => {
    setSelected(selected =>
      selected.includes(genre)
        ? selected.filter(g => g !== genre)
        : [...selected, genre]
    );
  };

  const handleSave = async () => {
    if (selected.length < 3 || isSaving) return;

    setIsSaving(true);

    try {
      // Small delay for user feedback
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // Call the onSave callback with selected genres
      onSave(selected);
      
    } catch (error) {
      console.error('Error saving preferences:', error);
      setIsSaving(false);
    }
  };

  const handleBack = () => {
    // User cancelled - close modal without saving
    onSave(null);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[2000] bg-black/50 backdrop-blur-sm flex flex-col items-center justify-center w-full min-h-screen p-4">
      {/* Modal Container */}
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 relative">
          <button
            className="absolute left-4 top-4 text-gray-400 hover:text-gray-600 transition-colors duration-200"
            onClick={handleBack}
            disabled={isSaving}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          
          <div className="text-center">
            <h2 className="text-2xl font-bold text-orange-400">Update Your Genres</h2>
            <p className="text-gray-600 text-sm mt-2">
              Select at least <span className="font-bold text-orange-400">3 genres</span> for personalized recommendations.
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-4 max-h-[60vh] overflow-y-auto">
          {/* Selected count indicator */}
          <div className="mb-4 text-center">
            <span className={`text-sm font-medium px-3 py-1 rounded-full ${
              selected.length >= 3 
                ? 'bg-green-100 text-green-700' 
                : 'bg-orange-100 text-orange-600'
            }`}>
              {selected.length >= 3 
                ? `✓ ${selected.length} genres selected` 
                : `${selected.length}/3 genres selected`
              }
            </span>
          </div>
          
          {/* Genre buttons */}
          <div className="flex flex-wrap gap-3 justify-center mb-6">
            {ALL_GENRES.map(genre => {
              const isSelected = selected.includes(genre);
              return (
                <button
                  key={genre}
                  className={`px-4 py-2 rounded-full font-semibold border-2 transition-all duration-300 whitespace-nowrap
                    ${isSelected
                      ? 'scale-105 shadow-lg'
                      : 'hover:scale-105'
                    }
                    ${isSaving ? 'opacity-50 pointer-events-none' : ''}
                  `}
                  style={{
                    background: isSelected ? GENRE_GRADIENTS[genre] : '#fff',
                    color: isSelected ? '#222' : '#fb923c',
                    borderColor: '#fb923c',
                    fontWeight: isSelected ? 700 : 500,
                  }}
                  onClick={() => handleToggle(genre)}
                  type="button"
                  disabled={isSaving}
                >
                  {genre}
                </button>
              );
            })}
          </div>
          
          {/* Selected genres preview */}
          {selected.length > 0 && (
            <div className="text-center">
              <p className="text-xs text-gray-500 mb-2">Your selected genres:</p>
              <div className="flex flex-wrap gap-1 justify-center max-w-md mx-auto">
                {selected.map(genre => (
                  <span 
                    key={genre} 
                    className="text-xs px-2 py-1 bg-orange-100 text-orange-700 rounded-full"
                  >
                    {genre}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200">
          <button
            className={`w-full px-6 py-3 rounded-full font-bold text-lg transition-all duration-300 relative overflow-hidden
              ${selected.length >= 3 && !isSaving
                ? 'bg-orange-400 text-white hover:bg-orange-500' 
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }
              ${isSaving ? 'bg-orange-500 text-white' : ''}
            `}
            onClick={handleSave}
            type="button"
            disabled={selected.length < 3 || isSaving}
          >
            {/* Loading animation */}
            {isSaving && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="flex space-x-1">
                  <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
                  <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                </div>
              </div>
            )}
            
            {/* Button text */}
            <span className={`transition-opacity duration-200 ${isSaving ? 'opacity-0' : 'opacity-100'}`}>
              {selected.length >= 3 ? 'Update Preferences' : 'Select at least 3 genres'}
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}