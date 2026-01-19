import { Suspense } from "react";
import SignInForm from "./SignInForm";

export default function SignInPage() {
  return (
    <Suspense
      fallback={
        <section className="mx-auto w-full max-w-md px-6 py-16">
          <h1 className="text-3xl font-semibold text-navy">Sign in</h1>
          <p className="mt-2 text-sm text-navy-soft">Loading sign-in form...</p>
        </section>
      }
    >
      <SignInForm />
    </Suspense>
  );
}
