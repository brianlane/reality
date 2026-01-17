import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { submitApplicationSchema } from "@/lib/validations";
import { errorResponse, successResponse } from "@/lib/api-response";

const APPLICATION_FEE_AMOUNT = 19900;

export async function POST(request: NextRequest) {
  try {
    const { applicationId } = submitApplicationSchema.parse(await request.json());
    const applicant = await db.applicant.findUnique({
      where: { id: applicationId },
    });

    if (!applicant) {
      return errorResponse("NOT_FOUND", "Application not found", 404);
    }

    const payment = await db.payment.create({
      data: {
        applicantId: applicant.id,
        type: "APPLICATION_FEE",
        amount: APPLICATION_FEE_AMOUNT,
        status: "PENDING",
      },
    });

    await db.applicant.update({
      where: { id: applicant.id },
      data: {
        applicationStatus: "PAYMENT_PENDING",
        submittedAt: new Date(),
      },
    });

    return successResponse({
      paymentUrl: `https://mock.stripe.local/session/${payment.id}`,
      applicationId: applicant.id,
    });
  } catch (error) {
    return errorResponse("VALIDATION_ERROR", "Invalid submit payload", 400, [
      { message: (error as Error).message },
    ]);
  }
}
