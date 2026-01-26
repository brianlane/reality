import { getAuthUser, requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { getOrCreateAdminUser } from "@/lib/admin-helpers";
import { errorResponse, successResponse } from "@/lib/api-response";
import { sendApplicationApprovalEmail } from "@/lib/email/approval";

type RouteContext = {
  params: Promise<{ id: string }>;
};

type ApproveBody = {
  compatibilityScore?: number;
  notes?: string;
};

export async function POST(request: Request, { params }: RouteContext) {
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

  const body = (await request.json()) as ApproveBody;

  const adminUser = await getOrCreateAdminUser({
    userId: auth.userId,
    email: auth.email,
  });

  const existing = await db.applicant.findFirst({
    where: { id, deletedAt: null },
  });
  if (!existing) {
    return errorResponse("NOT_FOUND", "Applicant not found", 404);
  }

  const applicant = await db.applicant.update({
    where: { id },
    data: {
      applicationStatus: "APPROVED",
      softRejectedAt: null,
      softRejectedFromStatus: null,
      reviewedAt: new Date(),
      reviewedBy: adminUser.id,
      compatibilityScore: body.compatibilityScore,
      backgroundCheckNotes: body.notes,
    },
    select: {
      id: true,
      applicationStatus: true,
      reviewedAt: true,
      compatibilityScore: true,
      user: {
        select: {
          email: true,
          firstName: true,
        },
      },
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

  // Send approval email
  try {
    await sendApplicationApprovalEmail({
      to: applicant.user.email,
      firstName: applicant.user.firstName,
      applicantId: applicant.id,
    });
  } catch (emailError) {
    console.error('Failed to send approval email:', emailError);
    // Don't fail the request if email fails
  }

  return successResponse({
    applicant: {
      id: applicant.id,
      applicationStatus: applicant.applicationStatus,
      reviewedAt: applicant.reviewedAt,
      compatibilityScore: applicant.compatibilityScore,
    },
  });
}
