import { Suspense } from "react";
import WaitlistConfirmation from "@/components/waitlist/WaitlistConfirmation";

type PageProps = {
  searchParams: Promise<{ id?: string }>;
};

export default async function WaitlistPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const applicationId = params.id || "";

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
          <WaitlistConfirmation applicationId={applicationId} />
        </Suspense>
      </div>
    </div>
  );
}
