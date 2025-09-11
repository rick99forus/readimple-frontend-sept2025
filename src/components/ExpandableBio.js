import React, { useState } from 'react';

export default function ExpandableBio({ text, lines = 2 }) {
  const [expanded, setExpanded] = useState(false);
  if (!text) return null;
  return (
    <div>
      <div
        className={`text-sm text-neutral-700 ${expanded ? '' : `line-clamp-${lines}`}`}
        style={{ cursor: text.length > 120 ? 'pointer' : 'default' }}
        onClick={() => setExpanded(v => !v)}
        title={expanded ? 'Show less' : 'Show more'}
      >
        {text}
      </div>
      {text.length > 120 && (
        <button
          className="text-xs text-orange-500 underline mt-1"
          onClick={() => setExpanded(v => !v)}
        >
          {expanded ? 'Show less' : 'Show more'}
        </button>
      )}
    </div>
  );
}