import crypto from "crypto";
import { db } from "@/lib/db";

export type ProlificParams = {
  prolificPid?: string;
  prolificStudyId?: string;
  prolificSessionId?: string;
};

// Completion code for all Prolific participants
// Set this code in Prolific's study settings under "Completion paths"
export const PROLIFIC_COMPLETION_CODE = process.env.PROLIFIC_COMPLETION_CODE || "C6NBKFHR";

/**
 * Build the Prolific completion redirect URL
 */
export function buildProlificRedirectUrl(completionCode: string): string {
  return `https://app.prolific.com/submissions/complete?cc=${completionCode}`;
}

/**
 * Validate that all required Prolific parameters are present
 */
export function hasValidProlificParams(params: ProlificParams): boolean {
  return Boolean(
    params.prolificPid &&
    params.prolificStudyId &&
    params.prolificSessionId
  );
}

/**
 * Store Prolific params in localStorage for persistence across navigation
 */
export function storeProlificParams(params: ProlificParams): void {
  if (typeof window === 'undefined') return;

  if (params.prolificPid) {
    localStorage.setItem('prolificPid', params.prolificPid);
  }
  if (params.prolificStudyId) {
    localStorage.setItem('prolificStudyId', params.prolificStudyId);
  }
  if (params.prolificSessionId) {
    localStorage.setItem('prolificSessionId', params.prolificSessionId);
  }
}

/**
 * Retrieve Prolific params from localStorage
 */
export function retrieveProlificParams(): ProlificParams {
  if (typeof window === 'undefined') {
    return {};
  }

  return {
    prolificPid: localStorage.getItem('prolificPid') || undefined,
    prolificStudyId: localStorage.getItem('prolificStudyId') || undefined,
    prolificSessionId: localStorage.getItem('prolificSessionId') || undefined,
  };
}

/**
 * Clear Prolific params from localStorage
 */
export function clearProlificParams(): void {
  if (typeof window === 'undefined') return;

  localStorage.removeItem('prolificPid');
  localStorage.removeItem('prolificStudyId');
  localStorage.removeItem('prolificSessionId');
  localStorage.removeItem('prolificCompletionCode');
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
      researchCompletedAt: true,
      prolificPid: true,
    },
  });

  // Return partner only if they've also completed
  if (partner?.researchCompletedAt) {
    return partner;
  }

  return null;
}
