import { Suspense } from "react";
import ResearchInviteGate from "@/components/research/ResearchInviteGate";

type PageProps = {
  searchParams: Promise<{ code?: string }>;
};

export default async function ResearchEntryPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const code = params.code || "";

  if (!code) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="container mx-auto px-4">
          <div className="mx-auto max-w-2xl space-y-6 py-12 text-center">
            <h1 className="text-2xl font-bold text-navy">Invalid Link</h1>
            <p className="text-navy-soft">
              This research invitation link is missing required information.
              Please check your email for the correct link or contact support.
            </p>
          </div>
        </div>
      </div>
    );
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
          <ResearchInviteGate code={code} />
        </Suspense>
      </div>
    </div>
  );
}
