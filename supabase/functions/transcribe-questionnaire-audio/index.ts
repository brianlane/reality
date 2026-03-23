/**
 * Supabase Edge Function: transcribe-questionnaire-audio
 *
 * Triggered by a Supabase Storage webhook on `object.created` events in the
 * `questionnaire-audio` bucket.
 *
 * Transcription provider chain (Flag 5 - free, no paid OpenAI):
 *   1. Groq whisper-large-v3 (primary, always free with generous rate limits)
 *   2. Hugging Face Inference API whisper-large-v3 (optional fallback, free tier)
 *
 * Setup in Supabase Dashboard → Storage → Webhooks:
 *   - Event:   INSERT on storage.objects
 *   - Bucket:  questionnaire-audio
 *   - Target:  https://<project>.supabase.co/functions/v1/transcribe-questionnaire-audio
 *
 * Required Edge Function secrets (Supabase Dashboard → Edge Functions → Secrets):
 *   SUPABASE_URL              (auto-injected)
 *   SUPABASE_SERVICE_ROLE_KEY (auto-injected)
 *   GROQ_API_KEY              (primary provider)
 *   HUGGINGFACE_API_KEY       (optional fallback)
 */

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const GROQ_API_KEY = Deno.env.get("GROQ_API_KEY");
const HUGGINGFACE_API_KEY = Deno.env.get("HUGGINGFACE_API_KEY");

const VOICE_AUDIO_BUCKET = "questionnaire-audio";
const GROQ_WHISPER_MODEL = "whisper-large-v3";

interface StorageWebhookPayload {
  type: string;
  table: string;
  schema: string;
  record: {
    id: string;
    name: string; // path: applicationId/questionId/timestamp.ext
    bucket_id: string;
    metadata?: { mimetype?: string; size?: number };
  };
}

interface VoiceUpdateParams {
  status: "transcribed" | "failed";
  transcript?: string;
  provider?: string | null;
  errorCode?: string;
}

interface TranscribeResult {
  status: "transcribed" | "failed" | "skipped";
  transcript?: string;
  provider?: string;
  errorCode?: string;
}

function jsonResponse(result: TranscribeResult, httpStatus = 200): Response {
  return new Response(JSON.stringify(result), {
    status: httpStatus,
    headers: { "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") {
    return new Response("Method Not Allowed", { status: 405 });
  }

  let payload: StorageWebhookPayload;
  try {
    payload = await req.json();
  } catch {
    return new Response("Bad Request", { status: 400 });
  }

  // Only process new objects in the correct bucket
  if (
    payload.type !== "INSERT" ||
    payload.schema !== "storage" ||
    payload.record?.bucket_id !== VOICE_AUDIO_BUCKET
  ) {
    return jsonResponse({ status: "skipped" });
  }

  const storagePath = payload.record.name;
  const parts = storagePath.split("/");

  if (parts.length < 3) {
    console.error("[transcribe] Invalid storage path format:", storagePath);
    return jsonResponse({ status: "failed", errorCode: "INVALID_PATH" });
  }

  const [applicationId, questionId] = parts;
  const mimeType = payload.record.metadata?.mimetype ?? "audio/webm";
  const originalFileName =
    storagePath.split("/").filter(Boolean).pop() ?? "audio.audio";

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  // Idempotency: skip if this exact path was already transcribed
  const { data: existing } = await supabase
    .from("QuestionnaireAnswer")
    .select("id, voiceStatus, voiceAudioPath, voiceTranscript, voiceProvider")
    .eq("applicantId", applicationId)
    .eq("questionId", questionId)
    .maybeSingle();

  if (
    existing?.voiceStatus === "transcribed" &&
    existing?.voiceAudioPath === storagePath
  ) {
    console.log("[transcribe] Already transcribed, skipping:", storagePath);
    return jsonResponse({
      status: "transcribed",
      transcript: existing.voiceTranscript ?? undefined,
      provider: existing.voiceProvider ?? undefined,
    });
  }

  // Note: question type/ownership validation is already enforced by
  // /api/applications/questionnaire/audio-upload-url before any signed upload
  // URL is issued. Re-validating here via PostgREST can produce false negatives
  // in some production schemas and leave voiceStatus stuck at "processing".

  // Download audio from private storage using the service-role client.
  // This avoids hard-coding storage REST URL path variants.
  let audioBlob: Blob;

  try {
    const { data, error } = await supabase.storage
      .from(VOICE_AUDIO_BUCKET)
      .download(storagePath);
    if (error || !data) {
      throw new Error(error?.message ?? "Storage download failed");
    }
    audioBlob = data;
  } catch (err) {
    console.error("[transcribe] Failed to download audio:", err);
    await upsertVoiceResult(
      supabase,
      applicationId,
      questionId,
      storagePath,
      mimeType,
      {
        status: "failed",
        errorCode: "AUDIO_DOWNLOAD_FAILED",
      },
    );
    return jsonResponse({
      status: "failed",
      errorCode: "AUDIO_DOWNLOAD_FAILED",
    });
  }

  // Provider chain: Groq (primary) → HuggingFace (fallback)
  let transcript: string | null = null;
  let provider: string | null = null;

  if (GROQ_API_KEY) {
    try {
      transcript = await transcribeWithGroq(
        audioBlob,
        mimeType,
        originalFileName,
      );
      provider = "groq";
      console.log("[transcribe] Groq transcription succeeded");
    } catch (err) {
      console.warn(
        "[transcribe] Groq failed, trying HuggingFace fallback:",
        String(err),
      );
    }
  } else {
    console.warn(
      "[transcribe] GROQ_API_KEY not set, skipping primary provider",
    );
  }

  if (transcript === null && HUGGINGFACE_API_KEY) {
    try {
      transcript = await transcribeWithHuggingFace(audioBlob, mimeType);
      provider = "huggingface";
      console.log("[transcribe] HuggingFace transcription succeeded");
    } catch (err) {
      console.error("[transcribe] HuggingFace fallback failed:", String(err));
    }
  }

  if (transcript === null) {
    const errorCode =
      !GROQ_API_KEY && !HUGGINGFACE_API_KEY
        ? "NO_PROVIDER_CONFIGURED"
        : "TRANSCRIPTION_FAILED";
    await upsertVoiceResult(
      supabase,
      applicationId,
      questionId,
      storagePath,
      mimeType,
      {
        status: "failed",
        errorCode,
      },
    );
    return jsonResponse({ status: "failed", errorCode });
  }

  await upsertVoiceResult(
    supabase,
    applicationId,
    questionId,
    storagePath,
    mimeType,
    {
      status: "transcribed",
      transcript,
      provider,
    },
  );

  return jsonResponse({
    status: "transcribed",
    transcript,
    provider: provider ?? undefined,
  });
});

async function transcribeWithGroq(
  audioBlob: Blob,
  mimeType: string,
  originalFileName: string,
): Promise<string> {
  const formData = new FormData();
  formData.append(
    "file",
    new File([audioBlob], originalFileName, {
      type: mimeType,
    }),
  );
  formData.append("model", GROQ_WHISPER_MODEL);
  formData.append("response_format", "json");

  const res = await fetch(
    "https://api.groq.com/openai/v1/audio/transcriptions",
    {
      method: "POST",
      headers: { Authorization: `Bearer ${GROQ_API_KEY}` },
      body: formData,
    },
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Groq API error ${res.status}: ${text.slice(0, 300)}`);
  }

  const data = (await res.json()) as { text?: string };
  if (!data.text?.trim()) throw new Error("Groq returned empty transcript");
  return data.text.trim();
}

async function transcribeWithHuggingFace(
  audioBlob: Blob,
  mimeType: string,
): Promise<string> {
  const res = await fetch(
    "https://api-inference.huggingface.co/models/openai/whisper-large-v3",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${HUGGINGFACE_API_KEY}`,
        "Content-Type": mimeType,
      },
      body: audioBlob,
    },
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `HuggingFace API error ${res.status}: ${text.slice(0, 300)}`,
    );
  }

  const data = (await res.json()) as { text?: string };
  if (!data.text?.trim())
    throw new Error("HuggingFace returned empty transcript");
  return data.text.trim();
}

async function upsertVoiceResult(
  supabase: ReturnType<typeof createClient>,
  applicationId: string,
  questionId: string,
  storagePath: string,
  mimeType: string,
  result: VoiceUpdateParams,
) {
  const now = new Date().toISOString();
  const voiceFields = {
    voiceStatus: result.status,
    voiceTranscript: result.transcript ?? null,
    voiceProvider: result.provider ?? null,
    voiceTranscribedAt: result.status === "transcribed" ? now : null,
    voiceAudioPath: storagePath,
    voiceMimeType: mimeType,
    voiceErrorCode: result.errorCode ?? null,
    updatedAt: now,
  };

  // Update an existing row only; row creation is handled by app APIs.
  const { data: existing } = await supabase
    .from("QuestionnaireAnswer")
    .select("id")
    .eq("applicantId", applicationId)
    .eq("questionId", questionId)
    .maybeSingle();

  if (existing) {
    // Guard: only apply if the row still points to this webhook's audio file.
    // Prevents a late-arriving webhook from overwriting a newer recording's result.
    const { error } = await supabase
      .from("QuestionnaireAnswer")
      .update(voiceFields)
      .eq("id", existing.id)
      .eq("voiceAudioPath", storagePath);
    if (error) {
      console.error("[transcribe] Failed to update answer row:", error.message);
    }
  } else {
    console.warn(
      "[transcribe] No answer row found to update; skipping write",
      applicationId,
      questionId,
    );
  }
}
