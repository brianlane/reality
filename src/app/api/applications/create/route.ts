import { NextRequest } from "next/server";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { createApplicationSchema } from "@/lib/validations";
import { errorResponse, successResponse } from "@/lib/api-response";

const INVITE_EXPIRATION_MS = 7 * 24 * 60 * 60 * 1000;

export async function POST(request: NextRequest) {
  try {
    const payload = createApplicationSchema.parse(await request.json());
    const {
      applicant: applicantInfo,
      applicationId,
      inviteToken,
      demographics,
    } = payload;
    const normalizedEmail = applicantInfo.email.toLowerCase();

    // If an invite token is provided, validate it FIRST before any other operations
    if (inviteToken) {
      const invitedApplicant = await db.applicant.findUnique({
        where: { waitlistInviteToken: inviteToken },
        include: {
          user: {
            select: {
              email: true,
            },
          },
        },
      });

      if (!invitedApplicant) {
        return errorResponse("INVALID_TOKEN", "Invalid invitation token.", 403);
      }

      // Verify the email matches the invited applicant
      if (invitedApplicant.user.email.toLowerCase() !== normalizedEmail) {
        return errorResponse(
          "EMAIL_MISMATCH",
          "The email address does not match the invitation.",
          403,
        );
      }

      // Check if the applicant is still on the waitlist
      if (invitedApplicant.applicationStatus !== "WAITLIST_INVITED") {
        return errorResponse(
          "ALREADY_USED",
          "This invitation has already been used.",
          400,
        );
      }

      // Check token expiration
      const inviteIssuedAt = invitedApplicant.invitedOffWaitlistAt;
      if (!inviteIssuedAt) {
        return errorResponse("INVALID_TOKEN", "Invalid invitation token.", 403);
      }

      const expiresAt = new Date(
        inviteIssuedAt.getTime() + INVITE_EXPIRATION_MS,
      );
      if (Date.now() > expiresAt.getTime()) {
        return errorResponse(
          "INVITE_EXPIRED",
          "This invitation has expired.",
          410,
        );
      }
    }

    const user =
      (await db.user.findFirst({
        where: { email: { equals: normalizedEmail, mode: "insensitive" } },
      })) ??
      (await db.user.create({
        data: {
          clerkId: normalizedEmail,
          email: normalizedEmail,
          firstName: applicantInfo.firstName,
          lastName: applicantInfo.lastName,
          phone: applicantInfo.phone ?? null,
        },
      }));

    const existingApplicant = await db.applicant.findUnique({
      where: { userId: user.id },
    });

    if (existingApplicant) {
      const softRejectedApplicant =
        existingApplicant as typeof existingApplicant & {
          softRejectedAt?: Date | null;
        };
      if (softRejectedApplicant.softRejectedAt) {
        return errorResponse(
          "APPLICATION_LOCKED",
          "Application can no longer be edited.",
          403,
        );
      }
      if (!applicationId || applicationId !== existingApplicant.id) {
        return errorResponse(
          "APPLICATION_CONFLICT",
          "Application does not match the current draft.",
          409,
        );
      }

      // Check if user is on waitlist and needs invite token
      const isTransitioningFromWaitlist =
        existingApplicant.applicationStatus === "WAITLIST_INVITED";

      if (isTransitioningFromWaitlist) {
        if (
          !inviteToken ||
          existingApplicant.waitlistInviteToken !== inviteToken
        ) {
          return errorResponse(
            "WAITLIST_LOCKED",
            "You must be invited off the waitlist to continue.",
            403,
          );
        }
      } else if (existingApplicant.applicationStatus !== "DRAFT") {
        return errorResponse(
          "APPLICATION_LOCKED",
          "Application can no longer be edited.",
          409,
        );
      }
    } else {
      // If no existing applicant and no invite token, this is unauthorized access
      if (!inviteToken) {
        return errorResponse(
          "UNAUTHORIZED",
          "You must have a valid invitation to create an application.",
          403,
        );
      }
    }

    // Prepare update data - combine status transition and demographics update
    const updateData: Prisma.ApplicantUpdateInput = {
      user: {
        update: {
          firstName: applicantInfo.firstName,
          lastName: applicantInfo.lastName,
          phone: applicantInfo.phone ?? null,
          email: normalizedEmail,
        },
      },
      ...demographics,
    };

    // If transitioning from waitlist, update status to PAYMENT_PENDING (token kept until SUBMITTED)
    if (existingApplicant) {
      const isTransitioningFromWaitlist =
        existingApplicant.applicationStatus === "WAITLIST_INVITED";
      if (isTransitioningFromWaitlist) {
        updateData.applicationStatus = "PAYMENT_PENDING";
      }
    }

    const applicant = existingApplicant
      ? await db.applicant.update({
          where: { id: existingApplicant.id },
          data: updateData,
        })
      : await db.applicant.create({
          data: {
            userId: user.id,
            ...demographics,
            applicationStatus: "PAYMENT_PENDING",
            photos: [],
          },
        });

    return successResponse({
      applicationId: applicant.id,
      status: applicant.applicationStatus,
    });
  } catch (error) {
    return errorResponse("VALIDATION_ERROR", "Invalid application data", 400, [
      { message: (error as Error).message },
    ]);
  }
}
