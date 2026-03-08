import { getAuthUser, requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { errorResponse, successResponse } from "@/lib/api-response";
import { adminApplicantUpdateSchema } from "@/lib/validations";
import { getOrCreateAdminUser } from "@/lib/admin-helpers";
import { cancelContinuousMonitoring } from "@/lib/background-checks/checkr";
import { atomicAppendNote } from "@/lib/background-checks/orchestrator";
import { logger } from "@/lib/logger";
import { Prisma } from "@prisma/client";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, { params }: RouteContext) {
  const { id } = await params;
  const auth = await getAuthUser();
  if (!auth) {
    return errorResponse("UNAUTHORIZED", "User not authenticated", 401);
  }
  try {
    requireAdmin(auth.email);
  } catch (error) {
    return errorResponse("FORBIDDEN", (error as Error).message, 403);
  }

  const includeDeleted =
    new URL(request.url).searchParams.get("includeDeleted") === "true";

  const applicant = await db.applicant.findFirst({
    where: { id, ...(includeDeleted ? {} : { deletedAt: null }) },
    include: {
      user: true,
      payments: true,
      questionnaireAnswers: {
        orderBy: { createdAt: "asc" },
        take: 1,
        select: { createdAt: true },
      },
    },
  });

  if (!applicant) {
    return errorResponse("NOT_FOUND", "Applicant not found", 404);
  }

  return successResponse({
    applicant: {
      id: applicant.id,
      userId: applicant.userId,
      firstName: applicant.user.firstName,
      lastName: applicant.user.lastName,
      email: applicant.user.email,
      phone: applicant.user.phone,
      age: applicant.age,
      gender: applicant.gender,
      location: applicant.location,
      cityFrom: applicant.cityFrom,
      industry: applicant.industry,
      occupation: applicant.occupation,
      employer: applicant.employer,
      education: applicant.education,
      incomeRange: applicant.incomeRange,
      referredBy: applicant.referredBy,
      aboutYourself: applicant.aboutYourself,
      incomeVerified: applicant.incomeVerified,
      applicationStatus: applicant.applicationStatus,
      screeningStatus: applicant.screeningStatus,
      compatibilityScore: applicant.compatibilityScore,
      createdAt: applicant.createdAt,
      submittedAt: applicant.submittedAt,
      questionnaireStartedAt:
        applicant.questionnaireAnswers[0]?.createdAt ?? null,
      reviewedAt: applicant.reviewedAt,
      softRejectedAt: applicant.softRejectedAt,
      invitedOffWaitlistAt: applicant.invitedOffWaitlistAt,
      photos: applicant.photos,
    },
    screening: {
      screeningStatus: applicant.screeningStatus,
      idenfyStatus: applicant.idenfyStatus,
      idenfyVerificationId: applicant.idenfyVerificationId,
      checkrStatus: applicant.checkrStatus,
      checkrReportId: applicant.checkrReportId,
      checkrCandidateId: applicant.checkrCandidateId,
      backgroundCheckNotes: applicant.backgroundCheckNotes,
      backgroundCheckConsentAt: applicant.backgroundCheckConsentAt,
      backgroundCheckConsentIp: applicant.backgroundCheckConsentIp,
      continuousMonitoringId: applicant.continuousMonitoringId,
    },
    screeningFlags: {
      relationshipReadinessFlag: applicant.relationshipReadinessFlag,
      saScreeningFlag: applicant.saScreeningFlag,
      screeningFlagDetails: applicant.screeningFlagDetails,
      screeningFlagComputedAt: applicant.screeningFlagComputedAt,
      screeningFlagReviewedAt: applicant.screeningFlagReviewedAt,
      screeningFlagReviewedBy: applicant.screeningFlagReviewedBy,
      screeningFlagOverride: applicant.screeningFlagOverride,
    },
    payments: applicant.payments,
  });
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const { id } = await params;
  const auth = await getAuthUser();
  if (!auth) {
    return errorResponse("UNAUTHORIZED", "User not authenticated", 401);
  }
  if (!auth.email) {
    return errorResponse("UNAUTHORIZED", "Email not available", 401);
  }
  try {
    requireAdmin(auth.email);
  } catch (error) {
    return errorResponse("FORBIDDEN", (error as Error).message, 403);
  }

  let body: ReturnType<typeof adminApplicantUpdateSchema.parse>;
  try {
    body = adminApplicantUpdateSchema.parse(await request.json());
  } catch (error) {
    return errorResponse("VALIDATION_ERROR", "Invalid request body", 400, [
      { message: (error as Error).message },
    ]);
  }

  const existing = await db.applicant.findUnique({ where: { id } });
  if (!existing) {
    return errorResponse("NOT_FOUND", "Applicant not found", 404);
  }

  const adminUser = await getOrCreateAdminUser({
    userId: auth.userId,
    email: auth.email,
  });

  const { backgroundCheckNotes: notesPayload, ...restApplicant } =
    body.applicant ?? {};

  const updateData: Prisma.ApplicantUpdateInput = {
    ...restApplicant,
    reviewedAt: new Date(),
    reviewedBy: adminUser.id,
  };

  const applicationStatusChangeRequested =
    body.applicant?.applicationStatus &&
    body.applicant.applicationStatus !== existing.applicationStatus;

  if (applicationStatusChangeRequested) {
    updateData.softRejectedAt = null;
    updateData.softRejectedFromStatus = null;
  }

  // Use atomic note append (raw SQL) to prevent concurrent webhook deliveries
  // from losing notes via last-write-wins when an admin saves at the same time.
  let applicant;
  if (notesPayload != null && notesPayload.trim() !== "") {
    applicant = await db.$transaction(async (tx) => {
      await tx.applicant.update({
        where: { id },
        data: updateData,
      });
      await atomicAppendNote(tx, id, notesPayload.trim());
      // Re-read after the atomic append so the returned object includes the
      // up-to-date backgroundCheckNotes (the update above doesn't include it).
      return tx.applicant.findUniqueOrThrow({ where: { id } });
    });
  } else {
    applicant = await db.applicant.update({
      where: { id },
      data: updateData,
    });
  }

  await db.adminAction.create({
    data: {
      userId: adminUser.id,
      type: "MANUAL_ADJUSTMENT",
      targetId: applicant.id,
      targetType: "applicant",
      description: "Updated applicant",
      metadata: body.applicant ?? {},
    },
  });

  return successResponse({
    applicant: {
      id: applicant.id,
      applicationStatus: applicant.applicationStatus,
      screeningStatus: applicant.screeningStatus,
      compatibilityScore: applicant.compatibilityScore,
      updatedAt: applicant.updatedAt,
    },
  });
}

export async function DELETE(_: Request, { params }: RouteContext) {
  const { id } = await params;
  const auth = await getAuthUser();
  if (!auth) {
    return errorResponse("UNAUTHORIZED", "User not authenticated", 401);
  }
  if (!auth.email) {
    return errorResponse("UNAUTHORIZED", "Email not available", 401);
  }
  try {
    requireAdmin(auth.email);
  } catch (error) {
    return errorResponse("FORBIDDEN", (error as Error).message, 403);
  }

  const existing = await db.applicant.findUnique({ where: { id } });
  if (!existing) {
    return errorResponse("NOT_FOUND", "Applicant not found", 404);
  }

  // Cancel continuous monitoring before soft-delete to avoid ongoing
  // Checkr subscription costs for a removed user.
  // Only null continuousMonitoringId if cancellation succeeds — if it fails,
  // preserve the ID so the admin can retry the cancellation manually.
  let monitoringCanceled = false;
  if (existing.continuousMonitoringId) {
    try {
      await cancelContinuousMonitoring(existing.continuousMonitoringId);
      monitoringCanceled = true;
      logger.info("Canceled continuous monitoring during soft delete", {
        applicantId: id,
        monitoringId: existing.continuousMonitoringId,
      });
    } catch (err: unknown) {
      logger.warn(
        "Failed to cancel continuous monitoring during soft delete — ID preserved for manual retry",
        {
          applicantId: id,
          monitoringId: existing.continuousMonitoringId,
          error: err instanceof Error ? err.message : String(err),
        },
      );
      // Continue with deletion. The ID is NOT cleared below so the admin can
      // see it in the DB and retry the Checkr API call manually.
    }
  }

  const adminUser = await getOrCreateAdminUser({
    userId: auth.userId,
    email: auth.email,
  });

  const applicant = await db.applicant.update({
    where: { id },
    data: {
      deletedAt: new Date(),
      deletedBy: adminUser.id,
      ...(monitoringCanceled ? { continuousMonitoringId: null } : {}),
    },
  });

  await db.adminAction.create({
    data: {
      userId: adminUser.id,
      type: "MANUAL_ADJUSTMENT",
      targetId: applicant.id,
      targetType: "applicant",
      description: "Soft deleted applicant",
    },
  });

  return successResponse({
    applicant: {
      id: applicant.id,
      deletedAt: applicant.deletedAt,
    },
  });
}
