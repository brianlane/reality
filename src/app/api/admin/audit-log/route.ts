import { getAuthUser, requireAdminRole } from "@/lib/auth";
import { db } from "@/lib/db";
import { errorResponse, successResponse } from "@/lib/api-response";

export async function GET(request: Request) {
  const auth = await getAuthUser();
  if (!auth) {
    return errorResponse("UNAUTHORIZED", "User not authenticated", 401);
  }

  try {
    await requireAdminRole(auth.email);
  } catch (error) {
    return errorResponse("FORBIDDEN", (error as Error).message, 403);
  }

  const url = new URL(request.url);
  const applicantId = url.searchParams.get("applicantId");
  const action = url.searchParams.get("action");
  const limit = Math.min(Number(url.searchParams.get("limit")) || 100, 500);
  const offset = Number(url.searchParams.get("offset")) || 0;

  const where: Record<string, unknown> = {};
  if (applicantId) where.applicantId = applicantId;
  if (action) where.action = action;

  const [logs, total] = await Promise.all([
    db.screeningAuditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
      include: {
        user: {
          select: { firstName: true, lastName: true, email: true },
        },
        applicant: {
          select: {
            id: true,
            user: { select: { firstName: true, lastName: true } },
          },
        },
      },
    }),
    db.screeningAuditLog.count({ where }),
  ]);

  return successResponse({
    logs: logs.map((log) => ({
      id: log.id,
      action: log.action,
      metadata: log.metadata,
      createdAt: log.createdAt,
      admin: log.user
        ? {
            name: `${log.user.firstName} ${log.user.lastName}`,
            email: log.user.email,
          }
        : { name: "System", email: null },
      applicant: {
        id: log.applicant.id,
        name: `${log.applicant.user.firstName} ${log.applicant.user.lastName}`,
      },
    })),
    total,
    limit,
    offset,
  });
}
