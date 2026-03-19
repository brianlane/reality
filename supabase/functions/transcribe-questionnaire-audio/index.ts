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
    return new Response("OK", { status: 200 });
  }

  const storagePath = payload.record.name;
  const parts = storagePath.split("/");

  if (parts.length < 3) {
    console.error("[transcribe] Invalid storage path format:", storagePath);
    return new Response("OK", { status: 200 });
  }

  const [applicationId, questionId] = parts;
  const mimeType = payload.record.metadata?.mimetype ?? "audio/webm";

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });

  // Idempotency: skip if this exact path was already transcribed
  const { data: existing } = await supabase
    .from("QuestionnaireAnswer")
    .select("id, voiceStatus, voiceAudioPath")
    .eq("applicantId", applicationId)
    .eq("questionId", questionId)
    .maybeSingle();

  if (
    existing?.voiceStatus === "transcribed" &&
    existing?.voiceAudioPath === storagePath
  ) {
    console.log("[transcribe] Already transcribed, skipping:", storagePath);
    return new Response("OK", { status: 200 });
  }

  // Validate this is an active TEXTAREA question (defense in depth)
  const { data: question } = await supabase
    .from("QuestionnaireQuestion")
    .select("id, type")
    .eq("id", questionId)
    .eq("type", "TEXTAREA")
    .eq("isActive", true)
    .maybeSingle();

  if (!question) {
    console.error(
      "[transcribe] Question not found or not TEXTAREA:",
      questionId,
    );
    return new Response("OK", { status: 200 });
  }

  // Download audio from private storage using service role key
  const audioUrl = `${SUPABASE_URL}/storage/v1/object/${VOICE_AUDIO_BUCKET}/${storagePath}`;
  let audioBlob: Blob;

  try {
    const audioResponse = await fetch(audioUrl, {
      headers: { Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` },
    });
    if (!audioResponse.ok) {
      throw new Error(`Storage download failed: ${audioResponse.status}`);
    }
    audioBlob = await audioResponse.blob();
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
    return new Response("OK", { status: 200 });
  }

  // Provider chain: Groq (primary) → HuggingFace (fallback)
  let transcript: string | null = null;
  let provider: string | null = null;

  if (GROQ_API_KEY) {
    try {
      transcript = await transcribeWithGroq(audioBlob, mimeType);
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
    return new Response("OK", { status: 200 });
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

  return new Response("OK", { status: 200 });
});

async function transcribeWithGroq(
  audioBlob: Blob,
  mimeType: string,
): Promise<string> {
  const formData = new FormData();
  formData.append(
    "file",
    new File([audioBlob], `audio${mimeTypeToExt(mimeType)}`, {
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

  // Try to update an existing row first
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
    // Create a new answer row with voice metadata only (value = null until user saves)
    const { error } = await supabase.from("QuestionnaireAnswer").insert({
      id: crypto.randomUUID(),
      applicantId: applicationId,
      questionId,
      value: null,
      createdAt: now,
      ...voiceFields,
    });
    if (error) {
      console.error("[transcribe] Failed to insert answer row:", error.message);
    }
  }
}

function mimeTypeToExt(mimeType: string): string {
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
