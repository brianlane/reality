import { db } from "@/lib/db";
import { errorResponse, successResponse } from "@/lib/api-response";
import { mapIdenfyStatus, verifyIdenfySignature } from "@/lib/background-checks/idenfy";

export async function POST(request: Request) {
  const signature = request.headers.get("x-idenfy-signature") ?? "";
  const payload = await request.text();

  if (!verifyIdenfySignature(signature, payload)) {
    return errorResponse("FORBIDDEN", "Invalid signature", 403);
  }

  const body = JSON.parse(payload);
  const applicantId = body.clientId;

  if (!applicantId) {
    return errorResponse("VALIDATION_ERROR", "Missing applicantId", 400);
  }

  const status = mapIdenfyStatus(body.status);

  await db.applicant.update({
    where: { id: applicantId },
    data: {
      idenfyStatus: status as never,
    },
  });

  return successResponse({ received: true });
}
