import ResetPasswordForm from "./ResetPasswordForm";

export default function ResetPasswordPage() {
  return (
    <section className="mx-auto w-full max-w-md px-6 py-16">
      <h1 className="text-3xl font-semibold text-navy">Reset Password</h1>
      <p className="mt-2 text-navy-soft">
        Enter your new password below to reset your account password.
      </p>

      <ResetPasswordForm />
    </section>
  );
}
