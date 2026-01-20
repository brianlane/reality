import { ApplicationStatus } from "@prisma/client";
import AdminWaitlistTable from "@/components/admin/AdminWaitlistTable";
import { getAuthUser, requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function AdminWaitlistPage() {
  let initialApplicants: Array<{
    id: string;
    user: {
      firstName: string;
      lastName: string;
      email: string;
    };
    age: number;
    gender: string;
    location: string;
    stage1Responses: unknown | null;
    waitlistedAt: string | null;
    invitedOffWaitlistAt: string | null;
  }> = [];
  let initialError: string | null = null;

  const auth = await getAuthUser();
  if (!auth || !auth.email) {
    initialError = "Please sign in again.";
  } else {
    try {
      requireAdmin(auth.email);
      const waitlistApplicants = await db.applicant.findMany({
        where: {
          applicationStatus: {
            in: [
              ApplicationStatus.WAITLIST,
              ApplicationStatus.WAITLIST_INVITED,
            ],
          },
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
          waitlistedAt: "asc",
        },
      });

      initialApplicants = waitlistApplicants.map((applicant) => ({
        id: applicant.id,
        user: applicant.user,
        age: applicant.age,
        gender: applicant.gender,
        location: applicant.location,
        stage1Responses: applicant.stage1Responses,
        waitlistedAt: applicant.waitlistedAt
          ? applicant.waitlistedAt.toISOString()
          : null,
        invitedOffWaitlistAt: applicant.invitedOffWaitlistAt
          ? applicant.invitedOffWaitlistAt.toISOString()
          : null,
      }));
    } catch (error) {
      initialError = (error as Error).message;
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-navy">
          Waitlist Management
        </h1>
        <p className="mt-1 text-sm text-navy-soft">
          Review and invite applicants from the waitlist
        </p>
      </div>
      <AdminWaitlistTable
        initialApplicants={initialApplicants}
        initialError={initialError}
      />
    </div>
  );
}
