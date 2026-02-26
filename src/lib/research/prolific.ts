import { db } from "@/lib/db";

// Re-export client-side utilities (types and functions only)
export {
  type ProlificParams,
  buildProlificRedirectUrl,
  hasValidProlificParams,
  storeProlificParams,
} from "./prolific-client";

// Server-side completion code used by API routes
export const PROLIFIC_COMPLETION_CODE =
  process.env.PROLIFIC_COMPLETION_CODE || "C6NBKFHR";

/**
 * Check if a participant's partner has also completed
 * @param applicantId - The ID of the applicant who just completed
 * @returns Partner's applicant record if found and completed, null otherwise
 */
export async function checkPartnerCompletion(applicantId: string) {
  const applicant = await db.applicant.findUnique({
    where: { id: applicantId },
    select: {
      prolificPid: true,
      prolificPartnerPid: true,
      researchCompletedAt: true,
    },
  });

  if (!applicant?.prolificPartnerPid) {
    return null;
  }

  // Find partner by their Prolific PID
  const partner = await db.applicant.findUnique({
    where: { prolificPid: applicant.prolificPartnerPid },
    select: {
      id: true,
      userId: true,
      researchCompletedAt: true,
      prolificPid: true,
    },
  });

  // Reject self-matches (someone entered their own PID as partner)
  if (partner?.id === applicantId) {
    return null;
  }

  // Return partner only if they've also completed
  if (partner?.researchCompletedAt) {
    return partner;
  }

  return null;
}
