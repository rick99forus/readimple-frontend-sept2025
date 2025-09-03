export function getWorldCatLink(book, geo = {}) {
  if (!book) return null;

  // Prefer OCLC, then ISBN, then fallback to title/author
  const oclc =
    book.oclc ||
    book.oclcNumber ||
    (Array.isArray(book.industryIdentifiers)
      ? (book.industryIdentifiers.find(id => id.type === 'OCLC')?.identifier)
      : undefined);

  const isbn =
    book.isbn_13 ||
    book.isbn13 ||
    book.isbn_10 ||
    book.isbn10 ||
    book.isbn ||
    (Array.isArray(book.industryIdentifiers)
      ? (book.industryIdentifiers.find(id => id.type === 'ISBN_13')?.identifier ||
         book.industryIdentifiers.find(id => id.type === 'ISBN_10')?.identifier)
      : undefined);

  let loc = '';
  if (geo.zip) loc = geo.zip;
  else if (geo.state) loc = geo.state.replace(/\s+/g, '+');
  else if (geo.country) loc = geo.country.replace(/\s+/g, '+');

  if (oclc) return `https://worldcat.org/oclc/${oclc}${loc ? `&loc=${encodeURIComponent(loc)}` : ''}`;
  if (isbn) return `https://worldcat.org/isbn/${isbn}${loc ? `&loc=${encodeURIComponent(loc)}` : ''}`;

  const title = book.title ? `ti:${encodeURIComponent(book.title.replace(/\s+/g, '+'))}` : '';
  const author = book.author ? `au:${encodeURIComponent(book.author.replace(/\s+/g, '+'))}` : '';
  const query = [title, author].filter(Boolean).join('+');
  if (query) return `https://worldcat.org/search?q=${query}`;
  return null;
}