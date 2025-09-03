export async function reverseGeocode(lat, lng, apiKey) {
  const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`;
  const res = await fetch(url);
  const data = await res.json();
  if (!data.results?.length) return {};
  const components = data.results[0].address_components;
  const zip = components.find(c => c.types.includes('postal_code'))?.long_name;
  const state = components.find(c => c.types.includes('administrative_area_level_1'))?.short_name;
  const country = components.find(c => c.types.includes('country'))?.long_name;
  return { zip, state, country };
}