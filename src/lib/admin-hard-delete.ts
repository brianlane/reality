import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";

type Transaction = Prisma.TransactionClient;

async function deleteApplicantRelations(tx: Transaction, applicantId: string) {
  await tx.questionnaireAnswer.deleteMany({ where: { applicantId } });
  await tx.payment.deleteMany({ where: { applicantId } });
  await tx.eventInvitation.deleteMany({ where: { applicantId } });
  await tx.match.deleteMany({
    where: {
      OR: [{ applicantId }, { partnerId: applicantId }],
    },
  });
}

async function deleteQuestionnaireBySectionIds(
  tx: Transaction,
  sectionIds: string[],
) {
  if (sectionIds.length === 0) return;
  const questions = await tx.questionnaireQuestion.findMany({
    where: { sectionId: { in: sectionIds } },
    select: { id: true },
  });
  const questionIds = questions.map((question) => question.id);
  if (questionIds.length > 0) {
    await tx.questionnaireAnswer.deleteMany({
      where: { questionId: { in: questionIds } },
    });
  }
  await tx.questionnaireQuestion.deleteMany({
    where: { sectionId: { in: sectionIds } },
  });
}

export async function hardDeleteApplicant(
  applicantId: string,
  adminUserId: string,
) {
  return db.$transaction(async (tx) => {
    const applicant = await tx.applicant.findUnique({
      where: { id: applicantId },
      select: { id: true, userId: true },
    });
    if (!applicant) return null;

    await deleteApplicantRelations(tx, applicant.id);
    await tx.applicant.delete({ where: { id: applicant.id } });
    await tx.adminAction.deleteMany({ where: { userId: applicant.userId } });
    await tx.user.delete({ where: { id: applicant.userId } });

    if (adminUserId !== applicant.userId) {
      await tx.adminAction.create({
        data: {
          userId: adminUserId,
          type: "MANUAL_ADJUSTMENT",
          targetId: applicant.id,
          targetType: "applicant",
          description: "Hard deleted applicant",
          metadata: { hardDelete: true },
        },
      });
    }

    return { applicantId: applicant.id, userId: applicant.userId };
  });
}

export async function hardDeleteEvent(eventId: string, adminUserId: string) {
  return db.$transaction(async (tx) => {
    const event = await tx.event.findUnique({
      where: { id: eventId },
      select: { id: true },
    });
    if (!event) return null;

    await tx.match.deleteMany({ where: { eventId } });
    await tx.eventInvitation.deleteMany({ where: { eventId } });
    await tx.payment.deleteMany({ where: { eventId } });
    await tx.event.delete({ where: { id: eventId } });

    await tx.adminAction.create({
      data: {
        userId: adminUserId,
        type: "MANUAL_ADJUSTMENT",
        targetId: eventId,
        targetType: "event",
        description: "Hard deleted event",
        metadata: { hardDelete: true },
      },
    });

    return { eventId };
  });
}

export async function hardDeleteMatch(matchId: string, adminUserId: string) {
  return db.$transaction(async (tx) => {
    const match = await tx.match.findUnique({
      where: { id: matchId },
      select: { id: true },
    });
    if (!match) return null;

    await tx.match.delete({ where: { id: matchId } });

    await tx.adminAction.create({
      data: {
        userId: adminUserId,
        type: "MANUAL_ADJUSTMENT",
        targetId: matchId,
        targetType: "match",
        description: "Hard deleted match",
        metadata: { hardDelete: true },
      },
    });

    return { matchId };
  });
}

export async function hardDeletePayment(
  paymentId: string,
  adminUserId: string,
) {
  return db.$transaction(async (tx) => {
    const payment = await tx.payment.findUnique({
      where: { id: paymentId },
      select: { id: true },
    });
    if (!payment) return null;

    await tx.payment.delete({ where: { id: paymentId } });

    await tx.adminAction.create({
      data: {
        userId: adminUserId,
        type: "MANUAL_ADJUSTMENT",
        targetId: paymentId,
        targetType: "payment",
        description: "Hard deleted payment",
        metadata: { hardDelete: true },
      },
    });

    return { paymentId };
  });
}

export async function hardDeleteQuestionnairePage(
  pageId: string,
  adminUserId: string,
) {
  return db.$transaction(async (tx) => {
    const page = await tx.questionnairePage.findUnique({
      where: { id: pageId },
      select: { id: true },
    });
    if (!page) return null;

    const sections = await tx.questionnaireSection.findMany({
      where: { pageId },
      select: { id: true },
    });
    const sectionIds = sections.map((section) => section.id);
    await deleteQuestionnaireBySectionIds(tx, sectionIds);
    await tx.questionnaireSection.deleteMany({ where: { pageId } });
    await tx.questionnairePage.delete({ where: { id: pageId } });

    await tx.adminAction.create({
      data: {
        userId: adminUserId,
        type: "MANUAL_ADJUSTMENT",
        targetId: pageId,
        targetType: "questionnaire_page",
        description: "Hard deleted questionnaire page",
        metadata: { hardDelete: true },
      },
    });

    return { pageId };
  });
}

export async function hardDeleteQuestionnaireSection(
  sectionId: string,
  adminUserId: string,
) {
  return db.$transaction(async (tx) => {
    const section = await tx.questionnaireSection.findUnique({
      where: { id: sectionId },
      select: { id: true },
    });
    if (!section) return null;

    await deleteQuestionnaireBySectionIds(tx, [sectionId]);
    await tx.questionnaireSection.delete({ where: { id: sectionId } });

    await tx.adminAction.create({
      data: {
        userId: adminUserId,
        type: "MANUAL_ADJUSTMENT",
        targetId: sectionId,
        targetType: "questionnaire_section",
        description: "Hard deleted questionnaire section",
        metadata: { hardDelete: true },
      },
    });

    return { sectionId };
  });
}

export async function hardDeleteQuestionnaireQuestion(
  questionId: string,
  adminUserId: string,
) {
  return db.$transaction(async (tx) => {
    const question = await tx.questionnaireQuestion.findUnique({
      where: { id: questionId },
      select: { id: true },
    });
    if (!question) return null;

    await tx.questionnaireAnswer.deleteMany({ where: { questionId } });
    await tx.questionnaireQuestion.delete({ where: { id: questionId } });

    await tx.adminAction.create({
      data: {
        userId: adminUserId,
        type: "MANUAL_ADJUSTMENT",
        targetId: questionId,
        targetType: "questionnaire_question",
        description: "Hard deleted questionnaire question",
        metadata: { hardDelete: true },
      },
    });

    return { questionId };
  });
}

export async function hardDeleteUser(userId: string, adminUserId: string) {
  return db.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    if (!user) return null;

    const applicant = await tx.applicant.findUnique({
      where: { userId },
      select: { id: true },
    });

    if (applicant) {
      await deleteApplicantRelations(tx, applicant.id);
      await tx.applicant.delete({ where: { id: applicant.id } });
    }

    await tx.adminAction.deleteMany({ where: { userId } });
    await tx.user.delete({ where: { id: userId } });

    if (adminUserId !== userId) {
      await tx.adminAction.create({
        data: {
          userId: adminUserId,
          type: "MANUAL_ADJUSTMENT",
          targetId: userId,
          targetType: "user",
          description: "Hard deleted user",
          metadata: { hardDelete: true },
        },
      });
    }

    return { userId };
  });
}
