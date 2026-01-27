"use client";

import { useState } from "react";
import { TEST_EMAIL_TYPES, type TestEmailType } from "@/lib/email/types";

export default function TestEmailsPage() {
  const [emailType, setEmailType] = useState<TestEmailType>(
    TEST_EMAIL_TYPES[0],
  );
  const [recipientEmail, setRecipientEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    success: boolean;
    message: string;
  } | null>(null);

  const handleSendEmail = async () => {
    if (!recipientEmail) {
      setResult({ success: false, message: "Please enter an email address" });
      return;
    }

    setLoading(true);
    setResult(null);

    try {
      const response = await fetch("/api/admin/test-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ emailType, recipientEmail }),
      });

      const data = await response.json();

      if (response.ok) {
        setResult({
          success: true,
          message: `✅ Email sent successfully! Resend ID: ${data.resendId || "N/A"}`,
        });
      } else {
        setResult({
          success: false,
          message: `❌ Error: ${data.error?.message || "Unknown error"}`,
        });
      }
    } catch (error) {
      setResult({
        success: false,
        message: `❌ Network error: ${error instanceof Error ? error.message : "Unknown"}`,
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl p-8">
      <h1 className="mb-6 text-3xl font-bold">Test Email Templates</h1>

      <div className="space-y-6 rounded-lg border bg-white p-6 shadow">
        <div>
          <label className="mb-2 block text-sm font-medium">Email Type</label>
          <select
            value={emailType}
            onChange={(e) => setEmailType(e.target.value as TestEmailType)}
            className="w-full rounded-md border px-3 py-2"
          >
            {TEST_EMAIL_TYPES.map((type) => (
              <option key={type} value={type}>
                {type.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium">
            Recipient Email
          </label>
          <input
            type="email"
            value={recipientEmail}
            onChange={(e) => setRecipientEmail(e.target.value)}
            placeholder="your-email@example.com"
            className="w-full rounded-md border px-3 py-2"
          />
        </div>

        <button
          onClick={handleSendEmail}
          disabled={loading}
          className="w-full rounded-md bg-blue-600 px-4 py-2 font-medium text-white hover:bg-blue-700 disabled:bg-gray-400"
        >
          {loading ? "Sending..." : "Send Test Email"}
        </button>

        {result && (
          <div
            className={`rounded-md p-4 ${
              result.success
                ? "bg-green-50 text-green-800"
                : "bg-red-50 text-red-800"
            }`}
          >
            <p className="whitespace-pre-wrap">{result.message}</p>
          </div>
        )}
      </div>

      <div className="mt-8 rounded-lg bg-gray-50 p-6">
        <h2 className="mb-4 text-lg font-semibold">Domain Status</h2>
        <p className="text-sm text-gray-600">
          Your domain{" "}
          <span className="font-mono font-semibold">
            realitymatchmaking.com
          </span>{" "}
          is <span className="text-green-600">✓ Verified</span> in Resend!
        </p>
        <p className="mt-2 text-sm text-gray-600">
          Emails will be sent from:{" "}
          <span className="font-mono">contact@realitymatchmaking.com</span>
        </p>
      </div>
    </div>
  );
}
