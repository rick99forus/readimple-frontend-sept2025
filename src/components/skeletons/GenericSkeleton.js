import React from 'react';

const shimmer = 'animate-pulse bg-neutral-200';

export const Rect = ({ className = '' }) => (
  <div className={`${shimmer} ${className} rounded`} />
);

const GenericSkeleton = ({ height = 'h-28' }) => (
  <div className={`w-full ${height} ${shimmer} rounded-lg`} />
);

export default GenericSkeleton;