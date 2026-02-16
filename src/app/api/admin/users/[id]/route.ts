import { getAuthUser, requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { errorResponse, successResponse } from "@/lib/api-response";
import { adminUserUpdateSchema } from "@/lib/validations";
import { getOrCreateAdminUser } from "@/lib/admin-helpers";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, { params }: RouteContext) {
  const { id } = await params;
  const auth = await getAuthUser();
  if (!auth) {
    return errorResponse("UNAUTHORIZED", "User not authenticated", 401);
  }
  try {
    requireAdmin(auth.email);
  } catch (error) {
    return errorResponse("FORBIDDEN", (error as Error).message, 403);
  }

  const includeDeleted =
    new URL(request.url).searchParams.get("includeDeleted") === "true";

  const user = await db.user.findFirst({
    where: { id, ...(includeDeleted ? {} : { deletedAt: null }) },
    include: {
      applicant: true,
    },
  });

  if (!user) {
    return errorResponse("NOT_FOUND", "User not found", 404);
  }

  return successResponse({
    user: {
      id: user.id,
      clerkId: user.clerkId,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      createdAt: user.createdAt,
      deletedAt: user.deletedAt,
      applicant: user.applicant,
    },
  });
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const { id } = await params;
  const auth = await getAuthUser();
  if (!auth) {
    return errorResponse("UNAUTHORIZED", "User not authenticated", 401);
  }
  if (!auth.email) {
    return errorResponse("UNAUTHORIZED", "Email not available", 401);
  }
  try {
    requireAdmin(auth.email);
  } catch (error) {
    return errorResponse("FORBIDDEN", (error as Error).message, 403);
  }

  let body: ReturnType<typeof adminUserUpdateSchema.parse>;
  try {
    body = adminUserUpdateSchema.parse(await request.json());
  } catch (error) {
    return errorResponse("VALIDATION_ERROR", "Invalid request body", 400, [
      { message: (error as Error).message },
    ]);
  }

  const existing = await db.user.findUnique({ where: { id } });
  if (!existing) {
    return errorResponse("NOT_FOUND", "User not found", 404);
  }

  // Always load applicant to include current status in response
  const applicant = await db.applicant.findUnique({ where: { userId: id } });

  if (body.applicationStatus !== undefined && !applicant) {
    return errorResponse(
      "VALIDATION_ERROR",
      "Only applicant users can have an application status",
      400,
    );
  }

  const adminUser = await getOrCreateAdminUser({
    userId: auth.userId,
    email: auth.email,
  });

  // Validate that email and clerkId are unique (excluding current user)
  // Check against ALL users including soft-deleted to prevent conflicts
  if (body.email !== undefined) {
    const normalizedEmail = body.email.toLowerCase();
    const emailExists = await db.user.findFirst({
      where: {
        email: normalizedEmail,
        id: { not: id },
      },
    });

    if (emailExists) {
      return errorResponse(
        "CONFLICT",
        `Email ${body.email} is already in use by another user`,
        409,
      );
    }
  }

  if (body.clerkId !== undefined) {
    const clerkIdExists = await db.user.findFirst({
      where: {
        clerkId: body.clerkId,
        id: { not: id },
      },
    });

    if (clerkIdExists) {
      return errorResponse(
        "CONFLICT",
        `ClerkId ${body.clerkId} is already in use by another user`,
        409,
      );
    }
  }

  const user = await db.user.update({
    where: { id },
    data: {
      clerkId: body.clerkId,
      email: body.email ? body.email.toLowerCase() : undefined,
      firstName: body.firstName,
      lastName: body.lastName,
      role: body.role,
    },
  });

  let updatedApplicant = null;
  if (body.applicationStatus !== undefined && applicant) {
    const applicationStatusChanged =
      body.applicationStatus !== applicant.applicationStatus;

    // Determine which fields to clear based on status change
    const clearFields: Record<string, null> = {};

    if (applicationStatusChanged) {
      // Always clear soft rejection fields when status changes
      clearFields.softRejectedAt = null;
      clearFields.softRejectedFromStatus = null;

      // Clear waitlist invitation fields when moving from WAITLIST_INVITED
      if (applicant.applicationStatus === "WAITLIST_INVITED") {
        clearFields.invitedOffWaitlistAt = null;
        clearFields.invitedOffWaitlistBy = null;
        clearFields.waitlistInviteToken = null;
      }

      // Clear research invitation fields when moving from any research status
      if (
        applicant.applicationStatus === "RESEARCH_INVITED" ||
        applicant.applicationStatus === "RESEARCH_IN_PROGRESS" ||
        applicant.applicationStatus === "RESEARCH_COMPLETED"
      ) {
        clearFields.researchInviteCode = null;
        clearFields.researchInvitedAt = null;
        clearFields.researchInvitedBy = null;
        clearFields.researchInviteUsedAt = null;
      }
    }

    updatedApplicant = await db.applicant.update({
      where: { userId: id },
      data: {
        applicationStatus: body.applicationStatus,
        reviewedAt: new Date(),
        reviewedBy: adminUser.id,
        ...clearFields,
      },
      select: {
        id: true,
        applicationStatus: true,
      },
    });
  }

  await db.adminAction.create({
    data: {
      userId: adminUser.id,
      type: "MANUAL_ADJUSTMENT",
      targetId: user.id,
      targetType: "user",
      description: "Updated user",
    },
  });

  return successResponse({
    user: {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      applicationStatus:
        updatedApplicant?.applicationStatus ?? applicant?.applicationStatus,
      updatedAt: user.updatedAt,
    },
  });
}

export async function DELETE(_: Request, { params }: RouteContext) {
  const { id } = await params;
  const auth = await getAuthUser();
  if (!auth) {
    return errorResponse("UNAUTHORIZED", "User not authenticated", 401);
  }
  if (!auth.email) {
    return errorResponse("UNAUTHORIZED", "Email not available", 401);
  }
  try {
    requireAdmin(auth.email);
  } catch (error) {
    return errorResponse("FORBIDDEN", (error as Error).message, 403);
  }

  const existing = await db.user.findUnique({ where: { id } });
  if (!existing) {
    return errorResponse("NOT_FOUND", "User not found", 404);
  }

  const adminUser = await getOrCreateAdminUser({
    userId: auth.userId,
    email: auth.email,
  });

  const user = await db.user.update({
    where: { id },
    data: {
      deletedAt: new Date(),
      deletedBy: adminUser.id,
    },
  });

  await db.adminAction.create({
    data: {
      userId: adminUser.id,
      type: "MANUAL_ADJUSTMENT",
      targetId: user.id,
      targetType: "user",
      description: "Soft deleted user",
    },
  });

  return successResponse({
    user: {
      id: user.id,
      deletedAt: user.deletedAt,
    },
  });
}
