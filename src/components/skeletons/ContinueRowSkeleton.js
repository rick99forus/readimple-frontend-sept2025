// filepath: src/components/ContinueRowSkeleton.js
import React from 'react';

export default function ContinueRowSkeleton({ rows = 1 }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <div
          key={i}
          className="
            rounded-2xl ring-1 ring-black/5 bg-white p-3
            flex items-center gap-3
            animate-pulse
          "
          aria-hidden="true"
        >
          {/* thumb */}
          <div className="w-12 h-16 rounded-lg bg-neutral-200" />
          {/* text + progress */}
          <div className="flex-1">
            <div className="h-3 w-4/5 bg-neutral-200 rounded mb-2" />
            <div className="h-2.5 w-2/5 bg-neutral-200 rounded" />
            <div className="mt-3 h-2 w-full bg-neutral-200 rounded" />
          </div>
          {/* action bubble */}
          <div className="w-9 h-9 rounded-full bg-neutral-200" />
        </div>
      ))}
    </div>
  );
}
