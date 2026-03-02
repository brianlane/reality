/**
 * Canonical location list used across Stage 1 qualification,
 * admin filters, and the matching algorithm.
 */
export const CITIES = [
  "New York City, NY",
  "Los Angeles, CA",
  "Chicago, IL",
  "Dallas, TX",
  "Phoenix, AZ",
  "San Francisco, CA",
  "Miami, FL",
  "Denver, CO",
  "Atlanta, GA",
  "Las Vegas, NV",
  "Seattle, WA",
  "Portland, OR",
] as const;

export type CityOption = (typeof CITIES)[number];

/**
 * All selectable values including "Other" for forms.
 */
export const CITY_OPTIONS = [...CITIES, "Other"] as const;

/**
 * Regional groupings for location proximity scoring.
 * Cities in the same group score 0.7 similarity (same region).
 * Cities in different groups score 0.3.
 */
export const METRO_GROUPS: Record<string, string[]> = {
  California: ["Los Angeles, CA", "San Francisco, CA"],
  Texas: ["Dallas, TX"],
  "Desert Southwest": ["Phoenix, AZ", "Las Vegas, NV"],
  "Pacific Northwest": ["Seattle, WA", "Portland, OR"],
  Southeast: ["Miami, FL", "Atlanta, GA"],
  Northeast: ["New York City, NY"],
  Mountain: ["Denver, CO"],
  Midwest: ["Chicago, IL"],
};

function getMetroGroup(city: string): string | null {
  for (const [group, cities] of Object.entries(METRO_GROUPS)) {
    if (cities.includes(city)) return group;
  }
  return null;
}

/**
 * Location similarity between two city strings.
 * - Same city: 1.0
 * - Same metro group: 0.7
 * - Different region: 0.3
 * - Unknown/Other: 0.5 (neutral)
 */
export function locationSimilarity(locA: string, locB: string): number {
  const a = normalizeCity(locA);
  const b = normalizeCity(locB);

  if (!a || !b) return 0.5;
  if (a === b) return 1.0;

  const groupA = getMetroGroup(a);
  const groupB = getMetroGroup(b);

  if (groupA && groupB && groupA === groupB) return 0.7;
  return 0.3;
}

/**
 * Try to match a freeform location string to one of our canonical cities.
 */
function normalizeCity(raw: string): string | null {
  if (!raw) return null;
  const cleaned = raw.trim();

  // Exact match
  const exact = CITIES.find((c) => c === cleaned);
  if (exact) return exact;

  // Case-insensitive match
  const lower = cleaned.toLowerCase();
  const ci = CITIES.find((c) => c.toLowerCase() === lower);
  if (ci) return ci;

  // Partial match (city name without state)
  const cityPart = lower
    .replace(/,?\s*(az|ca|ny|tx|fl|co|ga|nv|wa|or|il)$/i, "")
    .trim();
  // Guard against an empty string after stripping the state — every city starts
  // with "" so the find would always return the first city incorrectly.
  if (!cityPart) return null;
  const partial = CITIES.find((c) => c.toLowerCase().startsWith(cityPart));
  if (partial) return partial;

  return null;
}
