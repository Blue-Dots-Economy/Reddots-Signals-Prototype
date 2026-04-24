/**
 * Geocode an address string to lat/lng using OpenStreetMap Nominatim (free, no API key).
 * Falls back to a default location near Ghaziabad if geocoding fails.
 */
const FALLBACK = { lat: 28.6139, lng: 77.2090 };

export async function geocodeAddressDetailed(address: string): Promise<{ lat: number; lng: number; resolved: boolean }> {
  if (!address.trim()) return { ...FALLBACK, resolved: false };

  const query = address.includes("India") ? address : `${address}, India`;

  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1`,
      { headers: { "User-Agent": "YellowDots/1.0" } }
    );
    const data = await res.json();

    if (data && data.length > 0) {
      return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon), resolved: true };
    }

    return { ...FALLBACK, resolved: false };
  } catch {
    return { ...FALLBACK, resolved: false };
  }
}

export async function geocodeAddress(address: string): Promise<{ lat: number; lng: number }> {
  const result = await geocodeAddressDetailed(address);
  return { lat: result.lat, lng: result.lng };
}

/**
 * Add a small random offset to coordinates so dots at the same location spread out visually.
 * Offset is roughly ±200m (good enough for city-level maps).
 */
export function jitterCoords(lat: number, lng: number): { lat: number; lng: number } {
  const offset = 0.002;
  return {
    lat: lat + (Math.random() - 0.5) * offset,
    lng: lng + (Math.random() - 0.5) * offset,
  };
}

/** Wait for given ms */
export const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
