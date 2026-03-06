import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { errorResponse, successResponse } from "@/lib/api-response";

async function getApplicantForProlific(applicationId: string) {
  return db.applicant.findUnique({
    where: { id: applicationId },
    select: {
      id: true,
      applicationStatus: true,
      prolificCompletionCode: true,
      deletedAt: true,
    },
  });
}

/**
 * GET /api/research/prolific-redirect?applicationId=XXX
 * Fetch completion code for redirect fallback flows.
 */
export async function GET(request: NextRequest) {
  try {
    const applicationId = request.nextUrl.searchParams.get("applicationId");

    if (!applicationId) {
      return errorResponse("MISSING_ID", "Application ID required", 400);
    }

    const applicant = await getApplicantForProlific(applicationId);

    if (!applicant || applicant.deletedAt !== null) {
      return errorResponse("NOT_FOUND", "Applicant not found", 404);
    }

    if (
      applicant.applicationStatus !== "RESEARCH_COMPLETED" ||
      !applicant.prolificCompletionCode
    ) {
      return errorResponse("NOT_PROLIFIC", "Not a Prolific participant", 400);
    }

    return successResponse({
      applicationId: applicant.id,
      prolificCompletionCode: applicant.prolificCompletionCode,
    });
  } catch (error) {
    console.error("Error fetching Prolific completion code:", error);
    return errorResponse(
      "INTERNAL_ERROR",
      "Failed to fetch completion code",
      500,
    );
  }
}

/**
 * POST /api/research/prolific-redirect
 * Mark that a participant was redirected to Prolific
 */
export async function POST(request: NextRequest) {
  try {
    const { applicationId } = await request.json();

    if (!applicationId) {
      return errorResponse("MISSING_ID", "Application ID required", 400);
    }

    const applicant = await getApplicantForProlific(applicationId);

    if (!applicant || applicant.deletedAt !== null) {
      return errorResponse("NOT_FOUND", "Applicant not found", 404);
    }

    if (!applicant.prolificCompletionCode) {
      return errorResponse("NOT_PROLIFIC", "Not a Prolific participant", 400);
    }

    // Update redirect timestamp
    await db.applicant.update({
      where: { id: applicant.id },
      data: {
        prolificRedirectedAt: new Date(),
      },
    });

    return successResponse({
      message: "Redirect tracked successfully",
    });
  } catch (error) {
    console.error("Error tracking Prolific redirect:", error);
    return errorResponse("INTERNAL_ERROR", "Failed to track redirect", 500);
  }
}
