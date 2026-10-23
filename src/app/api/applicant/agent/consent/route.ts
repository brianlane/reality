import { getAuthUser, isAdminEmail } from "@/lib/auth";
import { db } from "@/lib/db";
import { errorResponse, successResponse } from "@/lib/api-response";
import { getApplicantByEmail } from "@/lib/applicant-helpers";

// Tier 1 dimension keys the agent is allowed to share. The consent record
// stores per-dimension opt-outs; unknown keys are rejected.
const SHARABLE_DIMENSIONS = [
  "attachment",
  "conflict",
  "values",
  "lifeArchitecture",
  "readiness",
  "family",
] as const;

type DimensionKey = (typeof SHARABLE_DIMENSIONS)[number];

const DEFAULT_CONSENT = {
  dimensionToggles: {} as Record<DimensionKey, boolean>,
  pouchReviewMode: false,
  agentPaused: false,
};

async function requireApplicant() {
  const auth = await getAuthUser();
  if (!auth) {
    return { error: errorResponse("UNAUTHORIZED", "User not authenticated", 401) };
  }
  if (isAdminEmail(auth.email)) {
    return { error: errorResponse("FORBIDDEN", "Applicant access required", 403) };
  }
  if (!auth.email) {
    return { error: errorResponse("UNAUTHORIZED", "Email not available", 401) };
  }
  const applicant = await getApplicantByEmail(auth.email);
  if (!applicant) {
    return { error: errorResponse("UNAUTHORIZED", "Applicant not found", 401) };
  }
  return { applicant };
}

function serialize(consent: {
  dimensionToggles: unknown;
  pouchReviewMode: boolean;
  agentPaused: boolean;
  updatedAt: Date;
}) {
  return {
    dimensionToggles:
      (consent.dimensionToggles as Record<string, boolean>) ?? {},
    pouchReviewMode: consent.pouchReviewMode,
    agentPaused: consent.agentPaused,
    updatedAt: consent.updatedAt.toISOString(),
    sharableDimensions: [...SHARABLE_DIMENSIONS],
  };
}

export async function GET() {
  const { applicant, error } = await requireApplicant();
  if (error) return error;

  // First visit creates the default consent record (opt-in with safe defaults).
  const consent = await db.agentConsent.upsert({
    where: { applicantId: applicant.id },
    update: {},
    create: { applicantId: applicant.id, ...DEFAULT_CONSENT },
  });

  return successResponse(serialize(consent));
}

export async function PUT(request: Request) {
  const { applicant, error } = await requireApplicant();
  if (error) return error;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return errorResponse("INVALID_JSON", "Request body must be JSON", 400);
  }

  const { dimensionToggles, pouchReviewMode, agentPaused } = (body ?? {}) as {
    dimensionToggles?: Record<string, boolean>;
    pouchReviewMode?: boolean;
    agentPaused?: boolean;
  };

  const data: {
    dimensionToggles?: Record<string, boolean>;
    pouchReviewMode?: boolean;
    agentPaused?: boolean;
  } = {};

  if (dimensionToggles !== undefined) {
    if (typeof dimensionToggles !== "object" || dimensionToggles === null) {
      return errorResponse(
        "INVALID_BODY",
        "dimensionToggles must be an object",
        400,
      );
    }
    const cleaned: Record<string, boolean> = {};
    for (const [key, value] of Object.entries(dimensionToggles)) {
      if (!(SHARABLE_DIMENSIONS as readonly string[]).includes(key)) {
        return errorResponse(
          "INVALID_BODY",
          `Unknown dimension: ${key}`,
          400,
          [{ field: "dimensionToggles", message: `Unknown dimension: ${key}` }],
        );
      }
      if (typeof value !== "boolean") {
        return errorResponse(
          "INVALID_BODY",
          `Toggle for ${key} must be a boolean`,
          400,
        );
      }
      cleaned[key] = value;
    }
    data.dimensionToggles = cleaned;
  }
  if (pouchReviewMode !== undefined) {
    if (typeof pouchReviewMode !== "boolean") {
      return errorResponse(
        "INVALID_BODY",
        "pouchReviewMode must be a boolean",
        400,
      );
    }
    data.pouchReviewMode = pouchReviewMode;
  }
  if (agentPaused !== undefined) {
    if (typeof agentPaused !== "boolean") {
      return errorResponse(
        "INVALID_BODY",
        "agentPaused must be a boolean",
        400,
      );
    }
    data.agentPaused = agentPaused;
  }

  const consent = await db.agentConsent.upsert({
    where: { applicantId: applicant.id },
    update: data,
    create: { applicantId: applicant.id, ...DEFAULT_CONSENT, ...data },
  });

  return successResponse(serialize(consent));
}
