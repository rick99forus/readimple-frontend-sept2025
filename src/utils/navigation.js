// filepath: src/utils/navigation.js
export function handleBookClick(navigate, book) {
  navigate('/discover', { state: { book } });
}