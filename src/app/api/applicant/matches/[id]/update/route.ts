import { getMockAuth } from "@/lib/auth";
import { db } from "@/lib/db";
import { errorResponse, successResponse } from "@/lib/api-response";
import { getApplicantByClerkId } from "@/lib/applicant-helpers";
import { updateMatchSchema } from "@/lib/validations";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(request: Request, { params }: RouteContext) {
  const { id } = await params;
  const auth = await getMockAuth();
  const applicant = await getApplicantByClerkId(auth.userId);

  if (!applicant) {
    return errorResponse("UNAUTHORIZED", "Applicant not found", 401);
  }

  const payload = updateMatchSchema.parse(await request.json());

  const match = await db.match.findUnique({
    where: { id },
  });

  if (!match || match.applicantId !== applicant.id) {
    return errorResponse("NOT_FOUND", "Match not found", 404);
  }

  const updated = await db.match.update({
    where: { id: match.id },
    data: {
      outcome: payload.outcome as never,
      notes: payload.notes ?? undefined,
    },
  });

  return successResponse({
    match: {
      id: updated.id,
      outcome: updated.outcome,
      updatedAt: updated.updatedAt,
    },
  });
}
