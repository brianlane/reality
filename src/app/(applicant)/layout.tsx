import Sidebar from "@/components/layout/Sidebar";

const applicantLinks = [
  { href: "/dashboard", label: "Dashboard" },
  { href: "/application", label: "Application" },
  { href: "/events", label: "Events" },
  { href: "/matches", label: "Matches" },
  { href: "/settings", label: "Settings" },
];

export default function ApplicantLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50 md:flex-row">
      <Sidebar
        title="Applicant"
        links={applicantLinks}
        signOutRedirect="/sign-in"
      />
      <main className="flex-1 px-6 py-8">{children}</main>
    </div>
  );
}
