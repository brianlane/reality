import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { errorResponse, successResponse } from "@/lib/api-response";
import { submitApplicationSchema } from "@/lib/validations";

export async function POST(request: NextRequest) {
  try {
    const { applicationId } = submitApplicationSchema.parse(
      await request.json(),
    );

    const applicant = await db.applicant.findUnique({
      where: { id: applicationId },
    });

    if (!applicant) {
      return errorResponse("NOT_FOUND", "Research applicant not found", 404);
    }

    if (applicant.applicationStatus !== "RESEARCH_IN_PROGRESS") {
      return errorResponse(
        "INVALID_STATUS",
        "Research questionnaire is not in progress",
        400,
      );
    }

    await db.applicant.update({
      where: { id: applicant.id },
      data: {
        applicationStatus: "RESEARCH_COMPLETED",
        researchCompletedAt: new Date(),
        researchInviteUsedAt: applicant.researchInviteUsedAt ?? new Date(),
      },
    });

    return successResponse({
      applicationId: applicant.id,
      status: "RESEARCH_COMPLETED",
    });
  } catch (error) {
    return errorResponse("VALIDATION_ERROR", "Invalid request payload", 400, [
      { message: (error as Error).message },
    ]);
  }
}
