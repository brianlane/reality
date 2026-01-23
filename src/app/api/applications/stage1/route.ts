import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { stage1QualificationSchema } from "@/lib/validations";
import { errorResponse, successResponse } from "@/lib/api-response";
import { sendWaitlistConfirmationEmail } from "@/lib/email/waitlist";
import type { JsonValueNonNull } from "@/lib/json";

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
      aboutYourself,
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

    // Only allow Stage 1 for new users or existing WAITLIST applicants
    if (activeApplicant && activeApplicant.applicationStatus !== "WAITLIST") {
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
      phone: phone ?? null,
      age,
      gender,
      location,
      aboutYourself,
      submittedAt: new Date().toISOString(),
    };

    // Create or update Applicant with WAITLIST status
    const restoringApplicant = existingApplicant?.deletedAt !== null;
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
                  waitlistedAt: new Date(),
                }
              : {}),
            // Only set waitlistedAt if not already set (preserve queue position)
            ...(existingApplicant.waitlistedAt
              ? {}
              : { waitlistedAt: new Date() }),
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
      console.error("Failed to send waitlist confirmation email:", emailError);
      // Continue even if email fails - don't block the application
    }

    return successResponse({
      applicationId: applicant.id,
      status: "WAITLIST",
    });
  } catch (error) {
    console.error("Stage 1 submission error:", error);
    return errorResponse(
      "VALIDATION_ERROR",
      "Invalid qualification data",
      400,
      [{ message: (error as Error).message }],
    );
  }
}
