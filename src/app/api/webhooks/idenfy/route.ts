import { db } from "@/lib/db";
import { errorResponse, successResponse } from "@/lib/api-response";
import {
  mapIdenfyStatus,
  verifyIdenfySignature,
} from "@/lib/background-checks/idenfy";

export async function POST(request: Request) {
  const signature = request.headers.get("x-idenfy-signature") ?? "";
  const payload = await request.text();

  if (!verifyIdenfySignature(signature, payload)) {
    return errorResponse("FORBIDDEN", "Invalid signature", 403);
  }

  let body: { clientId?: string; status?: string };
  try {
    body = JSON.parse(payload);
  } catch (error) {
    return errorResponse("VALIDATION_ERROR", "Invalid JSON payload", 400, [
      { message: (error as Error).message },
    ]);
  }
  const applicantId = body.clientId;

  if (!applicantId) {
    return errorResponse("VALIDATION_ERROR", "Missing applicantId", 400);
  }

  if (!body.status) {
    return errorResponse("VALIDATION_ERROR", "Missing status", 400);
  }

  const status = mapIdenfyStatus(body.status);
  const applicant = await db.applicant.findUnique({
    where: { id: applicantId },
  });

  if (!applicant) {
    return errorResponse("NOT_FOUND", "Applicant not found", 404);
  }

  await db.applicant.update({
    where: { id: applicantId },
    data: {
      idenfyStatus: status as never,
    },
  });

  return successResponse({ received: true });
}
