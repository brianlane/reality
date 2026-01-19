import Link from "next/link";
import LogoCircles from "@/components/layout/LogoCircles";

export default function HomePage() {
  return (
    <section className="mx-auto flex min-h-screen w-full items-center justify-center px-6">
      <div className="flex flex-col items-center gap-12">
        {/* Logo circles at top */}
        <div className="flex flex-col items-center gap-8">
          <LogoCircles />

          {/* Text below logo */}
          <div className="flex flex-col items-center leading-none">
            <span className="text-6xl font-bold text-copper tracking-tight">
              REALITY
            </span>
            <span className="text-sm uppercase tracking-wider text-navy-soft font-medium mt-2">
              Matchmaking
            </span>
          </div>
        </div>

        {/* Buttons below */}
        <div className="flex flex-col items-center gap-3 w-full max-w-md">
          <div className="w-full flex flex-col items-center gap-2">
            <Link
              href="/apply"
              className="w-full rounded-md bg-navy px-8 py-4 text-center text-base font-medium text-white hover:bg-copper transition-colors"
            >
              Join Now
            </Link>
          </div>
          <Link
            href="/sign-in"
            className="w-full rounded-md border border-slate-300 px-8 py-4 text-center text-base font-medium text-navy hover:border-copper hover:text-copper transition-colors"
          >
            Sign in
          </Link>
        </div>
      </div>
    </section>
  );
}
