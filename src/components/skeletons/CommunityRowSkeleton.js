// filepath: /Users/rcoding/Desktop/Ready/testing/readimple-app/frontend/src/components/skeletons/CommunityRowSkeleton.js
import React from 'react';
import { Rect } from './GenericSkeleton';

export default function CommunityRowSkeleton() {
  return (
    <div className="flex gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="w-40">
          <Rect className="w-8 h-8 rounded-full mb-2" />
          <Rect className="w-full h-40 mb-2" />
          <Rect className="w-3/4 h-4 mb-1" />
          <Rect className="w-1/2 h-3" />
        </div>
      ))}
    </div>
  );
}