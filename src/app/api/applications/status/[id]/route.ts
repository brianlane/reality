import { db } from "@/lib/db";
import { errorResponse, successResponse } from "@/lib/api-response";

type Params = {
  params: { id: string };
};

export async function GET(_: Request, { params }: Params) {
  const applicant = await db.applicant.findUnique({
    where: { id: params.id },
  });

  if (!applicant) {
    return errorResponse("NOT_FOUND", "Application not found", 404);
  }

  return successResponse({
    applicationId: applicant.id,
    status: applicant.applicationStatus,
    screeningStatus: applicant.screeningStatus,
    idenfyStatus: applicant.idenfyStatus,
    checkrStatus: applicant.checkrStatus,
    nextStep:
      applicant.applicationStatus === "PAYMENT_PENDING"
        ? "Complete payment to begin screening."
        : "We are reviewing your application.",
    submittedAt: applicant.submittedAt,
  });
}
