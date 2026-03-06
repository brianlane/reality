"use client";

import { Select } from "@/components/ui/select";
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
    <Select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="h-9 w-auto py-0"
    >
      <option value="">All Locations</option>
      {CITIES.map((city) => (
        <option key={city} value={city}>
          {city}
        </option>
      ))}
    </Select>
  );
}
