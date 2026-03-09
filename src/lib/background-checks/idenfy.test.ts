import { describe, it, expect, afterEach } from "vitest";
import crypto from "crypto";
import { mapIdenfyStatus, verifyIdenfySignature } from "./idenfy";

describe("mapIdenfyStatus", () => {
  it("maps APPROVED to PASSED", () => {
    expect(mapIdenfyStatus("APPROVED")).toBe("PASSED");
  });

  it("is case-insensitive", () => {
    expect(mapIdenfyStatus("approved")).toBe("PASSED");
    expect(mapIdenfyStatus("Approved")).toBe("PASSED");
  });

  it("maps DENIED to FAILED", () => {
    expect(mapIdenfyStatus("DENIED")).toBe("FAILED");
  });

  it("maps SUSPECTED to FAILED", () => {
    expect(mapIdenfyStatus("SUSPECTED")).toBe("FAILED");
  });

  it("maps REVIEWING to IN_PROGRESS", () => {
    // REVIEWING means iDenfy has a human reviewer evaluating the session.
    // The outcome is not yet determined, so we keep IN_PROGRESS and
    // alert the admin to follow up rather than auto-failing the applicant.
    expect(mapIdenfyStatus("REVIEWING")).toBe("IN_PROGRESS");
  });

  it("maps unknown status to FAILED", () => {
    expect(mapIdenfyStatus("UNKNOWN_STATUS")).toBe("FAILED");
    expect(mapIdenfyStatus("")).toBe("FAILED");
    expect(mapIdenfyStatus("PENDING")).toBe("FAILED");
  });
});

describe("verifyIdenfySignature", () => {
  const payload = '{"scanRef":"abc123","final":true}';
  const secret = "test-webhook-secret";

  afterEach(() => {
    delete process.env.IDENFY_WEBHOOK_SECRET;
    delete process.env.IDENFY_API_SECRET;
  });

  it("returns true for a valid signature using IDENFY_WEBHOOK_SECRET", () => {
    process.env.IDENFY_WEBHOOK_SECRET = secret;
    const sig = crypto
      .createHmac("sha256", secret)
      .update(payload)
      .digest("hex");
    expect(verifyIdenfySignature(sig, payload)).toBe(true);
  });

  it("falls back to IDENFY_API_SECRET when webhook secret is not set", () => {
    process.env.IDENFY_API_SECRET = secret;
    const sig = crypto
      .createHmac("sha256", secret)
      .update(payload)
      .digest("hex");
    expect(verifyIdenfySignature(sig, payload)).toBe(true);
  });

  it("returns false for an invalid signature", () => {
    process.env.IDENFY_WEBHOOK_SECRET = secret;
    expect(verifyIdenfySignature("a".repeat(64), payload)).toBe(false);
  });

  it("returns false when signature format is invalid hex", () => {
    process.env.IDENFY_WEBHOOK_SECRET = secret;
    expect(verifyIdenfySignature("not-valid-hex!!", payload)).toBe(false);
  });

  it("returns false when no secret is configured", () => {
    // Both env vars unset
    expect(verifyIdenfySignature("a".repeat(64), payload)).toBe(false);
  });
});
