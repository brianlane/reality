import crypto from "crypto";

export function verifyCheckrSignature(signature: string, payload: string) {
  const secret = process.env.CHECKR_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error("CHECKR_WEBHOOK_SECRET is not configured");
  }

  try {
    const computedSignature = crypto
      .createHmac("sha256", secret)
      .update(payload)
      .digest("hex");

    // Use timing-safe comparison to prevent timing attacks
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(computedSignature),
    );
  } catch {
    // If signature format is invalid, return false
    return false;
  }
}

export function mapCheckrResult(result: string) {
  return result === "clear" ? "PASSED" : "FAILED";
}
