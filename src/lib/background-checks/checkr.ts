import crypto from "crypto";
import { logger } from "@/lib/logger";

// ============================================
// Configuration
// ============================================

function getConfig() {
  const apiKey = process.env.CHECKR_API_KEY;
  const webhookSecret = process.env.CHECKR_WEBHOOK_SECRET;
  const packageSlug = process.env.CHECKR_PACKAGE_SLUG || "essential_criminal";
  const baseUrl = process.env.CHECKR_BASE_URL || "https://api.checkr.com";

  return { apiKey, webhookSecret, packageSlug, baseUrl };
}

function requireConfig() {
  const config = getConfig();
  if (!config.apiKey) {
    throw new Error("CHECKR_API_KEY must be configured");
  }
  return config as {
    apiKey: string;
    webhookSecret: string | undefined;
    packageSlug: string;
    baseUrl: string;
  };
}

// ============================================
// Types
// ============================================

export type CheckrCandidate = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  dob?: string;
  no_middle_name?: boolean;
  uri: string;
  created_at: string;
};

export type CheckrInvitation = {
  id: string;
  status: string;
  uri: string;
  invitation_url: string;
  candidate_id: string;
  package: string;
  created_at: string;
  completed_at?: string;
  expires_at?: string;
};

export type CheckrReport = {
  id: string;
  object: string;
  uri: string;
  status: string;
  result: string | null; // "clear", "consider", "adverse_action"
  created_at: string;
  completed_at: string | null;
  turnaround_time: number | null;
  package: string;
  candidate_id: string;
  adjudication: string | null;
  screenings: CheckrScreening[];
};

export type CheckrScreening = {
  id: string;
  object: string;
  type: string;
  status: string;
  result: string | null;
  turnaround_time: number | null;
};

export type CheckrContinuousMonitor = {
  id: string;
  object: string;
  status: string;
  candidate_id: string;
  created_at: string;
};

export type CheckrWebhookPayload = {
  id: string;
  object: string;
  type: string;
  created_at: string;
  data: {
    object: {
      id: string;
      status?: string;
      result?: string;
      candidate_id?: string;
      package?: string;
      adjudication?: string;
      [key: string]: unknown;
    };
  };
};

// ============================================
// Webhook Verification
// ============================================

export function verifyCheckrSignature(
  signature: string,
  payload: string,
): boolean {
  const config = getConfig();
  if (!config.webhookSecret) {
    throw new Error("CHECKR_WEBHOOK_SECRET is not configured");
  }

  try {
    const computedSignature = crypto
      .createHmac("sha256", config.webhookSecret)
      .update(payload)
      .digest("hex");

    // Use timing-safe comparison to prevent timing attacks
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
 * Map Checkr report result to our ScreeningStatus.
 * "clear" = passed, everything else (including null) = needs admin review.
 *
 * This function is called exclusively from the report.completed webhook, so the
 * report is already finished. A null/missing result on a completed report is
 * anomalous and must be flagged for review — returning "IN_PROGRESS" would leave
 * the applicant in a permanent limbo state since onCheckrComplete exits early for
 * that status.
 */
export function mapCheckrResult(result: string | null): "PASSED" | "FAILED" {
  return result === "clear" ? "PASSED" : "FAILED";
}

// ============================================
// API Client - Helper
// ============================================

async function checkrFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const config = requireConfig();
  const authHeader = Buffer.from(`${config.apiKey}:`).toString("base64");

  const url = `${config.baseUrl}${path}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Basic ${authHeader}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    logger.error("Checkr API request failed", {
      path,
      status: response.status,
      error: errorText,
    });
    throw new Error(`Checkr API error: ${response.status} ${errorText}`);
  }

  return response.json();
}

// ============================================
// API Client - Candidates
// ============================================

/**
 * Create a candidate in Checkr.
 * Note: SSN and DOB are collected by Checkr's hosted flow, NOT by us.
 */
export async function createCandidate(applicant: {
  firstName: string;
  lastName: string;
  email: string;
}): Promise<CheckrCandidate> {
  logger.info("Creating Checkr candidate", {
    applicantEmail: "[REDACTED]",
  });

  return checkrFetch<CheckrCandidate>("/v1/candidates", {
    method: "POST",
    body: JSON.stringify({
      first_name: applicant.firstName,
      last_name: applicant.lastName,
      email: applicant.email,
      no_middle_name: true,
    }),
  });
}

// ============================================
// API Client - Invitations
// ============================================

/**
 * Create an invitation for a candidate to complete their background check.
 * Checkr sends the candidate an email with a link to their hosted screening form
 * where sensitive data (SSN, DOB, address) is collected securely.
 */
export async function createInvitation(
  candidateId: string,
  packageSlug?: string,
): Promise<CheckrInvitation> {
  const config = requireConfig();
  const pkg = packageSlug || config.packageSlug;

  logger.info("Creating Checkr invitation", {
    candidateId,
    package: pkg,
  });

  return checkrFetch<CheckrInvitation>("/v1/invitations", {
    method: "POST",
    body: JSON.stringify({
      candidate_id: candidateId,
      package: pkg,
    }),
  });
}

// ============================================
// API Client - Reports
// ============================================

/**
 * Fetch a report from Checkr.
 * This is used for on-demand admin viewing only -- data is NEVER stored locally.
 */
export async function getReport(reportId: string): Promise<CheckrReport> {
  logger.info("Fetching Checkr report", { reportId });

  return checkrFetch<CheckrReport>(`/v1/reports/${reportId}`);
}

// ============================================
// API Client - Continuous Monitoring
// ============================================

/**
 * Enroll a candidate in continuous monitoring.
 * This provides ongoing criminal record checks while they remain a member.
 */
export async function enrollContinuousMonitoring(
  candidateId: string,
): Promise<CheckrContinuousMonitor> {
  logger.info("Enrolling candidate in continuous monitoring", {
    candidateId,
  });

  return checkrFetch<CheckrContinuousMonitor>("/v1/continuous_monitoring", {
    method: "POST",
    body: JSON.stringify({
      candidate_id: candidateId,
    }),
  });
}

/**
 * Cancel continuous monitoring for a candidate.
 * Called when a member leaves the service or deletes their account.
 */
export async function cancelContinuousMonitoring(
  monitoringId: string,
): Promise<void> {
  logger.info("Canceling continuous monitoring", { monitoringId });

  const config = requireConfig();
  const authHeader = Buffer.from(`${config.apiKey}:`).toString("base64");

  const response = await fetch(
    `${config.baseUrl}/v1/continuous_monitoring/${monitoringId}`,
    {
      method: "DELETE",
      headers: {
        Authorization: `Basic ${authHeader}`,
      },
    },
  );

  if (!response.ok && response.status !== 404) {
    const errorText = await response.text();
    throw new Error(
      `Failed to cancel continuous monitoring: ${response.status} ${errorText}`,
    );
  }
}
