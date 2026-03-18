/**
 * Setup script: creates the questionnaire-audio Supabase Storage bucket
 * and configures the private access policy required for the voice feature.
 *
 * Run once before deploying voice input:
 *   npx tsx scripts/setup-questionnaire-audio-bucket.ts
 *
 * The bucket is PRIVATE — objects are only accessible via server-issued
 * signed URLs (never directly from the browser via anon key).
 */

import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error(
    "❌ Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY",
  );
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false },
});

const BUCKET_NAME = "questionnaire-audio";

async function main() {
  console.log(`\n🔊 Setting up '${BUCKET_NAME}' Supabase Storage bucket...\n`);

  // Check if bucket already exists
  const { data: existing, error: listErr } =
    await supabase.storage.listBuckets();
  if (listErr) {
    console.error("❌ Failed to list buckets:", listErr.message);
    process.exit(1);
  }

  const alreadyExists = existing?.some((b) => b.name === BUCKET_NAME);
  if (alreadyExists) {
    console.log(`✓ Bucket '${BUCKET_NAME}' already exists.`);
  } else {
    const { error: createErr } = await supabase.storage.createBucket(
      BUCKET_NAME,
      {
        public: false, // Flag 6: private — only accessible via server-signed URLs
        allowedMimeTypes: [
          "audio/webm",
          "audio/mp4",
          "audio/mpeg",
          "audio/wav",
          "audio/ogg",
        ],
        fileSizeLimit: 10 * 1024 * 1024, // 10MB (Flag 3: recording limits)
      },
    );

    if (createErr) {
      console.error("❌ Failed to create bucket:", createErr.message);
      process.exit(1);
    }
    console.log(`✓ Created bucket '${BUCKET_NAME}' (private, 10MB limit)`);
  }

  console.log(`
✅ Bucket setup complete!

Next steps to complete the voice pipeline:
  1. Deploy the Edge Function:
       npx supabase functions deploy transcribe-questionnaire-audio

  2. Set Edge Function secrets in Supabase Dashboard
     (Dashboard → Edge Functions → transcribe-questionnaire-audio → Secrets):
       GROQ_API_KEY       = <your Groq API key from console.groq.com>
       HUGGINGFACE_API_KEY = <optional HF key from huggingface.co/settings/tokens>

  3. Configure the Storage webhook in Supabase Dashboard
     (Dashboard → Storage → Webhooks → New webhook):
       - Bucket:  ${BUCKET_NAME}
       - Events:  INSERT
       - Method:  POST
       - URL:     https://<project-ref>.supabase.co/functions/v1/transcribe-questionnaire-audio

  4. Add GROQ_API_KEY to your .env file and Vercel environment variables.
`);
}

main().catch((e) => {
  console.error("❌ Setup failed:", e);
  process.exit(1);
});
