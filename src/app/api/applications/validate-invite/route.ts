import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { errorResponse, successResponse } from "@/lib/api-response";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const token = searchParams.get("token");

    if (!token) {
      return errorResponse("MISSING_TOKEN", "Invite token is required", 400);
    }

    // Find applicant by waitlistInviteToken
    const applicant = await db.applicant.findUnique({
      where: { waitlistInviteToken: token },
      include: {
        user: {
          select: {
            firstName: true,
          },
        },
      },
    });

    if (!applicant) {
      return errorResponse(
        "INVALID_TOKEN",
        "Invalid or expired invitation link",
        404,
      );
    }

    // Check if status is WAITLIST
    if (applicant.applicationStatus !== "WAITLIST") {
      return errorResponse(
        "ALREADY_USED",
        "This invitation has already been used",
        400,
      );
    }

    return successResponse({
      valid: true,
      firstName: applicant.user.firstName,
      applicationId: applicant.id,
    });
  } catch (error) {
    console.error("Token validation error:", error);
    return errorResponse(
      "VALIDATION_ERROR",
      "Failed to validate invite token",
      400,
      [{ message: (error as Error).message }],
    );
  }
}
