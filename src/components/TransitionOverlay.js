import React from 'react';
import { useTransition } from '../context/TransitionContext';
import './TransitionOverlay.css'; // We'll create this CSS file

const TransitionOverlay = () => {
  const { isTransitioning, transitionDirection, ripplePosition } = useTransition();

  return (
    <>
      {/* Main page transition overlay */}
      {isTransitioning && (
        <div
          className="transition-overlay"
          style={{
            background: transitionDirection === 'up' 
              ? 'linear-gradient(to top, rgba(251,146,60,0.95) 0%, rgba(251,146,60,0.8) 50%, transparent 100%)'
              : 'linear-gradient(to bottom, rgba(251,146,60,0.95) 0%, rgba(251,146,60,0.8) 50%, transparent 100%)',
            backdropFilter: 'blur(8px)',
          }}
        />
      )}

      {/* Ripple effect from button clicks */}
      {ripplePosition && (
        <div
          className="ripple-container"
          style={{
            left: ripplePosition.x - 100,
            top: ripplePosition.y - 100,
            width: 200,
            height: 200,
          }}
        >
          <div className="ripple-effect" />
        </div>
      )}
    </>
  );
};

export default TransitionOverlay;