import { db } from "@/lib/db";
import { errorResponse, successResponse } from "@/lib/api-response";
import {
  mapCheckrResult,
  verifyCheckrSignature,
} from "@/lib/background-checks/checkr";

export async function POST(request: Request) {
  const signature = request.headers.get("x-checkr-signature") ?? "";
  const payload = await request.text();

  if (!verifyCheckrSignature(signature, payload)) {
    return errorResponse("FORBIDDEN", "Invalid signature", 403);
  }

  let body: { candidate_id?: string; result?: string };
  try {
    body = JSON.parse(payload);
  } catch (error) {
    return errorResponse("VALIDATION_ERROR", "Invalid JSON payload", 400, [
      { message: (error as Error).message },
    ]);
  }
  const applicantId = body.candidate_id;

  if (!applicantId) {
    return errorResponse("VALIDATION_ERROR", "Missing applicantId", 400);
  }

  if (!body.result) {
    return errorResponse("VALIDATION_ERROR", "Missing result", 400);
  }

  const status = mapCheckrResult(body.result);

  await db.applicant.update({
    where: { id: applicantId },
    data: {
      checkrStatus: status as never,
    },
  });

  return successResponse({ received: true });
}
