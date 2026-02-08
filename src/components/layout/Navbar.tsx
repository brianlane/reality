import Link from "next/link";
import Logo from "./Logo";
import NavAuthActions from "./NavAuthActions";

const navLinks = [
  { href: "/", label: "Home" },
  { href: "/purpose", label: "Purpose" },
];

export default function Navbar() {
  return (
    <header className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/">
          <Logo />
        </Link>
        <nav className="flex items-center gap-4 text-sm text-navy-soft">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="hover:text-copper transition-colors"
            >
              {link.label}
            </Link>
          ))}
          <NavAuthActions />
        </nav>
      </div>
    </header>
  );
}
