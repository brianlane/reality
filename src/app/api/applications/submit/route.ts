import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { submitApplicationSchema } from "@/lib/validations";
import { errorResponse, successResponse } from "@/lib/api-response";
import { ensureApplicantAccount } from "@/lib/account-init";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { notifyApplicationSubmitted } from "@/lib/email/admin-notifications";
import { initiateScreening } from "@/lib/background-checks/orchestrator";
import { logger } from "@/lib/logger";

const APPLICATION_FEE_AMOUNT = 19900;

export async function POST(request: NextRequest) {
  try {
    const { applicationId } = submitApplicationSchema.parse(
      await request.json(),
    );
    const applicant = await db.applicant.findUnique({
      where: { id: applicationId },
      include: { user: true },
    });

    if (!applicant) {
      return errorResponse("NOT_FOUND", "Application not found", 404);
    }
    if (applicant.softRejectedAt) {
      return errorResponse(
        "APPLICATION_LOCKED",
        "Application can no longer be submitted.",
        403,
      );
    }

    // Handle two different submission scenarios based on current status
    if (applicant.applicationStatus === "PAYMENT_PENDING") {
      // First submission: Create payment after demographics completed (status already PAYMENT_PENDING)
      if (applicant.user.email) {
        const accountResult = await ensureApplicantAccount({
          email: applicant.user.email,
          firstName: applicant.user.firstName,
          lastName: applicant.user.lastName,
        });

        if (accountResult.status === "error") {
          return errorResponse(
            "ACCOUNT_PROVISIONING_FAILED",
            "We couldn't create your account. Please contact support.",
            502,
          );
        }
      }

      const payment = await db.payment.create({
        data: {
          applicantId: applicant.id,
          type: "APPLICATION_FEE",
          amount: APPLICATION_FEE_AMOUNT,
          status: "PENDING",
        },
      });

      return successResponse({
        paymentUrl: `https://mock.stripe.local/session/${payment.id}`,
        applicationId: applicant.id,
      });
    } else if (applicant.applicationStatus === "DRAFT") {
      // Final submission: Mark application as submitted after password creation
      // Validate that the user is authenticated and their email matches
      const supabase = await createSupabaseServerClient();
      if (!supabase) {
        return errorResponse(
          "AUTH_NOT_CONFIGURED",
          "Authentication is not configured.",
          500,
        );
      }

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        return errorResponse(
          "UNAUTHORIZED",
          "You must be signed in to submit your application.",
          401,
        );
      }

      if (user.email?.toLowerCase() !== applicant.user.email.toLowerCase()) {
        return errorResponse(
          "FORBIDDEN",
          "You can only submit your own application.",
          403,
        );
      }

      await db.applicant.update({
        where: { id: applicant.id },
        data: {
          applicationStatus: "SUBMITTED",
          submittedAt: new Date(),
          screeningStatus: "PENDING",
          waitlistInviteToken: null,
          invitedOffWaitlistAt: null,
          invitedOffWaitlistBy: null,
        },
      });

      // Notify admin that an application was submitted (non-blocking)
      notifyApplicationSubmitted({
        applicantId: applicant.id,
        firstName: applicant.user.firstName,
        lastName: applicant.user.lastName,
        email: applicant.user.email,
      }).catch(() => {
        // Silently ignore - notification failure shouldn't affect the response
      });

      // Re-read the applicant to get the latest backgroundCheckConsentAt.
      // The initial fetch (top of handler) may be stale if the consent route
      // ran concurrently and committed between our fetch and this point.
      const freshApplicant = await db.applicant.findUnique({
        where: { id: applicant.id },
        select: { backgroundCheckConsentAt: true },
      });

      // If FCRA consent has already been given, auto-initiate screening (non-blocking)
      if (freshApplicant?.backgroundCheckConsentAt) {
        initiateScreening(applicant.id).catch((err: unknown) => {
          logger.error("Failed to auto-initiate screening after submission", {
            applicantId: applicant.id,
            error: err instanceof Error ? err.message : String(err),
          });
        });
      }

      return successResponse({
        applicationId: applicant.id,
        status: "SUBMITTED",
      });
    } else {
      return errorResponse(
        "INVALID_STATUS",
        `Cannot submit application with status ${applicant.applicationStatus}`,
        400,
      );
    }
  } catch (error) {
    return errorResponse("VALIDATION_ERROR", "Invalid submit payload", 400, [
      { message: (error as Error).message },
    ]);
  }
}
