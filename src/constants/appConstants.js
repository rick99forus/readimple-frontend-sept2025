export const MERCHANTS = {
  booktopia: {
    name: 'Booktopia',
    logo: '/logos/booktopia-logo.svg',
    homepage: 'https://www.booktopia.com.au/',
    search: isbn => `https://www.booktopia.com.au/search.ep?keywords=${isbn}`,
    color: 'bg-green-800',
    getLink: ({ identifiers = {}, isbn_13, isbn13, isbn, title, author }) => {
      const booktopiaIsbn = isbn_13 || isbn13 || isbn || identifiers.isbn_13?.[0];
      if (title && author && booktopiaIsbn) {
        // Direct product link
        const slug = `${title} ${author}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        return `https://www.booktopia.com.au/${slug}/book/${booktopiaIsbn}.html`;
      } else if (booktopiaIsbn) {
        // Fallback: search by ISBN
        return `https://www.booktopia.com.au/search.ep?keywords=${booktopiaIsbn}`;
      }
      // Final fallback: homepage
      return 'https://www.booktopia.com.au/';
    }
  },
  amazon: {
    name: 'Amazon AU',
    logo: '/logos/amazon.png',
    homepage: 'https://www.amazon.com.au/books',
    search: title => `https://www.amazon.com.au/books/s?k=${title}`,
    color: 'bg-neutral-100',
    getLink: ({ identifiers = {},  title, isbn_13, isbn13, isbn }) => {
      if (identifiers.amazon?.[0]) {
        return `https://www.amazon.com.au/dp/${identifiers.amazon[0]}/`;
      }
      const bookIsbn =  title || isbn_13 || isbn13 || isbn || identifiers.isbn_13?.[0];
      if (bookIsbn) {
        return `https://www.amazon.com.au/s?k=${bookIsbn}`;
      }
      return 'https://www.amazon.com.au/books';
    }
  },
  /*amazon_us: {
    name: 'Amazon US',
    logo: '/logos/amazon-us.png',
    homepage: 'https://www.amazon.com/books',
    search: isbn => `https://www.amazon.com/s?k=${isbn}`,
    color: 'bg-blue-800',
    getLink: ({ identifiers = {}, isbn_13, isbn13, isbn }) => {
      if (identifiers.amazon?.[0]) {
        return `https://www.amazon.com/dp/${identifiers.amazon[0]}/`;
      }
      const bookIsbn = isbn_13 || isbn13 || isbn || identifiers.isbn_13?.[0];
      if (bookIsbn) {
        return `https://www.amazon.com/s?k=${bookIsbn}`;
      }
      return 'https://www.amazon.com/books';
    }
  },*/
  google: {
    name: 'Google Books',
    logo: '/logos/Google.svg.png',
    homepage: 'https://books.google.com/',
    search: isbn => `https://books.google.com/books?vid=ISBN${isbn}`,
    color: 'bg-transparent',
    getLink: ({ identifiers = {}, isbn_13, isbn13, isbn }) => {
      if (identifiers.google?.[0]) {
        return `https://books.google.com/books?id=${identifiers.google[0]}`;
      }
      const bookIsbn = isbn_13 || isbn13 || isbn || identifiers.isbn_13?.[0];
      if (bookIsbn) {
        return `https://books.google.com/books?vid=ISBN${bookIsbn}`;
      }
      return 'https://books.google.com/';
    }
  },
  goodreads: {
    name: 'Goodreads',
    logo: '/logos/goodreads-logo.png',
    homepage: 'https://www.goodreads.com/book/show/',
    search: isbn => `https://www.goodreads.com/search?q=${isbn}`,
    color: 'bg-white/20',
    getLink: ({ identifiers = {}, isbn_13, isbn13, isbn }) => {
      if (identifiers.goodreads?.[0]) {
        return `https://www.goodreads.com/book/show/${identifiers.goodreads[0]}`;
      }
      const bookIsbn = isbn_13 || isbn13 || isbn || identifiers.isbn_13?.[0];
      if (bookIsbn) {
        return `https://www.goodreads.com/search?q=${bookIsbn}`;
      }
      return 'https://www.goodreads.com/book/show/';
    }
  },
  librarything: {
    name: 'LibraryThings',
    logo: '/logos/librarythings.png',
    homepage: 'https://www.librarything.com/',
    search: isbn => `https://www.librarything.com/search.php?search=${isbn}`,
    color: 'bg-gray-50',
    getLink: ({ identifiers = {}, title }) => {
      if (identifiers.librarything?.[0] && title) {
        const workId = identifiers.librarything[0];
        const slug = (title || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
        return `https://www.librarything.com/work/${workId}/t/${slug}`;
      }
      return 'https://www.librarything.com/';
    }
  },
  openlibrary: {
    name: 'Open Library',
    logo: '/logos/openlibrary.svg',
    homepage: 'https://openlibrary.org/',
    search: isbn => `https://openlibrary.org/search?isbn=${isbn}`,
    color: 'bg-[#e1dcc5]',
    getLink: ({ identifiers = {}, isbn_13, isbn13, isbn }) => {
      if (identifiers.openlibrary?.[0]) {
        return `https://openlibrary.org${identifiers.openlibrary[0]}`;
      }
      const bookIsbn = isbn_13 || isbn13 || isbn || identifiers.isbn_13?.[0];
      if (bookIsbn) {
        return `https://openlibrary.org/search?isbn=${bookIsbn}`;
      }
      return 'https://openlibrary.org/';
    }
  },
  worldcat: {
    name: 'WorldCat',
    logo: '/logos/worldcat.png',
    homepage: 'https://www.worldcat.org/',
    search: isbn => `https://www.worldcat.org/search?q=${isbn}`,
    color: 'bg-neutral-50',
    getLink: ({ identifiers = {}, isbn_13, isbn13, isbn }) => {
      const bookIsbn = isbn_13 || isbn13 || isbn || identifiers.isbn_13?.[0] || identifiers.isbn_10?.[0];
      if (bookIsbn) {
        return `https://www.worldcat.org/isbn/${bookIsbn}`;
      }
      return 'https://www.worldcat.org/';
    }
  },
};

export const AVATARS = [
  { id: 1, src: '/avatars/icons8-cat-100.png', label: 'Book Cat' },
  { id: 2, src: '/avatars/icons8-corgi-100.png', label: 'Corgi Reader' },
  { id: 3, src: '/avatars/icons8-dog-100.png', label: 'Doggo Bookworm' },
  { id: 4, src: '/avatars/icons8-pixel-cat-100.png', label: 'Pixel Cat' },
  { id: 5, src: '/avatars/icons8-heart-with-dog-paw-100.png', label: 'Paw Heart' },
  { id: 6, src: '/avatars/icons8-books-100.png', label: 'Book Stack' },
  { id: 7, src: '/avatars/icons8-art-book-100.png', label: 'Art Book' },
  { id: 8, src: '/avatars/icons8-learning-100.png', label: 'Learning Owl' },
  { id: 9, src: '/avatars/icons8-grooming-100.png', label: 'Groomed Reader' },
  { id: 10, src: '/avatars/icons8-freedom-100.png', label: 'Freedom Reader' },
  { id: 11, src: '/avatars/icons8-storytelling-100.png', label: 'Storyteller' },
  { id: 12, src: '/avatars/icons8-book-100.png', label: 'Classic Book' },
];

export const GENRE_GRADIENTS = {
  philosophy: 'linear-gradient(90deg, #a18cd1 0%, #fbc2eb 100%)',
  classic: 'linear-gradient(90deg, #d3cce3 0%, #e9e4f0 100%)',
  'graphic novel': 'linear-gradient(90deg, #f7971e 0%, #ffd200 100%)',
  memoir: 'linear-gradient(90deg, #f5f7fa 0%, #c3cfe2 100%)',
  dystopian: 'linear-gradient(90deg, #e96443 0%, #904e95 100%)',
  crime: 'linear-gradient(90deg, #ff5858 0%, #f09819 100%)',
  psychology: 'linear-gradient(90deg, #43cea2 0%, #185a9d 100%)',
  spirituality: 'linear-gradient(90deg, #ffecd2 0%, #fcb69f 100%)',
  'sci-fi': 'linear-gradient(90deg, #00c6ff 0%, #0072ff 100%)',
  education: 'linear-gradient(90deg, #f7971e 0%, #ffd200 100%)',
  health: 'linear-gradient(90deg, #56ab2f 0%, #a8e063 100%)',
  cookbook: 'linear-gradient(90deg, #f7971e 0%, #ffd200 100%)',
  featured: 'linear-gradient(90deg, #f7971e 0%, #ffd200 100%)',
  default: 'linear-gradient(90deg, #e0eafc 0%, #cfdef3 100%)',
};

export const GENRE_ACCENTS = {
  philosophy: 'rgba(139,92,246,0.20)',
  classic: 'rgba(107,114,128,0.15)',
  'graphic novel': 'rgba(147,51,234,0.15)',
  memoir: 'rgba(34,197,94,0.15)',
  dystopian: 'rgba(75,85,99,0.20)',
  crime: 'rgba(220,38,38,0.18)',
  psychology: 'rgba(59,130,246,0.15)',
  spirituality: 'rgba(163,230,53,0.20)',
  'sci-fi': 'rgba(59,130,246,0.15)',
  education: 'rgba(250,204,21,0.20)',
  health: 'rgba(34,197,94,0.20)',
  cookbook: 'rgba(250,204,21,0.20)',
  featured: 'rgba(251,146,60,0.20)',
  default: 'rgba(75,85,99,0.12)',
};