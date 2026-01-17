import { getMockAuth, requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { errorResponse, successResponse } from "@/lib/api-response";

type Params = {
  params: { id: string };
};

type ApproveBody = {
  compatibilityScore?: number;
  notes?: string;
};

export async function POST(request: Request, { params }: Params) {
  const auth = await getMockAuth();
  try {
    requireAdmin(auth.role);
  } catch (error) {
    return errorResponse("FORBIDDEN", (error as Error).message, 403);
  }

  const body = (await request.json()) as ApproveBody;

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

  const applicant = await db.applicant.update({
    where: { id: params.id },
    data: {
      applicationStatus: "APPROVED",
      reviewedAt: new Date(),
      reviewedBy: adminUser.id,
      compatibilityScore: body.compatibilityScore,
      backgroundCheckNotes: body.notes,
    },
  });

  await db.adminAction.create({
    data: {
      userId: adminUser.id,
      type: "APPROVE_APPLICATION",
      targetId: applicant.id,
      targetType: "applicant",
      description: "Approved applicant",
      metadata: { compatibilityScore: body.compatibilityScore },
    },
  });

  return successResponse({
    applicant: {
      id: applicant.id,
      applicationStatus: applicant.applicationStatus,
      reviewedAt: applicant.reviewedAt,
      compatibilityScore: applicant.compatibilityScore,
    },
  });
}
