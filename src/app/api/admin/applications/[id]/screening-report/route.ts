import { getAuthUser, requireAdminRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { errorResponse, successResponse } from "@/lib/api-response";
import { getReport } from "@/lib/background-checks/checkr";
import { logger } from "@/lib/logger";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/admin/applications/[id]/screening-report
 *
 * Fetches the Checkr background check report on demand for admin viewing.
 * Report data is fetched from Checkr's API and NEVER stored locally.
 * All access is logged to the ScreeningAuditLog for compliance.
 */
export async function GET(_request: Request, { params }: RouteContext) {
  const { id } = await params;

  const auth = await getAuthUser();
  if (!auth) {
    return errorResponse("UNAUTHORIZED", "User not authenticated", 401);
  }

  let adminUser;
  try {
    adminUser = await requireAdminRole(auth.email);
  } catch (error) {
    return errorResponse("FORBIDDEN", (error as Error).message, 403);
  }

  const applicant = await db.applicant.findFirst({
    where: { id, deletedAt: null },
    include: { user: true },
  });

  if (!applicant) {
    return errorResponse("NOT_FOUND", "Application not found", 404);
  }

  if (!applicant.checkrReportId) {
    return errorResponse(
      "NOT_FOUND",
      "No background check report available for this applicant",
      404,
    );
  }

  // Log the access BEFORE fetching the report (audit compliance)
  await db.screeningAuditLog.create({
    data: {
      userId: adminUser.userId,
      applicantId: applicant.id,
      action: "VIEW_REPORT",
      metadata: {
        reportId: applicant.checkrReportId,
        adminEmail: adminUser.email,
      },
    },
  });

  try {
    const report = await getReport(applicant.checkrReportId);

    // Return a sanitized view -- only what the admin needs
    return successResponse({
      reportId: report.id,
      status: report.status,
      result: report.result,
      adjudication: report.adjudication,
      completedAt: report.completed_at,
      turnaroundTime: report.turnaround_time,
      package: report.package,
      screenings: report.screenings.map((s) => ({
        id: s.id,
        type: s.type,
        status: s.status,
        result: s.result,
        turnaroundTime: s.turnaround_time,
      })),
      applicant: {
        id: applicant.id,
        name: `${applicant.user.firstName} ${applicant.user.lastName}`,
        checkrCandidateId: applicant.checkrCandidateId,
      },
    });
  } catch (error) {
    logger.error("Failed to fetch Checkr report", {
      reportId: applicant.checkrReportId,
      applicantId: applicant.id,
      error: error instanceof Error ? error.message : String(error),
    });
    return errorResponse(
      "INTERNAL_ERROR",
      "Failed to fetch background check report from Checkr",
      500,
    );
  }
}
