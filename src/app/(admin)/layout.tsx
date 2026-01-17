import Sidebar from "@/components/layout/Sidebar";

const adminLinks = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/applications", label: "Applications" },
  { href: "/admin/events", label: "Events" },
  { href: "/admin/matches", label: "Matches" },
  { href: "/admin/analytics", label: "Analytics" },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50 md:flex-row">
      <Sidebar title="Admin" links={adminLinks} />
      <main className="flex-1 px-6 py-8">{children}</main>
    </div>
  );
}
