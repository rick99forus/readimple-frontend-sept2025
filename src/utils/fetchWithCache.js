export async function fetchWithCache(url, cacheKey, ttlMinutes = 60) {
  const now = Date.now();
  const cached = localStorage.getItem(cacheKey);
  if (cached) {
    const { data, expires } = JSON.parse(cached);
    if (expires > now) return data;
  }
  const res = await fetch(url);
  const data = await res.json();
  localStorage.setItem(cacheKey, JSON.stringify({ data, expires: now + ttlMinutes * 60 * 1000 }));
  return data;
}