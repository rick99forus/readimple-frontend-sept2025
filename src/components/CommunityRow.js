import React, { useEffect, useState } from 'react';
import { fetchWithCache } from '../utils/fetchWithCache';
import CommunityRowSkeleton from './skeletons/CommunityRowSkeleton';

const CommunityRow = ({ onBookClick }) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      const preferredGenres = JSON.parse(localStorage.getItem('preferredGenres') || '[]');
      const genreParam = preferredGenres.length ? `?genres=${preferredGenres.join(',')}` : '';
      const cacheKey = `community_pulse_${preferredGenres.join('_') || 'all'}`;
      const data = await fetchWithCache(`/api/books/community/pulse${genreParam}`, cacheKey, 60);
      setItems(Array.isArray(data) ? data : []);
      setLoading(false);
    }
    fetchData();
  }, []);

  if (loading) return <CommunityRowSkeleton />;
  if (!items.length) return null;

  return (
    <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-1">
      {items.map((it, idx) => (
        <div
          key={(it.book?.id || idx) + '-' + idx}
          className="flex-shrink-0 w-40 bg-white rounded-lg border border-neutral-200 shadow-sm p-3"
        >
          <div className="flex items-center gap-2 mb-2">
            <img
              src={it.userAvatar}
              alt="User avatar"
              className="w-8 h-8 rounded-full object-cover border border-orange-400"
              loading="lazy"
              onError={e => { e.target.src='/fallback-avatar.png';}}
            />
            <span className="text-[11px] text-neutral-600 font-semibold line-clamp-1">
              Reading
            </span>
          </div>
          {it.book && (
            <button
              onClick={() => onBookClick(it.book)}
              className="text-left w-full"
              aria-label={`Open book ${it.book.title}`}
            >
              <img
                src={it.book.coverImage}
                alt={it.book.title}
                className="w-full h-40 object-cover rounded-md mb-2"
                loading="lazy"
                onError={e => { e.target.src='/fallback-cover.png';}}
              />
              <div className="text-xs font-semibold line-clamp-2">{it.book.title}</div>
              <div className="text-[10px] text-neutral-500 italic line-clamp-1">{it.book.author}</div>
            </button>
          )}
        </div>
      ))}
    </div>
  );
};
export default CommunityRow;