import React, { createContext, useContext, useState } from 'react';

const TransitionContext = createContext();

export const useTransition = () => {
  const context = useContext(TransitionContext);
  if (!context) {
    throw new Error('useTransition must be used within a TransitionProvider');
  }
  return context;
};

export const TransitionProvider = ({ children }) => {
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [transitionDirection, setTransitionDirection] = useState('up');
  const [ripplePosition, setRipplePosition] = useState(null);

  const startTransition = (direction = 'up', ripplePos = null) => {
    setTransitionDirection(direction);
    setRipplePosition(ripplePos);
    setIsTransitioning(true);

    // Auto-end transition after content loads
    setTimeout(() => {
      setIsTransitioning(false);
      setRipplePosition(null);
    }, 700); // Match the CSS transition duration
  };

  const value = {
    isTransitioning,
    transitionDirection,
    ripplePosition,
    startTransition,
  };

  return (
    <TransitionContext.Provider value={value}>
      {children}
    </TransitionContext.Provider>
  );
};