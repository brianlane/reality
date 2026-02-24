"use client";

import { useRef, useState } from "react";
import { useApplicationDraft } from "./useApplicationDraft";
import { PHOTO_MIN_COUNT } from "@/lib/photo-config";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function PhotoUploadForm({
  previewMode = false,
  onPhotosChange,
}: {
  previewMode?: boolean;
  onPhotosChange?: (photos: string[]) => void;
}) {
  const { draft, updateDraft } = useApplicationDraft();
  const [status, setStatus] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<string | null>(null);
  const [selectedCount, setSelectedCount] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const photos = draft.photos ?? [];

  function handleFileChange() {
    const count = fileInputRef.current?.files?.length ?? 0;
    setSelectedCount(count);
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

    const files = fileInputRef.current?.files;
    if (!files || files.length === 0) {
      setStatus("Please choose at least one photo.");
      return;
    }

    setIsUploading(true);
    const uploaded: string[] = [];
    const failed: string[] = [];

    try {
      const supabase = createSupabaseBrowserClient();

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setUploadProgress(`Uploading ${i + 1} of ${files.length}…`);

        try {
          // Step 1: Get a signed upload URL from our API
          const urlRes = await fetch("/api/applications/upload-url", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              applicantId: draft.applicationId,
              filename: file.name,
              mimeType: file.type,
              fileSize: file.size,
            }),
          });
          const urlData = await urlRes.json().catch(() => null);
          if (!urlRes.ok) {
            failed.push(
              `${file.name}: ${urlData?.error?.message ?? "failed to get upload URL"}`,
            );
            continue;
          }

          const { token, storagePath } = urlData;

          // Step 2: Upload directly to Supabase (bypasses serverless body limit)
          if (!supabase) {
            failed.push(`${file.name}: storage client unavailable`);
            continue;
          }
          const { error: uploadError } = await supabase.storage
            .from("photos")
            .uploadToSignedUrl(storagePath, token, file, {
              contentType: file.type,
              cacheControl: "3600",
            });
          if (uploadError) {
            failed.push(
              `${file.name}: ${uploadError.message ?? "upload failed"}`,
            );
            continue;
          }

          // Step 3: Confirm upload so we can save the URL to the database
          const confirmRes = await fetch("/api/applications/confirm-photo", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              applicantId: draft.applicationId,
              storagePath,
            }),
          });
          const confirmData = await confirmRes.json().catch(() => null);
          if (!confirmRes.ok) {
            failed.push(
              `${file.name}: ${confirmData?.error?.message ?? "failed to save photo"}`,
            );
            continue;
          }

          uploaded.push(confirmData.photoUrl);
        } catch {
          failed.push(`${file.name}: network error`);
        }
      }

      if (uploaded.length > 0) {
        const nextPhotos = [...photos, ...uploaded];
        updateDraft({ photos: nextPhotos });
        onPhotosChange?.(nextPhotos);
      }

      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      setSelectedCount(0);

      if (failed.length > 0) {
        setStatus(
          `${uploaded.length} photo${uploaded.length !== 1 ? "s" : ""} uploaded. Failed: ${failed.join("; ")}`,
        );
      } else {
        setStatus(null);
      }
    } finally {
      setIsUploading(false);
      setUploadProgress(null);
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
        multiple
        className="hidden"
        id="photo-file-input"
        onChange={handleFileChange}
      />

      {/* Buttons */}
      <div className="flex items-center gap-3">
        <label
          htmlFor="photo-file-input"
          className="cursor-pointer inline-flex items-center justify-center rounded-md bg-copper px-4 py-2 text-sm font-medium text-white transition hover:bg-copper-dark select-none"
        >
          Choose Photos
        </label>

        <button
          type="button"
          onClick={handleUpload}
          disabled={isUploading || selectedCount === 0}
          className="inline-flex items-center justify-center rounded-md border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-navy transition hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {isUploading
            ? (uploadProgress ?? "Uploading…")
            : selectedCount > 0
              ? `Upload ${selectedCount} photo${selectedCount !== 1 ? "s" : ""}`
              : "Upload photos"}
        </button>

        {selectedCount > 0 && !isUploading && (
          <span className="text-sm text-navy-soft">
            {selectedCount} file{selectedCount !== 1 ? "s" : ""} selected
          </span>
        )}
      </div>

      {status && (
        <p
          className={`text-sm ${status.includes("Failed") ? "text-red-500" : "text-navy-soft"}`}
        >
          {status}
        </p>
      )}
    </div>
  );
}
