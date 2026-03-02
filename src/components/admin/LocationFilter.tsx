"use client";

import { CITIES } from "@/lib/locations";

interface LocationFilterProps {
  value: string;
  onChange: (location: string) => void;
}

export default function LocationFilter({
  value,
  onChange,
}: LocationFilterProps) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-9 rounded-md border border-stone-300 bg-white px-3 text-sm text-stone-700 focus:border-copper focus:outline-none focus:ring-1 focus:ring-copper"
    >
      <option value="">All Locations</option>
      {CITIES.map((city) => (
        <option key={city} value={city}>
          {city}
        </option>
      ))}
    </select>
  );
}
