import { ApplicationStatus, type Applicant } from "@prisma/client";
import { db } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import {
  APP_STATUS,
  QUESTIONNAIRE_NON_RESEARCH_ALLOWED_STATUSES,
} from "@/lib/application-status";
import { ERROR_MESSAGES } from "@/lib/error-messages";

const RESEARCH_ACCESS_STATUSES: ApplicationStatus[] = [
  APP_STATUS.RESEARCH_INVITED,
  APP_STATUS.RESEARCH_IN_PROGRESS,
];

const NON_RESEARCH_ALLOWED_STATUSES: ApplicationStatus[] = [
  ...QUESTIONNAIRE_NON_RESEARCH_ALLOWED_STATUSES,
];

export type InvitedApplicantResult =
  | { applicant: Applicant; isResearchMode: boolean }
  | { error: string; statusCode: number };

export async function requireInvitedApplicant(
  applicationId: string,
): Promise<InvitedApplicantResult> {
  const applicant = await db.applicant.findFirst({
    where: { id: applicationId, deletedAt: null },
    include: { user: { select: { email: true } } },
  });

  if (!applicant) {
    return {
      error: ERROR_MESSAGES.APP_NOT_FOUND_OR_INVITED,
      statusCode: 404,
    };
  }

  const isResearchApplicant = RESEARCH_ACCESS_STATUSES.includes(
    applicant.applicationStatus,
  );

  if (isResearchApplicant) {
    if (!applicant.researchInvitedAt) {
      return {
        error: ERROR_MESSAGES.APP_NOT_FOUND_OR_INVITED,
        statusCode: 404,
      };
    }
    // If the caller has an authenticated session, verify they own this record.
    // Unauthenticated research links (auth=null) are still allowed through.
    const auth = await getAuthUser();
    if (auth?.email) {
      if (auth.email.toLowerCase() !== applicant.user.email.toLowerCase()) {
        return {
          error: ERROR_MESSAGES.OWN_APPLICATION_ONLY,
          statusCode: 403,
        };
      }
    }
    return { applicant, isResearchMode: true };
  }

  const auth = await getAuthUser();
  if (!auth?.email) {
    return { error: ERROR_MESSAGES.SIGN_IN_TO_CONTINUE, statusCode: 401 };
  }

  if (auth.email.toLowerCase() !== applicant.user.email.toLowerCase()) {
    return { error: ERROR_MESSAGES.OWN_APPLICATION_ONLY, statusCode: 403 };
  }

  if (!NON_RESEARCH_ALLOWED_STATUSES.includes(applicant.applicationStatus)) {
    return {
      error: ERROR_MESSAGES.QUESTIONNAIRE_STATUS_UNAVAILABLE,
      statusCode: 403,
    };
  }

  return { applicant, isResearchMode: false };
}
