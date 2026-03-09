import { db } from "@/lib/db";
import { getAuthUser } from "@/lib/auth";
import { errorResponse, successResponse } from "@/lib/api-response";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, { params }: RouteContext) {
  const { id } = await params;
  const applicant = await db.applicant.findUnique({
    where: { id },
    include: { user: { select: { email: true } } },
  });

  if (!applicant) {
    return errorResponse("NOT_FOUND", "Application not found", 404);
  }

  // Auth check: require authenticated user matching this applicant,
  // or a valid waitlistInviteToken for email-based flows
  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  const auth = await getAuthUser();

  const tokenValid =
    token &&
    applicant.waitlistInviteToken &&
    token === applicant.waitlistInviteToken;
  const authValid =
    auth?.email &&
    applicant.user.email.toLowerCase() === auth.email.toLowerCase();

  if (!tokenValid && !authValid) {
    return errorResponse("UNAUTHORIZED", "Authentication required", 401);
  }

  const displayStatus = applicant.softRejectedAt
    ? (applicant.softRejectedFromStatus ?? applicant.applicationStatus)
    : applicant.applicationStatus;
  const nextStepMessage = applicant.softRejectedAt
    ? "We are reviewing your application."
    : displayStatus === "PAYMENT_PENDING"
      ? "Complete payment to begin screening."
      : "We are reviewing your application.";

  return successResponse({
    applicationId: applicant.id,
    status: displayStatus,
    screeningStatus: applicant.screeningStatus,
    idenfyStatus: applicant.idenfyStatus,
    checkrStatus: applicant.checkrStatus,
    nextStep: nextStepMessage,
    submittedAt: applicant.submittedAt,
  });
}
