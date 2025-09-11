import React from 'react';
const Section = ({ title, id, children, className = '', show = true, actionSlot }) => {
  if (!show) return null;
  return (
    <section
      aria-labelledby={`${id}-label`}
      className={`w-full max-w-6xl mx-auto px-2  mb-8 ${className}`}
    >
      <div className="flex items-center justify-between mb-3">
        <h2 id={`${id}-label`} className="text-lg font-bold tracking-wide text-neutral-900">
          {title}
        </h2>
        {actionSlot}
      </div>
      {children}
    </section>
  );
};
export default Section;
