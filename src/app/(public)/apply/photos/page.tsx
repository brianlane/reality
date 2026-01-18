import PhotoUploadForm from "@/components/forms/PhotoUploadForm";

export default function PhotosPage() {
  return (
    <section className="mx-auto w-full max-w-3xl px-6 py-16">
      <h1 className="text-3xl font-semibold text-navy">Photo Upload</h1>
      <p className="mt-2 text-navy-soft">
        Step 3 of 5: Upload at least 2 profile photos.
      </p>
      <div className="mt-6 rounded-xl border border-slate-200 bg-white p-6 space-y-4">
        <PhotoUploadForm />
        <div className="text-sm text-navy-soft">
          Upload at least two photos, then continue to review.
        </div>
        <a
          href="/apply/review"
          className="inline-flex rounded-md bg-navy px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-copper"
        >
          Continue to review
        </a>
      </div>
    </section>
  );
}
