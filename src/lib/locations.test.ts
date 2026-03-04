import { describe, it, expect } from "vitest";
import { CITIES, CITY_OPTIONS } from "./locations";

describe("CITIES", () => {
  it("contains only non-empty strings", () => {
    for (const city of CITIES) {
      expect(typeof city).toBe("string");
      expect(city.length).toBeGreaterThan(0);
    }
  });

  it("contains no duplicates", () => {
    const unique = new Set(CITIES);
    expect(unique.size).toBe(CITIES.length);
  });
});

describe("CITY_OPTIONS", () => {
  it("includes all CITIES entries", () => {
    for (const city of CITIES) {
      expect(CITY_OPTIONS).toContain(city);
    }
  });

  it("includes 'Other' as the last entry", () => {
    expect(CITY_OPTIONS[CITY_OPTIONS.length - 1]).toBe("Other");
  });

  it("has exactly one more entry than CITIES", () => {
    expect(CITY_OPTIONS.length).toBe(CITIES.length + 1);
  });
});
