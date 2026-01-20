import { unstable_cache } from "next/cache";
import { getAuthUser, requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { errorResponse, successResponse } from "@/lib/api-response";

const getEngagementAnalytics = unstable_cache(
  async () => {
    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [recentApplicants, activeApplicants, invitations] = await Promise.all(
      [
        db.applicant.count({
          where: { createdAt: { gte: thirtyDaysAgo }, deletedAt: null },
        }),
        db.applicant.count({
          where: { updatedAt: { gte: thirtyDaysAgo }, deletedAt: null },
        }),
        db.eventInvitation.findMany({
          where: { respondedAt: { not: null }, event: { deletedAt: null } },
          select: { invitedAt: true, respondedAt: true, applicantId: true },
        }),
      ],
    );

    const responseTimes = invitations
      .filter((invite) => invite.respondedAt)
      .map(
        (invite) => invite.respondedAt!.getTime() - invite.invitedAt.getTime(),
      )
      .filter((ms) => ms >= 0);

    const avgResponseMs =
      responseTimes.length > 0
        ? responseTimes.reduce((sum, ms) => sum + ms, 0) / responseTimes.length
        : 0;

    const repeatParticipantsMap = invitations.reduce<Record<string, number>>(
      (acc, invite) => {
        acc[invite.applicantId] = (acc[invite.applicantId] ?? 0) + 1;
        return acc;
      },
      {},
    );

    const repeatParticipants = Object.values(repeatParticipantsMap).filter(
      (count) => count > 1,
    ).length;

    return {
      applicants: {
        newLast30Days: recentApplicants,
        activeLast30Days: activeApplicants,
      },
      invitations: {
        avgResponseHours: avgResponseMs / (1000 * 60 * 60),
        repeatParticipants,
      },
    };
  },
  ["admin-analytics-engagement"],
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

  const data = await getEngagementAnalytics();
  return successResponse(data);
}
