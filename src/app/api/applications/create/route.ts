import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { createApplicationSchema } from "@/lib/validations";
import { errorResponse, successResponse } from "@/lib/api-response";

export async function POST(request: NextRequest) {
  try {
    const payload = createApplicationSchema.parse(await request.json());
    const { userId, demographics, questionnaire } = payload;

    const user =
      (await db.user.findUnique({ where: { clerkId: userId } })) ??
      (await db.user.create({
        data: {
          clerkId: userId,
          email: `${userId}@mock.local`,
          firstName: "Applicant",
          lastName: "User",
        },
      }));

    const applicant = await db.applicant.upsert({
      where: { userId: user.id },
      update: {
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
      await db.questionnaire.upsert({
        where: { applicantId: applicant.id },
        update: { ...questionnaire, responses: questionnaire.responses ?? {} },
        create: {
          applicantId: applicant.id,
          ...questionnaire,
          responses: questionnaire.responses ?? {},
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
