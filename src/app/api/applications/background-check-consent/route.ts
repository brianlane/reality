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

    // Fetch applicant and verify ownership before checking consent flags.
    // This ensures unauthorized callers get FORBIDDEN, not CONSENT_REQUIRED,
    // even if they also omitted the consent checkboxes.
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

    // Get IP address from request headers.
    // Validate against an IPv4/IPv6 character whitelist before storing — the
    // X-Forwarded-For header is user-controllable and could contain arbitrary
    // strings. This is a legally significant FCRA audit field, so we must not
    // store attacker-supplied data verbatim.
    const headerList = await headers();
    const forwardedFor = headerList.get("x-forwarded-for");
    const realIp = headerList.get("x-real-ip");
    const rawIp = forwardedFor?.split(",")[0]?.trim() || realIp || "unknown";
    // Only allow characters valid in IPv4/IPv6 addresses; fall back to "unknown"
    const clientIp = /^[\d.:a-fA-F]+$/.test(rawIp) ? rawIp : "unknown";

    // Record consent and audit log atomically so the FCRA-critical digital
    // signature (fullName) is never lost if the write partially fails.
    // The findUnique runs after the update within the same BEGIN...COMMIT block,
    // so it sees the consent write (read-your-own-writes). Under READ COMMITTED
    // it also sees any applicationStatus committed by a concurrent submit route
    // before the findUnique statement executes.
    // Note: if both routes' reads run before either write commits, both could
    // miss each other — neither would call initiateScreening. This narrow
    // window is acceptable in practice; the initiateScreening updateMany guard
    // prevents duplicate initiations but does not prevent missed ones.
    const consentTimestamp = new Date();
    const freshApplicant = await db.$transaction(async (tx) => {
      await tx.applicant.update({
        where: { id: applicant.id },
        data: {
          backgroundCheckConsentAt: consentTimestamp,
          backgroundCheckConsentIp: clientIp,
        },
      });
      await tx.screeningAuditLog.create({
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
      });
      return tx.applicant.findUnique({
        where: { id: applicant.id },
        select: { applicationStatus: true },
      });
    });

    logger.info("FCRA background check consent recorded", {
      applicantId: applicant.id,
      ip: clientIp,
    });

    // Auto-initiate screening if the application is already submitted.
    // First check the in-transaction read, then do a post-commit re-read to
    // close the race window where consent and submit transactions both read
    // before either commits — neither would see the other's write.
    // initiateScreening's updateMany guard prevents duplicate transitions.
    let screeningInitiated = false;
    let shouldCheckScreening =
      freshApplicant?.applicationStatus === "SUBMITTED";

    if (!shouldCheckScreening) {
      // The in-transaction read may have missed a concurrent submit that
      // hadn't committed yet. Re-read after our commit to catch it.
      const postCommit = await db.applicant.findUnique({
        where: { id: applicant.id },
        select: { applicationStatus: true },
      });
      shouldCheckScreening = postCommit?.applicationStatus === "SUBMITTED";
    }

    if (shouldCheckScreening) {
      try {
        await initiateScreening(applicant.id);
        screeningInitiated = true;
      } catch (err: unknown) {
        // Log at error level so it surfaces in monitoring. The admin can
        // manually trigger screening via /api/applications/background-check.
        logger.error("Failed to auto-initiate screening after consent", {
          applicantId: applicant.id,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    return successResponse({
      status: "consent_recorded",
      consentedAt: consentTimestamp.toISOString(),
      screeningInitiated,
      message: "Background check consent has been recorded successfully.",
    });
  } catch (error) {
    logger.error("Failed to record background check consent", {
      error: error instanceof Error ? error.message : String(error),
    });
    return errorResponse("INTERNAL_ERROR", "Failed to record consent", 500);
  }
}
