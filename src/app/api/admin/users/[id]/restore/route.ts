import { getAuthUser, requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { errorResponse, successResponse } from "@/lib/api-response";
import { getOrCreateAdminUser } from "@/lib/admin-helpers";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function POST(_: Request, { params }: RouteContext) {
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
      deletedAt: null,
      deletedBy: null,
    },
  });

  await db.adminAction.create({
    data: {
      userId: adminUser.id,
      type: "MANUAL_ADJUSTMENT",
      targetId: user.id,
      targetType: "user",
      description: "Restored user",
    },
  });

  return successResponse({
    user: {
      id: user.id,
      deletedAt: user.deletedAt,
    },
  });
}
