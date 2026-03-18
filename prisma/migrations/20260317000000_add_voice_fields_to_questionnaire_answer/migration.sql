-- Add voice transcription fields to QuestionnaireAnswer
-- These fields support the async Groq/HuggingFace transcription pipeline
-- while keeping `value` as plain text for backward compatibility.

ALTER TABLE "QuestionnaireAnswer"
  ADD COLUMN IF NOT EXISTS "voiceAudioPath"     TEXT,
  ADD COLUMN IF NOT EXISTS "voiceMimeType"      TEXT,
  ADD COLUMN IF NOT EXISTS "voiceTranscript"    TEXT,
  ADD COLUMN IF NOT EXISTS "voiceStatus"        TEXT,
  ADD COLUMN IF NOT EXISTS "voiceProvider"      TEXT,
  ADD COLUMN IF NOT EXISTS "voiceTranscribedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "voiceErrorCode"     TEXT;

CREATE INDEX IF NOT EXISTS "QuestionnaireAnswer_voiceStatus_idx"
  ON "QuestionnaireAnswer"("voiceStatus");
