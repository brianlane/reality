import Link from "next/link";
import Logo from "@/components/layout/Logo";

export default function HomePage() {
  return (
    <section className="mx-auto flex min-h-[calc(100vh-200px)] w-full max-w-4xl flex-col items-start justify-center px-6 py-20 sm:px-8 sm:py-32">
      <div className="mb-16">
        <Logo size="large" />
      </div>

      <h1 className="text-4xl font-semibold leading-tight text-navy sm:text-5xl lg:text-6xl">
        Premium matchmaking experiences designed for real connections.
      </h1>

      <div className="mt-12 flex flex-wrap items-center gap-3">
        <Link
          href="/apply"
          className="rounded-md bg-navy px-6 py-3 text-base font-medium text-white hover:bg-copper transition-colors cursor-pointer"
        >
          Start application
        </Link>
        <Link
          href="/sign-in"
          className="rounded-md border border-slate-300 px-6 py-3 text-base font-medium text-navy hover:border-copper hover:text-copper transition-colors"
        >
          Sign in
        </Link>
      </div>
    </section>
  );
}
