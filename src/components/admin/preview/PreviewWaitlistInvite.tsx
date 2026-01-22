"use client";

import { Button } from "@/components/ui/button";

export default function PreviewWaitlistInvite() {
  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          <strong>Preview Mode:</strong> This is Stage 3 - Waitlist Invite.
          When the admin invites someone off the waitlist, they receive an
          email with a unique link that brings them to this page.
        </p>
      </div>

      <div className="bg-white border rounded-lg p-6 space-y-4">
        <div className="text-center space-y-3">
          <h2 className="text-2xl font-semibold text-navy">
            You've Been Invited!
          </h2>
          <p className="text-navy-soft">
            Congratulations! You've been selected to continue your application.
            Click the button below to get started.
          </p>
        </div>

        <div className="border-t pt-4 space-y-2">
          <h3 className="font-semibold text-navy">Next Steps</h3>
          <ul className="list-disc list-inside space-y-1 text-sm text-navy-soft">
            <li>Complete your demographic information</li>
            <li>Submit the application fee payment</li>
            <li>Answer the questionnaire</li>
            <li>Upload your photos</li>
            <li>Review and submit your final application</li>
          </ul>
        </div>

        <div className="flex justify-center pt-4">
          <Button
            onClick={() =>
              alert("Preview mode - navigation disabled. In real flow, this would take the applicant to Stage 4 (Demographics).")
            }
          >
            Continue Application
          </Button>
        </div>

        <div className="bg-gray-50 rounded p-4 text-sm text-navy-soft">
          <strong>Invite Token:</strong> preview-invite-token-123
          <br />
          This unique token is validated on the server to ensure only invited
          applicants can proceed.
        </div>
      </div>
    </div>
  );
}
