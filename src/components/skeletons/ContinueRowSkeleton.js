// filepath: /Users/rcoding/Desktop/Ready/testing/readimple-app/frontend/src/components/skeletons/ContinueRowSkeleton.js
import React from 'react';
import { Rect } from './GenericSkeleton';

export default function ContinueRowSkeleton() {
  return (
    <div className="flex gap-4 overflow-hidden">
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i} className="w-36">
          <Rect className="w-full h-48 mb-2" />
            <Rect className="w-3/4 h-4 mb-1" />
          <Rect className="w-1/2 h-3 mb-2" />
          <Rect className="w-full h-2" />
        </div>
      ))}
    </div>
  );
}