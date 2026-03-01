import { getAuthUser, isAdminEmail } from "@/lib/auth";
import { db } from "@/lib/db";
import { errorResponse, successResponse } from "@/lib/api-response";
import { getApplicantByEmail } from "@/lib/applicant-helpers";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, { params }: RouteContext) {
  const { id } = await params;
  const auth = await getAuthUser();
  if (!auth) {
    return errorResponse("UNAUTHORIZED", "User not authenticated", 401);
  }
  if (isAdminEmail(auth.email)) {
    return errorResponse("FORBIDDEN", "Applicant access required", 403);
  }
  if (!auth.email) {
    return errorResponse("UNAUTHORIZED", "Email not available", 401);
  }

  const applicant = await getApplicantByEmail(auth.email);
  if (!applicant) {
    return errorResponse("UNAUTHORIZED", "Applicant not found", 401);
  }

  const match = await db.match.findFirst({
    where: {
      id,
      OR: [{ applicantId: applicant.id }, { partnerId: applicant.id }],
      notifiedAt: { not: null },
      deletedAt: null,
    },
    include: {
      event: true,
      applicant: { include: { user: true } },
      partner: { include: { user: true } },
    },
  });

  if (!match) {
    return errorResponse("NOT_FOUND", "Match not found", 404);
  }

  const isApplicant = match.applicantId === applicant.id;
  const partnerRecord = isApplicant ? match.partner : match.applicant;

  return successResponse({
    id: match.id,
    eventName: match.event.name,
    partner: {
      firstName: partnerRecord.user.firstName,
      age: partnerRecord.age,
      occupation: partnerRecord.occupation,
    },
    compatibilityScore: match.compatibilityScore,
    outcome: match.outcome,
    contactExchanged: match.contactExchanged,
    notifiedAt: match.notifiedAt,
  });
}
