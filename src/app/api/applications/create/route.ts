import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { createApplicationSchema } from "@/lib/validations";
import type { JsonValueNonNull } from "@/lib/json";
import { errorResponse, successResponse } from "@/lib/api-response";
import { Prisma } from "@prisma/client";

const INVITE_EXPIRATION_MS = 7 * 24 * 60 * 60 * 1000;

export async function POST(request: NextRequest) {
  try {
    const payload = createApplicationSchema.parse(await request.json());
    const {
      applicant: applicantInfo,
      applicationId,
      inviteToken,
      demographics,
      questionnaire,
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

    if (questionnaire) {
      const questionnaireData: {
        religionImportance: number;
        politicalAlignment: string;
        familyImportance: number;
        careerAmbition: number;
        financialGoals: string;
        fitnessLevel: string;
        diet: string;
        drinking: string;
        smoking: string;
        drugs: string;
        pets: string;
        relationshipGoal: string;
        wantsChildren: string;
        childrenTimeline: string | null;
        movingWillingness: string;
        hobbies: string[];
        travelFrequency: string;
        favoriteActivities: string[];
        loveLanguage: string;
        conflictStyle: string;
        introvertExtrovert: number;
        spontaneityPlanning: number;
        dealBreakers: string[];
        aboutMe: string;
        idealPartner: string;
        perfectDate: string;
        responses: JsonValueNonNull;
      } = {
        religionImportance: questionnaire.religionImportance ?? 3,
        politicalAlignment: questionnaire.politicalAlignment ?? "moderate",
        familyImportance: questionnaire.familyImportance ?? 3,
        careerAmbition: questionnaire.careerAmbition ?? 3,
        financialGoals: questionnaire.financialGoals ?? "To be determined",
        fitnessLevel: questionnaire.fitnessLevel ?? "Moderately active",
        diet: questionnaire.diet ?? "Omnivore",
        drinking: questionnaire.drinking ?? "Socially",
        smoking: questionnaire.smoking ?? "No",
        drugs: questionnaire.drugs ?? "No",
        pets: questionnaire.pets ?? "No preference",
        relationshipGoal: questionnaire.relationshipGoal ?? "Long-term",
        wantsChildren: questionnaire.wantsChildren ?? "Maybe",
        childrenTimeline: questionnaire.childrenTimeline ?? null,
        movingWillingness:
          questionnaire.movingWillingness ?? "Open to relocating",
        hobbies: questionnaire.hobbies ?? [],
        travelFrequency:
          questionnaire.travelFrequency ?? "Once or twice a year",
        favoriteActivities: questionnaire.favoriteActivities ?? [],
        loveLanguage: questionnaire.loveLanguage ?? "Quality Time",
        conflictStyle: questionnaire.conflictStyle ?? "Discuss calmly",
        introvertExtrovert: questionnaire.introvertExtrovert ?? 5,
        spontaneityPlanning: questionnaire.spontaneityPlanning ?? 5,
        dealBreakers: questionnaire.dealBreakers ?? [],
        aboutMe: questionnaire.aboutMe ?? "TBD",
        idealPartner: questionnaire.idealPartner ?? "TBD",
        perfectDate: questionnaire.perfectDate ?? "TBD",
        responses: (questionnaire.responses ?? {}) as JsonValueNonNull,
      };
      await db.questionnaire.upsert({
        where: { applicantId: applicant.id },
        update: questionnaireData,
        create: {
          applicantId: applicant.id,
          ...questionnaireData,
        },
      });
    }

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
