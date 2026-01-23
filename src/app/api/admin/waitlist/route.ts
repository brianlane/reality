import { ApplicationStatus } from "@prisma/client";
import { getAuthUser, requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { errorResponse, successResponse } from "@/lib/api-response";
import { logger } from "@/lib/logger";

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
    const url = new URL(request.url);
    const page = Number(url.searchParams.get("page") ?? "1");
    const limit = Number(url.searchParams.get("limit") ?? "50");
    const includeDeleted = url.searchParams.get("includeDeleted") === "true";

    const where = {
      applicationStatus: {
        in: [ApplicationStatus.WAITLIST, ApplicationStatus.WAITLIST_INVITED],
      },
      ...(includeDeleted ? {} : { deletedAt: null }),
    };

    const [waitlistApplicants, total] = await Promise.all([
      db.applicant.findMany({
        where,
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
        skip: (page - 1) * limit,
        take: limit,
      }),
      db.applicant.count({ where }),
    ]);

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
      pagination: {
        total,
        pages: Math.ceil(total / limit),
        currentPage: page,
        perPage: limit,
      },
    });
  } catch (error) {
    logger.error("Error fetching waitlist", {
      error: (error as Error).message,
    });
    return errorResponse("SERVER_ERROR", "Failed to fetch waitlist", 500, [
      { message: (error as Error).message },
    ]);
  }
}
