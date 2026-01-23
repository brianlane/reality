import { unstable_cache } from "next/cache";
import { getAuthUser, requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { errorResponse, successResponse } from "@/lib/api-response";

const getFunnelAnalytics = unstable_cache(
  async () => {
    const statusCounts = await db.applicant.groupBy({
      by: ["applicationStatus"],
      _count: true,
      where: { deletedAt: null },
    });

    const statusMap = statusCounts.reduce<Record<string, number>>(
      (acc, row) => {
        acc[row.applicationStatus] = row._count;
        return acc;
      },
      {},
    );

    const [invitationsSent, acceptedInvites, attendedInvites] =
      await Promise.all([
        db.eventInvitation.count({
          where: { event: { deletedAt: null } },
        }),
        db.eventInvitation.count({
          where: { status: "ACCEPTED", event: { deletedAt: null } },
        }),
        db.eventInvitation.count({
          where: { status: "ATTENDED", event: { deletedAt: null } },
        }),
      ]);

    return {
      applications: {
        draft: statusMap.DRAFT ?? 0,
        submitted: statusMap.SUBMITTED ?? 0,
        paymentPending: statusMap.PAYMENT_PENDING ?? 0,
        screening: statusMap.SCREENING_IN_PROGRESS ?? 0,
        approved: statusMap.APPROVED ?? 0,
        waitlist: (statusMap.WAITLIST ?? 0) + (statusMap.WAITLIST_INVITED ?? 0),
      },
      invitations: {
        sent: invitationsSent,
        accepted: acceptedInvites,
        attended: attendedInvites,
      },
    };
  },
  ["admin-analytics-funnel"],
  { revalidate: 60 },
);

export async function GET() {
  const auth = await getAuthUser();
  if (!auth) {
    return errorResponse("UNAUTHORIZED", "User not authenticated", 401);
  }
  try {
    requireAdmin(auth.email);
  } catch (error) {
    return errorResponse("FORBIDDEN", (error as Error).message, 403);
  }

  const data = await getFunnelAnalytics();
  return successResponse(data);
}
