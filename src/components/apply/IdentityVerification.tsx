"use client";

import { useState, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type VerificationStatus = "PENDING" | "IN_PROGRESS" | "PASSED" | "FAILED";

type Props = {
  applicationId: string;
  initialStatus: VerificationStatus;
  onStatusChange?: (status: VerificationStatus) => void;
};

export default function IdentityVerification({
  applicationId,
  initialStatus,
  onStatusChange,
}: Props) {
  const [status, setStatus] = useState<VerificationStatus>(initialStatus);
  const [verificationUrl, setVerificationUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pollCount, setPollCount] = useState(0);
  const [pollTimedOut, setPollTimedOut] = useState(false);

  const updateStatus = useCallback(
    (newStatus: VerificationStatus) => {
      setStatus(newStatus);
      setPollTimedOut(false);
      onStatusChange?.(newStatus);
    },
    [onStatusChange],
  );

  // Poll for status updates when verification is in progress
  useEffect(() => {
    if (status !== "IN_PROGRESS" || pollTimedOut) return;

    // Stop polling after 10 minutes (120 polls) and show timeout UI
    if (pollCount >= 120) {
      setPollTimedOut(true);
      return;
    }

    const interval = setInterval(async () => {
      try {
        const response = await fetch(
          `/api/applications/status/${applicationId}`,
        );
        if (response.ok) {
          const data = await response.json();
          if (data.idenfyStatus && data.idenfyStatus !== "IN_PROGRESS") {
            updateStatus(data.idenfyStatus);
          }
        }
        setPollCount((prev) => prev + 1);
      } catch {
        // Silently retry on network errors
      }
    }, 5000); // Poll every 5 seconds

    return () => clearInterval(interval);
  }, [status, applicationId, pollCount, pollTimedOut, updateStatus]);

  const checkStatusManually = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/applications/status/${applicationId}`);
      if (response.ok) {
        const data = await response.json();
        if (data.idenfyStatus && data.idenfyStatus !== "IN_PROGRESS") {
          updateStatus(data.idenfyStatus);
        } else {
          setError(
            "Verification is still processing. Please try again in a few minutes, or contact support if this persists.",
          );
        }
      } else {
        setError(
          "Unable to check verification status. Please try again later.",
        );
      }
    } catch {
      setError("Unable to check status. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const initiateVerification = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/applications/verify-identity", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ applicationId }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.error?.code === "CONSENT_REQUIRED") {
          setError(
            "Please complete the background check consent form before verifying your identity.",
          );
        } else {
          setError(
            data.error?.message || "Failed to start identity verification",
          );
        }
        return;
      }

      if (data.status === "already_passed") {
        updateStatus("PASSED");
        return;
      }

      if (data.status === "already_in_progress") {
        updateStatus("IN_PROGRESS");
        return;
      }

      setVerificationUrl(data.verificationUrl);
      updateStatus("IN_PROGRESS");
      setPollCount(0);
    } catch {
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const openVerification = () => {
    if (verificationUrl) {
      window.open(verificationUrl, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <Card className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="text-2xl">
          {status === "PASSED" && "✅"}
          {status === "FAILED" && "❌"}
          {status === "IN_PROGRESS" && "⏳"}
          {status === "PENDING" && "🪪"}
        </div>
        <div>
          <h3 className="text-lg font-semibold text-navy">
            Identity Verification
          </h3>
          <p className="text-sm text-navy-soft">
            {status === "PENDING" &&
              "Verify your identity with a government-issued photo ID and a selfie."}
            {status === "IN_PROGRESS" &&
              "Your identity verification is being processed. This usually takes a few minutes."}
            {status === "PASSED" &&
              "Your identity has been verified successfully."}
            {status === "FAILED" &&
              "Identity verification was not successful. Please try again or contact support."}
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-md bg-red-50 border border-red-200 p-3">
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {status === "PENDING" && (
        <Button
          onClick={initiateVerification}
          disabled={isLoading}
          className="w-full bg-copper hover:bg-copper/90"
        >
          {isLoading
            ? "Starting Verification..."
            : "Start Identity Verification"}
        </Button>
      )}

      {status === "IN_PROGRESS" && verificationUrl && (
        <div className="space-y-3">
          <Button
            onClick={openVerification}
            className="w-full bg-copper hover:bg-copper/90"
          >
            Open Verification Window
          </Button>
          <p className="text-xs text-center text-navy-soft">
            A new window will open for you to complete the verification process.
          </p>
        </div>
      )}

      {status === "IN_PROGRESS" && !verificationUrl && !pollTimedOut && (
        <div className="flex items-center justify-center gap-2 py-2">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-copper border-t-transparent" />
          <span className="text-sm text-navy-soft">
            Waiting for verification result...
          </span>
        </div>
      )}

      {status === "IN_PROGRESS" && pollTimedOut && (
        <div className="space-y-3">
          <div className="rounded-md bg-amber-50 border border-amber-200 p-3">
            <p className="text-sm text-amber-800">
              Verification is taking longer than expected. It may still be
              processing. You can check the status or contact support if the
              issue persists.
            </p>
          </div>
          <Button
            onClick={checkStatusManually}
            disabled={isLoading}
            variant="outline"
            className="w-full"
          >
            {isLoading ? "Checking..." : "Check Status"}
          </Button>
        </div>
      )}

      {status === "FAILED" && (
        <Button
          onClick={initiateVerification}
          disabled={isLoading}
          variant="outline"
          className="w-full"
        >
          {isLoading ? "Retrying..." : "Retry Verification"}
        </Button>
      )}
    </Card>
  );
}
