import { Suspense } from "react";
import ResearchInviteGate from "@/components/research/ResearchInviteGate";
import ResearchSelfRegistration from "@/components/research/ResearchSelfRegistration";

type PageProps = {
  searchParams: Promise<{ code?: string }>;
};

export default async function ResearchEntryPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const code = params.code || "";

  // If no code provided, show self-registration form
  if (!code) {
    return (
      <div className="min-h-screen bg-gray-50 py-12">
        <div className="container mx-auto px-4">
          <ResearchSelfRegistration />
        </div>
      </div>
    );
  }

  // If code provided, validate invite code
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
