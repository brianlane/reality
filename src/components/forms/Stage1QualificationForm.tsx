"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";

export default function Stage1QualificationForm() {
  const router = useRouter();
  const [status, setStatus] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus(null);
    setIsSubmitting(true);

    const formData = new FormData(event.currentTarget);
    const payload = {
      firstName: String(formData.get("firstName") ?? "").trim(),
      lastName: String(formData.get("lastName") ?? "").trim(),
      email: String(formData.get("email") ?? "")
        .trim()
        .toLowerCase(),
      phone: String(formData.get("phone") ?? "").trim() || null,
      age: Number(formData.get("age")),
      gender: formData.get("gender"),
      location: String(formData.get("location") ?? "").trim(),
      relationshipGoal: String(formData.get("relationshipGoal") ?? "").trim(),
      aboutYourself: String(formData.get("aboutYourself") ?? "").trim(),
    };

    // Client-side validation
    if (payload.aboutYourself.length < 50) {
      setStatus("Please write at least 50 characters about yourself.");
      setIsSubmitting(false);
      return;
    }

    if (payload.aboutYourself.length > 500) {
      setStatus("Please keep your description under 500 characters.");
      setIsSubmitting(false);
      return;
    }

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
            <Input id="firstName" name="firstName" required />
          </div>
          <div>
            <label
              htmlFor="lastName"
              className="text-sm font-medium text-navy-muted"
            >
              Last name
            </label>
            <Input id="lastName" name="lastName" required />
          </div>
        </div>
        <div>
          <label
            htmlFor="email"
            className="text-sm font-medium text-navy-muted"
          >
            Email
          </label>
          <Input id="email" name="email" type="email" required />
        </div>
        <div>
          <label
            htmlFor="phone"
            className="text-sm font-medium text-navy-muted"
          >
            Phone (optional)
          </label>
          <Input id="phone" name="phone" type="tel" />
        </div>
      </div>

      {/* Demographics */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold text-navy">About You</h3>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label htmlFor="age" className="text-sm font-medium text-navy-muted">
              Age
            </label>
            <Input id="age" name="age" type="number" min={18} max={100} required />
          </div>
          <div>
            <label
              htmlFor="gender"
              className="text-sm font-medium text-navy-muted"
            >
              Gender
            </label>
            <Select id="gender" name="gender" required>
              <option value="">Select gender</option>
              <option value="MALE">Male</option>
              <option value="FEMALE">Female</option>
              <option value="NON_BINARY">Non-binary</option>
              <option value="PREFER_NOT_TO_SAY">Prefer not to say</option>
            </Select>
          </div>
        </div>
        <div>
          <label
            htmlFor="location"
            className="text-sm font-medium text-navy-muted"
          >
            Location (City, State)
          </label>
          <Input
            id="location"
            name="location"
            placeholder="e.g., San Francisco, CA"
            required
          />
        </div>
        <div>
          <label
            htmlFor="relationshipGoal"
            className="text-sm font-medium text-navy-muted"
          >
            What are you looking for?
          </label>
          <Select id="relationshipGoal" name="relationshipGoal" required>
            <option value="">Select your goal</option>
            <option value="Marriage">Marriage</option>
            <option value="Long-term">Long-term relationship</option>
            <option value="Serious dating">Serious dating</option>
            <option value="Exploring">Exploring options</option>
          </Select>
        </div>
      </div>

      {/* About Yourself */}
      <div className="space-y-4">
        <div>
          <label
            htmlFor="aboutYourself"
            className="text-sm font-medium text-navy-muted"
          >
            Tell us a bit about yourself (50-500 characters)
          </label>
          <textarea
            id="aboutYourself"
            name="aboutYourself"
            rows={4}
            minLength={50}
            maxLength={500}
            required
            className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-copper focus:outline-none focus:ring-1 focus:ring-copper"
            placeholder="Share what makes you unique, your interests, values, or what you're passionate about..."
          />
          <p className="mt-1 text-xs text-gray-500">
            Minimum 50 characters, maximum 500 characters
          </p>
        </div>
      </div>

      {/* Submit Button */}
      <div className="space-y-2">
        <Button type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting ? "Submitting..." : "Join the Waitlist"}
        </Button>
        {status && (
          <p className="text-sm text-red-500 text-center">{status}</p>
        )}
      </div>

      {/* Info Note */}
      <p className="text-xs text-gray-500 text-center">
        By submitting, you agree to our terms of service and privacy policy.
        This is just a quick qualification - no payment required yet.
      </p>
    </form>
  );
}
