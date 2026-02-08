export default function ResearchThankYouPage() {
  return (
    <section className="mx-auto w-full max-w-3xl px-6 py-16 text-center">
      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-copper">
        <svg
          className="h-10 w-10 text-white"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="m4.5 12.75 6 6 9-13.5"
          />
        </svg>
      </div>
      <h1 className="mt-6 text-3xl font-semibold text-navy">Thank You!</h1>
      <p className="mt-3 text-navy-soft">
        Your responses have been recorded. We appreciate your help in improving
        our compatibility questionnaire.
      </p>
    </section>
  );
}
