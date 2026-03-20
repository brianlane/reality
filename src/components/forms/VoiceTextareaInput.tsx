"use client";
"use no forget";

import { useCallback, useEffect, useRef, useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import {
  VOICE_MAX_DURATION_SECONDS,
  VOICE_MAX_FILE_SIZE_BYTES,
  VOICE_POLL_INTERVAL_MS,
  VOICE_POLL_MAX_ATTEMPTS,
  type VoiceStatus,
} from "@/lib/voice-config";
import { ERROR_MESSAGES } from "@/lib/error-messages";

// Flag 4: Async processing UX — all states the voice pipeline can be in.
type VoicePhase =
  | { phase: "idle" }
  | { phase: "recording"; startedAt: number }
  | { phase: "uploading" }
  | { phase: "processing"; storagePath: string }
  | { phase: "transcribed"; transcript: string; storagePath: string }
  | { phase: "failed"; message: string; storagePath?: string };

interface VoiceTextareaInputProps {
  value: string;
  onChange: (value: string) => void;
  questionId: string;
  applicationId: string | null;
  rows?: number;
  required?: boolean;
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
}: VoiceTextareaInputProps) {
  "use no memo";
  const [voicePhase, setVoicePhase] = useState<VoicePhase>({ phase: "idle" });
  const [elapsed, setElapsed] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const cancelledRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const pollAttemptsRef = useRef(0);
  const pollGenerationRef = useRef(0);
  const pollRequestControllerRef = useRef<AbortController | null>(null);
  const pollInFlightRef = useRef(false);

  const clearTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setElapsed(0);
  }, []);

  const clearPoll = useCallback(() => {
    if (pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }
    if (pollRequestControllerRef.current) {
      pollRequestControllerRef.current.abort();
      pollRequestControllerRef.current = null;
    }
    pollInFlightRef.current = false;
    pollGenerationRef.current += 1;
    pollAttemptsRef.current = 0;
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      clearTimer();
      clearPoll();
      if (
        mediaRecorderRef.current &&
        mediaRecorderRef.current.state !== "inactive"
      ) {
        cancelledRef.current = true;
        mediaRecorderRef.current.stop();
      }
    };
  }, [clearTimer, clearPoll]);

  const startPolling = useCallback(
    (storagePath: string) => {
      if (!applicationId) return;
      // Clear any previously running poll so the old interval isn't leaked if
      // startPolling is somehow called while a poll is already active.
      clearPoll();
      const generation = pollGenerationRef.current;
      pollAttemptsRef.current = 0;

      pollRef.current = setInterval(async () => {
        if (generation !== pollGenerationRef.current) {
          return;
        }
        if (pollInFlightRef.current) {
          return;
        }
        pollInFlightRef.current = true;
        pollAttemptsRef.current += 1;

        // Flag 4: timeout after max polling attempts
        if (pollAttemptsRef.current > VOICE_POLL_MAX_ATTEMPTS) {
          if (generation === pollGenerationRef.current) {
            clearPoll();
            setVoicePhase({
              phase: "failed",
              message: "Transcription timed out. Please try again.",
              storagePath,
            });
          }
          return;
        }

        const controller = new AbortController();
        pollRequestControllerRef.current = controller;

        try {
          const res = await fetch(
            `/api/applications/questionnaire/voice-status?applicationId=${encodeURIComponent(applicationId)}&questionId=${encodeURIComponent(questionId)}`,
            { signal: controller.signal },
          );
          if (generation !== pollGenerationRef.current) return;
          if (!res.ok) return;

          const data = (await res.json()) as {
            voiceStatus: VoiceStatus | null;
            voiceTranscript: string | null;
            voiceErrorCode: string | null;
          };
          if (generation !== pollGenerationRef.current) return;

          if (data.voiceStatus === "transcribed" && data.voiceTranscript) {
            clearPoll();
            setVoicePhase({
              phase: "transcribed",
              transcript: data.voiceTranscript,
              storagePath,
            });
          } else if (data.voiceStatus === "failed") {
            clearPoll();
            setVoicePhase({
              phase: "failed",
              message: ERROR_MESSAGES.VOICE_TRANSCRIPTION_FAILED,
              storagePath,
            });
          }
          // voiceStatus === "processing" or null → keep polling
        } catch (err) {
          // Network error — keep polling; don't abort
          if (err instanceof DOMException && err.name === "AbortError") {
            return;
          }
        } finally {
          if (pollRequestControllerRef.current === controller) {
            pollRequestControllerRef.current = null;
          }
          pollInFlightRef.current = false;
        }
      }, VOICE_POLL_INTERVAL_MS);
    },
    [applicationId, questionId, clearPoll],
  );

  const uploadAudio = useCallback(
    async (blob: Blob) => {
      if (!applicationId) return;
      setVoicePhase({ phase: "uploading" });

      // Flag 3: client-side size guard
      if (blob.size > VOICE_MAX_FILE_SIZE_BYTES) {
        setVoicePhase({
          phase: "failed",
          message: `Recording is too large (max ${VOICE_MAX_FILE_SIZE_BYTES / 1024 / 1024}MB). Please try a shorter recording.`,
        });
        return;
      }

      try {
        const urlRes = await fetch(
          "/api/applications/questionnaire/audio-upload-url",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              applicationId,
              questionId,
              mimeType: blob.type || "audio/webm",
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

        // Upload directly to Supabase Storage via the signed URL
        const uploadRes = await fetch(signedUrl, {
          method: "PUT",
          headers: { "Content-Type": blob.type || "audio/webm" },
          body: blob,
        });

        if (!uploadRes.ok) {
          setVoicePhase({
            phase: "failed",
            message: ERROR_MESSAGES.VOICE_UPLOAD_FAILED,
          });
          return;
        }

        // Flag 4: transition to processing and begin polling
        setVoicePhase({ phase: "processing", storagePath });
        startPolling(storagePath);
      } catch {
        setVoicePhase({
          phase: "failed",
          message: "An unexpected error occurred. Please try again.",
        });
      }
    },
    [applicationId, questionId, startPolling],
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

      // Flag 2: prefer webm/opus (Chrome/Firefox), fall back to mp4 (Safari)
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
        if (cancelledRef.current) return; // discard without uploading
        const blob = new Blob(chunksRef.current, {
          type: mimeType || "audio/webm",
        });
        void uploadAudio(blob);
      };

      recorder.start(250); // collect chunks every 250ms
      const startedAt = Date.now();
      setVoicePhase({ phase: "recording", startedAt });
      setElapsed(0);

      // Flag 3: auto-stop at max duration
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
  }, [applicationId, stopRecording, uploadAudio]);

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

  const useTranscript = useCallback(() => {
    if (voicePhase.phase !== "transcribed") return;
    onChange(voicePhase.transcript);
    setVoicePhase({ phase: "idle" });
  }, [voicePhase, onChange]);

  const appendTranscript = useCallback(() => {
    if (voicePhase.phase !== "transcribed") return;
    const sep = value.trim().length > 0 ? "\n\n" : "";
    onChange(value + sep + voicePhase.transcript);
    setVoicePhase({ phase: "idle" });
  }, [voicePhase, value, onChange]);

  const resetVoice = useCallback(() => {
    clearPoll();
    clearTimer();
    setVoicePhase({ phase: "idle" });
  }, [clearPoll, clearTimer]);

  const isBusy =
    voicePhase.phase === "uploading" || voicePhase.phase === "processing";

  return (
    <div className="space-y-2">
      <Textarea
        rows={rows}
        value={value}
        required={required}
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
              Stop &amp; transcribe
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
            Uploading…
          </span>
        )}

        {voicePhase.phase === "processing" && (
          <span className="flex items-center gap-1.5 text-xs text-navy-soft">
            <SpinnerIcon />
            Transcribing your voice answer…
          </span>
        )}

        {voicePhase.phase === "failed" && (
          <>
            <span className="text-xs text-red-600">{voicePhase.message}</span>
            <button
              type="button"
              onClick={resetVoice}
              className="text-xs text-navy-soft hover:text-navy underline"
            >
              Try again
            </button>
          </>
        )}
      </div>

      {/* Transcript suggestion panel — shown when transcription is ready */}
      {voicePhase.phase === "transcribed" && (
        <div className="rounded-lg border border-copper/40 bg-copper/5 p-3 space-y-2">
          <p className="text-xs font-semibold text-copper-dark">
            Voice transcript ready — review and use below
          </p>
          <p className="text-sm text-navy-soft whitespace-pre-wrap leading-relaxed">
            {voicePhase.transcript}
          </p>
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              type="button"
              onClick={useTranscript}
              className="rounded-md bg-copper px-3 py-1.5 text-xs font-semibold text-white hover:bg-copper-dark transition-colors"
            >
              Use as answer
            </button>
            {value.trim().length > 0 && (
              <button
                type="button"
                onClick={appendTranscript}
                className="rounded-md border border-copper text-copper px-3 py-1.5 text-xs font-medium hover:bg-copper/10 transition-colors"
              >
                Append to answer
              </button>
            )}
            <button
              type="button"
              onClick={resetVoice}
              className="text-xs text-navy-soft hover:text-navy underline"
            >
              Dismiss
            </button>
          </div>
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
