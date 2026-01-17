const faqs = [
  {
    q: "Who is eligible to apply?",
    a: "Applicants must be 22-36 and complete background screening.",
  },
  {
    q: "How long does screening take?",
    a: "Typically 5-7 business days after application submission.",
  },
];

export default function FAQPage() {
  return (
    <section className="mx-auto w-full max-w-4xl px-6 py-16">
      <h1 className="text-3xl font-semibold text-slate-900">FAQ</h1>
      <div className="mt-6 space-y-4">
        {faqs.map((faq) => (
          <div
            key={faq.q}
            className="rounded-xl border border-slate-200 bg-white p-6"
          >
            <h2 className="text-lg font-semibold text-slate-900">{faq.q}</h2>
            <p className="mt-2 text-slate-600">{faq.a}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
