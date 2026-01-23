import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { stage1QualificationSchema } from "@/lib/validations";
import { errorResponse, successResponse } from "@/lib/api-response";
import { sendWaitlistConfirmationEmail } from "@/lib/email/waitlist";
import type { JsonValueNonNull } from "@/lib/json";
import { logger } from "@/lib/logger";

export async function POST(request: NextRequest) {
  try {
    const payload = stage1QualificationSchema.parse(await request.json());
    const {
      firstName,
      lastName,
      email,
      phone,
      age,
      gender,
      location,
      instagram,
    } = payload;

    const normalizedEmail = email.toLowerCase();

    // Check if user exists
    const existingUser = await db.user.findFirst({
      where: { email: { equals: normalizedEmail, mode: "insensitive" } },
      include: { applicant: true },
    });
    const existingApplicant = existingUser?.applicant ?? null;
    const activeApplicant =
      existingApplicant && existingApplicant.deletedAt === null
        ? existingApplicant
        : null;
    const restoredApplicant =
      existingApplicant && existingApplicant.deletedAt !== null
        ? existingApplicant
        : null;

    // Only allow Stage 1 for new users or existing WAITLIST applicants
    if (
      (activeApplicant && activeApplicant.applicationStatus !== "WAITLIST") ||
      (restoredApplicant && restoredApplicant.applicationStatus !== "WAITLIST")
    ) {
      return errorResponse(
        "APPLICATION_EXISTS",
        "You already have an application in progress or submitted.",
        409,
      );
    }

    // Create or update User record
    const user = existingUser
      ? await db.user.update({
          where: { id: existingUser.id },
          data: {
            firstName,
            lastName,
            phone: phone ?? null,
            email: normalizedEmail,
            deletedAt: null,
            deletedBy: null,
          },
        })
      : await db.user.create({
          data: {
            clerkId: normalizedEmail,
            email: normalizedEmail,
            firstName,
            lastName,
            phone: phone ?? null,
          },
        });

    // Store Stage 1 responses as JSON
    const stage1Responses: JsonValueNonNull = {
      firstName,
      lastName,
      email,
      phone,
      age,
      gender,
      location,
      instagram,
      submittedAt: new Date().toISOString(),
    };

    // Create or update Applicant with WAITLIST status
    const restoringApplicant = !!restoredApplicant;
    const waitlistedAt = existingApplicant?.waitlistedAt ?? new Date();
    const applicant = existingApplicant
      ? await db.applicant.update({
          where: { id: existingApplicant.id },
          data: {
            age,
            gender,
            location,
            stage1CompletedAt: new Date(),
            stage1Responses: stage1Responses,
            ...(restoringApplicant
              ? {
                  deletedAt: null,
                  deletedBy: null,
                  applicationStatus: "WAITLIST",
                  reviewedAt: null,
                  reviewedBy: null,
                  rejectionReason: null,
                  compatibilityScore: null,
                  backgroundCheckNotes: null,
                  waitlistedAt,
                }
              : {}),
            // Only set waitlistedAt if not already set (preserve queue position)
            ...(existingApplicant.waitlistedAt ? {} : { waitlistedAt }),
          },
        })
      : await db.applicant.create({
          data: {
            userId: user.id,
            age,
            gender,
            location,
            occupation: "Pending",
            education: "Pending",
            incomeRange: "Pending",
            applicationStatus: "WAITLIST",
            stage1CompletedAt: new Date(),
            stage1Responses: stage1Responses,
            waitlistedAt: new Date(),
            photos: [],
          },
        });

    // Send waitlist confirmation email
    try {
      await sendWaitlistConfirmationEmail({
        to: normalizedEmail,
        firstName,
        applicationId: applicant.id,
      });
    } catch (emailError) {
      const errorMessage =
        emailError instanceof Error ? emailError.message : String(emailError);
      logger.error("Failed to send waitlist confirmation email", {
        applicationId: applicant.id,
        error: errorMessage,
      });
      // Continue even if email fails - don't block the application
    }

    return successResponse({
      applicationId: applicant.id,
      status: "WAITLIST",
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logger.error("Stage 1 submission error", {
      error: errorMessage,
    });
    return errorResponse(
      "VALIDATION_ERROR",
      "Invalid qualification data",
      400,
      [{ message: errorMessage }],
    );
  }
}
