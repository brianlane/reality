import { db } from "@/lib/db";
import { errorResponse, successResponse } from "@/lib/api-response";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_: Request, { params }: RouteContext) {
  const { id } = await params;
  const applicant = await db.applicant.findUnique({
    where: { id },
  });

  if (!applicant) {
    return errorResponse("NOT_FOUND", "Application not found", 404);
  }

  const displayStatus = applicant.softRejectedAt
    ? (applicant.softRejectedFromStatus ?? applicant.applicationStatus)
    : applicant.applicationStatus;
  const nextStepMessage =
    displayStatus === "PAYMENT_PENDING"
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
