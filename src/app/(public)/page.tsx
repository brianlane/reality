import Link from "next/link";

export default function HomePage() {
  return (
    <section className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-4 py-12 sm:px-6 sm:py-16">
      <div className="rounded-2xl bg-white p-6 shadow-sm sm:p-10">
        <h1 className="text-3xl font-semibold text-navy sm:text-4xl">
          Premium matchmaking experiences designed for real connections.
        </h1>
        <p className="mt-4 max-w-2xl text-navy-soft">
          Apply once, complete your profile, and get curated introductions at
          exclusive events.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/apply"
            className="rounded-md bg-navy px-4 py-2 text-sm font-medium text-white hover:bg-copper transition-colors"
          >
            Start application
          </Link>
        </div>
      </div>
    </section>
  );
}
