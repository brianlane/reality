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
