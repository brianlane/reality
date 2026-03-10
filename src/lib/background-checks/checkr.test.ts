import { describe, it, expect, afterEach } from "vitest";
import crypto from "crypto";
import { mapCheckrResult, verifyCheckrSignature } from "./checkr";

describe("mapCheckrResult", () => {
  it("maps 'clear' to PASSED", () => {
    expect(mapCheckrResult("clear")).toBe("PASSED");
  });

  it("maps 'consider' to FAILED", () => {
    expect(mapCheckrResult("consider")).toBe("FAILED");
  });

  it("maps 'adverse_action' to FAILED", () => {
    expect(mapCheckrResult("adverse_action")).toBe("FAILED");
  });

  it("maps null to FAILED (anomalous completed report)", () => {
    expect(mapCheckrResult(null)).toBe("FAILED");
  });

  it("maps unknown result to FAILED", () => {
    expect(mapCheckrResult("unknown_value")).toBe("FAILED");
  });
});

describe("verifyCheckrSignature", () => {
  const payload = '{"type":"report.completed","data":{"object":{"id":"r1"}}}';
  const secret = "test-checkr-webhook-secret";

  afterEach(() => {
    delete process.env.CHECKR_WEBHOOK_SECRET;
  });

  it("returns true for a valid HMAC-SHA256 signature", () => {
    process.env.CHECKR_WEBHOOK_SECRET = secret;
    const sig = crypto
      .createHmac("sha256", secret)
      .update(payload)
      .digest("hex");
    expect(verifyCheckrSignature(sig, payload)).toBe(true);
  });

  it("returns false for an invalid signature", () => {
    process.env.CHECKR_WEBHOOK_SECRET = secret;
    expect(verifyCheckrSignature("b".repeat(64), payload)).toBe(false);
  });

  it("returns false for malformed hex signature", () => {
    process.env.CHECKR_WEBHOOK_SECRET = secret;
    expect(verifyCheckrSignature("not-hex!", payload)).toBe(false);
  });

  it("throws when CHECKR_WEBHOOK_SECRET is not configured", () => {
    // env var is unset in afterEach
    expect(() => verifyCheckrSignature("abc", payload)).toThrow(
      "CHECKR_WEBHOOK_SECRET is not configured",
    );
  });
});
