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
 * Maps US state abbreviations to IANA timezone identifiers.
 * Covers all states in CITIES plus the full US.
 */
const STATE_TIMEZONES: Record<string, string> = {
  AL: "America/Chicago",
  AK: "America/Anchorage",
  AZ: "America/Phoenix",
  AR: "America/Chicago",
  CA: "America/Los_Angeles",
  CO: "America/Denver",
  CT: "America/New_York",
  DE: "America/New_York",
  FL: "America/New_York",
  GA: "America/New_York",
  HI: "Pacific/Honolulu",
  ID: "America/Boise",
  IL: "America/Chicago",
  IN: "America/Indiana/Indianapolis",
  IA: "America/Chicago",
  KS: "America/Chicago",
  KY: "America/New_York",
  LA: "America/Chicago",
  ME: "America/New_York",
  MD: "America/New_York",
  MA: "America/New_York",
  MI: "America/Detroit",
  MN: "America/Chicago",
  MS: "America/Chicago",
  MO: "America/Chicago",
  MT: "America/Denver",
  NE: "America/Chicago",
  NV: "America/Los_Angeles",
  NH: "America/New_York",
  NJ: "America/New_York",
  NM: "America/Denver",
  NY: "America/New_York",
  NC: "America/New_York",
  ND: "America/Chicago",
  OH: "America/New_York",
  OK: "America/Chicago",
  OR: "America/Los_Angeles",
  PA: "America/New_York",
  RI: "America/New_York",
  SC: "America/New_York",
  SD: "America/Chicago",
  TN: "America/Chicago",
  TX: "America/Chicago",
  UT: "America/Denver",
  VT: "America/New_York",
  VA: "America/New_York",
  WA: "America/Los_Angeles",
  WV: "America/New_York",
  WI: "America/Chicago",
  WY: "America/Denver",
  DC: "America/New_York",
};

/**
 * Derives an IANA timezone from a US venue address string.
 * Expects a format like "6850 E Main St, Scottsdale, AZ 85251".
 * Falls back to "America/Phoenix" if the state cannot be parsed.
 */
export function getTimezoneForAddress(address: string): string {
  const match = address.match(/,\s*([A-Z]{2})\s+\d{5}/);
  if (match) {
    const state = match[1];
    return STATE_TIMEZONES[state] ?? "America/Phoenix";
  }
  return "America/Phoenix";
}
