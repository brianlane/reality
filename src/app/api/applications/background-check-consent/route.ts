import { headers } from "next/headers";
import { db } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { errorResponse, successResponse } from "@/lib/api-response";
import { initiateScreening } from "@/lib/background-checks/orchestrator";
import { logger } from "@/lib/logger";

/**
 * POST /api/applications/background-check-consent
 *
 * Records FCRA-compliant background check consent for an applicant.
 * This is the legally required standalone disclosure + authorization.
 * Requires authenticated user who owns the application.
 */
export async function POST(request: Request) {
  try {
    const auth = await getAuthUser();
    if (!auth) {
      return errorResponse("UNAUTHORIZED", "Authentication required", 401);
    }

    const body = await request.json();
    const { applicationId, fullName, consentGiven } = body;

    if (!applicationId) {
      return errorResponse(
        "VALIDATION_ERROR",
        "applicationId is required",
        400,
      );
    }

    if (
      !fullName ||
      typeof fullName !== "string" ||
      fullName.trim().length < 2
    ) {
      return errorResponse(
        "VALIDATION_ERROR",
        "Full legal name is required as digital signature",
        400,
      );
    }

    if (consentGiven !== true) {
      return errorResponse(
        "CONSENT_REQUIRED",
        "You must agree to the background check authorization to proceed",
        400,
      );
    }

    const applicant = await db.applicant.findUnique({
      where: { id: applicationId },
      include: { user: true },
    });

    if (!applicant) {
      return errorResponse("NOT_FOUND", "Application not found", 404);
    }

    // Verify the authenticated user owns this application
    if (applicant.user.email.toLowerCase() !== auth.email?.toLowerCase()) {
      return errorResponse("FORBIDDEN", "Access denied", 403);
    }

    // Already consented
    if (applicant.backgroundCheckConsentAt) {
      return successResponse({
        status: "already_consented",
        consentedAt: applicant.backgroundCheckConsentAt,
        message: "Background check consent has already been recorded.",
      });
    }

    // Get IP address from request headers
    const headerList = await headers();
    const forwardedFor = headerList.get("x-forwarded-for");
    const realIp = headerList.get("x-real-ip");
    const clientIp = forwardedFor?.split(",")[0]?.trim() || realIp || "unknown";

    // Record consent AND audit log atomically in a transaction.
    // Both must succeed together -- the audit log contains the digital signature
    // (fullName) which is FCRA-critical legal evidence. If the audit log fails
    // after consent is recorded, the digital signature would be permanently lost
    // since retries would hit the "already_consented" guard.
    const consentTimestamp = new Date();
    await db.$transaction([
      db.applicant.update({
        where: { id: applicant.id },
        data: {
          backgroundCheckConsentAt: consentTimestamp,
          backgroundCheckConsentIp: clientIp,
        },
      }),
      db.screeningAuditLog.create({
        data: {
          userId: applicant.userId,
          applicantId: applicant.id,
          action: "FCRA_CONSENT_GIVEN",
          metadata: {
            fullName: fullName.trim(),
            ip: clientIp,
            consentTimestamp: consentTimestamp.toISOString(),
            userAgent: headerList.get("user-agent") || "unknown",
          },
        },
      }),
    ]);

    logger.info("FCRA background check consent recorded", {
      applicantId: applicant.id,
      ip: clientIp,
    });

    // Re-read the applicant to get the latest applicationStatus.
    // The initial fetch (top of handler) may be stale if the submit route
    // ran concurrently and committed between our fetch and this point.
    const freshApplicant = await db.applicant.findUnique({
      where: { id: applicant.id },
      select: { applicationStatus: true },
    });

    // If the application is already submitted, auto-initiate screening
    if (
      freshApplicant?.applicationStatus === "SUBMITTED" ||
      freshApplicant?.applicationStatus === "SCREENING_IN_PROGRESS"
    ) {
      initiateScreening(applicant.id).catch((err: unknown) => {
        logger.error("Failed to auto-initiate screening after consent", {
          applicantId: applicant.id,
          error: err instanceof Error ? err.message : String(err),
        });
      });
    }

    return successResponse({
      status: "consent_recorded",
      consentedAt: consentTimestamp.toISOString(),
      message: "Background check consent has been recorded successfully.",
    });
  } catch (error) {
    logger.error("Failed to record background check consent", {
      error: error instanceof Error ? error.message : String(error),
    });
    return errorResponse("INTERNAL_ERROR", "Failed to record consent", 500);
  }
}
