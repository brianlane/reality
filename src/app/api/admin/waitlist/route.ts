import { getAuthUser, requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { errorResponse, successResponse } from "@/lib/api-response";

export async function GET(request: Request) {
  const auth = await getAuthUser();
  if (!auth) {
    return errorResponse("UNAUTHORIZED", "User not authenticated", 401);
  }
  if (!auth.email) {
    return errorResponse("UNAUTHORIZED", "Email not available", 401);
  }
  try {
    requireAdmin(auth.email);
  } catch (error) {
    return errorResponse("FORBIDDEN", (error as Error).message, 403);
  }

  try {
    const waitlistApplicants = await db.applicant.findMany({
      where: {
        applicationStatus: "WAITLIST",
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            phone: true,
          },
        },
      },
      orderBy: {
        waitlistedAt: "asc", // FIFO - oldest first
      },
    });

    const formattedApplicants = waitlistApplicants.map((applicant) => ({
      id: applicant.id,
      user: applicant.user,
      age: applicant.age,
      gender: applicant.gender,
      location: applicant.location,
      stage1Responses: applicant.stage1Responses,
      waitlistedAt: applicant.waitlistedAt,
      invitedOffWaitlistAt: applicant.invitedOffWaitlistAt,
      invitedOffWaitlistBy: applicant.invitedOffWaitlistBy,
      stage1CompletedAt: applicant.stage1CompletedAt,
    }));

    return successResponse({
      applicants: formattedApplicants,
      count: formattedApplicants.length,
    });
  } catch (error) {
    console.error("Error fetching waitlist:", error);
    return errorResponse(
      "SERVER_ERROR",
      "Failed to fetch waitlist",
      500,
      [{ message: (error as Error).message }],
    );
  }
}
