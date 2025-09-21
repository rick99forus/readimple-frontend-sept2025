// filepath: src/components/GreetingBar.js
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

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
// eslint-disable-next-line
const IconPencil = ({ className = 'w-4 h-4' }) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
    <path
      d="M4 21h4.586a1 1 0 0 0 .707-.293l11.414-11.414a1 1 0 0 0 0-1.414-1.414L8.293 18.293A1 1 0 0 1 8 19.586V21a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-3a1 1 0 0 1 1-1Z"
      fill="currentColor"
    />
    <path
      d="M19.707 4.293a1 1 0 0 0-1.414 0L15.586 7l1.414 1.414 2.707-2.707a1 1 0 0 0 0-1.414Z"
      fill="currentColor"
    />
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
  // eslint-disable-next-line
  return { 
    greeting: 'Good night',
    gradient: 'from-gray-700 to-black/90-900', // night
    Icon: IconMoon,
  };
}

/* ---------- Component ---------- */
// eslint-disable-next-line
const GreetingBar = ({  }) => {
  const [displayName, setDisplayName] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const stored = localStorage.getItem('displayName') || '';
    setDisplayName(stored);
    // Listen for changes from Profile
    const onStorage = () => setDisplayName(localStorage.getItem('displayName') || '');
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const handleEdit = () => {
    navigate('/profile');
  };

  const { greeting, gradient, Icon } = getTimeTheme();

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
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-neutral-800 bg-neutral-100 hover:bg-neutral-200 ring-1 ring-black/5 focus:outline-none focus:ring-2 focus:ring-orange-300"
              aria-label="Edit display name"
              title="Edit profile"
            >
              Edit Profile
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GreetingBar;
