"use client";

export default function PreviewWaitlistConfirmation() {
  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          <strong>Preview Mode:</strong> This is Stage 2 - Waitlist
          Confirmation. After submitting Stage 1, applicants see this
          confirmation page explaining they&rsquo;re on the waitlist.
        </p>
      </div>

      <div className="bg-white border rounded-lg p-6 space-y-4">
        <div className="text-center space-y-3">
          <h2 className="text-2xl font-semibold text-navy">
            You&rsquo;re on the Waitlist!
          </h2>
          <p className="text-navy-soft">
            Thank you for your interest. We&rsquo;ve received your application
            and you&rsquo;re now on our waitlist.
          </p>
        </div>

        <div className="border-t pt-4 space-y-2">
          <h3 className="font-semibold text-navy">What happens next?</h3>
          <ul className="list-disc list-inside space-y-1 text-sm text-navy-soft">
            <li>You&rsquo;ll receive a confirmation email shortly</li>
            <li>
              We&rsquo;ll review applications in the order they were received
            </li>
            <li>
              When a spot opens up, we&rsquo;ll send you an invite link to
              continue
            </li>
            <li>
              The invite link will allow you to complete the full application
            </li>
          </ul>
        </div>

        <div className="bg-gray-50 rounded p-4 text-sm text-navy-soft">
          <strong>Note:</strong> This is a display-only page. Applicants cannot
          take any action here - they simply wait for an invite email from the
          admin.
        </div>
      </div>
    </div>
  );
}
