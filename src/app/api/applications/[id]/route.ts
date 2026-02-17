import { db } from "@/lib/db";
import { errorResponse, successResponse } from "@/lib/api-response";

type RouteContext = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/applications/[id]
 * Returns applicant demographic data for pre-filling forms
 * Used when waitlist invitees continue their application
 */
export async function GET(_: Request, { params }: RouteContext) {
  const { id } = await params;

  const applicant = await db.applicant.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
        },
      },
    },
  });

  if (!applicant) {
    return errorResponse("NOT_FOUND", "Application not found", 404);
  }

  // Return demographic data for form pre-filling
  return successResponse({
    // User data (from Stage 1)
    firstName: applicant.user.firstName,
    lastName: applicant.user.lastName,
    email: applicant.user.email,
    phone: applicant.user.phone,

    // Applicant data (from Stage 1 and demographics)
    age: applicant.age,
    gender: applicant.gender,
    seeking: applicant.seeking,
    location: applicant.location,
    cityFrom: applicant.cityFrom,
    occupation: applicant.occupation,
    industry: applicant.industry,
    employer: applicant.employer,
    education: applicant.education,
    incomeRange: applicant.incomeRange,
    referredBy: applicant.referredBy,
    aboutYourself: applicant.aboutYourself,
  });
}
