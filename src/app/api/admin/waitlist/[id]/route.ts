import { getAuthUser, requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { errorResponse, successResponse } from "@/lib/api-response";
import { adminWaitlistUpdateSchema } from "@/lib/validations";
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

  const applicant = await db.applicant.findFirst({
    where: {
      id,
      ...(includeDeleted ? {} : { deletedAt: null }),
    },
    include: { user: true },
  });

  if (!applicant) {
    return errorResponse("NOT_FOUND", "Applicant not found", 404);
  }

  return successResponse({
    applicant: {
      id: applicant.id,
      user: {
        id: applicant.user.id,
        firstName: applicant.user.firstName,
        lastName: applicant.user.lastName,
        email: applicant.user.email,
      },
      applicationStatus: applicant.applicationStatus,
      waitlistReason: applicant.waitlistReason,
      waitlistPosition: applicant.waitlistPosition,
      waitlistedAt: applicant.waitlistedAt,
      invitedOffWaitlistAt: applicant.invitedOffWaitlistAt,
      deletedAt: applicant.deletedAt,
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

  let body: ReturnType<typeof adminWaitlistUpdateSchema.parse>;
  try {
    body = adminWaitlistUpdateSchema.parse(await request.json());
  } catch (error) {
    return errorResponse("VALIDATION_ERROR", "Invalid request body", 400, [
      { message: (error as Error).message },
    ]);
  }

  const existing = await db.applicant.findUnique({ where: { id } });
  if (!existing) {
    return errorResponse("NOT_FOUND", "Applicant not found", 404);
  }

  const adminUser = await getOrCreateAdminUser({
    userId: auth.userId,
    email: auth.email,
  });

  const applicant = await db.applicant.update({
    where: { id },
    data: {
      waitlistReason: body.waitlistReason,
      waitlistPosition: body.waitlistPosition,
      reviewedAt: new Date(),
      reviewedBy: adminUser.id,
    },
  });

  await db.adminAction.create({
    data: {
      userId: adminUser.id,
      type: "MANUAL_ADJUSTMENT",
      targetId: applicant.id,
      targetType: "applicant",
      description: "Updated waitlist details",
      metadata: body ?? {},
    },
  });

  return successResponse({
    applicant: {
      id: applicant.id,
      waitlistReason: applicant.waitlistReason,
      waitlistPosition: applicant.waitlistPosition,
      updatedAt: applicant.updatedAt,
    },
  });
}
