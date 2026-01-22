"use client";

import PhotoUploadForm from "@/components/forms/PhotoUploadForm";
import { PreviewDraftProvider } from "./PreviewDraftProvider";
import { mockPhotos } from "./mockData";

export default function PreviewPhotos() {
  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-blue-800">
          <strong>Preview Mode:</strong> This is Stage 7 - Photo Upload.
          Applicants upload photos as part of their application. Typically 3-5
          photos are required.
        </p>
      </div>

      <div className="bg-white border rounded-lg p-6 space-y-4">
        <div className="space-y-3">
          <h2 className="text-2xl font-semibold text-navy">Upload Photos</h2>
          <p className="text-navy-soft">
            Please upload recent photos of yourself. We recommend uploading 3-5
            clear, well-lit photos that show your personality.
          </p>
        </div>

        <div className="border-t pt-4">
          <h3 className="font-semibold text-navy mb-3">
            Sample Uploaded Photos
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
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

        <div className="border-t pt-4">
          <h3 className="font-semibold text-navy mb-3">Upload Form</h3>
          <PreviewDraftProvider>
            <PhotoUploadForm previewMode={true} />
          </PreviewDraftProvider>
        </div>

        <div className="bg-gray-50 rounded p-4 text-sm text-navy-soft">
          <strong>Note:</strong> In the real application, photos are uploaded
          to cloud storage and thumbnails are generated. The preview shows
          placeholder images.
        </div>
      </div>
    </div>
  );
}
