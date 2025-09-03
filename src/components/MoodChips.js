import React from 'react';
const MoodChips = ({ moods = [], selected, onSelect }) => {
  if (!moods.length) return null;
  return (
    <div className="flex gap-2 max-w-screen overflow-x-auto pb-1 scrollbar-hide">
      {moods.map(m => {
        const active = m.key === selected;
        return (
          <button
            key={m.key}
            onClick={() => onSelect(m.key)}
            className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap transition ${
              active ? 'bg-orange-500 text-white shadow' : 'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
            }`}
            aria-pressed={active}
            aria-label={`Select mood ${m.label}`}
          >
            {m.label}
          </button>
        );
      })}
    </div>
  );
};
export default MoodChips;