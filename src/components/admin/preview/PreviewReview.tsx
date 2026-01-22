"use client";

import { Button } from "@/components/ui/button";
import { mockDemographics, mockPhotos } from "./mockData";

export default function PreviewReview() {
  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          <strong>Preview Mode:</strong> This is Stage 8 - Review &amp; Submit.
          Applicants review all their information before final submission.
        </p>
      </div>

      <div className="bg-white border rounded-lg p-6 space-y-6">
        <div className="text-center space-y-3">
          <h2 className="text-2xl font-semibold text-navy">
            Review Your Application
          </h2>
          <p className="text-navy-soft">
            Please review all the information below before submitting your
            application. You can go back to edit any section if needed.
          </p>
        </div>

        {/* Basic Information */}
        <div className="border-t pt-4 space-y-3">
          <h3 className="text-lg font-semibold text-navy">Basic Information</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-navy-muted">Name:</span>
              <p className="text-navy font-medium">
                {mockDemographics.firstName} {mockDemographics.lastName}
              </p>
            </div>
            <div>
              <span className="text-navy-muted">Email:</span>
              <p className="text-navy font-medium">{mockDemographics.email}</p>
            </div>
            <div>
              <span className="text-navy-muted">Phone:</span>
              <p className="text-navy font-medium">{mockDemographics.phone}</p>
            </div>
            <div>
              <span className="text-navy-muted">Age:</span>
              <p className="text-navy font-medium">{mockDemographics.age}</p>
            </div>
            <div>
              <span className="text-navy-muted">Gender:</span>
              <p className="text-navy font-medium">{mockDemographics.gender}</p>
            </div>
            <div>
              <span className="text-navy-muted">Location:</span>
              <p className="text-navy font-medium">
                {mockDemographics.location}
              </p>
            </div>
          </div>
        </div>

        {/* Demographics */}
        <div className="border-t pt-4 space-y-3">
          <h3 className="text-lg font-semibold text-navy">Demographics</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-navy-muted">Occupation:</span>
              <p className="text-navy font-medium">
                {mockDemographics.occupation}
              </p>
            </div>
            <div>
              <span className="text-navy-muted">Career:</span>
              <p className="text-navy font-medium">
                {mockDemographics.employer}
              </p>
            </div>
            <div>
              <span className="text-navy-muted">Education:</span>
              <p className="text-navy font-medium">
                {mockDemographics.education}
              </p>
            </div>
            <div>
              <span className="text-navy-muted">Income Range:</span>
              <p className="text-navy font-medium">
                {mockDemographics.incomeRange}
              </p>
            </div>
          </div>
        </div>

        {/* About Yourself */}
        <div className="border-t pt-4 space-y-3">
          <h3 className="text-lg font-semibold text-navy">About Yourself</h3>
          <p className="text-sm text-navy-soft">
            {mockDemographics.aboutYourself}
          </p>
        </div>

        {/* Photos */}
        <div className="border-t pt-4 space-y-3">
          <h3 className="text-lg font-semibold text-navy">Photos</h3>
          <div className="grid grid-cols-3 gap-4">
            {mockPhotos.map((photo, index) => (
              <div
                key={index}
                className="aspect-square bg-gray-200 rounded-lg flex items-center justify-center text-gray-500"
              >
                Photo {index + 1}
              </div>
            ))}
          </div>
        </div>

        {/* Questionnaire */}
        <div className="border-t pt-4 space-y-3">
          <h3 className="text-lg font-semibold text-navy">
            Questionnaire Answers
          </h3>
          <p className="text-sm text-navy-soft">
            Your questionnaire responses have been saved and will be reviewed as
            part of your application.
          </p>
        </div>

        {/* Submit */}
        <div className="border-t pt-4 space-y-3">
          <Button
            onClick={() =>
              alert(
                "Preview mode - final submission disabled. In real flow, this would submit the complete application for admin review.",
              )
            }
            className="w-full"
          >
            Submit Application
          </Button>
          <p className="text-xs text-center text-navy-soft">
            By submitting, you confirm that all information provided is accurate
            and complete.
          </p>
        </div>

        <div className="bg-gray-50 rounded p-4 text-sm text-navy-soft">
          <strong>Note:</strong> After submission, the application status
          changes to &ldquo;SUBMITTED&rdquo; and the admin can review it in the
          dashboard. The applicant receives a confirmation email.
        </div>
      </div>
    </div>
  );
}
