import { getAuthUser, requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { errorResponse, successResponse } from "@/lib/api-response";
import { generateBriefing } from "@/lib/agent/briefing-generator";

type RouteParams = {
  params: Promise<{ id: string }>;
};

/**
 * Admin: generate a compatibility briefing for an applicant against a
 * candidate. Body: { candidateId: string, audience?: "CURATOR" | "APPLICANT",
 * matchId?: string }.
 */
export async function POST(request: Request, { params }: RouteParams) {
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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("INVALID_JSON", "Request body must be JSON", 400);
  }

  const { candidateId, audience, matchId } = (body ?? {}) as {
    candidateId?: string;
    audience?: string;
    matchId?: string;
  };

  if (!candidateId || typeof candidateId !== "string") {
    return errorResponse("INVALID_BODY", "candidateId is required", 400);
  }
  if (candidateId === id) {
    return errorResponse(
      "INVALID_BODY",
      "candidateId must differ from the applicant",
      400,
    );
  }
  const resolvedAudience =
    audience === "APPLICANT" ? "APPLICANT" : ("CURATOR" as const);

  const [applicant, candidate] = await Promise.all([
    db.applicant.findUnique({ where: { id }, select: { id: true } }),
    db.applicant.findUnique({
      where: { id: candidateId },
      select: { id: true },
    }),
  ]);
  if (!applicant || !candidate) {
    return errorResponse("NOT_FOUND", "Applicant or candidate not found", 404);
  }

  try {
    const briefing = await generateBriefing({
      applicantId: id,
      candidateId,
      matchId: typeof matchId === "string" ? matchId : undefined,
      audience: resolvedAudience,
    });
    return successResponse({ briefing }, 201);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const status = message.includes("not configured") ? 503 : 500;
    return errorResponse(
      status === 503 ? "AGENT_NOT_CONFIGURED" : "GENERATION_FAILED",
      message,
      status,
    );
  }
}
