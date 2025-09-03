// filepath: src/pages/Profile.js
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AVATARS, BORDER_STYLES } from '../constants/avatars';
import GenreSelectorModal from '../components/GenreSelectorModal';

/* ===================== Helpers (kept, with same behavior) ===================== */
function getProfile() {
  try {
    return JSON.parse(localStorage.getItem('profile') || '{}');
  } catch {
    return {};
  }
}

// Persist + notify Header (unchanged behavior)
function setProfile(profile) {
  try {
    localStorage.setItem('profile', JSON.stringify(profile));
    window.dispatchEvent(new CustomEvent('profileUpdated', { detail: profile }));
    window.dispatchEvent(new StorageEvent('storage', { key: 'profile', newValue: JSON.stringify(profile) }));
  } catch (error) {
    console.error('Error saving profile:', error);
  }
}

function getStats(profile) {
  return {
    booksRead: profile.booksRead || Math.floor(Math.random() * 100),
    reviews: profile.reviews || Math.floor(Math.random() * 20),
    streak: profile.streak || Math.floor(Math.random() * 30),
    favGenre: profile.genres && profile.genres.length > 0 ? profile.genres[0] : 'None',
  };
}

function getBadge(stats) {
  if (stats.booksRead > 100) return { label: 'Legendary Reader', color: 'from-orange-400 to-pink-500' };
  if (stats.booksRead > 50) return { label: 'Pro Reader', color: 'from-amber-400 to-orange-500' };
  if (stats.booksRead > 20) return { label: 'Bookworm', color: 'from-sky-400 to-cyan-500' };
  return { label: 'Newbie', color: 'from-neutral-400 to-neutral-500' };
}

/* ===================== Tiny inline icons (currentColor) ===================== */
const IconUser = ({ className = 'w-5 h-5' }) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
    <path d="M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5Zm0 2c-5 0-9 2.5-9 5.5V21h18v-1.5C21 16.5 17 14 12 14Z" fill="currentColor"/>
  </svg>
);
const IconPaint = ({ className = 'w-4.5 h-4.5' }) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
    <path d="M7 16h4l9-9-4-4-9 9v4ZM3 21h6l-6-6v6Z" fill="currentColor"/>
  </svg>
);
const IconCrown = ({ className = 'w-4.5 h-4.5' }) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
    <path d="M3 19h18l-2-9-4 3-4-6-4 6-4-3 2 9Z" fill="currentColor"/>
  </svg>
);
const IconBook = ({ className = 'w-4.5 h-4.5' }) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
    <path d="M4 5a2 2 0 0 1 2-2h12v16H6a2 2 0 0 0-2 2V5Zm14 0H8v12h10V5Z" fill="currentColor"/>
  </svg>
);
const IconBack = ({ className = 'w-5 h-5' }) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
    <path d="M15 6l-6 6 6 6" className="stroke-current" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

/* ===================== Component ===================== */
export default function Profile({ setShowTabBar, setShowHeader }) {
  const navigate = useNavigate();
  const initialProfile = useMemo(() => getProfile(), []);
  const [profile, setProfileState] = useState(initialProfile);

  // Avatar states
  const initialAvatarIdx =
    AVATARS.findIndex(a => a.id === initialProfile.avatarId) !== -1
      ? AVATARS.findIndex(a => a.id === initialProfile.avatarId)
      : 0;
  const [avatarIdx, setAvatarIdx] = useState(initialAvatarIdx);

  const [username, setUsername] = useState(initialProfile.username || '');
  const [bio, setBio] = useState(initialProfile.bio || '');

  const [borderColor, setBorderColor] = useState(initialProfile.avatarBorderColor || '#fb923c');
  const [borderStyleIdx, setBorderStyleIdx] = useState(
    BORDER_STYLES.findIndex(b => b.name === initialProfile.avatarBorderStyle) !== -1
      ? BORDER_STYLES.findIndex(b => b.name === initialProfile.avatarBorderStyle)
      : 0
  );

  const [showGenreModal, setShowGenreModal] = useState(false);
  const [showAvatarOverlay, setShowAvatarOverlay] = useState(false);

  // UI toggles
  useEffect(() => {
    setShowHeader?.(true);
    setShowTabBar?.(true);
  }, [setShowHeader, setShowTabBar]);

  // Deriveds
  const avatarToShow = AVATARS[avatarIdx] || AVATARS[0];
  const stats = useMemo(() => getStats(profile), [profile]);
  const badge = useMemo(() => getBadge(stats), [stats]);
  const borderStyleObj = BORDER_STYLES[borderStyleIdx].style || {};
  const avatarBorderClass = BORDER_STYLES[borderStyleIdx].className;
  const avatarBorderStyle = { ...borderStyleObj, borderColor };

  /* ===================== Mutators (persist + local state) ===================== */
  const persist = useCallback((patch) => {
    const next = { ...getProfile(), ...patch };
    setProfile(next);               // persists + dispatches events
    setProfileState(next);          // local mirror
  }, []);

  const handleAvatarSelect = (idx) => {
    setAvatarIdx(idx);
    persist({
      avatarId: AVATARS[idx].id,
      avatarBorderColor: borderColor,
      avatarBorderStyle: BORDER_STYLES[borderStyleIdx].name,
    });
  };

  const handleBorderColorChange = (e) => {
    const value = e.target.value;
    setBorderColor(value);
    persist({
      avatarId: AVATARS[avatarIdx].id,
      avatarBorderColor: value,
      avatarBorderStyle: BORDER_STYLES[borderStyleIdx].name,
    });
  };

  const handleBorderStyleChange = (idx) => {
    setBorderStyleIdx(idx);
    persist({
      avatarId: AVATARS[avatarIdx].id,
      avatarBorderColor: borderColor,
      avatarBorderStyle: BORDER_STYLES[idx].name,
    });
  };

  const handleUsernameChange = (e) => {
    const value = e.target.value;
    setUsername(value);
    persist({ username: value });
  };

  const handleBioChange = (e) => {
    const value = e.target.value;
    setBio(value);
    persist({ bio: value });
  };

  const handleGenreSave = (selectedGenres) => {
    if (selectedGenres && selectedGenres.length >= 3) {
      localStorage.setItem('preferredGenres', JSON.stringify(selectedGenres));
      localStorage.setItem('hasSelectedGenres', 'true');
      window.dispatchEvent(new Event('genresUpdated'));
      persist({ genres: selectedGenres });
    }
    setShowGenreModal(false);
  };

  /* ===================== UI ===================== */
  return (
    <div className="inset-0 flex flex-col items-center justify-start min-h-screen w-full bg-white text-black">
      <div className="w-full max-w-5xl px-4 py-4">
        {/* Header Card */}
        <div className="mb-4 rounded-2xl bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60 ring-1 ring-black/5 px-3 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl text-white shadow-md ring-1 ring-white/20 bg-gradient-to-br from-amber-400 to-orange-500">
                <IconUser className="w-5 h-5 text-white/90" />
              </span>
              <div className="min-w-0">
                <h1 className="text-xl font-extrabold tracking-tight text-neutral-900 truncate">Your Profile</h1>
                <p className="text-[11px] text-neutral-500">Tune your avatar & reading vibe</p>
              </div>
            </div>
            <button
              onClick={() => setShowGenreModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-neutral-800 bg-neutral-100 hover:bg-neutral-200 ring-1 ring-black/5"
              title="Change Preferred Genres"
            >
              <IconBook />
              Genres
            </button>
          </div>
        </div>

        {/* Avatar + Badge */}
        <div className="flex flex-col items-center">
          <button
            className="relative group"
            onClick={() => setShowAvatarOverlay(true)}
            title="Customize avatar"
          >
            <div className={`flex items-center justify-center rounded-full ${avatarBorderClass} shadow-lg`} style={avatarBorderStyle}>
              <img
                src={avatarToShow.src}
                alt={avatarToShow.label}
                className="w-24 h-24 rounded-full object-cover bg-neutral-800"
                draggable={false}
              />
            </div>
            <span className="opacity-0 group-hover:opacity-100 transition absolute -bottom-2 left-1/2 -translate-x-1/2 text-[11px] bg-neutral-900 text-white px-2 py-0.5 rounded-full">
              Edit avatar
            </span>
          </button>

          <div className="mt-2 text-sm font-semibold text-black">{avatarToShow.label}</div>

          <span className={`mt-2 inline-flex items-center gap-1 px-3 py-1 rounded-full text-white text-xs font-semibold bg-gradient-to-r ${badge.color}`}>
            <IconCrown /> {badge.label}
          </span>
        </div>

        {/* Form: Username + Bio */}
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div className="flex flex-col">
            <label className="text-[11px] font-semibold text-neutral-500 mb-1">Display name</label>
            <input
              type="text"
              className="w-full px-3 py-2 rounded-xl bg-white border-2 border-neutral-200 focus:outline-none focus:border-orange-400 text-[15px]"
              placeholder="Choose a username"
              value={username}
              onChange={handleUsernameChange}
            />
          </div>
          <div className="flex flex-col">
            <label className="text-[11px] font-semibold text-neutral-500 mb-1">Short bio</label>
            <input
              type="text"
              className="w-full px-3 py-2 rounded-xl bg-white border-2 border-neutral-200 focus:outline-none focus:border-orange-400 text-[15px]"
              placeholder="Write a short bio about yourself…"
              value={bio}
              onChange={handleBioChange}
              maxLength={120}
            />
          </div>
        </div>

        {/* Stats */}
        <div className="mt-4 grid grid-cols-3 gap-3">
          {[
            { label: 'Books Read', value: stats.booksRead },
            { label: 'Reviews', value: stats.reviews },
            { label: 'Day Streak', value: stats.streak },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl bg-white/80 backdrop-blur ring-1 ring-black/5 px-3 py-3 text-center">
              <div className="text-2xl font-extrabold text-orange-500">{s.value}</div>
              <div className="text-[11px] text-neutral-500">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Favorite Genre + Preferred Genres */}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="px-3 py-1 rounded-full bg-orange-100 text-orange-700 text-xs font-semibold ring-1 ring-orange-200">
            Favorite Genre: {stats.favGenre}
          </span>
          {(() => {
            const preferredGenres = JSON.parse(localStorage.getItem('preferredGenres') || '[]');
            if (!preferredGenres.length) return null;
            return (
              <div className="flex flex-wrap gap-2">
                {preferredGenres.map((g, i) => (
                  <span key={i} className="px-3 py-1 rounded-full bg-neutral-100 text-neutral-700 text-xs font-semibold ring-1 ring-black/10">
                    {g}
                  </span>
                ))}
              </div>
            );
          })()}
        </div>

        {/* Achievements */}
        <div className="mt-6">
          <h4 className="text-sm font-bold text-orange-500 mb-2">Achievements</h4>
          <div className="flex flex-wrap gap-2">
            {stats.booksRead > 10 && <span className="px-2 py-1 rounded bg-green-100 text-green-700 text-xs font-semibold">10+ Books</span>}
            {stats.streak > 7 && <span className="px-2 py-1 rounded bg-blue-100 text-blue-700 text-xs font-semibold">7 Day Streak</span>}
            {stats.reviews > 5 && <span className="px-2 py-1 rounded bg-purple-100 text-purple-700 text-xs font-semibold">5+ Reviews</span>}
            {stats.booksRead > 50 && <span className="px-2 py-1 rounded bg-orange-100 text-orange-700 text-xs font-semibold">50+ Books</span>}
            {stats.booksRead > 100 && <span className="px-2 py-1 rounded bg-pink-100 text-pink-700 text-xs font-semibold">100+ Books</span>}
          </div>
        </div>

        {/* Your current explicit profile genres (if any) */}
        {Array.isArray(profile.genres) && profile.genres.length > 0 && (
          <div className="mt-4">
            <div className="text-[11px] font-semibold text-neutral-500 mb-1">Profile genres</div>
            <div className="flex flex-wrap gap-2">
              {profile.genres.map((g, i) => (
                <span key={i} className="px-3 py-1 rounded-full bg-orange-50 text-orange-700 text-xs font-semibold ring-1 ring-orange-200">
                  {g}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ======= Avatar Overlay (glassy sheet) ======= */}
      {showAvatarOverlay && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm flex items-center justify-center px-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowAvatarOverlay(false);
          }}
          role="dialog"
          aria-modal="true"
          aria-label="Choose your avatar"
        >
          <div className="bg-white/90 supports-[backdrop-filter]:bg-white/80 backdrop-blur rounded-2xl shadow-2xl ring-1 ring-black/5 w-full max-w-3xl max-h-[80vh] overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200">
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl text-white bg-gradient-to-br from-indigo-500 to-violet-600 ring-1 ring-white/20 shadow">
                  <IconPaint />
                </span>
                <h3 className="text-base font-extrabold tracking-tight text-neutral-900">Customize Avatar</h3>
              </div>
              <button
                onClick={() => setShowAvatarOverlay(false)}
                className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-white text-neutral-700 border border-neutral-200 hover:bg-neutral-50 focus:outline-none focus:ring-2 focus:ring-orange-300"
                aria-label="Close"
              >
                <IconBack className="-scale-x-100" />
              </button>
            </div>

            {/* Content */}
            <div className="p-4 overflow-y-auto" style={{ maxHeight: 'calc(80vh - 56px)' }}>
              {/* Avatars grid */}
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-4">
                {AVATARS.map((avatar, idx) => {
                  const active = avatarIdx === idx;
                  return (
                    <button
                      key={avatar.id}
                      onClick={() => handleAvatarSelect(idx)}
                      className={`relative group flex flex-col items-center justify-center rounded-2xl p-3 bg-white ring-1 ring-black/5 hover:ring-orange-300 transition ${
                        active ? 'outline outline-2 outline-orange-400' : ''
                      }`}
                      title={avatar.label}
                    >
                      <div className={`rounded-full ${avatarBorderClass} mb-2`} style={avatarBorderStyle}>
                        <img
                          src={avatar.src}
                          alt={avatar.label}
                          className="w-16 h-16 rounded-full object-cover bg-neutral-800"
                          draggable={false}
                        />
                      </div>
                      <span className="text-[11px] font-semibold text-neutral-800">{avatar.label}</span>
                      {active && (
                        <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-orange-500 ring-2 ring-white" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Border Color */}
              <div className="mt-5">
                <label className="text-xs font-semibold text-neutral-700 mb-2 block">Border color</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={borderColor}
                    onChange={handleBorderColorChange}
                    className="w-12 h-12 rounded-full border-2 border-neutral-300"
                    aria-label="Avatar border color"
                  />
                  <span className="text-xs text-neutral-500">{borderColor}</span>
                </div>
              </div>

              {/* Border Style */}
              <div className="mt-5">
                <label className="text-xs font-semibold text-neutral-700 mb-2 block">Border style</label>
                <div className="flex flex-wrap gap-2">
                  {BORDER_STYLES.map((style, idx) => {
                    const active = borderStyleIdx === idx;
                    return (
                      <button
                        key={style.name}
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition ${
                          active ? 'border-orange-400 bg-orange-100' : 'border-neutral-300 bg-white hover:bg-neutral-50'
                        }`}
                        style={style.style}
                        onClick={() => handleBorderStyleChange(idx)}
                        title={style.name}
                      >
                        {style.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Done */}
              <div className="mt-6 flex justify-end">
                <button
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 ring-1 ring-black/5"
                  onClick={() => setShowAvatarOverlay(false)}
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Genres Modal */}
      <GenreSelectorModal open={showGenreModal} onSave={handleGenreSave} />
    </div>
  );
}
