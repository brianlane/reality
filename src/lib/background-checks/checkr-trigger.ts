import {
  createCandidate,
  createInvitation,
} from "@/lib/background-checks/checkr";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

type TriggerCheckrInvitationParams = {
  applicantId: string;
  applicantIdentity: {
    firstName: string;
    lastName: string;
    email: string;
  };
  audit: {
    userId: string | null;
    action: string;
    metadata?: Record<string, unknown>;
  };
};

type TriggerCheckrInvitationResult =
  | { status: "already_in_progress" }
  | {
      status: "invitation_sent";
      candidateId: string;
      invitationId: string;
      packageName: string | null;
    };

/**
 * Shared Checkr initiation flow used by both admin-triggered and orchestrator
 * code paths to avoid drift:
 * - atomic claim (PENDING/FAILED -> IN_PROGRESS)
 * - candidate creation/reuse
 * - invitation creation
 * - audit logging (non-blocking)
 * - rollback to PENDING on failure
 */
export async function triggerCheckrInvitation(
  params: TriggerCheckrInvitationParams,
): Promise<TriggerCheckrInvitationResult> {
  const { applicantId, applicantIdentity, audit } = params;

  const claimed = await db.applicant.updateMany({
    where: { id: applicantId, checkrStatus: { in: ["PENDING", "FAILED"] } },
    data: { checkrStatus: "IN_PROGRESS" },
  });

  if (claimed.count === 0) {
    return { status: "already_in_progress" };
  }

  try {
    // Re-read after atomic claim to avoid stale candidate IDs.
    const freshApplicant = await db.applicant.findUnique({
      where: { id: applicantId },
      select: { checkrCandidateId: true },
    });
    let candidateId = freshApplicant?.checkrCandidateId ?? null;

    if (!candidateId) {
      const candidate = await createCandidate({
        firstName: applicantIdentity.firstName,
        lastName: applicantIdentity.lastName,
        email: applicantIdentity.email,
      });
      candidateId = candidate.id;

      await db.applicant.update({
        where: { id: applicantId },
        data: { checkrCandidateId: candidateId },
      });
    }

    const invitation = await createInvitation(candidateId);

    await db.screeningAuditLog
      .create({
        data: {
          userId: audit.userId,
          applicantId,
          action: audit.action,
          metadata: {
            candidateId,
            invitationId: invitation.id,
            ...(invitation.package ? { package: invitation.package } : {}),
            ...(audit.metadata ?? {}),
          },
        },
      })
      .catch((err: unknown) => {
        logger.warn("Failed to create screening audit log", {
          applicantId,
          error: err instanceof Error ? err.message : String(err),
        });
      });

    return {
      status: "invitation_sent",
      candidateId,
      invitationId: invitation.id,
      packageName:
        typeof invitation.package === "string" ? invitation.package : null,
    };
  } catch (err: unknown) {
    await db.applicant.update({
      where: { id: applicantId },
      data: { checkrStatus: "PENDING" },
    });
    throw err;
  }
}
