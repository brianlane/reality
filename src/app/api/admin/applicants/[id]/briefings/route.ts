import { getAuthUser, requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { errorResponse, successResponse } from "@/lib/api-response";

type RouteParams = {
  params: Promise<{ id: string }>;
};

/**
 * Admin: list all agent briefings for an applicant (curator and applicant
 * audiences). Used by the admin briefing panel on the application detail page.
 */
export async function GET(_request: Request, { params }: RouteParams) {
  const auth = await getAuthUser();
  if (!auth) {
    return errorResponse("UNAUTHORIZED", "User not authenticated", 401);
  }
  try {
    requireAdmin(auth.email);
  } catch (error) {
    return errorResponse("FORBIDDEN", (error as Error).message, 403);
  }

  const { id } = await params;

  const applicant = await db.applicant.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!applicant) {
    return errorResponse("NOT_FOUND", "Applicant not found", 404);
  }

  const briefings = await db.briefing.findMany({
    where: { applicantId: id, deletedAt: null },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      audience: true,
      content: true,
      matchId: true,
      model: true,
      createdAt: true,
      agentProfile: {
        select: { id: true, version: true, depth: true },
      },
    },
  });

  return successResponse({ briefings });
}
