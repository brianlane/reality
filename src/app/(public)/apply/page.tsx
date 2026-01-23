import { redirect } from "next/navigation";
import Stage1QualificationForm from "@/components/forms/Stage1QualificationForm";
import ExistingApplicationStatus from "@/components/apply/ExistingApplicationStatus";
import { getAuthUser } from "@/lib/auth";
import { db } from "@/lib/db";

export default async function ApplyPage() {
  // Check if user is authenticated and has an existing application
  const auth = await getAuthUser();
  let existingApplication = null;

  if (auth?.email) {
    const user = await db.user.findFirst({
      where: {
        email: { equals: auth.email, mode: "insensitive" },
        deletedAt: null,
      },
    });

    if (user) {
      const applicant = await db.applicant.findFirst({
        where: { userId: user.id, deletedAt: null },
      });
      if (applicant) {
        existingApplication = applicant;
      }
    }
  }

  // If user has an existing application, handle based on status
  if (existingApplication) {
    const softRejectedApplication =
      existingApplication as typeof existingApplication & {
        softRejectedAt?: Date | null;
        softRejectedFromStatus?: string | null;
      };
    const effectiveStatus = softRejectedApplication.softRejectedAt
      ? (softRejectedApplication.softRejectedFromStatus ??
        existingApplication.applicationStatus)
      : existingApplication.applicationStatus;
    // If on waitlist, redirect to waitlist confirmation page
    if (effectiveStatus === "WAITLIST") {
      redirect(`/apply/waitlist?id=${existingApplication.id}`);
    }

    // For any other status, show the status page
    return (
      <section className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 sm:py-16">
        <ExistingApplicationStatus application={existingApplication} />
      </section>
    );
  }

  return (
    <section className="mx-auto w-full max-w-3xl px-4 py-10 sm:px-6 sm:py-16">
      <h1 className="text-3xl font-semibold text-navy sm:text-4xl">
        Join the Waitlist
      </h1>
      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
        <Stage1QualificationForm />
      </div>
    </section>
  );
}
