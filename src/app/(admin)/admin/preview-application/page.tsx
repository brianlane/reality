import { getAuthUser, requireAdmin } from "@/lib/auth";
import { redirect } from "next/navigation";
import PreviewTabContainer from "@/components/admin/preview/PreviewTabContainer";

export default async function AdminPreviewApplicationPage() {
  const authUser = await getAuthUser();

  if (!authUser) {
    redirect("/admin/login");
  }

  try {
    requireAdmin(authUser.email);
  } catch {
    return (
      <div className="text-center py-12">
        <h2 className="text-xl font-semibold text-red-600">Access Denied</h2>
        <p className="mt-2 text-gray-600">Admin access required.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-navy">
          Application Flow Preview
        </h1>
        <p className="mt-2 text-navy-soft">
          View the complete applicant journey from Stage 1 to final submission.
          All forms are in preview mode - no data will be submitted or saved.
        </p>
      </div>

      <PreviewTabContainer />
    </div>
  );
}
