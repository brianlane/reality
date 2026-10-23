import { getAuthUser, requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { errorResponse, successResponse } from "@/lib/api-response";
import { runPouchExchange, PouchError } from "@/lib/agent/pouch";

type RouteParams = {
  params: Promise<{ id: string }>;
};

/**
 * Admin: run a two-way pouch exchange between a match's two applicants.
 * Both agents share only consented Tier 1 dimensions; the exchange is
 * audit-logged (dimension names + payload hash). Returns both pouches so
 * the curator can feed them into briefing generation.
 */
export async function POST(_request: Request, { params }: RouteParams) {
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

  const match = await db.match.findUnique({
    where: { id, deletedAt: null },
    select: { id: true, applicantId: true, partnerId: true },
  });
  if (!match) {
    return errorResponse("NOT_FOUND", "Match not found", 404);
  }

  try {
    const { pouchAtoB, pouchBtoA } = await runPouchExchange(
      match.applicantId,
      match.partnerId,
    );
    return successResponse({ pouchAtoB, pouchBtoA }, 201);
  } catch (err) {
    if (err instanceof PouchError) {
      const status =
        err.code === "PAUSED" || err.code === "REVIEW_REQUIRED" ? 403 : 422;
      return errorResponse(err.code, err.message, status);
    }
    const message = err instanceof Error ? err.message : String(err);
    return errorResponse("EXCHANGE_FAILED", message, 500);
  }
}
