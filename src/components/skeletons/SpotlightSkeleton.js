// filepath: /Users/rcoding/Desktop/Ready/testing/readimple-app/frontend/src/components/skeletons/SpotlightSkeleton.js
import React from 'react';
import { Rect } from './GenericSkeleton';

export default function SpotlightSkeleton() {
  return (
    <div className="flex gap-4">
      <div className="w-32">
        <Rect className="w-32 h-48 rounded-lg" />
      </div>
      <div className="flex-1">
        <Rect className="w-1/2 h-5 mb-2" />
        <Rect className="w-1/3 h-4 mb-2" />
        <Rect className="w-full h-4 mb-1" />
        <Rect className="w-5/6 h-4 mb-1" />
        <Rect className="w-2/3 h-4 mb-4" />
        <Rect className="w-24 h-8" />
      </div>
    </div>
  );
}