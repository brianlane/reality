import Link from "next/link";

export default function HomePage() {
  return (
    <section className="mx-auto flex w-full max-w-5xl flex-col gap-6 px-6 py-16">
      <div className="rounded-2xl bg-white p-10 shadow-sm">
        <h1 className="text-3xl font-semibold text-slate-900">
          Premium matchmaking experiences designed for real connections.
        </h1>
        <p className="mt-4 max-w-2xl text-slate-600">
          Apply once, complete your profile, and get curated introductions at
          exclusive events.
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Link
            href="/apply"
            className="rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white"
          >
            Start application
          </Link>
        </div>
      </div>
    </section>
  );
}
