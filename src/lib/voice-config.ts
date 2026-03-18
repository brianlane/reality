// Acceptance criteria constants for the voice input feature.
// Each constant maps to a specific review flag documented in the plan.

// Flag 2: Browser codec variance — accepted MIME types from all major browsers.
// Chrome/Firefox produce webm/opus; Safari produces mp4/aac.
export const VOICE_ALLOWED_MIME_TYPES = [
  "audio/webm",
  "audio/webm;codecs=opus",
  "audio/mp4",
  "audio/mpeg",
  "audio/wav",
  "audio/ogg",
  "audio/ogg;codecs=opus",
] as const;

export type VoiceAllowedMimeType = (typeof VOICE_ALLOWED_MIME_TYPES)[number];

// Flag 3: Recording limits — enforced in both UI and upload URL issuance.
export const VOICE_MAX_DURATION_SECONDS = 180; // 3 minutes
export const VOICE_MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

// Flag 6: Storage provisioning — bucket name used by all voice storage operations.
export const VOICE_AUDIO_BUCKET = "questionnaire-audio";

// Flag 4: Async processing UX — status values for the transcription state machine.
// processing → transcribed (success path)
// processing → failed     (error path)
export type VoiceStatus = "processing" | "transcribed" | "failed";

// Polling config for the frontend status check loop.
export const VOICE_POLL_INTERVAL_MS = 2500;
export const VOICE_POLL_MAX_ATTEMPTS = 36; // ~90 seconds max

// Flag 2: Normalize and validate MIME type (strip codec params for comparison).
export function isMimeTypeAllowed(mimeType: string): boolean {
  const base = mimeType.split(";")[0].trim().toLowerCase();
  return VOICE_ALLOWED_MIME_TYPES.some(
    (allowed) => allowed.split(";")[0].trim().toLowerCase() === base,
  );
}

export function mimeTypeToExtension(mimeType: string): string {
  const base = mimeType.split(";")[0].trim().toLowerCase();
  const map: Record<string, string> = {
    "audio/webm": ".webm",
    "audio/mp4": ".mp4",
    "audio/mpeg": ".mp3",
    "audio/wav": ".wav",
    "audio/ogg": ".ogg",
  };
  return map[base] ?? ".audio";
}
