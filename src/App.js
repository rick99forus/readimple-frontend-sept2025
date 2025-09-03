import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { TransitionProvider } from './context/TransitionContext';
import TransitionOverlay from './components/TransitionOverlay';
import TabBar from './components/TabBar';
import Header from './components/Header';

// Pages
import Home from './pages/Home';
import DiscoverNews from './pages/DiscoverNews';
import Scan from './pages/Scan';
import BookShelf from './pages/Bookshelf';
import Profile from './pages/Profile';
import GenreSelection from './pages/GenreSelection';

export default function App() {
  const [showTabBar, setShowTabBar] = useState(true);
  const [showHeader, setShowHeader] = useState(true);
  const [userCheckComplete, setUserCheckComplete] = useState(false);
  const [isFirstTimeUser, setIsFirstTimeUser] = useState(false);

  // Check user status on mount - only once
  useEffect(() => {
    const checkUserStatus = () => {
      try {
        const hasSelectedGenres = localStorage.getItem('hasSelectedGenres') === 'true';
        const preferredGenres = JSON.parse(localStorage.getItem('preferredGenres') || '[]');
        const hasPreferredGenres = preferredGenres.length >= 3;
        
        const isNewUser = !hasSelectedGenres && !hasPreferredGenres;
        
        console.log('🔍 User Status Check:', {
          hasSelectedGenres,
          hasPreferredGenres,
          preferredGenresCount: preferredGenres.length,
          isFirstTime: isNewUser
        });
        
        setIsFirstTimeUser(isNewUser);
        setUserCheckComplete(true);
        
      } catch (error) {
        console.error('Error checking user status:', error);
        // If there's an error, assume not first time user to prevent loops
        setIsFirstTimeUser(false);
        setUserCheckComplete(true);
      }
    };

    checkUserStatus();
  }, []); // Empty dependency array - only run once on mount

  // Listen for changes in localStorage (when user completes genre selection)
  useEffect(() => {
    const handleStorageChange = () => {
      console.log('📝 Storage changed - rechecking user status');
      const hasSelectedGenres = localStorage.getItem('hasSelectedGenres') === 'true';
      const preferredGenres = JSON.parse(localStorage.getItem('preferredGenres') || '[]');
      const hasPreferredGenres = preferredGenres.length >= 3;
      
      if (hasSelectedGenres || hasPreferredGenres) {
        setIsFirstTimeUser(false);
        console.log('✅ User completed setup - no longer first time');
      }
      
    };

    // Listen for custom events (when genre selection completes)
    window.addEventListener('genresUpdated', handleStorageChange);
    
    return () => {
      window.removeEventListener('genresUpdated', handleStorageChange);
    };
  }, []);

  // Show loading until user check is complete
  if (!userCheckComplete) {
    return (
      <div className="min-h-screen bg-neutral-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 bg-orange-400 rounded-full flex items-center justify-center mx-auto mb-4 animate-pulse">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <p className="text-gray-500 text-sm">Loading Readimple...</p>
        </div>
      </div>
    );
  }

  return (
    <TransitionProvider>
      <Router>
        <div className="bg-white text-black min-h-screen flex flex-col items-center">
          <div className="w-full">
            <div className="App">
              <TransitionOverlay />

              {/* Header */}
              {showHeader && <Header />}

              <div className={`${showTabBar ? 'pb-[70px]' : ''} ${showHeader ? 'pt-[56px]' : ''}
                `}>
                <Routes>
                  {/* If first time user, only allow genre selection */}
                  {isFirstTimeUser ? (
                    <Route
                      path="*"
                      element={
                        <GenreSelection
                          setShowTabBar={setShowTabBar}
                          setShowHeader={setShowHeader}
                          onComplete={() => {
                            setIsFirstTimeUser(false);
                            window.dispatchEvent(new Event('genresUpdated'));
                          }}
                        />
                      }
                    />
                  ) : (
                    <>
                      <Route
                        path="/genre-selection"
                        element={
                          <GenreSelection
                            setShowTabBar={setShowTabBar}
                            setShowHeader={setShowHeader}
                            onComplete={() => {
                              setIsFirstTimeUser(false);
                              window.dispatchEvent(new Event('genresUpdated'));
                            }}
                          />
                        }
                      />
                      <Route
                        path="/"
                        element={
                          <Home setShowTabBar={setShowTabBar} setShowHeader={setShowHeader} />
                        }
                      />
                      <Route
                        path="/discover"
                        element={
                          <DiscoverNews setShowTabBar={setShowTabBar} setShowHeader={setShowHeader} />
                        }
                      />
                      <Route
                        path="/scan"
                        element={
                          <Scan setShowTabBar={setShowTabBar} setShowHeader={setShowHeader} />
                        }
                      />
                      <Route
                        path="/profile"
                        element={
                          <Profile setShowTabBar={setShowTabBar} setShowHeader={setShowHeader} />
                        }
                      />
                      <Route
                        path="/bookshelf"
                        element={
                          <BookShelf setShowTabBar={setShowTabBar} setShowHeader={setShowHeader} />
                        }
                      />
                      {/* Fallback route */}
                      <Route path="*" element={<Navigate to="/" replace />} />
                    </>
                  )}
                </Routes>
              </div>

              {/* TabBar only if not first time user */}
              {!isFirstTimeUser && showTabBar && <TabBar />}
            </div>
          </div>
        </div>
      </Router>
    </TransitionProvider>
  );
}
