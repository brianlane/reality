import { db } from "@/lib/db";
import { errorResponse, successResponse } from "@/lib/api-response";
import { nanoid } from "nanoid";
import { sendResearchInviteEmail } from "@/lib/email/research";
import { logger } from "@/lib/logger";
import { generateUniqueResearchInviteCode } from "@/lib/research/invite-code";

const RESEARCH_STATUSES = new Set([
  "RESEARCH_INVITED",
  "RESEARCH_IN_PROGRESS",
  "RESEARCH_COMPLETED",
]);

/**
 * POST /api/research/self-register
 * Allows anyone to self-register for the research study
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { firstName, lastName, email } = body;

    // Validate required fields
    if (!firstName || !lastName || !email) {
      return errorResponse(
        "VALIDATION_ERROR",
        "First name, last name, and email are required",
        400,
      );
    }

    // Check if user already exists with this email
    const existingUser = await db.user.findUnique({
      where: { email: email.toLowerCase() },
      include: { applicant: true },
    });

    if (existingUser?.applicant) {
      if (!RESEARCH_STATUSES.has(existingUser.applicant.applicationStatus)) {
        return errorResponse(
          "CONFLICT",
          "A non-research application already exists for this email.",
          409,
        );
      }

      const inviteCode =
        existingUser.applicant.researchInviteCode ??
        (await generateUniqueResearchInviteCode(db));

      // User already exists - just set them to research mode
      const applicant = await db.applicant.update({
        where: { id: existingUser.applicant.id },
        data: {
          applicationStatus: "RESEARCH_IN_PROGRESS",
          researchInvitedAt: new Date(),
          researchInviteCode: inviteCode,
        },
      });

      let emailSent = false;
      try {
        await sendResearchInviteEmail({
          to: existingUser.email,
          firstName: existingUser.firstName || firstName,
          inviteCode,
          applicantId: applicant.id,
        });
        emailSent = true;
      } catch (emailError) {
        logger.error("Failed to send research self-register email", {
          error:
            emailError instanceof Error
              ? emailError.message
              : String(emailError),
          applicantId: applicant.id,
          email: existingUser.email,
        });
      }

      return successResponse({
        applicationId: applicant.id,
        inviteCode,
        emailSent,
        message: "Welcome back! Continue with your research questionnaire.",
      });
    }

    // Create new user and applicant for research
    const clerkId = `research_${nanoid(16)}`;
    const inviteCode = await generateUniqueResearchInviteCode(db);

    const user = await db.user.create({
      data: {
        clerkId,
        email: email.toLowerCase(),
        firstName,
        lastName,
        role: "APPLICANT",
      },
    });

    const applicant = await db.applicant.create({
      data: {
        userId: user.id,
        age: 0, // Placeholder - not required for research
        gender: "PREFER_NOT_TO_SAY",
        location: "Unknown",
        occupation: "Research Participant",
        education: "Unknown",
        incomeRange: "Unknown",
        applicationStatus: "RESEARCH_IN_PROGRESS",
        researchInvitedAt: new Date(),
        researchInviteCode: inviteCode,
        photos: [],
      },
    });

    let emailSent = false;
    try {
      await sendResearchInviteEmail({
        to: user.email,
        firstName: user.firstName || firstName,
        inviteCode,
        applicantId: applicant.id,
      });
      emailSent = true;
    } catch (emailError) {
      logger.error("Failed to send research self-register email", {
        error:
          emailError instanceof Error ? emailError.message : String(emailError),
        applicantId: applicant.id,
        email: user.email,
      });
    }

    return successResponse({
      applicationId: applicant.id,
      inviteCode,
      emailSent,
      message: "Successfully registered for research study",
    });
  } catch (error) {
    console.error("Research self-registration error:", error);
    return errorResponse(
      "INTERNAL_ERROR",
      "Failed to register for research study",
      500,
    );
  }
}
