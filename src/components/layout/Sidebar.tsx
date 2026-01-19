import Link from "next/link";

type SidebarLink = {
  href: string;
  label: string;
};

type SidebarProps = {
  title: string;
  links: SidebarLink[];
};

export default function Sidebar({ title, links }: SidebarProps) {
  return (
    <aside className="w-full border-b border-slate-200 bg-white px-6 py-4 md:min-h-screen md:w-64 md:border-b-0 md:border-r">
      <div className="mb-4 text-sm font-semibold text-navy-soft">{title}</div>
      <nav className="flex flex-wrap gap-3 text-sm text-navy-soft md:flex-col">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="rounded-md px-2 py-1 hover:bg-copper hover:text-white transition-colors"
          >
            {link.label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
