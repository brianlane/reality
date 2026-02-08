"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type Props = {
  applicationId: string;
  firstName: string;
  lastName: string;
};

export default function BackgroundCheckConsentForm({
  applicationId,
  firstName,
  lastName,
}: Props) {
  const [fullName, setFullName] = useState("");
  const [consentChecked, setConsentChecked] = useState(false);
  const [evergreenChecked, setEvergreenChecked] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const isValid =
    fullName.trim().length >= 2 && consentChecked && evergreenChecked;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValid) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(
        "/api/applications/background-check-consent",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            applicationId,
            fullName: fullName.trim(),
            consentGiven: true,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        setError(
          data.error?.message || "Failed to record consent. Please try again.",
        );
        return;
      }

      setSuccess(true);

      // Redirect after a brief delay to show success
      setTimeout(() => {
        window.location.href = `/apply/waitlist?id=${applicationId}`;
      }, 2000);
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 p-8 text-center">
        <div className="text-4xl mb-4">&#10003;</div>
        <h2 className="text-xl font-semibold text-green-800 mb-2">
          Consent Recorded
        </h2>
        <p className="text-green-700">
          Your background check authorization has been recorded. Redirecting...
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-semibold text-navy">
          Background Check Authorization
        </h1>
        <p className="text-navy-soft">
          Please review and authorize the following disclosure carefully.
        </p>
      </div>

      {/* FCRA Standalone Disclosure */}
      <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-6 shadow-sm">
        <div className="space-y-4">
          <h2 className="text-lg font-semibold text-navy">
            Disclosure and Authorization
          </h2>

          <div className="text-sm text-navy-soft leading-relaxed space-y-3">
            <p>
              <strong>Disclosure:</strong> In connection with your application
              for membership with Reality Matchmaking (&quot;the Company&quot;),
              a consumer report and/or investigative consumer report may be
              obtained from a third-party consumer reporting agency. This report
              may include information regarding your:
            </p>

            <ul className="list-disc pl-6 space-y-1">
              <li>Identity verification (via iDenfy)</li>
              <li>Social Security Number trace</li>
              <li>National criminal database search</li>
              <li>7-year county-level criminal court search</li>
              <li>Sex offender registry check</li>
              <li>
                Financial record check (liens, judgments, and bankruptcies)
              </li>
            </ul>

            <p>
              These checks are conducted by Checkr, Inc. and iDenfy, licensed
              consumer reporting agencies, to verify your identity, criminal
              history, and financial standing for membership eligibility
              purposes.
            </p>

            <p>
              <strong>Your Rights Under the FCRA:</strong> Under the Fair Credit
              Reporting Act (FCRA), you have the right to:
            </p>

            <ul className="list-disc pl-6 space-y-1">
              <li>
                Receive a copy of any consumer report obtained about you upon
                request
              </li>
              <li>
                Dispute the accuracy or completeness of any information in a
                consumer report
              </li>
              <li>
                Receive a description of the nature and scope of any
                investigative consumer report requested about you
              </li>
              <li>
                Be informed if information in your report is used as a basis for
                denying your membership application
              </li>
            </ul>

            <p>
              A summary of your rights under the FCRA is available at{" "}
              <a
                href="https://www.consumer.ftc.gov/articles/pdf-0096-fair-credit-reporting-act.pdf"
                target="_blank"
                rel="noopener noreferrer"
                className="text-copper underline"
              >
                www.consumer.ftc.gov
              </a>
              .
            </p>
          </div>
        </div>

        <hr className="border-slate-200" />

        {/* Evergreen Consent for Continuous Monitoring */}
        <div className="space-y-3">
          <h3 className="text-base font-semibold text-navy">
            Ongoing Monitoring Authorization
          </h3>
          <p className="text-sm text-navy-soft leading-relaxed">
            By providing your authorization below, you also consent to
            continuous criminal record monitoring for the duration of your
            active membership. This means the Company may receive updated
            reports if new records are found. You may revoke this consent at any
            time by canceling your membership.
          </p>
          <p className="text-xs text-slate-400">
            Note: For California residents, you may be asked to re-authorize
            this consent annually in accordance with state law.
          </p>
        </div>

        <hr className="border-slate-200" />

        {/* Consent Checkboxes */}
        <div className="space-y-4">
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={consentChecked}
              onChange={(e) => setConsentChecked(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-slate-300 text-copper focus:ring-copper"
            />
            <span className="text-sm text-navy leading-relaxed">
              I have read and understand the above disclosure. I authorize
              Reality Matchmaking to obtain a consumer report about me for the
              purpose of evaluating my membership application.
            </span>
          </label>

          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={evergreenChecked}
              onChange={(e) => setEvergreenChecked(e.target.checked)}
              className="mt-1 h-4 w-4 rounded border-slate-300 text-copper focus:ring-copper"
            />
            <span className="text-sm text-navy leading-relaxed">
              I authorize ongoing monitoring of my criminal record for the
              duration of my membership. I understand I can revoke this
              authorization at any time by canceling my membership.
            </span>
          </label>
        </div>

        <hr className="border-slate-200" />

        {/* Digital Signature */}
        <div className="space-y-3">
          <h3 className="text-base font-semibold text-navy">
            Digital Signature
          </h3>
          <p className="text-sm text-navy-soft">
            Please type your full legal name below as your electronic signature.
          </p>
          <Input
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder={`${firstName} ${lastName}`}
            className="text-base"
          />
          <p className="text-xs text-slate-400">
            By typing your name and submitting this form, you are providing your
            digital signature, which has the same legal effect as a handwritten
            signature.
          </p>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 p-3">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Submit */}
      <Button
        type="submit"
        disabled={!isValid || isSubmitting}
        className="w-full bg-copper hover:bg-copper/90 disabled:opacity-50 disabled:cursor-not-allowed py-3 text-base"
      >
        {isSubmitting
          ? "Recording Authorization..."
          : "I Authorize Background Check"}
      </Button>

      <p className="text-center text-xs text-slate-400">
        Your consent and digital signature are recorded with a timestamp and
        your IP address for legal compliance purposes.
      </p>
    </form>
  );
}
