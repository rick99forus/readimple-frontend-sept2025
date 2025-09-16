import React, { useEffect, useState } from 'react';
import MoodChips from './MoodChips';
import BookRow from './BookRow';

const MOODS = [
  { key: 'happy', label: 'Happy' },
  { key: 'sad', label: 'Sad' },
  { key: 'adventurous', label: 'Adventurous' },
  { key: 'romantic', label: 'Romantic' },
  { key: 'mysterious', label: 'Mysterious' },
  { key: 'inspiring', label: 'Inspiring' },
];

const fetchBooksForMood = async (mood) => {
  // 1. Use OpenAI to get a list of book titles for the mood
  const openaiRes = await fetch('/api/openai/mood-books', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mood }),
  });
  const { titles } = await openaiRes.json();

  // 2. For each title, search Google Books
  const books = [];
  for (const title of titles) {
    const gbRes = await fetch(
      `https://www.googleapis.com/books/v1/volumes?q=intitle:${encodeURIComponent(title)}&maxResults=1&key=YOUR_GOOGLE_BOOKS_API_KEY`
    );
    const gbData = await gbRes.json();
    if (gbData.items && gbData.items.length > 0) {
      const b = gbData.items[0].volumeInfo;
      books.push({
        id: gbData.items[0].id,
        title: b.title,
        author: (b.authors && b.authors.join(', ')) || '',
        coverImage: b.imageLinks?.thumbnail || '',
      });
    }
  }
  return books;
};

const MoodBooksSection = ({ onBookClick }) => {
  const [selectedMood, setSelectedMood] = useState(MOODS[0].key);
  const [books, setBooks] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetchBooksForMood(selectedMood).then(bks => {
      if (!cancelled) {
        setBooks(bks);
        setLoading(false);
      }
    });
    return () => { cancelled = true; };
  }, [selectedMood]);

  return (
    <div>
      <MoodChips moods={MOODS} selected={selectedMood} onSelect={setSelectedMood} />
      <div className="mt-4">
        {loading ? (
          <div>Loading books for this mood...</div>
        ) : (
          <BookRow books={books} onBookClick={onBookClick} />
        )}
      </div>
    </div>
  );
};

export default MoodBooksSection;