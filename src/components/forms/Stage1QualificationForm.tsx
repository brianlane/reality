"use client";

import { FormEvent, useState, ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

// Strict email regex that requires proper domain with TLD
const EMAIL_REGEX = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;

type FieldErrors = {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  age?: string;
  gender?: string;
  location?: string;
  instagram?: string;
};

const CITIES = [
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
  "Other",
] as const;

export default function Stage1QualificationForm({
  previewMode = false,
}: {
  previewMode?: boolean;
}) {
  const router = useRouter();
  const [status, setStatus] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [touched, setTouched] = useState<Set<string>>(new Set());
  const [locationSelection, setLocationSelection] = useState<string>("");

  const validateField = (name: string, value: string | number) => {
    switch (name) {
      case "firstName":
        if (!value || String(value).trim().length === 0) {
          return "First name is required";
        }
        break;
      case "lastName":
        if (!value || String(value).trim().length === 0) {
          return "Last name is required";
        }
        break;
      case "email":
        if (!value || String(value).trim().length === 0) {
          return "Email is required";
        }
        if (!EMAIL_REGEX.test(String(value).trim())) {
          return "Please enter a valid email address (e.g., user@example.com)";
        }
        break;
      case "phone":
        if (!value || String(value).trim().length === 0) {
          return "Phone is required";
        }
        break;
      case "age":
        const age = Number(value);
        if (!value || isNaN(age)) {
          return "Age is required";
        }
        if (age < 24) {
          return "Must be 24 or older";
        }
        if (age > 41) {
          return "Must be 41 or younger";
        }
        break;
      case "gender":
        if (!value) {
          return "Gender is required";
        }
        break;
      case "location":
        if (!value || String(value).trim().length === 0) {
          return "Location is required";
        }
        break;
      case "instagram":
        if (!value || String(value).trim().length === 0) {
          return "Instagram is required";
        }
        break;
    }
    return undefined;
  };

  const handleFieldChange = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;

    // Handle location dropdown selection
    if (name === "locationSelect") {
      setLocationSelection(value);
      // Validate or clear error based on selection
      if (value !== "Other") {
        const error = validateField("location", value);
        setErrors((prev) => ({
          ...prev,
          location: error,
        }));
      } else {
        // Clear error when switching to "Other" - user will enter custom location
        setErrors((prev) => ({
          ...prev,
          location: undefined,
        }));
      }
      return;
    }

    if (touched.has(name)) {
      const error = validateField(name, value);
      setErrors((prev) => ({
        ...prev,
        [name]: error,
      }));
    }
  };

  const handleFieldBlur = (
    e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;

    // Handle location dropdown blur specially
    if (name === "locationSelect") {
      setTouched((prev) => new Set(prev).add("location"));
      // Don't validate if "Other" is selected - wait for custom input
      if (value !== "Other") {
        const error = validateField("location", value);
        setErrors((prev) => ({
          ...prev,
          location: error,
        }));
      }
      return;
    }

    setTouched((prev) => new Set(prev).add(name));
    const error = validateField(name, value);
    setErrors((prev) => ({
      ...prev,
      [name]: error,
    }));
  };

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus(null);

    if (previewMode) {
      setStatus("Preview mode - form submission is disabled");
      return;
    }

    const formData = new FormData(event.currentTarget);
    const locationSelect = String(formData.get("locationSelect") ?? "").trim();
    const customLocation = String(formData.get("location") ?? "").trim();
    const finalLocation =
      locationSelect === "Other" ? customLocation : locationSelect;

    const payload = {
      firstName: String(formData.get("firstName") ?? "").trim(),
      lastName: String(formData.get("lastName") ?? "").trim(),
      email: String(formData.get("email") ?? "")
        .trim()
        .toLowerCase(),
      phone: String(formData.get("phone") ?? "").trim(),
      age: Number(formData.get("age")),
      gender: formData.get("gender"),
      location: finalLocation,
      instagram: String(formData.get("instagram") ?? "").trim(),
    };

    // Validate all fields
    const newErrors: FieldErrors = {};
    let hasErrors = false;

    Object.entries(payload).forEach(([key, value]) => {
      const error = validateField(key, value as string | number);
      if (error) {
        newErrors[key as keyof FieldErrors] = error;
        hasErrors = true;
      }
    });

    if (hasErrors) {
      setErrors(newErrors);
      setTouched(new Set(Object.keys(payload)));
      setStatus("Please fix the errors above before submitting.");
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/applications/stage1", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorData = await response.json();
        setStatus(
          errorData?.error?.message || "Failed to submit qualification.",
        );
        setIsSubmitting(false);
        return;
      }

      const data = await response.json();
      router.push(`/apply/waitlist?id=${data.applicationId}`);
    } catch (error) {
      console.error("Stage 1 submission error:", error);
      setStatus("An error occurred. Please try again.");
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Information */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-navy">Basic Information</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label
              htmlFor="firstName"
              className="text-sm font-medium text-navy-muted"
            >
              First name
            </label>
            <Input
              id="firstName"
              name="firstName"
              required
              onChange={handleFieldChange}
              onBlur={handleFieldBlur}
              className={errors.firstName ? "border-red-500" : ""}
            />
            {errors.firstName && (
              <p className="mt-1 text-xs text-red-500">{errors.firstName}</p>
            )}
          </div>
          <div>
            <label
              htmlFor="lastName"
              className="text-sm font-medium text-navy-muted"
            >
              Last name
            </label>
            <Input
              id="lastName"
              name="lastName"
              required
              onChange={handleFieldChange}
              onBlur={handleFieldBlur}
              className={errors.lastName ? "border-red-500" : ""}
            />
            {errors.lastName && (
              <p className="mt-1 text-xs text-red-500">{errors.lastName}</p>
            )}
          </div>
        </div>
        <div>
          <label
            htmlFor="email"
            className="text-sm font-medium text-navy-muted"
          >
            Email
          </label>
          <Input
            id="email"
            name="email"
            type="email"
            required
            onChange={handleFieldChange}
            onBlur={handleFieldBlur}
            className={errors.email ? "border-red-500" : ""}
          />
          {errors.email && (
            <p className="mt-1 text-xs text-red-500">{errors.email}</p>
          )}
        </div>
        <div>
          <label
            htmlFor="phone"
            className="text-sm font-medium text-navy-muted"
          >
            Phone
          </label>
          <Input
            id="phone"
            name="phone"
            type="tel"
            required
            onChange={handleFieldChange}
            onBlur={handleFieldBlur}
            className={errors.phone ? "border-red-500" : ""}
          />
          {errors.phone && (
            <p className="mt-1 text-xs text-red-500">{errors.phone}</p>
          )}
        </div>
      </div>

      {/* Demographics */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-navy">About You</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label
              htmlFor="age"
              className="text-sm font-medium text-navy-muted"
            >
              Age
            </label>
            <Input
              id="age"
              name="age"
              type="number"
              min={24}
              max={41}
              required
              onChange={handleFieldChange}
              onBlur={handleFieldBlur}
              className={errors.age ? "border-red-500" : ""}
            />
            {errors.age && (
              <p className="mt-1 text-xs text-red-500">{errors.age}</p>
            )}
          </div>
          <div>
            <label
              htmlFor="gender"
              className="text-sm font-medium text-navy-muted"
            >
              Gender
            </label>
            <Select
              id="gender"
              name="gender"
              required
              onChange={handleFieldChange}
              onBlur={handleFieldBlur}
              className={errors.gender ? "border-red-500" : ""}
            >
              <option value="">Select gender</option>
              <option value="MALE">Male</option>
              <option value="FEMALE">Female</option>
              <option value="NON_BINARY">Non-binary</option>
              <option value="PREFER_NOT_TO_SAY">Prefer not to say</option>
            </Select>
            {errors.gender && (
              <p className="mt-1 text-xs text-red-500">{errors.gender}</p>
            )}
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label
              htmlFor="locationSelect"
              className="text-sm font-medium text-navy-muted"
            >
              Location (City, State)
            </label>
            <Select
              id="locationSelect"
              name="locationSelect"
              required={locationSelection !== "Other"}
              value={locationSelection}
              onChange={handleFieldChange}
              onBlur={handleFieldBlur}
              className={errors.location ? "border-red-500" : ""}
            >
              <option value="">Select a city</option>
              {CITIES.map((city) => (
                <option key={city} value={city}>
                  {city}
                </option>
              ))}
            </Select>
            {locationSelection === "Other" && (
              <div className="mt-2">
                <Input
                  id="location"
                  name="location"
                  placeholder="e.g., Phoenix, AZ"
                  required
                  onChange={handleFieldChange}
                  onBlur={handleFieldBlur}
                  className={errors.location ? "border-red-500" : ""}
                />
              </div>
            )}
            {errors.location && (
              <p className="mt-1 text-xs text-red-500">{errors.location}</p>
            )}
          </div>
          <div>
            <label
              htmlFor="instagram"
              className="text-sm font-medium text-navy-muted"
            >
              Instagram
            </label>
            <Input
              id="instagram"
              name="instagram"
              placeholder="@yourusername"
              required
              onChange={handleFieldChange}
              onBlur={handleFieldBlur}
              className={errors.instagram ? "border-red-500" : ""}
            />
            {errors.instagram && (
              <p className="mt-1 text-xs text-red-500">{errors.instagram}</p>
            )}
          </div>
        </div>
      </div>

      {/* Submit Button */}
      <div className="space-y-2">
        <Button type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting ? "Submitting..." : "Join the Waitlist"}
        </Button>
        {status && <p className="text-sm text-red-500 text-center">{status}</p>}
      </div>
    </form>
  );
}
