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
    <AdminLoginForm
      forceSignOut={forceSignOut}
      adminEmailMissing={!adminEmail}
    />
  );
}
