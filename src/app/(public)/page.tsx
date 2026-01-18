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

      <p className="mt-8 max-w-2xl text-lg leading-relaxed text-navy-soft sm:text-xl">
        Apply once, complete your profile, and get curated introductions at
        exclusive events.
      </p>

      <div className="mt-12">
        <Link
          href="/apply"
          className="rounded-md bg-navy px-6 py-3 text-base font-medium text-white hover:bg-copper transition-colors cursor-pointer"
        >
          Start application
        </Link>
      </div>
    </section>
  );
}
