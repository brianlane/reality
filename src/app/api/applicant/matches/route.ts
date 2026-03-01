import { getAuthUser, isAdminEmail } from "@/lib/auth";
import { db } from "@/lib/db";
import { errorResponse, successResponse } from "@/lib/api-response";
import { getApplicantByEmail } from "@/lib/applicant-helpers";

export async function GET(request: Request) {
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

  const url = new URL(request.url);
  const outcome = url.searchParams.get("outcome");

  const rawMatches = await db.match.findMany({
    where: {
      OR: [{ applicantId: applicant.id }, { partnerId: applicant.id }],
      notifiedAt: { not: null },
      deletedAt: null,
      ...(outcome ? { outcome: outcome as never } : {}),
    },
    include: {
      event: true,
      applicant: { include: { user: true } },
      partner: { include: { user: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return successResponse({
    matches: rawMatches.map((match) => {
      const isApplicant = match.applicantId === applicant.id;
      const partnerRecord = isApplicant ? match.partner : match.applicant;
      return {
        id: match.id,
        eventId: match.eventId,
        eventName: match.event.name,
        partner: {
          id: partnerRecord.id,
          firstName: partnerRecord.user.firstName,
          age: partnerRecord.age,
          occupation: partnerRecord.occupation,
          photos: partnerRecord.photos,
        },
        type: match.type,
        compatibilityScore: match.compatibilityScore,
        outcome: match.outcome,
        contactExchanged: match.contactExchanged,
        notifiedAt: match.notifiedAt,
        createdAt: match.createdAt,
      };
    }),
  });
}
