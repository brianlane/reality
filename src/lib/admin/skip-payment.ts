export async function skipPaymentForApplicant(options: {
  applicationId: string;
  headers: HeadersInit;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const res = await fetch(
    `/api/admin/applications/${options.applicationId}/skip-payment`,
    {
      method: "POST",
      headers: options.headers,
    },
  );
  const json = await res.json().catch(() => null);
  if (!res.ok || json?.error) {
    return {
      ok: false,
      message: json?.error?.message || "Failed to skip payment.",
    };
  }
  return { ok: true };
}
