import { google } from "@ai-sdk/google";

/**
 * Shared Gemini model for the agent layer.
 *
 * Auth: the @ai-sdk/google provider reads GOOGLE_GENERATIVE_AI_API_KEY
 * from the environment automatically. Set it in Vercel project env vars
 * (all environments that run agent jobs).
 *
 * Model override: set AGENT_MODEL to pin a different Gemini model id.
 */
export const AGENT_MODEL_ID =
  process.env.AGENT_MODEL ?? "gemini-2.5-flash";

export function agentModel() {
  return google(AGENT_MODEL_ID);
}

/** True when the agent layer is configured to actually call Gemini. */
export function isAgentConfigured(): boolean {
  return !!process.env.GOOGLE_GENERATIVE_AI_API_KEY;
}
