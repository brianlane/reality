"use client";
"use no forget";

import { useCallback, useEffect, useRef, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import {
  VOICE_MAX_DURATION_SECONDS,
  VOICE_MAX_FILE_SIZE_BYTES,
} from "@/lib/voice-config";
import { ERROR_MESSAGES } from "@/lib/error-messages";

// Client UI states for the voice recording flow.
// Transcription is server-side only; clients only record, review, and confirm.
type VoicePhase =
  | { phase: "idle" }
  | { phase: "recording"; startedAt: number }
  | { phase: "recorded"; blob: Blob; mimeType: string; blobUrl: string }
  | { phase: "uploading" }
  | { phase: "confirmed"; blobUrl: string }
  | { phase: "failed"; message: string };

interface VoiceTextareaInputProps {
  value: string;
  onChange: (value: string) => void;
  questionId: string;
  applicationId: string | null;
  rows?: number;
  required?: boolean;
  /** Called when a recording is confirmed (true) or discarded (false). */
  onAudioConfirmed?: (confirmed: boolean) => void;
}

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function VoiceTextareaInput({
  value,
  onChange,
  questionId,
  applicationId,
  rows = 4,
  required,
  onAudioConfirmed,
}: VoiceTextareaInputProps) {
  "use no memo";
  const [voicePhase, setVoicePhase] = useState<VoicePhase>({ phase: "idle" });
  const [elapsed, setElapsed] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const cancelledRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Track current blob URL so we can revoke it when re-recording or on unmount.
  const blobUrlRef = useRef<string | null>(null);

  const revokeBlobUrl = useCallback(() => {
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }
  }, []);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setElapsed(0);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearTimer();
      revokeBlobUrl();
      if (
        mediaRecorderRef.current &&
        mediaRecorderRef.current.state !== "inactive"
      ) {
        cancelledRef.current = true;
        mediaRecorderRef.current.stop();
      }
    };
  }, [clearTimer, revokeBlobUrl]);

  const resetToIdle = useCallback(
    (wasConfirmed: boolean) => {
      revokeBlobUrl();
      setVoicePhase({ phase: "idle" });
      if (wasConfirmed) {
        onAudioConfirmed?.(false);
      }
    },
    [revokeBlobUrl, onAudioConfirmed],
  );

  const uploadAndConfirm = useCallback(
    async (blob: Blob, mimeType: string, blobUrl: string) => {
      if (!applicationId) return;
      setVoicePhase({ phase: "uploading" });

      if (blob.size > VOICE_MAX_FILE_SIZE_BYTES) {
        setVoicePhase({
          phase: "failed",
          message: `Recording is too large (max ${VOICE_MAX_FILE_SIZE_BYTES / 1024 / 1024}MB). Please try a shorter recording.`,
        });
        return;
      }

      try {
        const normalizedMimeType =
          (blob.type || "audio/webm").split(";")[0].trim().toLowerCase() ||
          "audio/webm";

        const urlRes = await fetch(
          "/api/applications/questionnaire/audio-upload-url",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              applicationId,
              questionId,
              mimeType: normalizedMimeType,
              fileSize: blob.size,
            }),
          },
        );

        if (!urlRes.ok) {
          const data = (await urlRes.json().catch(() => ({}))) as {
            error?: { message?: string };
          };
          setVoicePhase({
            phase: "failed",
            message: data?.error?.message ?? ERROR_MESSAGES.VOICE_UPLOAD_FAILED,
          });
          return;
        }

        const { signedUrl, storagePath } = (await urlRes.json()) as {
          signedUrl: string;
          storagePath: string;
        };

        const uploadUrl =
          signedUrl.startsWith("http://") || signedUrl.startsWith("https://")
            ? signedUrl
            : (process.env.NEXT_PUBLIC_SUPABASE_URL ?? "") + signedUrl;

        const uploadRes = await fetch(uploadUrl, {
          method: "PUT",
          headers: { "Content-Type": normalizedMimeType },
          body: blob,
        });

        if (!uploadRes.ok) {
          const uploadErrorText = await uploadRes.text().catch(() => "");
          console.error("voice upload failed", {
            status: uploadRes.status,
            statusText: uploadRes.statusText,
            uploadErrorText,
          });
          setVoicePhase({
            phase: "failed",
            message: ERROR_MESSAGES.VOICE_UPLOAD_FAILED,
          });
          return;
        }

        // Recording confirmed — transition before firing background transcription.
        setVoicePhase({ phase: "confirmed", blobUrl });
        onAudioConfirmed?.(true);

        // Fire-and-forget: trigger server-side transcription for admin review.
        // The client does not poll for the result.
        void fetch("/api/applications/questionnaire/audio-upload-complete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            applicationId,
            questionId,
            storagePath,
            mimeType: normalizedMimeType,
            fileSize: blob.size,
          }),
        }).catch(() => {});
      } catch {
        setVoicePhase({
          phase: "failed",
          message: "An unexpected error occurred. Please try again.",
        });
      }
    },
    [applicationId, questionId, onAudioConfirmed],
  );

  const stopRecording = useCallback(() => {
    clearTimer();
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.stop();
    }
  }, [clearTimer]);

  const startRecording = useCallback(async () => {
    if (!applicationId) {
      setVoicePhase({
        phase: "failed",
        message: "Application context is required for voice input.",
      });
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      const mimeType =
        [
          "audio/webm;codecs=opus",
          "audio/webm",
          "audio/mp4",
          "audio/ogg;codecs=opus",
        ].find((type) => MediaRecorder.isTypeSupported(type)) ?? "";

      const recorder = new MediaRecorder(
        stream,
        mimeType ? { mimeType } : undefined,
      );
      chunksRef.current = [];
      cancelledRef.current = false;
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        if (cancelledRef.current) return;
        const effectiveMime = mimeType || "audio/webm";
        const blob = new Blob(chunksRef.current, { type: effectiveMime });
        // Revoke any previous blob URL before creating a new one.
        revokeBlobUrl();
        const blobUrl = URL.createObjectURL(blob);
        blobUrlRef.current = blobUrl;
        setVoicePhase({
          phase: "recorded",
          blob,
          mimeType: effectiveMime,
          blobUrl,
        });
      };

      recorder.start(250);
      const startedAt = Date.now();
      setVoicePhase({ phase: "recording", startedAt });
      setElapsed(0);

      timerRef.current = setInterval(() => {
        const secs = Math.floor((Date.now() - startedAt) / 1000);
        setElapsed(secs);
        if (secs >= VOICE_MAX_DURATION_SECONDS) {
          stopRecording();
        }
      }, 1000);
    } catch (err) {
      const name = err instanceof Error ? err.name : "";
      const message =
        name === "NotAllowedError"
          ? ERROR_MESSAGES.VOICE_PERMISSION_DENIED
          : name === "NotFoundError"
            ? ERROR_MESSAGES.VOICE_NO_MICROPHONE
            : "Could not start recording. Please check microphone permissions.";
      setVoicePhase({ phase: "failed", message });
    }
  }, [applicationId, stopRecording, revokeBlobUrl]);

  const cancelRecording = useCallback(() => {
    cancelledRef.current = true;
    clearTimer();
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== "inactive"
    ) {
      mediaRecorderRef.current.stop();
    }
    setVoicePhase({ phase: "idle" });
  }, [clearTimer]);

  const isBusy =
    voicePhase.phase === "uploading" || voicePhase.phase === "recording";

  return (
    <div className="space-y-2">
      <Textarea
        rows={rows}
        value={value}
        required={required && voicePhase.phase !== "confirmed"}
        onChange={(e) => onChange(e.target.value)}
        disabled={isBusy}
        className={isBusy ? "opacity-60" : undefined}
      />

      {/* Voice controls row */}
      <div className="flex flex-wrap items-center gap-2 min-h-[1.75rem]">
        {voicePhase.phase === "idle" && (
          <button
            type="button"
            onClick={startRecording}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 py-1.5 text-xs font-medium text-navy-soft hover:bg-slate-50 hover:border-slate-400 transition-colors"
          >
            <MicIcon />
            Voice answer
          </button>
        )}

        {voicePhase.phase === "recording" && (
          <>
            <span className="flex items-center gap-1.5 text-xs text-red-600 font-medium">
              <span className="inline-block h-2 w-2 rounded-full bg-red-500 animate-pulse" />
              {formatDuration(elapsed)} /{" "}
              {formatDuration(VOICE_MAX_DURATION_SECONDS)}
            </span>
            <button
              type="button"
              onClick={stopRecording}
              className="inline-flex items-center gap-1.5 rounded-md border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100 transition-colors"
            >
              Stop recording
            </button>
            <button
              type="button"
              onClick={cancelRecording}
              className="text-xs text-navy-soft hover:text-navy underline"
            >
              Cancel
            </button>
          </>
        )}

        {voicePhase.phase === "uploading" && (
          <span className="flex items-center gap-1.5 text-xs text-navy-soft">
            <SpinnerIcon />
            Saving recording…
          </span>
        )}

        {voicePhase.phase === "failed" && (
          <>
            <span className="text-xs text-red-600">{voicePhase.message}</span>
            <button
              type="button"
              onClick={() => resetToIdle(false)}
              className="text-xs text-navy-soft hover:text-navy underline"
            >
              Try again
            </button>
          </>
        )}
      </div>

      {/* Recorded: playback + confirm/discard */}
      {voicePhase.phase === "recorded" && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-2">
          <p className="text-xs font-medium text-navy-soft">
            Review your recording before saving
          </p>
          <audio src={voicePhase.blobUrl} controls className="w-full" />
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              type="button"
              onClick={() =>
                void uploadAndConfirm(
                  voicePhase.blob,
                  voicePhase.mimeType,
                  voicePhase.blobUrl,
                )
              }
              className="inline-flex items-center gap-1.5 rounded-md bg-copper px-3 py-1.5 text-xs font-semibold text-white hover:bg-copper-dark transition-colors"
            >
              Save recording
            </button>
            <button
              type="button"
              onClick={() => resetToIdle(false)}
              className="text-xs text-navy-soft hover:text-navy underline"
            >
              Re-record
            </button>
          </div>
        </div>
      )}

      {/* Confirmed: saved indicator + playback */}
      {voicePhase.phase === "confirmed" && (
        <div className="rounded-lg border border-copper/40 bg-copper/5 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <p className="flex items-center gap-1.5 text-xs font-semibold text-copper-dark">
              <CheckIcon />
              Voice recording saved
            </p>
            <button
              type="button"
              onClick={() => resetToIdle(true)}
              className="text-xs text-navy-soft hover:text-navy underline"
            >
              Re-record
            </button>
          </div>
          <audio src={voicePhase.blobUrl} controls className="w-full" />
        </div>
      )}
    </div>
  );
}

function MicIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  );
}

function SpinnerIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      className="animate-spin"
      aria-hidden="true"
    >
      <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
