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
    const { applicationId, fullName, consentGiven, evergreenConsentGiven } =
      body;

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

    // Note: ownership check and name-match validation happen after the DB
    // fetch below, once we have the applicant's legal name on file.

    if (consentGiven !== true) {
      return errorResponse(
        "CONSENT_REQUIRED",
        "You must agree to the background check authorization to proceed",
        400,
      );
    }

    if (evergreenConsentGiven !== true) {
      return errorResponse(
        "CONSENT_REQUIRED",
        "You must agree to ongoing criminal record monitoring to proceed",
        400,
      );
    }

    const applicant = await db.applicant.findFirst({
      where: { id: applicationId, deletedAt: null },
      include: { user: true },
    });

    if (!applicant) {
      return errorResponse("NOT_FOUND", "Application not found", 404);
    }

    // Verify the authenticated user owns this application
    if (applicant.user.email.toLowerCase() !== auth.email?.toLowerCase()) {
      return errorResponse("FORBIDDEN", "Access denied", 403);
    }

    // Validate the digital signature matches the applicant's legal name on file.
    // Case-insensitive, whitespace-normalized to handle minor formatting differences.
    const normalizedInput = fullName.trim().toLowerCase().replace(/\s+/g, " ");
    const expectedName =
      `${applicant.user.firstName} ${applicant.user.lastName}`
        .toLowerCase()
        .replace(/\s+/g, " ");
    if (normalizedInput !== expectedName) {
      return errorResponse(
        "VALIDATION_ERROR",
        "The name entered does not match your legal name on file. Please type your full legal name exactly as it appears.",
        400,
      );
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

    // Record consent AND audit log atomically in a transaction, and include
    // a re-read of applicationStatus within the same transaction. This ensures
    // the re-read sees any applicationStatus committed by a concurrent submit
    // route before our read executes, closing the race window that existed when
    // the write and re-read were separate statements.
    // The audit log contains the digital signature (fullName) which is
    // FCRA-critical legal evidence — it must succeed atomically with the consent
    // write or retries would hit the "already_consented" guard and lose the sig.
    const consentTimestamp = new Date();
    const [, , freshApplicant] = await db.$transaction([
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
            consentGiven: true,
            evergreenConsentGiven: true,
          },
        },
      }),
      db.applicant.findUnique({
        where: { id: applicant.id },
        select: { applicationStatus: true },
      }),
    ]);

    logger.info("FCRA background check consent recorded", {
      applicantId: applicant.id,
      ip: clientIp,
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
