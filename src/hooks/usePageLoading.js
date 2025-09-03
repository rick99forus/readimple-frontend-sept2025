import { useEffect } from 'react';
import { useTransition } from '../context/TransitionContext';

export const usePageLoading = (dependencies = [], loadingTime = 1000) => {
  const { finishLoading, isTransitioning } = useTransition();

  useEffect(() => {
    if (!isTransitioning) return;

    // Simulate minimum loading time for smooth animation
    const minLoadingTimer = setTimeout(() => {
      finishLoading();
    }, loadingTime);

    // Also finish loading when dependencies are ready
    const dependenciesReady = dependencies.every(dep => 
      dep !== null && dep !== undefined && dep !== false
    );

    if (dependenciesReady) {
      clearTimeout(minLoadingTimer);
      setTimeout(finishLoading, Math.min(loadingTime, 800));
    }

    return () => clearTimeout(minLoadingTimer);
  }, [dependencies, loadingTime, isTransitioning, finishLoading]);
};