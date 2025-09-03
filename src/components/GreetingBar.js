// filepath: src/components/GreetingBar.js
import React, { useState, useEffect } from 'react';

/* ---------- Tiny, crisp SVG icons (currentColor) ---------- */
const IconSunrise = ({ className = 'w-5 h-5' }) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
    {/* rays */}
    <path d="M12 2v2M4.9 4.9l1.4 1.4M2 12h2M19.1 6.3l1.4-1.4M20 12h2"
      stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" fill="none" />
    {/* half sun */}
    <path d="M4 14a8 8 0 0 1 16 0" stroke="currentColor" strokeWidth="1.6"
      strokeLinecap="round" fill="none" />
    {/* horizon */}
    <path d="M2 18h20" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
  </svg>
);

const IconSun = ({ className = 'w-5 h-5' }) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
    <circle cx="12" cy="12" r="4" fill="currentColor" />
    <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"
      stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" fill="none" />
  </svg>
);

const IconHalfMoon = ({ className = 'w-5 h-5' }) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
    <path
      d="M20.5 12.5A8.5 8.5 0 1 1 11.5 3a7 7 0 1 0 9 9.5Z"
      fill="currentColor"
    />
  </svg>
);

const IconMoon = ({ className = 'w-5 h-5' }) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
    <path
      d="M21 12.8A8.5 8.5 0 1 1 11.2 3a7 7 0 1 0 9.8 9.8Z"
      fill="currentColor"
    />
  </svg>
);

/* Pencil/edit icon — sized down to fit the compact chip buttons */
const IconEdit = ({ className = 'w-3.5 h-3.5' }) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
    <path d="M3 17.25V21h3.75L19.81 7.94l-3.75-3.75L3 17.25Z" fill="currentColor" />
    <path d="M20.71 6.04a1 1 0 0 0 0-1.41l-1.34-1.34a1 1 0 0 0-1.41 0l-1.13 1.13L19.58 7.17l1.13-1.13Z" fill="currentColor" />
  </svg>
);

/* ---------- Time-of-day theme ---------- */
function getTimeTheme() {
  const h = new Date().getHours();
  if (h < 12) {
    return {
      greeting: 'Good morning',
      gradient: 'from-amber-400 to-orange-500', // sunrise
      Icon: IconSunrise,
    };
  }
  if (h < 18) {
    return {
      greeting: 'Good afternoon',
      gradient: 'from-sky-400 to-cyan-500', // daytime
      Icon: IconSun,
    };
  }
  // evening/night
  return {
    greeting: 'Good evening',
    gradient: 'from-indigo-500 to-violet-600', // dusk
    Icon: IconHalfMoon, // or IconMoon if you want a fuller night feel
  };
  // night
  return { 
    greeting: 'Good night',
    gradient: 'from-gray-700 to-black/90-900', // night
    Icon: IconMoon,
  };
}

/* ---------- Component ---------- */
const GreetingBar = ({ name, onEditName }) => {
  const [displayName, setDisplayName] = useState(name || '');
  const { greeting, gradient, Icon } = getTimeTheme();

  useEffect(() => {
    const stored = localStorage.getItem('displayName') || '';
    if (!name && stored) setDisplayName(stored);
  }, [name]);

  const handleEdit = () => {
    const current = localStorage.getItem('displayName') || displayName || '';
    const updated = window.prompt('Enter your display name', current);
    if (updated == null) return; // cancelled
    const trimmed = updated.trim();
    setDisplayName(trimmed);
    localStorage.setItem('displayName', trimmed);
    onEditName && onEditName(trimmed);
  };

  return (
    <div className="w-full">
      <div className="mx-auto w-full max-w-6xl px-4 pt-3 pb-2">
        <div
          className="flex items-center justify-between rounded-2xl bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60 ring-1 ring-black/5 px-3 py-3"
          role="banner"
          aria-label="Personal greeting"
        >
          {/* Left: gradient icon bubble + text */}
          <div className="flex items-center gap-3 min-w-0">
            <span className={`inline-flex items-center justify-center w-10 h-10 rounded-xl text-white shadow-md ring-1 ring-white/20 bg-gradient-to-br ${gradient}`}>
              <Icon className="w-5 h-5 text-white/90" />
            </span>
            <div className="min-w-0">
              <div className="text-[11px] text-neutral-500">{greeting}</div>
              <div className="text-xl font-extrabold tracking-tight text-neutral-900 truncate">
                {displayName || 'ReadImpler'} <span aria-hidden>👋</span>
              </div>
            </div>
          </div>

          {/* Right: Edit button — compact, with smaller icon */}
          <div className="flex items-center gap-2">
            {/* Text pill on sm+ */}
            <button
              onClick={handleEdit}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-neutral-800 bg-neutral-100 hover:bg-neutral-200 ring-1 ring-black/5 focus:outline-none focus:ring-2 focus:ring-orange-300"
              aria-label="Edit display name"
              title="Edit display name"
            >
              <IconEdit className="w-3.5 h-3.5" />
              Edit name
            </button>

            {/* Icon-only on xs — button & icon both slightly smaller than before */}
            <button
              onClick={handleEdit}
              className="sm:hidden inline-flex items-center justify-center w-8 h-8 rounded-lg bg-white text-neutral-700 border border-neutral-200 hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-orange-300"
              aria-label="Edit display name"
              title="Edit name"
            >
              <IconEdit className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GreetingBar;
