import sanitizeHtml from "sanitize-html";
import { getAuthUser, requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { errorResponse, successResponse } from "@/lib/api-response";
import { getSupabaseClient } from "@/lib/storage/client";
import { VOICE_AUDIO_BUCKET } from "@/lib/voice-config";

type RouteContext = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, { params }: RouteContext) {
  const { id } = await params;
  const auth = await getAuthUser();
  if (!auth) {
    return errorResponse("UNAUTHORIZED", "User not authenticated", 401);
  }
  try {
    requireAdmin(auth.email);
  } catch (error) {
    return errorResponse("FORBIDDEN", (error as Error).message, 403);
  }

  // Verify applicant exists
  const applicant = await db.applicant.findFirst({
    where: { id },
    include: {
      user: { select: { firstName: true, lastName: true, email: true } },
    },
  });

  if (!applicant) {
    return errorResponse("NOT_FOUND", "Applicant not found", 404);
  }

  // Fetch all questionnaire answers for this applicant, organized by page/section
  const answers = await db.questionnaireAnswer.findMany({
    where: { applicantId: id },
    include: {
      question: {
        include: {
          section: {
            include: {
              page: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  // Pre-generate signed download URLs (1-hour expiry) for any voice recordings.
  const supabase = getSupabaseClient();
  const voiceAudioUrlMap = new Map<string, string>();
  if (supabase) {
    const voicePaths = answers
      .filter((a) => a.voiceAudioPath)
      .map((a) => ({ answerId: a.id, path: a.voiceAudioPath! }));

    await Promise.all(
      voicePaths.map(async ({ answerId, path }) => {
        const { data, error } = await supabase.storage
          .from(VOICE_AUDIO_BUCKET)
          .createSignedUrl(path, 3600);
        if (!error && data?.signedUrl) {
          voiceAudioUrlMap.set(answerId, data.signedUrl);
        }
      }),
    );
  }

  // Organize answers by page > section > question
  const pageMap = new Map<
    string,
    {
      id: string;
      title: string;
      order: number;
      sections: Map<
        string,
        {
          id: string;
          title: string;
          order: number;
          questions: Array<{
            id: string;
            prompt: string;
            type: string;
            order: number;
            value: unknown;
            richText: string | null;
            answeredAt: string;
            voiceStatus: string | null;
            voiceProvider: string | null;
            voiceTranscript: string | null;
            voiceTranscribedAt: string | null;
            voiceAudioUrl: string | null;
          }>;
        }
      >;
    }
  >();

  for (const answer of answers) {
    const question = answer.question;
    const section = question.section;
    const page = section.page;

    // Skip orphaned answers (question/section/page deleted)
    if (!page) continue;

    if (!pageMap.has(page.id)) {
      pageMap.set(page.id, {
        id: page.id,
        title: page.title,
        order: page.order,
        sections: new Map(),
      });
    }

    const pageEntry = pageMap.get(page.id)!;
    if (!pageEntry.sections.has(section.id)) {
      pageEntry.sections.set(section.id, {
        id: section.id,
        title: section.title,
        order: section.order,
        questions: [],
      });
    }

    pageEntry.sections.get(section.id)!.questions.push({
      id: question.id,
      prompt: question.prompt,
      type: question.type,
      order: question.order,
      value: answer.value,
      richText: answer.richText
        ? sanitizeHtml(answer.richText, {
            allowedTags: sanitizeHtml.defaults.allowedTags,
            allowedAttributes: sanitizeHtml.defaults.allowedAttributes,
          })
        : null,
      answeredAt: answer.updatedAt.toISOString(),
      voiceStatus: answer.voiceStatus ?? null,
      voiceProvider: answer.voiceProvider ?? null,
      voiceTranscript: answer.voiceTranscript ?? null,
      voiceTranscribedAt: answer.voiceTranscribedAt?.toISOString() ?? null,
      voiceAudioUrl: voiceAudioUrlMap.get(answer.id) ?? null,
    });
  }

  // Convert maps to sorted arrays
  const pages = Array.from(pageMap.values())
    .sort((a, b) => a.order - b.order)
    .map((page) => ({
      ...page,
      sections: Array.from(page.sections.values())
        .sort((a, b) => a.order - b.order)
        .map((section) => ({
          ...section,
          questions: section.questions.sort((a, b) => a.order - b.order),
        })),
    }));

  return successResponse({
    applicant: {
      id: applicant.id,
      firstName: applicant.user.firstName,
      lastName: applicant.user.lastName,
      email: applicant.user.email,
      applicationStatus: applicant.applicationStatus,
    },
    totalAnswers: answers.length,
    pages,
  });
}
