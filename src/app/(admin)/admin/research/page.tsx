import { ApplicationStatus } from "@prisma/client";
import AdminResearchInviteTable from "@/components/admin/AdminResearchInviteTable";
import { getAuthUser, requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function AdminResearchPage() {
  let initialApplicants: Array<{
    id: string;
    user: {
      firstName: string;
      lastName: string;
      email: string;
    };
    applicationStatus: string;
    researchInviteCode: string | null;
    researchInvitedAt: string | null;
    researchInviteUsedAt: string | null;
    researchCompletedAt: string | null;
  }> = [];
  let initialError: string | null = null;

  const auth = await getAuthUser();
  if (!auth || !auth.email) {
    initialError = "Please sign in again.";
  } else {
    try {
      requireAdmin(auth.email);
      const researchApplicants = await db.applicant.findMany({
        where: {
          applicationStatus: {
            in: [
              ApplicationStatus.RESEARCH_INVITED,
              ApplicationStatus.RESEARCH_IN_PROGRESS,
              ApplicationStatus.RESEARCH_COMPLETED,
            ],
          },
          deletedAt: null,
        },
        include: {
          user: {
            select: {
              email: true,
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: {
          researchInvitedAt: "desc",
        },
      });

      initialApplicants = researchApplicants.map((applicant) => ({
        id: applicant.id,
        user: applicant.user,
        applicationStatus: applicant.applicationStatus,
        researchInviteCode: applicant.researchInviteCode ?? null,
        researchInvitedAt: applicant.researchInvitedAt
          ? applicant.researchInvitedAt.toISOString()
          : null,
        researchInviteUsedAt: applicant.researchInviteUsedAt
          ? applicant.researchInviteUsedAt.toISOString()
          : null,
        researchCompletedAt: applicant.researchCompletedAt
          ? applicant.researchCompletedAt.toISOString()
          : null,
      }));
    } catch (error) {
      initialError = (error as Error).message;
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-navy">Research Invites</h1>
        <p className="mt-1 text-sm text-navy-soft">
          Invite research participants and track questionnaire completion.
        </p>
      </div>
      <AdminResearchInviteTable
        initialApplicants={initialApplicants}
        initialError={initialError}
      />
    </div>
  );
}
