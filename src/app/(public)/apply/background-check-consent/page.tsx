import { db } from "@/lib/db";
import { redirect } from "next/navigation";
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

  const applicant = await db.applicant.findUnique({
    where: { id: applicationId },
    include: { user: true },
  });

  if (!applicant) {
    redirect("/apply");
  }

  // If consent already given, skip to next step
  if (applicant.backgroundCheckConsentAt) {
    redirect(`/apply/waitlist?id=${applicationId}`);
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
