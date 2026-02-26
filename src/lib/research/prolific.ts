import { db } from "@/lib/db";
import { Prisma } from "@prisma/client";

// Re-export client-side utilities (types and functions only)
export {
  type ProlificParams,
  buildProlificRedirectUrl,
  hasValidProlificParams,
} from "./prolific-client";

// Server-side completion code used by API routes.
// Intentionally no hardcoded fallback: fail closed when unset.
export function getProlificCompletionCode(): string | null {
  const code = process.env.PROLIFIC_COMPLETION_CODE?.trim();
  return code ? code : null;
}

export function isProlificPidUniqueViolation(error: unknown): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) {
    return false;
  }
  if (error.code !== "P2002") {
    return false;
  }
  const target = (error.meta as { target?: string[] | string } | undefined)
    ?.target;
  if (Array.isArray(target)) {
    return target.includes("prolificPid");
  }
  if (typeof target === "string") {
    return target.includes("prolificPid");
  }
  return false;
}

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
      applicationStatus: true,
      researchCompletedAt: true,
      prolificPid: true,
    },
  });

  // Reject self-matches (someone entered their own PID as partner)
  if (partner?.id === applicantId) {
    return null;
  }

  // Return partner only when status and timestamp both indicate completion.
  if (
    partner?.applicationStatus === "RESEARCH_COMPLETED" &&
    partner.researchCompletedAt
  ) {
    return partner;
  }

  return null;
}
