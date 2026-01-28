"use client";

import { TEST_EMAIL_TYPES, type TestEmailType } from "@/lib/email/types";
import { useState } from "react";

export default function EmailPreviewPage() {
  const [selectedEmail, setSelectedEmail] = useState<TestEmailType>(
    "WAITLIST_CONFIRMATION",
  );

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <h1 className="mb-2 text-3xl font-bold text-gray-900">
            Email Template Previews
          </h1>
          <p className="text-gray-600">
            Preview email templates without sending actual emails
          </p>
        </div>

        <div className="mb-6 flex flex-wrap gap-2">
          {TEST_EMAIL_TYPES.map((type) => (
            <button
              key={type}
              onClick={() => setSelectedEmail(type)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                selectedEmail === type
                  ? "bg-blue-600 text-white shadow-md"
                  : "bg-white text-gray-700 hover:bg-gray-50 border border-gray-300"
              }`}
            >
              {type.replace(/_/g, " ")}
            </button>
          ))}
        </div>

        <div className="rounded-lg bg-white p-4 shadow-lg">
          <div className="mb-4 flex items-center justify-between border-b pb-4">
            <h2 className="text-xl font-semibold text-gray-900">
              {selectedEmail.replace(/_/g, " ")}
            </h2>
            <a
              href={`/api/admin/preview-email?type=${selectedEmail}`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded bg-gray-100 px-3 py-1 text-sm text-gray-700 hover:bg-gray-200"
            >
              Open in New Tab ↗
            </a>
          </div>

          <div className="border rounded-lg overflow-hidden bg-gray-100">
            <iframe
              key={selectedEmail}
              src={`/api/admin/preview-email?type=${selectedEmail}`}
              className="w-full"
              style={{ height: "800px" }}
              title={`${selectedEmail} Preview`}
            />
          </div>
        </div>

        <div className="mt-6 rounded-lg bg-blue-50 p-4 border border-blue-200">
          <h3 className="mb-2 font-semibold text-blue-900">💡 Pro Tip</h3>
          <p className="text-sm text-blue-800">
            To test email sending, visit{" "}
            <a
              href="/admin/test-emails"
              className="font-medium underline hover:text-blue-600"
            >
              Test Emails
            </a>{" "}
            page. This page is just for previewing the design without sending.
          </p>
        </div>
      </div>
    </div>
  );
}
