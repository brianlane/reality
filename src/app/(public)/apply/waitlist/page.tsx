import { Suspense } from "react";
import WaitlistConfirmation from "@/components/waitlist/WaitlistConfirmation";
import { db } from "@/lib/db";

type PageProps = {
  searchParams: Promise<{ id?: string }>;
};

export default async function WaitlistPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const applicationId = params.id || "";

  // Fetch applicant data to get firstName from user relation
  let firstName: string | undefined;
  if (applicationId) {
    try {
      const applicant = await db.applicant.findUnique({
        where: { id: applicationId },
        select: {
          user: {
            select: { firstName: true },
          },
        },
      });
      firstName = applicant?.user.firstName;
    } catch (error) {
      console.error("Error fetching applicant:", error);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-12">
      <div className="container mx-auto px-4">
        <Suspense
          fallback={
            <div className="mx-auto max-w-2xl py-12 text-center">
              <p className="text-gray-500">Loading...</p>
            </div>
          }
        >
          <WaitlistConfirmation firstName={firstName} />
        </Suspense>
      </div>
    </div>
  );
}
