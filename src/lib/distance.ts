// Haversine formula to calculate distance between two coordinates in kilometers
export function calculateDistance(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
    Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) *
    Math.sin(dLon / 2);
  
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;
  
  return Math.round(distance * 10) / 10; // Round to 1 decimal
}

function toRad(degrees: number): number {
  return degrees * (Math.PI / 180);
}

// Simple geocoding with client-side cache to avoid repeated requests
const GEO_CACHE_KEY = 'geo_cache_v1';
let geoCache: Record<string, { lat: number; lng: number }> | null = null;

function loadGeoCache() {
  if (geoCache) return geoCache;
  if (typeof window === 'undefined') {
    geoCache = {};
    return geoCache;
  }
  try {
    const stored = window.localStorage.getItem(GEO_CACHE_KEY);
    geoCache = stored ? JSON.parse(stored) : {};
  } catch {
    geoCache = {};
  }
  return geoCache!;
}

function saveGeoCache() {
  if (typeof window === 'undefined' || !geoCache) return;
  try {
    window.localStorage.setItem(GEO_CACHE_KEY, JSON.stringify(geoCache));
  } catch {
    // ignore quota or serialization errors
  }
}

// Extract coordinates from location string if possible
// This is a simple geocoding fallback - returns null if can't extract
export async function geocodeLocation(locationString: string): Promise<{ lat: number; lng: number } | null> {
  const cache = loadGeoCache();
  const key = locationString.toLowerCase().trim();
  if (cache[key]) {
    return cache[key];
  }

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(locationString)}&limit=1&accept-language=es`
    );
    const data = await response.json();
    
    if (data && data.length > 0) {
      const coords = {
        lat: parseFloat(data[0].lat),
        lng: parseFloat(data[0].lon),
      };
      cache[key] = coords;
      saveGeoCache();
      return coords;
    }
    return null;
  } catch (error) {
    console.error('Error geocoding location:', error);
    return null;
  }
}
