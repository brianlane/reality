import crypto from "crypto";
import { logger } from "@/lib/logger";

// ============================================
// Configuration
// ============================================

function getConfig() {
  const apiKey = process.env.IDENFY_API_KEY;
  const apiSecret = process.env.IDENFY_API_SECRET;
  const baseUrl = process.env.IDENFY_BASE_URL || "https://ivs.idenfy.com";
  const callbackUrl = process.env.IDENFY_CALLBACK_URL;
  const webhookSecret = process.env.IDENFY_WEBHOOK_SECRET;

  return { apiKey, apiSecret, baseUrl, callbackUrl, webhookSecret };
}

function requireConfig() {
  const config = getConfig();
  if (!config.apiKey || !config.apiSecret) {
    throw new Error("IDENFY_API_KEY and IDENFY_API_SECRET must be configured");
  }
  return config as {
    apiKey: string;
    apiSecret: string;
    baseUrl: string;
    callbackUrl: string | undefined;
    webhookSecret: string | undefined;
  };
}

// ============================================
// Types
// ============================================

export type IdenfyVerificationSession = {
  authToken: string;
  scanRef: string;
  clientId: string;
  url: string;
};

export type IdenfyWebhookPayload = {
  final: boolean;
  status: {
    overall: string;
    autoDocument?: string;
    autoFace?: string;
    manualDocument?: string;
    manualFace?: string;
  };
  scanRef: string;
  clientId: string;
  platform?: string;
};

// ============================================
// API Client
// ============================================

/**
 * Create an iDenfy verification session for an applicant.
 * Returns the auth token and URL to redirect the user to.
 */
export async function createVerificationSession(applicant: {
  id: string;
  firstName: string;
  lastName: string;
}): Promise<IdenfyVerificationSession> {
  const config = requireConfig();
  const authHeader = Buffer.from(
    `${config.apiKey}:${config.apiSecret}`,
  ).toString("base64");

  const body = {
    clientId: applicant.id,
    firstName: applicant.firstName,
    lastName: applicant.lastName,
    ...(config.callbackUrl && { callbackUrl: config.callbackUrl }),
  };

  logger.info("Creating iDenfy verification session", {
    applicantId: applicant.id,
  });

  const response = await fetch(`${config.baseUrl}/api/v2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${authHeader}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const errorText = await response.text();
    logger.error("iDenfy session creation failed", {
      status: response.status,
      error: errorText,
      applicantId: applicant.id,
    });
    throw new Error(`iDenfy API error: ${response.status} ${errorText}`);
  }

  const data = await response.json();

  return {
    authToken: data.authToken,
    scanRef: data.scanRef,
    clientId: applicant.id,
    url: `https://ivs.idenfy.com/api/v2/redirect?authToken=${data.authToken}`,
  };
}

// ============================================
// Webhook Verification
// ============================================

/**
 * Verify an iDenfy webhook signature using HMAC-SHA256.
 * iDenfy signs webhooks with the API secret key.
 */
export function verifyIdenfySignature(
  signature: string,
  payload: string,
): boolean {
  const config = getConfig();
  const secret = config.webhookSecret || config.apiSecret;

  if (!secret) {
    logger.error("iDenfy webhook secret is not configured");
    return false;
  }

  try {
    const computedSignature = crypto
      .createHmac("sha256", secret)
      .update(payload)
      .digest("hex");

    return crypto.timingSafeEqual(
      Buffer.from(signature, "hex"),
      Buffer.from(computedSignature, "hex"),
    );
  } catch {
    // If signature format is invalid, return false
    return false;
  }
}

// ============================================
// Status Mapping
// ============================================

/**
 * Map iDenfy verification status to our ScreeningStatus enum.
 */
export function mapIdenfyStatus(
  status: string,
): "PASSED" | "FAILED" | "IN_PROGRESS" {
  switch (status.toUpperCase()) {
    case "APPROVED":
      return "PASSED";
    case "DENIED":
    case "SUSPECTED":
      return "FAILED";
    case "REVIEWING":
      return "IN_PROGRESS";
    default:
      return "FAILED";
  }
}
