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

type RunSkipPaymentFlowOptions = {
  applicationId?: string;
  confirmAction: (message: string) => boolean;
  getAuthHeaders: () => Promise<HeadersInit | null>;
  setIsLoading: (value: boolean) => void;
  setError: (value: string | null) => void;
  setSuccess: (value: string | null) => void;
  setApplicationStatusDraft: () => void;
};

export async function runSkipPaymentFlow(
  options: RunSkipPaymentFlowOptions,
): Promise<void> {
  if (!options.applicationId) {
    return;
  }
  if (
    !options.confirmAction(
      "Skip payment and unlock questionnaire for this applicant?",
    )
  ) {
    return;
  }

  options.setIsLoading(true);
  options.setError(null);
  options.setSuccess(null);

  try {
    const headers = await options.getAuthHeaders();
    if (!headers) {
      options.setError("Please sign in again.");
      return;
    }

    const result = await skipPaymentForApplicant({
      applicationId: options.applicationId,
      headers,
    });
    if (!result.ok) {
      options.setError(result.message);
      return;
    }

    options.setApplicationStatusDraft();
    options.setSuccess("Payment skipped. Applicant is now in Draft.");
  } catch {
    options.setError("Failed to skip payment.");
  } finally {
    options.setIsLoading(false);
  }
}
