import { randomBytes } from "crypto";
import { ApplicationStatus } from "@prisma/client";
import { getAuthUser, requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { errorResponse, successResponse } from "@/lib/api-response";
import { adminResearchInviteCreateSchema } from "@/lib/validations";
import { getOrCreateAdminUser } from "@/lib/admin-helpers";
import { sendResearchInviteEmail } from "@/lib/email/research";
import { logger } from "@/lib/logger";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

function generateInviteCode() {
  return randomBytes(16).toString("hex");
}

export async function GET(request: Request) {
  const auth = await getAuthUser();
  if (!auth || !auth.email) {
    return errorResponse("UNAUTHORIZED", "User not authenticated", 401);
  }
  try {
    requireAdmin(auth.email);
  } catch (error) {
    return errorResponse("FORBIDDEN", (error as Error).message, 403);
  }

  const url = new URL(request.url);
  const includeDeleted = url.searchParams.get("includeDeleted") === "true";

  const researchStatuses: ApplicationStatus[] = [
    "RESEARCH_INVITED",
    "RESEARCH_IN_PROGRESS",
    "RESEARCH_COMPLETED",
  ];

  const applicants = await db.applicant.findMany({
    where: {
      applicationStatus: { in: researchStatuses },
      ...(includeDeleted ? {} : { deletedAt: null }),
    },
    include: {
      user: {
        select: {
          firstName: true,
          lastName: true,
          email: true,
        },
      },
    },
    orderBy: { researchInvitedAt: "desc" },
  });

  return successResponse({
    applicants: applicants.map((applicant) => ({
      id: applicant.id,
      user: applicant.user,
      applicationStatus: applicant.applicationStatus,
      researchInviteCode: applicant.researchInviteCode,
      researchInvitedAt: applicant.researchInvitedAt,
      researchInviteUsedAt: applicant.researchInviteUsedAt,
      researchCompletedAt: applicant.researchCompletedAt,
    })),
    count: applicants.length,
  });
}

export async function POST(request: Request) {
  const auth = await getAuthUser();
  if (!auth || !auth.email) {
    return errorResponse("UNAUTHORIZED", "User not authenticated", 401);
  }
  try {
    requireAdmin(auth.email);
  } catch (error) {
    return errorResponse("FORBIDDEN", (error as Error).message, 403);
  }

  let body: ReturnType<typeof adminResearchInviteCreateSchema.parse>;
  try {
    body = adminResearchInviteCreateSchema.parse(await request.json());
  } catch (error) {
    return errorResponse("VALIDATION_ERROR", "Invalid request body", 400, [
      { message: (error as Error).message },
    ]);
  }

  const normalizedEmail = body.email.toLowerCase();

  const existingUser = await db.user.findFirst({
    where: { email: { equals: normalizedEmail, mode: "insensitive" } },
    include: { applicant: true },
  });

  // Check if user has a non-research applicant record (including soft-deleted)
  // This prevents converting real application data into research participants
  if (
    existingUser?.applicant &&
    ![
      "RESEARCH_INVITED",
      "RESEARCH_IN_PROGRESS",
      "RESEARCH_COMPLETED",
    ].includes(existingUser.applicant.applicationStatus)
  ) {
    const isDeleted = existingUser.applicant.deletedAt !== null;
    return errorResponse(
      "CONFLICT",
      isDeleted
        ? "A deleted application exists for this email. Please use a different email for research."
        : "A non-research application already exists for this email.",
      409,
    );
  }

  // Prevent overwriting existing user profiles (e.g., admin users)
  if (existingUser && !existingUser.applicant) {
    return errorResponse(
      "CONFLICT",
      "A user account already exists for this email without an applicant profile.",
      409,
    );
  }

  const adminUser = await getOrCreateAdminUser({
    userId: auth.userId,
    email: auth.email,
  });

  let inviteCode = "";
  let foundUniqueCode = false;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    inviteCode = generateInviteCode();
    const exists = await db.applicant.findFirst({
      where: { researchInviteCode: inviteCode },
    });
    if (!exists) {
      foundUniqueCode = true;
      break;
    }
  }

  if (!foundUniqueCode) {
    return errorResponse(
      "INVITE_FAILED",
      "Failed to generate unique invite code after 5 attempts.",
      500,
    );
  }

  const result = await db.$transaction(async (tx) => {
    const user = existingUser
      ? await tx.user.update({
          where: { id: existingUser.id },
          data: {
            email: normalizedEmail,
            firstName: body.firstName,
            lastName: body.lastName,
            deletedAt: null,
            deletedBy: null,
          },
        })
      : await tx.user.create({
          data: {
            clerkId: normalizedEmail,
            email: normalizedEmail,
            firstName: body.firstName,
            lastName: body.lastName,
            role: "APPLICANT",
          },
        });

    const applicant = existingUser?.applicant
      ? await tx.applicant.update({
          where: { id: existingUser.applicant.id },
          data: {
            applicationStatus: "RESEARCH_INVITED",
            researchInviteCode: inviteCode,
            researchInvitedAt: new Date(),
            researchInvitedBy: adminUser.id,
            researchInviteUsedAt: null,
            researchCompletedAt: null,
            deletedAt: null,
            deletedBy: null,
          },
          include: { user: true },
        })
      : await tx.applicant.create({
          data: {
            userId: user.id,
            age: 0,
            gender: "PREFER_NOT_TO_SAY",
            location: "Research",
            occupation: "Research participant",
            education: "Research participant",
            incomeRange: "Research",
            applicationStatus: "RESEARCH_INVITED",
            researchInviteCode: inviteCode,
            researchInvitedAt: new Date(),
            researchInvitedBy: adminUser.id,
            photos: [],
          },
          include: { user: true },
        });

    await tx.adminAction.create({
      data: {
        userId: adminUser.id,
        type: "INVITE_RESEARCH",
        targetId: applicant.id,
        targetType: "applicant",
        description: `Created research invite for ${applicant.user.firstName}`,
        metadata: { inviteCode },
      },
    });

    return { applicant };
  });

  const inviteUrl = `${APP_URL}/research?code=${inviteCode}`;

  // Send research invite email (non-blocking - don't fail the invite if email fails)
  let emailSent = false;
  try {
    await sendResearchInviteEmail({
      to: normalizedEmail,
      firstName: body.firstName,
      inviteCode,
      applicantId: result.applicant.id,
    });
    emailSent = true;
  } catch (emailError) {
    logger.error("Failed to send research invite email", {
      error:
        emailError instanceof Error ? emailError.message : String(emailError),
      applicantId: result.applicant.id,
      email: normalizedEmail,
    });
  }

  return successResponse({
    applicant: {
      id: result.applicant.id,
      firstName: result.applicant.user.firstName,
      lastName: result.applicant.user.lastName,
      email: result.applicant.user.email,
      applicationStatus: result.applicant.applicationStatus,
    },
    inviteUrl,
    emailSent,
  });
}
