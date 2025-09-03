import React from 'react';

export const BookRowSkeleton = () => (
  <div className="flex space-x-4 py-2 overflow-hidden">
    {Array.from({ length: 4 }).map((_, i) => (
      <div key={i} className="w-32 flex-shrink-0">
        <div className="w-32 h-48 bg-gray-200 rounded-lg animate-pulse mb-2" />
        <div className="w-24 h-4 bg-gray-200 rounded animate-pulse mb-1" />
        <div className="w-20 h-3 bg-gray-200 rounded animate-pulse" />
      </div>
    ))}
  </div>
);

export const HeroSkeleton = () => (
  <div className="flex items-center justify-between mb-1 pb-2 h-64 bg-gray-100 animate-pulse rounded-lg">
    <div className="flex-1 p-4">
      <div className="w-3/4 h-8 bg-gray-200 rounded mb-4" />
      <div className="w-1/2 h-4 bg-gray-200 rounded mb-2" />
      <div className="w-1/4 h-6 bg-gray-200 rounded" />
    </div>
    <div className="w-32 h-48 bg-gray-200 rounded-lg mr-4" />
  </div>
);