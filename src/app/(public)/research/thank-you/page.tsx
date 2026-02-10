import { CopperIcon } from "@/components/ui/copper-icon";

export default function ResearchThankYouPage() {
  return (
    <section className="mx-auto w-full max-w-3xl px-6 py-16 text-center">
      <CopperIcon d="m4.5 12.75 6 6 9-13.5" />
      <h1 className="mt-6 text-3xl font-semibold text-navy">Thank You!</h1>
      <p className="mt-3 text-navy-soft">
        Your responses have been recorded. We appreciate your help in improving
        our compatibility questionnaire.
      </p>
    </section>
  );
}
