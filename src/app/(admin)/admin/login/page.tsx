import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getAuthUser } from "@/lib/auth";
import AdminLoginForm from "./AdminLoginForm";

export default async function AdminLoginPage() {
  const user = await getAuthUser();

  const adminEmail = process.env.ADMIN_EMAIL;
  const isAdmin =
    user?.email && adminEmail
      ? user.email.toLowerCase() === adminEmail.toLowerCase()
      : false;

  if (isAdmin) {
    redirect("/admin");
  }

  const forceSignOut = Boolean(user && adminEmail && !isAdmin);

  return (
    <Suspense
      fallback={
        <section className="mx-auto w-full max-w-md px-6 py-16">
          <h1 className="text-3xl font-semibold text-navy">Admin sign in</h1>
          <p className="mt-2 text-sm text-navy-soft">Loading sign-in form...</p>
        </section>
      }
    >
      <AdminLoginForm
        forceSignOut={forceSignOut}
        adminEmailMissing={!adminEmail}
      />
    </Suspense>
  );
}
