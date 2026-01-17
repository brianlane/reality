import { getMockAuth, requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { errorResponse, successResponse } from "@/lib/api-response";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type RejectBody = {
  reason?: string;
};

export async function POST(request: Request, { params }: RouteContext) {
  const { id } = await params;
  const auth = await getMockAuth();
  try {
    requireAdmin(auth.role);
  } catch (error) {
    return errorResponse("FORBIDDEN", (error as Error).message, 403);
  }

  const body = (await request.json()) as RejectBody;

  const adminUser =
    (await db.user.findUnique({ where: { clerkId: auth.userId } })) ??
    (await db.user.create({
      data: {
        clerkId: auth.userId,
        email: `${auth.userId}@mock.local`,
        firstName: "Admin",
        lastName: "User",
        role: "ADMIN",
      },
    }));

  const existing = await db.applicant.findUnique({ where: { id } });
  if (!existing) {
    return errorResponse("NOT_FOUND", "Applicant not found", 404);
  }

  const applicant = await db.applicant.update({
    where: { id },
    data: {
      applicationStatus: "REJECTED",
      reviewedAt: new Date(),
      reviewedBy: adminUser.id,
      rejectionReason: body.reason ?? "Rejected",
    },
  });

  await db.adminAction.create({
    data: {
      userId: adminUser.id,
      type: "REJECT_APPLICATION",
      targetId: applicant.id,
      targetType: "applicant",
      description: "Rejected applicant",
      metadata: { reason: body.reason },
    },
  });

  return successResponse({
    applicant: {
      id: applicant.id,
      applicationStatus: applicant.applicationStatus,
      rejectionReason: applicant.rejectionReason,
      reviewedAt: applicant.reviewedAt,
    },
  });
}
