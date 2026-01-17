import { getMockAuth, requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { errorResponse, successResponse } from "@/lib/api-response";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_: Request, { params }: RouteContext) {
  const { id } = await params;
  const auth = await getMockAuth();
  try {
    requireAdmin(auth.role);
  } catch (error) {
    return errorResponse("FORBIDDEN", (error as Error).message, 403);
  }

  const applicant = await db.applicant.findUnique({
    where: { id },
    include: {
      user: true,
      questionnaire: true,
      payments: true,
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
      occupation: applicant.occupation,
      employer: applicant.employer,
      education: applicant.education,
      incomeRange: applicant.incomeRange,
      incomeVerified: applicant.incomeVerified,
      applicationStatus: applicant.applicationStatus,
      submittedAt: applicant.submittedAt,
      photos: applicant.photos,
    },
    questionnaire: applicant.questionnaire,
    screening: {
      screeningStatus: applicant.screeningStatus,
      idenfyStatus: applicant.idenfyStatus,
      idenfyVerificationId: applicant.idenfyVerificationId,
      checkrStatus: applicant.checkrStatus,
      checkrReportId: applicant.checkrReportId,
      backgroundCheckNotes: applicant.backgroundCheckNotes,
    },
    payments: applicant.payments,
  });
}
