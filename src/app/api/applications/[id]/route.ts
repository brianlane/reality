import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { errorResponse, successResponse } from "@/lib/api-response";

type RouteContext = {
  params: Promise<{ id: string }>;
};

const INVITE_EXPIRATION_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * GET /api/applications/[id]
 * Returns applicant demographic data for pre-filling forms
 * Used when waitlist invitees continue their application
 */
export async function GET(request: NextRequest, { params }: RouteContext) {
  const { id } = await params;
  const inviteToken = request.nextUrl.searchParams.get("token");

  if (!inviteToken) {
    return errorResponse("MISSING_TOKEN", "Invite token is required", 400);
  }

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

  if (applicant.deletedAt) {
    return errorResponse("NOT_FOUND", "Application not found", 404);
  }

  if (applicant.applicationStatus !== "WAITLIST_INVITED") {
    return errorResponse(
      "ALREADY_USED",
      "This invitation has already been used",
      400,
    );
  }

  if (
    !applicant.waitlistInviteToken ||
    applicant.waitlistInviteToken !== inviteToken
  ) {
    return errorResponse(
      "INVALID_TOKEN",
      "Invalid or expired invitation link",
      403,
    );
  }

  if (!applicant.invitedOffWaitlistAt) {
    return errorResponse(
      "INVALID_TOKEN",
      "Invalid or expired invitation link",
      403,
    );
  }

  const expiresAt = new Date(
    applicant.invitedOffWaitlistAt.getTime() + INVITE_EXPIRATION_MS,
  );
  if (Date.now() > expiresAt.getTime()) {
    return errorResponse(
      "INVITE_EXPIRED",
      "This invitation link has expired",
      410,
    );
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
