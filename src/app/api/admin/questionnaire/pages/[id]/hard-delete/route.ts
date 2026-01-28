import { getAuthUser, requireAdmin } from "@/lib/auth";
import { errorResponse, successResponse } from "@/lib/api-response";
import { getOrCreateAdminUser } from "@/lib/admin-helpers";
import { hardDeleteQuestionnairePage } from "@/lib/admin-hard-delete";

type RouteContext = {
  params: Promise<{ id: string }>;
};

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

  const adminUser = await getOrCreateAdminUser({
    userId: auth.userId,
    email: auth.email,
  });

  const result = await hardDeleteQuestionnairePage(id, adminUser.id);
  if (!result) {
    return errorResponse("NOT_FOUND", "Page not found", 404);
  }

  return successResponse({ page: result });
}
