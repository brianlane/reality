import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { createApplicationSchema } from "@/lib/validations";
import type { JsonValueNonNull } from "@/lib/json";
import { errorResponse, successResponse } from "@/lib/api-response";

export async function POST(request: NextRequest) {
  try {
    const payload = createApplicationSchema.parse(await request.json());
    const { applicant: applicantInfo, demographics, questionnaire } = payload;

    const user =
      (await db.user.findUnique({ where: { email: applicantInfo.email } })) ??
      (await db.user.create({
        data: {
          clerkId: applicantInfo.email,
          email: applicantInfo.email,
          firstName: applicantInfo.firstName,
          lastName: applicantInfo.lastName,
          phone: applicantInfo.phone ?? null,
        },
      }));

    const applicant = await db.applicant.upsert({
      where: { userId: user.id },
      update: {
        user: {
          update: {
            firstName: applicantInfo.firstName,
            lastName: applicantInfo.lastName,
            phone: applicantInfo.phone ?? null,
          },
        },
        ...demographics,
        applicationStatus: "DRAFT",
      },
      create: {
        userId: user.id,
        ...demographics,
        applicationStatus: "DRAFT",
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
