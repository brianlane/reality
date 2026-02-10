import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import BackgroundCheckConsentForm from "./BackgroundCheckConsentForm";

type PageProps = {
  searchParams: Promise<{ id?: string }>;
};

export default async function BackgroundCheckConsentPage({
  searchParams,
}: PageProps) {
  const params = await searchParams;
  const applicationId = params.id;

  if (!applicationId) {
    redirect("/apply");
  }

  // Require authentication — this page displays PII (name) and is reached
  // after password creation, so the user should be logged in.
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

  // If consent already given, proceed to identity verification
  // (the verify-identity page will redirect to waitlist if already passed)
  if (applicant.backgroundCheckConsentAt) {
    redirect(`/apply/verify-identity?id=${applicationId}`);
  }

  return (
    <div className="min-h-screen bg-slate-50 py-12">
      <div className="mx-auto max-w-2xl px-4">
        <BackgroundCheckConsentForm
          applicationId={applicant.id}
          firstName={applicant.user.firstName}
          lastName={applicant.user.lastName}
        />
      </div>
    </div>
  );
}
