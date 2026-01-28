import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
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

  if (
    applicant.applicationStatus === "RESEARCH_INVITED" ||
    applicant.applicationStatus === "RESEARCH_IN_PROGRESS"
  ) {
    redirect("/research/questionnaire");
  }

  if (applicant.applicationStatus === "RESEARCH_COMPLETED") {
    redirect("/research/thank-you");
  }

  // Ensure the application is in the right status (DRAFT)
  if (applicant.applicationStatus !== "DRAFT") {
    redirect(`/apply/waitlist?id=${applicationId}`);
  }

  // SECURITY: Verify authorization - user must either be unauthenticated (first time)
  // or their email must match the applicant's email (returning user)
  const supabase = await createSupabaseServerClient();
  if (supabase) {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (
      user &&
      user.email?.toLowerCase() !== applicant.user.email.toLowerCase()
    ) {
      // Someone is trying to access another user's application
      redirect("/apply");
    }
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
