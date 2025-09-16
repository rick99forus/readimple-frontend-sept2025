import React from 'react';

const GENRE_GRADIENTS = {
  fiction: 'linear-gradient(210deg, #fffbe6 40%, #ffffff 100%)',
  fantasy: 'linear-gradient(210deg, #f3e8ff 40%, #ffffff 100%)',
  'sci-fi': 'linear-gradient(210deg, #e0f2fe 40%, #ffffff 100%)',
  romance: 'linear-gradient(210deg, #fce7f3 40%, #ffffff 100%)',
  mystery: 'linear-gradient(210deg, #f1f5f9 40%, #ffffff 100%)',
  biography: 'linear-gradient(210deg, #d1fae5 40%, #ffffff 100%)',
  thriller: 'linear-gradient(210deg, #fee2e2 40%, #ffffff 100%)',
  horror: 'linear-gradient(210deg, #fee2e2 40%, #ffffff 100%)',
  adventure: 'linear-gradient(210deg, #fef3c7 40%, #ffffff 100%)',
  poetry: 'linear-gradient(210deg, #f0fdf4 40%, #ffffff 100%)',
  children: 'linear-gradient(210deg, #ecfdf5 40%, #ffffff 100%)',
  'self-help': 'linear-gradient(210deg, #f0f9ff 40%, #ffffff 100%)',
  history: 'linear-gradient(210deg, #fef9c3 40%, #ffffff 100%)',
  science: 'linear-gradient(210deg, #e0f2fe 40%, #ffffff 100%)',
  classic: 'linear-gradient(210deg, #f1f5f9 40%, #ffffff 100%)',
  memoir: 'linear-gradient(210deg, #d1fae5 40%, #ffffff 100%)',
  crime: 'linear-gradient(210deg, #fee2e2 40%, #ef4444 100%)',
  psychology: 'linear-gradient(210deg, #f0fdf4 40%, #ffffff 100%)',
  philosophy: 'linear-gradient(210deg, #fef9c3 40%, #ffffff 100%)',
  spirituality: 'linear-gradient(210deg, #f3e8ff 40%, #ffffff 100%)',
  business: 'linear-gradient(210deg, #fefce8 40%, #ffffff 100%)',
  'graphic novel': 'linear-gradient(210deg, #f3e8ff 40%, #ffffff 100%)',
  dystopian: 'linear-gradient(210deg, #f1f5f9 40%, #64748b 100%)',
  default: 'linear-gradient(210deg, #f8fafc 40%, #ffffff 100%)',
};

const SpotlightCard = ({ data, onClick }) => {
  if (!data || !data.book) return null;

  const { book, teaser, whyYoullLoveIt = [] } = data;
  const genre = (book._genre || book.genres?.[0] || 'default').toLowerCase();
  const bgGradient = GENRE_GRADIENTS[genre] || GENRE_GRADIENTS.default;

  return (
    <div
      className="flex flex-col gap-4 border border-orange-200 rounded-xl p-4 shadow-sm"
      style={{ background: bgGradient, transition: 'background 0.5s' }}
    >
      <button
        onClick={() => onClick(book)}
        className="flex-shrink-0 text-left"
        aria-label={`Open spotlight book ${book.title}`}
      >
        <img
          src={book.coverImage}
          alt={book.title}
          className="w-32 h-48 object-cover rounded-lg shadow"
          loading="lazy"
          onError={e => { e.target.src='/fallback-cover.png';}}
        />
      </button>
      <div className="flex-1 flex flex-col">
        <h3 className="text-lg font-bold">{book.title}</h3>
        <div className="text-sm text-neutral-600 italic mb-2">by {book.author}</div>
        <p className="text-sm text-neutral-800 mb-3 line-clamp-3">{teaser}</p>
        {whyYoullLoveIt.length > 0 && (
          <ul className="text-xs space-y-1 mb-3 list-disc ml-4 text-neutral-700">
            {whyYoullLoveIt.slice(0, 4).map((r, i) => <li key={i}>{r}</li>)}
          </ul>
        )}
        <div className="mt-auto">
          <button
            onClick={() => onClick(book)}
            className="px-4 py-2 bg-orange-500 text-white rounded-full text-sm font-semibold hover:bg-orange-600"
          >
            Explore
          </button>
        </div>
      </div>
    </div>
  );
};
export default SpotlightCard;