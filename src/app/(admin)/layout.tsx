import Sidebar from "@/components/layout/Sidebar";

const adminLinks = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/applications", label: "Applications" },
  { href: "/admin/waitlist", label: "Waitlist" },
  { href: "/admin/research", label: "Research" },
  { href: "/admin/events", label: "Events" },
  { href: "/admin/matches", label: "Matches" },
  { href: "/admin/payments", label: "Payments" },
  { href: "/admin/questionnaire", label: "Questionnaire" },
  { href: "/admin/preview-application", label: "Preview Flow" },
  { href: "/admin/analytics", label: "Analytics" },
  { href: "/admin/test-emails", label: "Test Emails" },
  { href: "/admin/preview-emails", label: "Email Previews" },
  { href: "/admin/test-views", label: "Test Views" },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50 md:flex-row">
      <Sidebar
        title="Admin"
        links={adminLinks}
        signOutRedirect="/admin/login"
      />
      <main className="flex-1 px-6 py-8">{children}</main>
    </div>
  );
}
