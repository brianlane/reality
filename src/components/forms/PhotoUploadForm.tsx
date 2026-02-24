"use client";

import { useRef, useState } from "react";
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
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const photos = draft.photos ?? [];

  function handleFileChange() {
    const file = fileInputRef.current?.files?.[0];
    setSelectedFileName(file ? file.name : null);
    setStatus(null);
  }

  async function handleUpload() {
    setStatus(null);

    if (previewMode) {
      setStatus("Preview mode — photo upload is disabled.");
      return;
    }

    if (!draft.applicationId) {
      setStatus("Complete previous steps first.");
      return;
    }

    const file = fileInputRef.current?.files?.[0];
    if (!file) {
      setStatus("Please choose a photo first.");
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("applicantId", draft.applicationId);

      const response = await fetch("/api/applications/upload-photo", {
        method: "POST",
        body: formData,
      });

      const data = await response.json().catch(() => null);

      if (!response.ok) {
        setStatus(data?.error?.message ?? "Photo upload failed.");
        return;
      }

      updateDraft({ photos: [...photos, data.photoUrl] });

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      setSelectedFileName(null);
      setStatus(null);
    } catch {
      setStatus("Upload failed. Please check your connection and try again.");
    } finally {
      setIsUploading(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Counter + thumbnails */}
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

      {/* File picker */}
      <input
        ref={fileInputRef}
        type="file"
        name="file"
        accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
        className="hidden"
        id="photo-file-input"
        onChange={handleFileChange}
      />

      {/* Buttons — all on the same baseline */}
      <div className="flex items-center gap-3">
        <label
          htmlFor="photo-file-input"
          className="cursor-pointer inline-flex items-center justify-center rounded-md bg-copper px-4 py-2 text-sm font-medium text-white transition hover:bg-copper-dark select-none"
        >
          Choose Photo
        </label>

        <button
          type="button"
          onClick={handleUpload}
          disabled={isUploading || !selectedFileName}
          className="inline-flex items-center justify-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-navy transition hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isUploading ? "Uploading…" : "Upload photo"}
        </button>

        {selectedFileName && !isUploading && (
          <span
            className="text-sm text-navy-soft truncate max-w-[180px]"
            title={selectedFileName}
          >
            {selectedFileName}
          </span>
        )}
        {isUploading && (
          <span className="text-sm text-navy-soft">Uploading…</span>
        )}
      </div>

      {status && <p className="text-sm text-red-500">{status}</p>}
    </div>
  );
}
