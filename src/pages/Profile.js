// filepath: src/pages/Profile.js
import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AVATARS, BORDER_STYLES } from '../constants/avatars';
import GenreSelectorModal from '../components/GenreSelectorModal';
import BottomSheet from '../components/BottomSheet';

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

// Favorite genre to accent colors (for header pulse)
const GENRE_ACCENTS = {
  fiction: '#ef4444',
  fantasy: '#8b5cf6',
  'sci-fi': '#06b6d4',
  romance: '#ec4899',
  mystery: '#64748b',
  biography: '#10b981',
  thriller: '#f87171',
  horror: '#ef4444',
  adventure: '#f59e0b',
  poetry: '#22c55e',
  children: '#14b8a6',
  'self-help': '#38bdf8',
  history: '#fbbf24',
  science: '#0ea5e9',
  classic: '#94a3b8',
  memoir: '#34d399',
  crime: '#ef4444',
  psychology: '#22c55e',
  philosophy: '#fbbf24',
  spirituality: '#8b5cf6',
  business: '#f59e0b',
  'graphic novel': '#8b5cf6',
  dystopian: '#64748b',
  default: '#fb923c'
};

// XP / Level helpers
const XP_KEY = 'profile:xp';
const LVL_KEY = 'profile:level';
const COMPLETENESS_REWARDED_KEY = 'profile:completenessRewarded';
const DAILY_KEY = 'quests:daily';
const WEEKLY_KEY = 'quests:weekly';
const BASELINE_LIKES_DAILY = 'quests:baseline:likes:daily';
const BASELINE_LIKES_WEEKLY = 'quests:baseline:likes:weekly';
const BIO_TODAY_KEY = 'quests:bioUpdated:isoDate';
const GENRES_TODAY_KEY = 'quests:genresUpdated:isoDate';

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}
function isoWeekKey(d = new Date()) {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((date - yearStart) / 86400000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

function xpForLevel(level) {
  return 100 + (level - 1) * 50;
}
function getLevelAndProgress(xp) {
  let level = 1;
  let remaining = xp;
  while (remaining >= xpForLevel(level)) {
    remaining -= xpForLevel(level);
    level += 1;
  }
  const needed = xpForLevel(level);
  const progress = needed ? remaining / needed : 0;
  return { level, progress, remaining, needed };
}
function getLocalLikes() {
  try { return JSON.parse(localStorage.getItem('likedBooks') || '[]'); } catch { return []; }
}

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
  // eslint-disable-next-line
  const navigate = useNavigate();
  const initialProfile = useMemo(() => getProfile(), []);
  const [profile, setProfileState] = useState(initialProfile);

  // Avatar states
  const initialAvatarIdx =
    AVATARS.findIndex(a => a.id === initialProfile.avatarId) !== -1
      ? AVATARS.findIndex(a => a.id === initialProfile.avatarId)
      : 0;
  const [avatarIdx, setAvatarIdx] = useState(initialAvatarIdx);

  const [username, setUsername] = useState(() => localStorage.getItem('displayName') || '');
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

  // XP / Level state
  const [xp, setXp] = useState(() => parseInt(localStorage.getItem(XP_KEY) || '0', 10));
  const [level, setLevel] = useState(() => parseInt(localStorage.getItem(LVL_KEY) || '1', 10));
  const { progress: levelProgress } = useMemo(() => getLevelAndProgress(xp), [xp]);

  // Animated conic ring angle (0..360)
  const [ringAngle, setRingAngle] = useState(() => Math.round(levelProgress * 360));
  const animRef = useRef(null);

  // XP Chip
  const [xpChip, setXpChip] = useState({ visible: false, x: 0, y: 0, amount: 0 });

  // Toast for completeness
  const [toast, setToast] = useState(null);

  // Quests
  const [daily, setDaily] = useState(() => {
    try { return JSON.parse(localStorage.getItem(DAILY_KEY) || 'null'); } catch { return null; }
  });
  const [weekly, setWeekly] = useState(() => {
    try { return JSON.parse(localStorage.getItem(WEEKLY_KEY) || 'null'); } catch { return null; }
  });
  const [showQuestsSheet, setShowQuestsSheet] = useState(false);

  // Initialize / reset quests
  useEffect(() => {
    const iso = todayISO();
    const week = isoWeekKey();

    // Daily baseline likes
    if (localStorage.getItem(BASELINE_LIKES_DAILY_DATE_KEY()) !== iso) {
      localStorage.setItem(BASELINE_LIKES_DAILY, String(getLocalLikes().length));
      localStorage.setItem(BASELINE_LIKES_DAILY_DATE_KEY(), iso);
    }
    // Weekly baseline likes
    if (localStorage.getItem(BASELINE_LIKES_WEEKLY_DATE_KEY()) !== week) {
      localStorage.setItem(BASELINE_LIKES_WEEKLY, String(getLocalLikes().length));
      localStorage.setItem(BASELINE_LIKES_WEEKLY_DATE_KEY(), week);
    }

    // Daily
    if (!daily || daily.iso !== iso) {
      const newDaily = {
        iso,
        quests: [
          { id: 'like3', title: 'Like 3 books', xp: 20, target: 3, progress: 0, completed: false, type: 'daily' },
          { id: 'bioToday', title: 'Update your bio today', xp: 10, target: 1, progress: 0, completed: false, type: 'daily' },
          { id: 'genresToday', title: 'Set your genres today', xp: 15, target: 1, progress: 0, completed: false, type: 'daily' }
        ]
      };
      setDaily(newDaily);
      localStorage.setItem(DAILY_KEY, JSON.stringify(newDaily));
    }
    // Weekly
    if (!weekly || weekly.week !== week) {
      const newWeekly = {
        week,
        quests: [
          { id: 'like10w', title: 'Like 10 books this week', xp: 50, target: 10, progress: 0, completed: false, type: 'weekly' }
        ]
      };
      setWeekly(newWeekly);
      localStorage.setItem(WEEKLY_KEY, JSON.stringify(newWeekly));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Recompute quest progress from sources
  useEffect(() => {
    const iso = todayISO();
    const week = isoWeekKey();
    const likes = getLocalLikes().length;
    const baselineD = parseInt(localStorage.getItem(BASELINE_LIKES_DAILY) || '0', 10);
    const baselineW = parseInt(localStorage.getItem(BASELINE_LIKES_WEEKLY) || '0', 10);
    const likedToday = Math.max(0, likes - baselineD);
    const likedWeek = Math.max(0, likes - baselineW);

    // Daily
    if (daily && daily.iso === iso) {
      const copy = { ...daily, quests: daily.quests.map(q => ({ ...q })) };
      for (const q of copy.quests) {
        if (q.id === 'like3') q.progress = Math.min(q.target, likedToday);
        if (q.id === 'bioToday') q.progress = localStorage.getItem(BIO_TODAY_KEY) === iso ? 1 : 0;
        if (q.id === 'genresToday') q.progress = localStorage.getItem(GENRES_TODAY_KEY) === iso ? 1 : 0;
        q.completed = q.progress >= q.target;
      }
      setDaily(copy);
      localStorage.setItem(DAILY_KEY, JSON.stringify(copy));
    }
    // Weekly
    if (weekly && weekly.week === week) {
      const copyW = { ...weekly, quests: weekly.quests.map(q => ({ ...q })) };
      for (const q of copyW.quests) {
        if (q.id === 'like10w') q.progress = Math.min(q.target, likedWeek);
        q.completed = q.progress >= q.target;
      }
      setWeekly(copyW);
      localStorage.setItem(WEEKLY_KEY, JSON.stringify(copyW));
    }
  }, [daily?.iso, weekly?.week, username, bio, profile.genres]);

  function BASELINE_LIKES_DAILY_DATE_KEY() { return 'quests:baseline:likes:daily:date'; }
  function BASELINE_LIKES_WEEKLY_DATE_KEY() { return 'quests:baseline:likes:weekly:week'; }

  // Animate ring when xp changes
  useEffect(() => {
    const { progress } = getLevelAndProgress(xp);
    const targetAngle = Math.round(progress * 360);
    if (prefersReducedMotion()) {
      setRingAngle(targetAngle);
      return;
    }
    cancelAnimationFrame(animRef.current);
    const start = ringAngle;
    const delta = targetAngle - start;
    const duration = 600;
    const t0 = performance.now();
    const step = (t) => {
      const elapsed = Math.min(1, (t - t0) / duration);
      const eased = 0.5 - Math.cos(elapsed * Math.PI) / 2;
      setRingAngle(Math.round(start + delta * eased));
      if (elapsed < 1) animRef.current = requestAnimationFrame(step);
    };
    animRef.current = requestAnimationFrame(step);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [xp]);

  // Persist xp/level when xp changes
  useEffect(() => {
    const { level: newLevel } = getLevelAndProgress(xp);
    if (newLevel !== level) setLevel(newLevel);
    localStorage.setItem(XP_KEY, String(xp));
    localStorage.setItem(LVL_KEY, String(newLevel));
  }, [xp]); // eslint-disable-line react-hooks/exhaustive-deps

  const addXP = useCallback((amount, srcRect) => {
    if (!amount || amount <= 0) return;
    const before = getLevelAndProgress(xp);
    const newXp = Math.max(0, xp + amount);
    const after = getLevelAndProgress(newXp);
    setXp(newXp);
    try { navigator?.vibrate?.(10); } catch {}
    // show chip near source
    const x = srcRect ? Math.round(srcRect.left + srcRect.width / 2) : window.innerWidth / 2;
    const y = srcRect ? Math.round(srcRect.top) : 80;
    setXpChip({ visible: true, x, y, amount });
    setTimeout(() => setXpChip(prev => ({ ...prev, visible: false })), prefersReducedMotion() ? 500 : 1200);
    // notify header/components
    window.dispatchEvent(new CustomEvent('profileXPUpdated', { detail: { amount, before, after } }));
  }, [xp]);

  // Profile completeness (5 checks)
  const likedBooksCount = getLocalLikes().length;
  const preferredGenres = useMemo(() => {
    try { return JSON.parse(localStorage.getItem('preferredGenres') || '[]'); } catch { return []; }
  }, [profile.genres]);
  const completenessItems = [
    { id: 'username', ok: Boolean(username?.trim()) },
    { id: 'bio', ok: Boolean(bio?.trim()) },
    { id: 'avatar', ok: avatarIdx !== 0 || Boolean(initialProfile.avatarId) },
    { id: 'genres', ok: (preferredGenres?.length || 0) >= 3 },
    { id: 'likes', ok: likedBooksCount >= 5 }
  ];
  const completeness = Math.round((completenessItems.filter(i => i.ok).length / 5) * 100);

  useEffect(() => {
    if (completeness === 100 && localStorage.getItem(COMPLETENESS_REWARDED_KEY) !== 'true') {
      localStorage.setItem(COMPLETENESS_REWARDED_KEY, 'true');
      // show toast
      setToast({ type: 'success', text: 'Profile complete! +30 XP 🎉' });
      setTimeout(() => setToast(null), 2200);
      // award XP with chip centered
      addXP(30, null);
    }
  }, [completeness, addXP]);

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
    localStorage.setItem('displayName', value);
    persist({ username: value });
    // Notify GreetingBar via storage event
    window.dispatchEvent(new Event('storage'));
  };

  const handleBioChange = (e) => {
    const value = e.target.value;
    setBio(value);
    persist({ bio: value });
    // mark quest done today
    localStorage.setItem(BIO_TODAY_KEY, todayISO());
  };

  const handleGenreSave = (selectedGenres) => {
    if (selectedGenres && selectedGenres.length >= 3) {
      localStorage.setItem('preferredGenres', JSON.stringify(selectedGenres));
      localStorage.setItem('hasSelectedGenres', 'true');
      window.dispatchEvent(new Event('genresUpdated'));
      persist({ genres: selectedGenres });
      // mark quest today
      localStorage.setItem(GENRES_TODAY_KEY, todayISO());
      // header pulse by favorite genre accent
      const fav = (selectedGenres?.[0] || 'default').toLowerCase();
      const accent = GENRE_ACCENTS[fav] || GENRE_ACCENTS.default;
      window.dispatchEvent(new CustomEvent('headerPulse', { detail: { accent } }));
    }
    setShowGenreModal(false);
  };

  // Visible quests (top 3 from combined daily/weekly)
  const visibleQuests = useMemo(() => {
    const list = [];
    if (daily?.quests) list.push(...daily.quests);
    if (weekly?.quests) list.push(...weekly.quests);
    return list.slice(0, 3);
  }, [daily, weekly]);

  const handleClaimXP = (quest, e) => {
    if (!quest?.completed) return;
    const rect = e?.currentTarget?.getBoundingClientRect?.();
    addXP(quest.xp, rect || null);
    // mark as claimed by setting completed but no double-claim
    // To keep simple, we store a claimed flag
    if (quest.type === 'daily') {
      const copy = { ...daily, quests: daily.quests.map(q => q.id === quest.id ? { ...q, completed: true, claimed: true } : q) };
      setDaily(copy);
      localStorage.setItem(DAILY_KEY, JSON.stringify(copy));
    } else {
      const copy = { ...weekly, quests: weekly.quests.map(q => q.id === quest.id ? { ...q, completed: true, claimed: true } : q) };
      setWeekly(copy);
      localStorage.setItem(WEEKLY_KEY, JSON.stringify(copy));
    }
  };

  // ===================== UI ===================== //
  return (
    <div className="inset-0 flex flex-col items-center justify-start min-h-screen w-full bg-white text-black">
      {/* +XP Chip */}
      {xpChip.visible && (
        <div
          className="fixed z-[2100] px-2 py-1 rounded-full bg-green-600 text-white text-xs font-bold shadow transition-opacity"
          style={{ left: xpChip.x, top: xpChip.y, transform: 'translate(-50%, -50%)', opacity: xpChip.visible ? 1 : 0 }}
          aria-live="polite"
        >
          +{xpChip.amount} XP
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed top-3 left-1/2 -translate-x-1/2 z-[2000]">
          <div className="px-4 py-2 rounded-xl bg-gradient-to-r from-green-500 to-emerald-500 text-white text-sm font-semibold shadow">
            {toast.text}
          </div>
        </div>
      )}

      <div className="w-full max-w-5xl px-4 py-4">
        {/* Header Card + XP/Level display */}
        <div className="mb-4 rounded-2xl bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60 ring-1 ring-black/5 px-3 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <span className="inline-flex items-center justify-center w-10 h-10 rounded-xl text-white shadow-md ring-1 ring-white/20 bg-gradient-to-br from-amber-400 to-orange-500">
                <IconUser className="w-5 h-5 text-white/90" />
              </span>
              <div className="min-w-0">
                <h1 className="text-xl font-extrabold tracking-tight text-neutral-900 truncate">Your Profile</h1>
                <p className="text-[11px] text-neutral-500">Level {level} • {xp} XP</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <div className="text-xs text-neutral-600" aria-label={`Level progress ${Math.round(levelProgress*100)}%`}>
                {Math.round(levelProgress * 100)}% to next level
              </div>
              <button
                onClick={() => setShowGenreModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-neutral-800 bg-neutral-100 hover:bg-neutral-200 ring-1 ring-black/5 focus:outline-none focus:ring-2 focus:ring-orange-300"
                title="Change Preferred Genres"
                aria-label="Change preferred genres"
              >
                <IconBook />
                Genres
              </button>
            </div>
          </div>
        </div>

        {/* Avatar + Badge + XP Ring */}
        <div className="flex flex-col items-center">
          <button
            className="relative group focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 rounded-full"
            onClick={() => setShowAvatarOverlay(true)}
            title="Customize avatar"
            aria-label="Customize avatar"
          >
            {/* Conic-gradient ring wrapper */}
            <div
              className="relative p-1 rounded-full"
              style={{
                background: `conic-gradient(#f97316 ${ringAngle}deg, #e5e7eb 0deg)`,
              }}
              aria-hidden="true"
            >
              <div className="bg-white rounded-full p-[6px]">
                <div className={`flex items-center justify-center rounded-full ${avatarBorderClass} shadow-lg`} style={avatarBorderStyle}>
                  <img
                    src={avatarToShow.src}
                    alt={avatarToShow.label}
                    className="w-24 h-24 rounded-full object-cover bg-neutral-800"
                    draggable={false}
                  />
                </div>
              </div>
              {/* progress label */}
              <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 text-[10px] font-semibold text-neutral-500">
                L{level}
              </span>
            </div>

            <span className="opacity-0 group-hover:opacity-100 transition absolute -bottom-6 left-1/2 -translate-x-1/2 text-[11px] bg-neutral-900 text-white px-2 py-0.5 rounded-full">
              Edit avatar
            </span>
          </button>

          <div className="mt-2 text-sm font-semibold text-black">{avatarToShow.label}</div>

          <span className={`mt-2 inline-flex items-center gap-1 px-3 py-1 rounded-full text-white text-xs font-semibold bg-gradient-to-r ${badge.color}`}>
            <IconCrown /> {badge.label}
          </span>
        </div>

        {/* Profile Completeness */}
        <div className="mt-4 w-full max-w-md mx-auto">
          <div className="flex items-center justify-between mb-1">
            <div className="text-xs font-semibold text-neutral-700">Profile completeness</div>
            <div className="text-xs text-neutral-500">{completeness}%</div>
          </div>
          <div className="w-full h-2 rounded-full bg-neutral-200 overflow-hidden" aria-label={`Profile completeness ${completeness}%`}>
            <div
              className="h-full bg-gradient-to-r from-orange-500 to-amber-400 transition-[width]"
              style={{ width: `${completeness}%`, transitionDuration: prefersReducedMotion() ? '0ms' : '600ms' }}
            />
          </div>
          <div className="mt-2 flex flex-wrap gap-1">
            {completenessItems.map(i => (
              <span
                key={i.id}
                className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ring-1 ${
                  i.ok ? 'bg-green-100 text-green-700 ring-green-200' : 'bg-neutral-100 text-neutral-600 ring-black/10'
                }`}
                aria-label={`${i.id} ${i.ok ? 'completed' : 'missing'}`}
              >
                {i.ok ? '✓' : '•'} {i.id}
              </span>
            ))}
          </div>
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
              aria-label="Display name"
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
              aria-label="Short bio"
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
            const preferred = preferredGenres;
            if (!preferred.length) return null;
            return (
              <div className="flex flex-wrap gap-2">
                {preferred.map((g, i) => (
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

        {/* Quests */}
        <div className="mt-6 w-full">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-bold text-orange-500">Quests</h4>
            <button
              onClick={() => setShowQuestsSheet(true)}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-neutral-100 hover:bg-neutral-200 ring-1 ring-black/5 focus:outline-none focus:ring-2 focus:ring-orange-300"
              aria-label="View all quests"
            >
              View all
            </button>
          </div>
          <div className="grid gap-3 sm:grid-cols-3">
            {visibleQuests.map(q => {
              const pct = Math.round((q.progress / q.target) * 100);
              return (
                <div key={q.id} className="rounded-2xl bg-white ring-1 ring-black/5 p-3">
                  <div className="text-sm font-semibold text-neutral-800">{q.title}</div>
                  <div className="text-[11px] text-neutral-500 mb-2 capitalize">{q.type}</div>
                  <div className="w-full h-2 bg-neutral-200 rounded-full overflow-hidden mb-2" aria-label={`${q.title} ${pct}%`}>
                    <div className={`h-full ${q.completed ? 'bg-green-500' : 'bg-orange-500'}`} style={{ width: `${pct}%` }} />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-neutral-600">{q.progress}/{q.target}</span>
                    <button
                      onClick={(e) => q.completed && !q.claimed ? handleClaimXP(q, e) : null}
                      disabled={!q.completed || q.claimed}
                      className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-orange-300 ${
                        q.claimed ? 'bg-neutral-100 text-neutral-400' :
                        q.completed ? 'bg-green-600 text-white hover:bg-green-700' :
                        'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                      }`}
                      aria-label={q.completed && !q.claimed ? `Claim ${q.xp} XP for ${q.title}` : q.title}
                    >
                      {q.claimed ? 'Claimed' : q.completed ? `Claim +${q.xp} XP` : 'In progress'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
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
                      onClick={(e) => {
                        handleAvatarSelect(idx);
                        // small XP for trying customization once
                        if (localStorage.getItem('xp:firstAvatarChange') !== 'true') {
                          localStorage.setItem('xp:firstAvatarChange', 'true');
                          addXP(5, e.currentTarget.getBoundingClientRect());
                        }
                      }}
                      className={`relative group flex flex-col items-center justify-center rounded-2xl p-3 bg-white ring-1 ring-black/5 hover:ring-orange-300 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 ${
                        active ? 'outline outline-2 outline-orange-400' : ''
                      }`}
                      title={avatar.label}
                      aria-label={`Choose avatar ${avatar.label}`}
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
                        className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 ${
                          active ? 'border-orange-400 bg-orange-100' : 'border-neutral-300 bg-white hover:bg-neutral-50'
                        }`}
                        style={style.style}
                        onClick={(e) => {
                          handleBorderStyleChange(idx);
                          if (localStorage.getItem('xp:firstBorderChange') !== 'true') {
                            localStorage.setItem('xp:firstBorderChange', 'true');
                            addXP(5, e.currentTarget.getBoundingClientRect());
                          }
                        }}
                        title={style.name}
                        aria-label={`Select border style ${style.name}`}
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
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 ring-1 ring-black/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-orange-400"
                  onClick={() => setShowAvatarOverlay(false)}
                  aria-label="Done customizing avatar"
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

      {/* Quests Bottom Sheet */}
      <BottomSheet open={showQuestsSheet} onClose={() => setShowQuestsSheet(false)} title="All quests">
        <div className="p-4 space-y-4">
          {daily && (
            <div>
              <div className="text-xs font-bold text-neutral-600 uppercase mb-2">Daily</div>
              <div className="grid gap-3">
                {daily.quests.map(q => {
                  const pct = Math.round((q.progress / q.target) * 100);
                  return (
                    <div key={q.id} className="rounded-2xl bg-white ring-1 ring-black/5 p-3">
                      <div className="flex items-center justify-between mb-1">
                        <div className="font-semibold text-neutral-800">{q.title}</div>
                        <div className="text-xs text-neutral-500">{q.progress}/{q.target}</div>
                      </div>
                      <div className="w-full h-2 bg-neutral-200 rounded-full overflow-hidden mb-2">
                        <div className={`h-full ${q.completed ? 'bg-green-500' : 'bg-orange-500'}`} style={{ width: `${pct}%` }} />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-neutral-500">Reward: +{q.xp} XP</span>
                        <button
                          onClick={(e) => q.completed && !q.claimed ? handleClaimXP(q, e) : null}
                          disabled={!q.completed || q.claimed}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-orange-300 ${
                            q.claimed ? 'bg-neutral-100 text-neutral-400' :
                            q.completed ? 'bg-green-600 text-white hover:bg-green-700' :
                            'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                          }`}
                          aria-label={q.completed && !q.claimed ? `Claim ${q.xp} XP for ${q.title}` : q.title}
                        >
                          {q.claimed ? 'Claimed' : q.completed ? `Claim +${q.xp} XP` : 'In progress'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
          {weekly && (
            <div>
              <div className="text-xs font-bold text-neutral-600 uppercase mb-2">Weekly</div>
              <div className="grid gap-3">
                {weekly.quests.map(q => {
                  const pct = Math.round((q.progress / q.target) * 100);
                  return (
                    <div key={q.id} className="rounded-2xl bg-white ring-1 ring-black/5 p-3">
                      <div className="flex items-center justify-between mb-1">
                        <div className="font-semibold text-neutral-800">{q.title}</div>
                        <div className="text-xs text-neutral-500">{q.progress}/{q.target}</div>
                      </div>
                      <div className="w-full h-2 bg-neutral-200 rounded-full overflow-hidden mb-2">
                        <div className={`h-full ${q.completed ? 'bg-green-500' : 'bg-orange-500'}`} style={{ width: `${pct}%` }} />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-xs text-neutral-500">Reward: +{q.xp} XP</span>
                        <button
                          onClick={(e) => q.completed && !q.claimed ? handleClaimXP(q, e) : null}
                          disabled={!q.completed || q.claimed}
                          className={`px-3 py-1.5 rounded-lg text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-orange-300 ${
                            q.claimed ? 'bg-neutral-100 text-neutral-400' :
                            q.completed ? 'bg-green-600 text-white hover:bg-green-700' :
                            'bg-neutral-100 text-neutral-700 hover:bg-neutral-200'
                          }`}
                          aria-label={q.completed && !q.claimed ? `Claim ${q.xp} XP for ${q.title}` : q.title}
                        >
                          {q.claimed ? 'Claimed' : q.completed ? `Claim +${q.xp} XP` : 'In progress'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </BottomSheet>
    </div>
  );
}
