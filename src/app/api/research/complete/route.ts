import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { errorResponse, successResponse } from "@/lib/api-response";
import { submitApplicationSchema } from "@/lib/validations";
import { notifyQuestionnaireCompleted } from "@/lib/email/admin-notifications";
import {
  getProlificCompletionCode,
  checkPartnerCompletion,
  buildProlificRedirectUrl,
} from "@/lib/research/prolific";
import { sendCoupleCompletionEmail } from "@/lib/email/couple-completion";

export async function POST(request: NextRequest) {
  try {
    const { applicationId } = submitApplicationSchema.parse(
      await request.json(),
    );

    const applicant = await db.applicant.findUnique({
      where: { id: applicationId },
      include: {
        user: true,
        questionnaireAnswers: {
          include: {
            question: true,
          },
        },
      },
    });

    if (!applicant || applicant.deletedAt !== null) {
      return errorResponse("NOT_FOUND", "Research applicant not found", 404);
    }

    // Verify this is a properly invited research participant
    if (!applicant.researchInvitedAt) {
      return errorResponse(
        "UNAUTHORIZED",
        "Not a valid research participant",
        403,
      );
    }

    if (applicant.applicationStatus !== "RESEARCH_IN_PROGRESS") {
      return errorResponse(
        "INVALID_STATUS",
        "Research questionnaire is not in progress",
        400,
      );
    }

    // Extract partner PID from questionnaire answers using keyword-based matching
    // so prompt wording changes don't silently break this flow.
    const partnerPidAnswer = applicant.questionnaireAnswers.find((answer) => {
      const prompt = answer.question.prompt.toLowerCase();
      const hasPartnerToken = prompt.includes("partner");
      const hasPartnerProlificPidPhrase =
        prompt.includes("partner's prolific pid") ||
        prompt.includes("partners prolific pid") ||
        prompt.includes("partner prolific pid");
      const hasPartnerProlificIdPhrase =
        prompt.includes("partner's prolific id") ||
        prompt.includes("partners prolific id") ||
        prompt.includes("partner prolific id");
      return (
        hasPartnerToken &&
        (hasPartnerProlificPidPhrase || hasPartnerProlificIdPhrase)
      );
    });
    const partnerPidFromAnswer =
      typeof partnerPidAnswer?.value === "string"
        ? partnerPidAnswer.value.trim()
        : undefined;
    const partnerPid =
      partnerPidFromAnswer || applicant.prolificPartnerPid || undefined;

    // Use the completion code for all Prolific participants
    let completionCode = applicant.prolificCompletionCode;
    if (applicant.prolificPid) {
      const prolificCompletionCode = getProlificCompletionCode();
      if (!prolificCompletionCode) {
        return errorResponse(
          "SERVER_MISCONFIGURED",
          "Prolific integration is temporarily unavailable. Please try again later.",
          503,
        );
      }
      completionCode = prolificCompletionCode;
    }

    // Update applicant with completion data
    await db.applicant.update({
      where: { id: applicant.id },
      data: {
        applicationStatus: "RESEARCH_COMPLETED",
        researchCompletedAt: new Date(),
        researchInviteUsedAt: applicant.researchInviteUsedAt ?? new Date(),
        prolificCompletionCode: completionCode,
        prolificPartnerPid: partnerPid,
      },
    });

    // Check if partner has also completed (for couples)
    if (partnerPid) {
      const partner = await checkPartnerCompletion(applicant.id);

      if (partner) {
        // Both partners completed! Fetch partner's user data for email
        const partnerUser = await db.user.findUnique({
          where: { id: partner.userId },
          select: { firstName: true, lastName: true },
        });

        if (partnerUser) {
          // Send notification email (non-blocking)
          sendCoupleCompletionEmail({
            applicant1: {
              name: `${applicant.user.firstName} ${applicant.user.lastName}`,
              prolificPid: applicant.prolificPid ?? undefined,
              applicationId: applicant.id,
            },
            applicant2: {
              name: `${partnerUser.firstName} ${partnerUser.lastName}`,
              prolificPid: partner.prolificPid ?? undefined,
              applicationId: partner.id,
            },
          }).catch(() => {
            // Silently ignore - notification failure shouldn't affect the response
          });
        }
      }
    }

    // Notify admin that a research questionnaire was completed (non-blocking)
    notifyQuestionnaireCompleted({
      applicantId: applicant.id,
      firstName: applicant.user.firstName,
      lastName: applicant.user.lastName,
      email: applicant.user.email,
    }).catch(() => {
      // Silently ignore - notification failure shouldn't affect the response
    });

    return successResponse({
      applicationId: applicant.id,
      status: "RESEARCH_COMPLETED",
      prolificCompletionCode: completionCode,
      prolificRedirect: completionCode
        ? buildProlificRedirectUrl(completionCode)
        : null,
    });
  } catch (error) {
    return errorResponse("VALIDATION_ERROR", "Invalid request payload", 400, [
      { message: (error as Error).message },
    ]);
  }
}
