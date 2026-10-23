import { createHash } from "node:crypto";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

export type PouchDimension = {
  summary: string;
  signals: string[];
  confidence?: string;
};

export type Pouch = {
  fromApplicantId: string;
  profileVersion: number;
  dimensions: Record<string, PouchDimension>;
};

export class PouchError extends Error {
  code: "PAUSED" | "REVIEW_REQUIRED" | "NO_PROFILE" | "NO_DIMENSIONS";
  constructor(
    code: PouchError["code"],
    message: string,
  ) {
    super(message);
    this.code = code;
  }
}

function hashPayload(payload: unknown): string {
  return createHash("sha256")
    .update(JSON.stringify(payload))
    .digest("hex");
}

/**
 * Build the Tier 1 summary this applicant's agent is willing to share,
 * filtered by the principal's consent. Returns null when the agent is
 * paused (shares nothing). Never includes raw narrative — dimensions are
 * already structured summaries.
 */
export async function buildPouch(
  applicantId: string,
): Promise<Pouch | null> {
  const [profile, consent] = await Promise.all([
    db.agentProfile.findUnique({ where: { applicantId } }),
    db.agentConsent.findUnique({ where: { applicantId } }),
  ]);

  if (consent?.agentPaused) {
    return null;
  }
  if (!profile?.dimensions) {
    throw new PouchError(
      "NO_PROFILE",
      `No agent profile for applicant ${applicantId}`,
    );
  }

  const toggles = (consent?.dimensionToggles ?? {}) as Record<string, boolean>;
  const all = (profile.dimensions ?? {}) as Record<string, PouchDimension>;
  const dimensions: Record<string, PouchDimension> = {};
  for (const [key, dim] of Object.entries(all)) {
    if (toggles[key] === false) continue; // explicit opt-out
    if (!dim || typeof dim.summary !== "string") continue;
    dimensions[key] = {
      summary: dim.summary,
      signals: Array.isArray(dim.signals) ? dim.signals : [],
      ...(dim.confidence ? { confidence: dim.confidence } : {}),
    };
  }

  if (Object.keys(dimensions).length === 0) {
    throw new PouchError(
      "NO_DIMENSIONS",
      `No consented dimensions for applicant ${applicantId}`,
    );
  }

  return {
    fromApplicantId: applicantId,
    profileVersion: profile.version,
    dimensions,
  };
}

/**
 * Run a two-way pouch exchange between two applicants' agents. Enforces
 * consent on both sides (paused agents share nothing; review-mode
 * principals must approve via UI first — no silent exchange), writes an
 * audit row per direction (dimension names + payload hash only), and
 * returns both pouches for the caller (e.g. briefing generation).
 */
export async function runPouchExchange(
  applicantAId: string,
  applicantBId: string,
): Promise<{ pouchAtoB: Pouch; pouchBtoA: Pouch }> {
  const [consentA, consentB] = await Promise.all([
    db.agentConsent.findUnique({ where: { applicantId: applicantAId } }),
    db.agentConsent.findUnique({ where: { applicantId: applicantBId } }),
  ]);

  if (consentA?.agentPaused || consentB?.agentPaused) {
    throw new PouchError(
      "PAUSED",
      "Exchange refused: one agent is paused",
    );
  }
  if (consentA?.pouchReviewMode || consentB?.pouchReviewMode) {
    throw new PouchError(
      "REVIEW_REQUIRED",
      "Exchange requires principal review: one side has review-before-sharing on",
    );
  }

  const [pouchAtoB, pouchBtoA] = await Promise.all([
    buildPouch(applicantAId),
    buildPouch(applicantBId),
  ]);
  // buildPouch returns null only when paused, already handled above.
  if (!pouchAtoB || !pouchBtoA) {
    throw new PouchError("PAUSED", "Exchange refused: one agent is paused");
  }

  const now = new Date();
  await db.$transaction([
    db.pouchExchange.create({
      data: {
        fromApplicantId: applicantAId,
        toApplicantId: applicantBId,
        dimensionsShared: Object.keys(pouchAtoB.dimensions),
        payloadHash: hashPayload(pouchAtoB),
        consentedAt: now,
      },
    }),
    db.pouchExchange.create({
      data: {
        fromApplicantId: applicantBId,
        toApplicantId: applicantAId,
        dimensionsShared: Object.keys(pouchBtoA.dimensions),
        payloadHash: hashPayload(pouchBtoA),
        consentedAt: now,
      },
    }),
  ]);

  logger.info("Pouch exchange completed", {
    applicantAId,
    applicantBId,
    dimensionsAtoB: Object.keys(pouchAtoB.dimensions),
    dimensionsBtoA: Object.keys(pouchBtoA.dimensions),
  });

  return { pouchAtoB, pouchBtoA };
}
