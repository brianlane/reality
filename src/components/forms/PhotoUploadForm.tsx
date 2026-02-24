"use client";

import { FormEvent, useRef, useState } from "react";
import { useApplicationDraft } from "./useApplicationDraft";

export const PHOTO_MIN_COUNT = 5;

export default function PhotoUploadForm({
  previewMode = false,
}: {
  previewMode?: boolean;
}) {
  const { draft, updateDraft } = useApplicationDraft();
  const [status, setStatus] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const photos = draft.photos ?? [];

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus(null);

    if (previewMode) {
      setStatus("Preview mode - photo upload is disabled");
      return;
    }

    if (!draft.applicationId) {
      setStatus("Complete previous steps first.");
      return;
    }

    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      setStatus("Please select a photo.");
      return;
    }

    setIsUploading(true);
    const formData = new FormData(event.currentTarget);
    formData.append("applicantId", draft.applicationId);

    const response = await fetch("/api/applications/upload-photo", {
      method: "POST",
      body: formData,
    });

    setIsUploading(false);

    if (!response.ok) {
      setStatus("Photo upload failed.");
      return;
    }

    const data = await response.json();
    updateDraft({
      photos: [...photos, data.photoUrl],
    });

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
    setStatus(null);
  }

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <p className="text-sm font-medium text-navy">
          {photos.length} / {PHOTO_MIN_COUNT} photos uploaded
        </p>
        {photos.length > 0 && (
          <div className="flex flex-wrap gap-3">
            {photos.map((url, i) => (
              <img
                key={url}
                src={url}
                alt={`Photo ${i + 1}`}
                className="h-24 w-24 rounded-lg object-cover border border-slate-200"
              />
            ))}
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          ref={fileInputRef}
          type="file"
          name="file"
          accept="image/*"
          required
          className="hidden"
          id="photo-file-input"
        />
        <div className="flex items-center gap-3">
          <label
            htmlFor="photo-file-input"
            className="cursor-pointer inline-flex items-center justify-center rounded-md bg-copper px-4 py-2 text-sm font-medium text-white transition hover:bg-copper-dark"
          >
            Choose Photo
          </label>
          <button
            type="submit"
            disabled={isUploading}
            className="inline-flex items-center justify-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-navy transition hover:bg-slate-50 disabled:opacity-50"
          >
            {isUploading ? "Uploading..." : "Upload photo"}
          </button>
        </div>
        {status && <p className="text-sm text-red-500">{status}</p>}
      </form>
    </div>
  );
}
