// filepath: /Users/rcoding/Desktop/Ready/testing/readimple-app/frontend/src/components/skeletons/MoodChipsSkeleton.js
import React from 'react';
import { Rect } from './GenericSkeleton';

export default function MoodChipsSkeleton() {
  return (
    <div className="flex gap-2">
      {Array.from({ length: 6 }).map((_, i) => (
        <Rect key={i} className="h-8 w-20" />
      ))}
    </div>
  );
}