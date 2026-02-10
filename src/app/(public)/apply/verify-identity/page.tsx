import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import VerifyIdentityClient from "./VerifyIdentityClient";

type PageProps = {
  searchParams: Promise<{ id?: string }>;
};

export default async function VerifyIdentityPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const applicationId = params.id;

  if (!applicationId) {
    redirect("/apply");
  }

  // Require authentication — this page is reached after consent,
  // so the user should be logged in.
  const auth = await getAuthUser();
  if (!auth) {
    redirect("/apply");
  }

  const applicant = await db.applicant.findFirst({
    where: { id: applicationId, deletedAt: null },
    include: { user: true },
  });

  if (!applicant) {
    redirect("/apply");
  }

  // Verify ownership — the authenticated user must own this application
  if (applicant.user.email.toLowerCase() !== auth.email?.toLowerCase()) {
    redirect("/apply");
  }

  // Must have FCRA consent before identity verification
  if (!applicant.backgroundCheckConsentAt) {
    redirect(`/apply/background-check-consent?id=${applicationId}`);
  }

  // If identity already passed, skip to waitlist
  if (applicant.idenfyStatus === "PASSED") {
    redirect(`/apply/waitlist?id=${applicationId}`);
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12">
      <div className="mx-auto max-w-2xl px-4">
        <VerifyIdentityClient
          applicationId={applicant.id}
          initialStatus={
            (applicant.idenfyStatus as "PENDING" | "IN_PROGRESS" | "FAILED") ??
            "PENDING"
          }
        />
      </div>
    </div>
  );
}
