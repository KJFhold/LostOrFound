// src/lib/places.ts
// Shared short place formatting for the UI.
// Goal: consistent short text, for example: "Karl Johans gate 1, Oslo".

export type PlaceFormat = "streetCity";

// Country names removed when they appear as the final segment.
const COUNTRY_WORDS = new Set(["norway", "norge", "norwegen", "noruega"]);

function clean(s: string) {
  return s.trim().replace(/\s+/g, " ");
}

function isCountry(seg: string) {
  return COUNTRY_WORDS.has(seg.trim().toLowerCase());
}

// Convert "0154 Oslo" to "Oslo".
function extractCityFromPostal(seg: string) {
  const m = seg.match(/^\s*\d{4}\s+(.+)\s*$/);
  return m?.[1] ? clean(m[1]) : clean(seg);
}

function looksLikeStreet(seg: string) {
  // Numbers or common Norwegian and English street words.
  return (
    /\d/.test(seg) ||
    /(gate|vei|veg|street|st\.?|road|ave|avenue|plass|torg)/i.test(seg)
  );
}

function findCity(segments: string[]) {
  // 1) Postal code and city.
  for (const seg of segments) {
    if (/^\s*\d{4}\s+/.test(seg)) return extractCityFromPostal(seg);
  }

  // 2) First non-country segment that does not resemble a street.
  const candidates = segments.filter((s) => s && !isCountry(s));
  const nonStreet = candidates.filter((s) => !looksLikeStreet(s));

  if (nonStreet.length) return clean(nonStreet[0]);
  if (candidates.length) return clean(candidates[0]);
  return "";
}

/**
 * Create a short place label from the geocoding label.
 * Default format: "streetCity".
 */
export function shortPlace(label?: string | null, _format: PlaceFormat = "streetCity") {
  if (!label) return null;
  const raw = label.trim();
  if (!raw) return null;

  const parts = raw
    .split(",")
    .map(clean)
    .filter(Boolean);

  if (parts.length === 0) return null;

  // Remove the country when it is the final segment.
  const trimmed =
    parts.length > 1 && isCountry(parts[parts.length - 1]) ? parts.slice(0, -1) : parts;

  if (trimmed.length === 1) {
    const only = trimmed[0];
    if (/^\d{4}\s+/.test(only)) return extractCityFromPostal(only);
    return only;
  }

  const first = trimmed[0];
  const city = findCity(trimmed.slice(1).concat(trimmed));

  // Street/address format: "first, city".
  if (looksLikeStreet(first)) return city ? `${first}, ${city}` : first;

  // Area/district format: "first, city".
  return city ? `${first}, ${city}` : first;
}
