import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "How Your Agent Works | Reality Matchmaking",
  description:
    "Your AI agent prepares you for your matches — what it knows, what it shares, and what it never will. Curation, extended by AI.",
  openGraph: {
    title: "How Your Agent Works | Reality Matchmaking",
    description:
      "Your AI agent prepares you for your matches — what it knows, what it shares, and what it never will.",
    url: "https://www.realitymatchmaking.com/how-agents-work",
    siteName: "Reality Matchmaking",
    locale: "en_US",
    type: "website",
  },
};

const SHARED = [
  {
    title: "Structured summaries, not stories",
    body: "Your agent shares things like conflict style or values — as structured summaries. It never sends your answers, your messages, or your details.",
  },
  {
    title: "Only with your consent",
    body: "Choose exactly which dimensions your agent may share, review each summary before it goes out, or pause your agent entirely. One tap, anytime.",
  },
  {
    title: "Only with the other person's agent",
    body: "Summaries travel agent-to-agent, never to a stranger's screen. And only when both people have opted in.",
  },
];

const NEVER = [
  "Your questionnaire answers, word for word",
  "Your messages, photos, or identity details",
  "Anything about your past relationships beyond what you chose to share",
  "Anything at all while your agent is paused",
];

export default function HowAgentsWorkPage() {
  return (
    <article className="overflow-x-hidden bg-slate-50">
      {/* Hero */}
      <section className="bg-white border-b border-slate-200">
        <div className="mx-auto max-w-3xl px-6 py-20 text-center">
          <p className="text-sm font-medium uppercase tracking-widest text-copper">
            The Agent Layer
          </p>
          <h1 className="mt-4 text-4xl font-bold leading-tight text-navy sm:text-5xl">
            Our curators have always prepared your matches.
            <br />
            <span className="text-copper">Now your agent prepares you.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-navy-soft">
            Your personal AI agent learns how you connect — from your
            questionnaire, and over time from your dates — and quietly does
            the homework before each match: where you&apos;ll click, where
            you&apos;ll be tested, and what to talk about first.
          </p>
        </div>
      </section>

      {/* What it does */}
      <section className="border-b border-slate-200">
        <div className="mx-auto max-w-3xl px-6 py-16">
          <h2 className="text-2xl font-bold text-navy">What your agent does</h2>
          <div className="mt-6 space-y-4 text-navy-soft leading-relaxed">
            <p>
              <span className="font-medium text-navy">
                Before a match, it briefs you.
              </span>{" "}
              Not a score — a reading: the fault lines where this pairing will
              be tested, and the conversation threads worth opening early.
            </p>
            <p>
              <span className="font-medium text-navy">
                After a date, it debriefs with you.
              </span>{" "}
              A short check-in on how it went. Over time, that&apos;s how your
              agent learns your actual patterns — not your stated preferences.
            </p>
            <p>
              <span className="font-medium text-navy">
                It never decides for you.
              </span>{" "}
              Your agent prepares you for the other person. It doesn&apos;t
              pick, rank, or reject anyone on your behalf. Curators still
              curate.
            </p>
          </div>
        </div>
      </section>

      {/* What it shares */}
      <section className="bg-white border-b border-slate-200">
        <div className="mx-auto max-w-3xl px-6 py-16">
          <h2 className="text-2xl font-bold text-navy">
            What it shares — and how
          </h2>
          <p className="mt-4 text-navy-soft leading-relaxed">
            When two agents compare notes before a match, here are the rules:
          </p>
          <div className="mt-6 grid gap-6 sm:grid-cols-3">
            {SHARED.map((item) => (
              <div
                key={item.title}
                className="rounded-lg border border-slate-200 p-5"
              >
                <h3 className="font-semibold text-navy">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-navy-soft">
                  {item.body}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* What it never shares */}
      <section className="border-b border-slate-200">
        <div className="mx-auto max-w-3xl px-6 py-16">
          <h2 className="text-2xl font-bold text-navy">
            What it never shares
          </h2>
          <ul className="mt-6 space-y-3">
            {NEVER.map((item) => (
              <li key={item} className="flex items-start gap-3 text-navy-soft">
                <span className="mt-0.5 font-bold text-copper">✕</span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
          <p className="mt-6 text-sm leading-relaxed text-navy-soft">
            Every exchange is logged — what was shared, with whom, and when —
            and you can review the log anytime from your settings.
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="bg-white">
        <div className="mx-auto max-w-3xl px-6 py-16 text-center">
          <h2 className="text-2xl font-bold text-navy">
            Curation, extended by AI.
          </h2>
          <p className="mx-auto mt-4 max-w-xl text-navy-soft leading-relaxed">
            The agent layer is rolling out in phases. Apply today and
            you&apos;ll be first in line when your agent comes online.
          </p>
          <div className="mt-8">
            <Link
              href="/apply"
              className="inline-block rounded-md bg-copper px-8 py-3 font-semibold text-white hover:opacity-90"
            >
              Apply now
            </Link>
          </div>
        </div>
      </section>
    </article>
  );
}
