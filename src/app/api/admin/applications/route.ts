import { getAuthUser, requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { errorResponse, successResponse } from "@/lib/api-response";

export async function GET(request: Request) {
  const auth = await getAuthUser();
  if (!auth) {
    return errorResponse("UNAUTHORIZED", "User not authenticated", 401);
  }
  try {
    requireAdmin(auth.email);
  } catch (error) {
    return errorResponse("FORBIDDEN", (error as Error).message, 403);
  }

  const url = new URL(request.url);
  const status = url.searchParams.get("status") ?? undefined;
  const gender = url.searchParams.get("gender") ?? undefined;
  const screeningStatus = url.searchParams.get("screeningStatus") ?? undefined;
  const page = Number(url.searchParams.get("page") ?? "1");
  const limit = Number(url.searchParams.get("limit") ?? "20");
  const sortBy = url.searchParams.get("sortBy") ?? "submittedAt";
  const sortOrder = url.searchParams.get("sortOrder") ?? "desc";

  const where = {
    ...(status ? { applicationStatus: status as never } : {}),
    ...(gender ? { gender: gender as never } : {}),
    ...(screeningStatus ? { screeningStatus: screeningStatus as never } : {}),
  };

  const [applications, total] = await Promise.all([
    db.applicant.findMany({
      where,
      include: { user: true },
      orderBy: { [sortBy]: sortOrder },
      skip: (page - 1) * limit,
      take: limit,
    }),
    db.applicant.count({ where }),
  ]);

  const stats = await db.applicant.groupBy({
    by: ["applicationStatus"],
    _count: true,
  });

  const statusCounts = stats.reduce<Record<string, number>>((acc, item) => {
    acc[item.applicationStatus] = item._count;
    return acc;
  }, {});

  return successResponse({
    applications: applications.map((applicant) => ({
      id: applicant.id,
      firstName: applicant.user.firstName,
      lastName: applicant.user.lastName,
      age: applicant.age,
      gender: applicant.gender,
      occupation: applicant.occupation,
      applicationStatus: applicant.applicationStatus,
      screeningStatus: applicant.screeningStatus,
      compatibilityScore: applicant.compatibilityScore,
      submittedAt: applicant.submittedAt,
    })),
    pagination: {
      total,
      pages: Math.ceil(total / limit),
      currentPage: page,
      perPage: limit,
    },
    stats: {
      totalSubmitted: statusCounts.SUBMITTED ?? 0,
      pending: statusCounts.SCREENING_IN_PROGRESS ?? 0,
      approved: statusCounts.APPROVED ?? 0,
      rejected: statusCounts.REJECTED ?? 0,
      waitlist: statusCounts.WAITLIST ?? 0,
    },
  });
}
