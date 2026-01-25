import ForgotPasswordForm from "./ForgotPasswordForm";

export default function ForgotPasswordPage() {
  return (
    <section className="mx-auto w-full max-w-md px-6 py-16">
      <h1 className="text-3xl font-semibold text-navy">Forgot Password</h1>
      <p className="mt-2 text-navy-soft">
        Enter your email address and we'll send you a link to reset your
        password.
      </p>

      <ForgotPasswordForm />
    </section>
  );
}
