module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      maxWidth: {
        // Remove or override unwanted values
        '6xl': 'none',
      },
      animation: {
        bounce: 'bounce 1s infinite',
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        serif: ['Playfair Display', 'serif'],
      }
    },
  },
  plugins: [
    require('tailwind-scrollbar-hide'),
  ],
  // tailwind.config.js
safelist: [
  'grid-cols-1','grid-cols-2','grid-cols-3','grid-cols-4',
  'sm:grid-cols-2','sm:grid-cols-3','sm:grid-cols-4',
  'md:grid-cols-3','md:grid-cols-4',
],

}