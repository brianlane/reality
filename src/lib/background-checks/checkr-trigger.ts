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
 * - audit logging (compliance-critical; failures propagate)
 * - rollback to the pre-claim status on failure
 */
export async function triggerCheckrInvitation(
  params: TriggerCheckrInvitationParams,
): Promise<TriggerCheckrInvitationResult> {
  const { applicantId, applicantIdentity, audit } = params;

  // Claim FAILED first, then PENDING, so we can safely restore the original
  // status on failure without erasing historical failure state.
  let rollbackStatus: "PENDING" | "FAILED" | null = null;
  const claimedFromFailed = await db.applicant.updateMany({
    where: { id: applicantId, checkrStatus: "FAILED" },
    data: { checkrStatus: "IN_PROGRESS" },
  });
  if (claimedFromFailed.count > 0) {
    rollbackStatus = "FAILED";
  } else {
    const claimedFromPending = await db.applicant.updateMany({
      where: { id: applicantId, checkrStatus: "PENDING" },
      data: { checkrStatus: "IN_PROGRESS" },
    });
    if (claimedFromPending.count > 0) {
      rollbackStatus = "PENDING";
    }
  }

  if (!rollbackStatus) {
    return { status: "already_in_progress" };
  }

  let invitation: { id: string; package?: string };
  let candidateId: string = "";
  try {
    // Re-read after atomic claim to avoid stale candidate IDs.
    const freshApplicant = await db.applicant.findUnique({
      where: { id: applicantId },
      select: { checkrCandidateId: true },
    });
    candidateId = freshApplicant?.checkrCandidateId ?? "";

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

    invitation = await createInvitation(candidateId);
    // From here, the invitation is sent externally. Do NOT roll back on later
    // failures — retries would create duplicate invitations.
  } catch (err: unknown) {
    await db.applicant.updateMany({
      where: { id: applicantId, checkrStatus: "IN_PROGRESS" },
      data: { checkrStatus: rollbackStatus },
    });
    throw err;
  }

  // Audit log is compliance-critical; failures propagate. No rollback — the
  // invitation is already sent; callers can retry and will get already_in_progress.
  await db.screeningAuditLog.create({
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
  });

  return {
    status: "invitation_sent",
    candidateId,
    invitationId: invitation.id,
    packageName:
      typeof invitation.package === "string" ? invitation.package : null,
  };
</think>

<｜tool▁calls▁begin｜><｜tool▁call▁begin｜>
Read
