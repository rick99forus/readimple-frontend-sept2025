import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTransition } from '../context/TransitionContext';

const AVATARS = [
  { id: 1, src: '/avatars/icons8-cat-100.png', label: 'Book Cat' },
  { id: 2, src: '/avatars/icons8-corgi-100.png', label: 'Corgi Reader' },
  { id: 3, src: '/avatars/icons8-dog-100.png', label: 'Doggo Bookworm' },
  { id: 4, src: '/avatars/icons8-pixel-cat-100.png', label: 'Pixel Cat' },
  { id: 5, src: '/avatars/icons8-heart-with-dog-paw-100.png', label: 'Paw Heart' },
  { id: 6, src: '/avatars/icons8-books-100.png', label: 'Book Stack' },
  { id: 7, src: '/avatars/icons8-art-book-100.png', label: 'Art Book' },
  { id: 8, src: '/avatars/icons8-learning-100.png', label: 'Learning Owl' },
  { id: 9, src: '/avatars/icons8-grooming-100.png', label: 'Groomed Reader' },
  { id: 10, src: '/avatars/icons8-freedom-100.png', label: 'Freedom Reader' },
  { id: 11, src: '/avatars/icons8-storytelling-100.png', label: 'Storyteller' },
  { id: 12, src: '/avatars/icons8-book-100.png', label: 'Classic Book' },
];

function getProfile() {
  try {
    return JSON.parse(localStorage.getItem('profile') || '{}');
  } catch {
    return {};
  }
}

const tabs = [
  {
    to: '/',
    label: 'Home',
    activeIcon: (
      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
        <path d="M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z"/>
      </svg>
    ),
    inactiveIcon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <path d="M3 12L12 3l9 9" strokeLinecap="round" strokeLinejoin="round"/>
        <path d="M9 21V15h6v6" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    to: '/discover',
    label: 'Discover',
    activeIcon: (
      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
      </svg>
    ),
    inactiveIcon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26 12,2"/>
      </svg>
    ),
  },
  {
    to: '/scan',
    label: 'Scan',
    activeIcon: (
      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
        <path d="M3 3h6v6H3V3zm2 2v2h2V5H5zm6-2h6v6h-6V3zm2 2v2h2V5h-2zM3 15h6v6H3v-6zm2 2v2h2v-2H5zm11 0h2v2h-2v-2zm0-2h2v2h-2v-2zm2 0h2v2h-2v-2zm0-2h2v2h-2v-2zm-4 0h2v2h-2v-2zm0 2h2v2h-2v-2zm0 2h2v2h-2v-2zm2 2h2v2h-2v-2z"/>
      </svg>
    ),
    inactiveIcon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <rect x="3" y="3" width="6" height="6" rx="1"/>
        <rect x="15" y="3" width="6" height="6" rx="1"/>
        <rect x="3" y="15" width="6" height="6" rx="1"/>
        <line x1="15" y1="15" x2="21" y2="15"/>
        <line x1="15" y1="17" x2="21" y2="17"/>
        <line x1="15" y1="19" x2="21" y2="19"/>
        <line x1="15" y1="21" x2="21" y2="21"/>
      </svg>
    ),
  },
  {
    to: '/bookshelf',
    label: 'Bookshelf',
    activeIcon: (
      <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
        <path d="M4 2v2h16V2H4zm0 18v2h16v-2H4zM6 6v12h3V6H6zm5 0v12h3V6h-3zm5 0v12h3V6h-3z"/>
        <path d="M3 5h18v1H3zm0 13h18v1H3z"/>
      </svg>
    ),
    inactiveIcon: (
      <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
        <rect x="4" y="4" width="16" height="16" rx="2"/>
        <line x1="8" y1="8" x2="8" y2="16"/>
        <line x1="12" y1="8" x2="12" y2="16"/>
        <line x1="16" y1="8" x2="16" y2="16"/>
      </svg>
    ),
  },
];

const TabBar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const profile = getProfile();
  const avatarId = profile.avatarId;
  const { startTransition } = useTransition();
  const [activeRipple, setActiveRipple] = useState(null);

  const handleTabClick = (tabTo, event) => {
    if (location.pathname === tabTo) return;

    // Get click position for ripple effect
    const rect = event.currentTarget.getBoundingClientRect();
    const ripplePos = {
      x: rect.left + rect.width / 2,
      y: rect.top + rect.height / 2,
    };

    // Create immediate visual feedback
    setActiveRipple(tabTo);
    setTimeout(() => setActiveRipple(null), 200);

    // Start transition with ripple effect
    startTransition('up', ripplePos);

    // Navigate immediately
    setTimeout(() => {
      navigate(tabTo);
    }, 50);
  };

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 z-[200] w-full max-w-screen">
      <div className="bg-white border-t-2 border-gray-100 rounded-t-xl shadow-sm px-2">
        <div className="flex justify-evenly items-center px-2 py-1 w-screen">
          {tabs.map(tab => {
            const isActive = location.pathname === tab.to;
            const isRippling = activeRipple === tab.to;
            const tabKey = tab.label.toLowerCase();
            let icon = isActive ? tab.activeIcon : tab.inactiveIcon;
            
            // Handle Profile tab with avatar
            if (tabKey === 'profile') {
              if (avatarId) {
                const borderColor = profile.avatarBorderColor || '#f97316';
                
                icon = (
                  <img
                    src={AVATARS.find(a => a.id === avatarId)?.src || AVATARS[0].src}
                    alt="avatar"
                    className="w-6 h-6 rounded-full transition-all duration-200"
                    style={{
                      border: `2px solid ${isActive ? borderColor : '#e5e7eb'}`,
                      filter: isActive ? 'brightness(1.1)' : 'brightness(0.9)',
                    }}
                  />
                );
              } else {
                icon = (
                  <div className="relative">
                    <svg 
                      className="w-6 h-6" 
                      fill={isActive ? 'currentColor' : 'none'} 
                      stroke="currentColor" 
                      strokeWidth={isActive ? "1" : "2"} 
                      viewBox="0 0 24 24"
                    >
                      <circle cx="12" cy="8" r="4"/>
                      <path d="M4 20c0-4 4-6 8-6s8 2 8 6" strokeLinecap="round"/>
                    </svg>
                    <span className="absolute -top-1 -right-1 w-2 h-2 bg-orange-400 rounded-full"></span>
                  </div>
                );
              }
            }

            return (
              <button
                key={tab.to}
                className={`
                  flex flex-col items-center py-2 px-3 transition-all duration-200 min-w-[50px]
                  ${isActive 
                    ? 'text-orange-500' 
                    : 'text-gray-400 hover:text-gray-600'
                  }
                  ${isRippling ? 'scale-95' : 'scale-100'}
                `}
                onClick={(e) => handleTabClick(tab.to, e)}
              >
                {/* Simple active indicator */}
                {isActive && (
                  <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-6 h-0.5 bg-orange-400 rounded-full"></div>
                )}

                {/* Icon */}
                <div className="mb-1">
                  {icon}
                </div>
                
                {/* Label */}
                <span className={`text-xs ${isActive ? 'font-semibold' : 'font-normal'}`}>
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
};

export default TabBar;