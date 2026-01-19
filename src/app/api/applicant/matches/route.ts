import { getAuthUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { errorResponse, successResponse } from "@/lib/api-response";
import { getApplicantByClerkId } from "@/lib/applicant-helpers";

export async function GET(request: Request) {
  const auth = await getAuthUser();
  if (!auth) {
    return errorResponse("UNAUTHORIZED", "User not authenticated", 401);
  }

  const applicant = await getApplicantByClerkId(auth.userId);

  if (!applicant) {
    return errorResponse("UNAUTHORIZED", "Applicant not found", 401);
  }

  const url = new URL(request.url);
  const outcome = url.searchParams.get("outcome");

  const matches = await db.match.findMany({
    where: {
      applicantId: applicant.id,
      ...(outcome ? { outcome: outcome as never } : {}),
    },
    include: {
      event: true,
      partner: { include: { user: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return successResponse({
    matches: matches.map((match) => ({
      id: match.id,
      eventId: match.eventId,
      eventName: match.event.name,
      partner: {
        id: match.partnerId,
        firstName: match.partner.user.firstName,
        age: match.partner.age,
        occupation: match.partner.occupation,
        photos: match.partner.photos,
      },
      type: match.type,
      compatibilityScore: match.compatibilityScore,
      outcome: match.outcome,
      contactExchanged: match.contactExchanged,
      createdAt: match.createdAt,
    })),
  });
}
