import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import CreatePasswordForm from "./CreatePasswordForm";

type PageProps = {
  searchParams: Promise<{ id?: string }>;
};

export default async function CreatePasswordPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const applicationId = params.id;

  if (!applicationId) {
    redirect("/apply");
  }

  // Fetch applicant to get their email
  const applicant = await db.applicant.findUnique({
    where: { id: applicationId },
    include: { user: true },
  });

  if (!applicant) {
    redirect("/apply");
  }

  // Ensure the application is in the right status (DRAFT)
  if (applicant.applicationStatus !== "DRAFT") {
    redirect(`/apply/waitlist?id=${applicationId}`);
  }

  return (
    <section className="mx-auto w-full max-w-md px-6 py-16">
      <h1 className="text-3xl font-semibold text-navy">Create Your Password</h1>
      <p className="mt-2 text-navy-soft">
        Almost done! Create a password to secure your account and submit your
        application.
      </p>

      <CreatePasswordForm
        email={applicant.user.email}
        applicationId={applicationId}
      />
    </section>
  );
}
