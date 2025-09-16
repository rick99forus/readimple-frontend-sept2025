import React, { useState } from 'react';

export default function ExpandableBio({ text, lines = 2 }) {

    function ExpandableBio({ text, lines = 2 }) {
        const [open, setOpen] = React.useState(false);
        const clampClass = open ? '' : `line-clamp-${lines}`;
        return (
          <div className="text-sm text-neutral-700">
            <p className={`italic ${clampClass}`}>{text}</p>
            {text.length > 120 && (
              <button
                className="mt-1 text-xs font-semibold text-orange-700 hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-300 rounded"
                onClick={() => setOpen((v) => !v)}
              >
                {open ? 'Show less' : 'Show more'}
              </button>
            )}
          </div>
        );
      }
      
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