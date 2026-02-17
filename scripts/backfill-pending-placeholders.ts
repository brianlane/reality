import "dotenv/config";
import { db } from "../src/lib/db";

function normalizePending(value: string | null): string | null {
  if (!value) return value;
  return value.trim().toLowerCase() === "pending" ? "" : value;
}

async function main() {
  const applicants = await db.applicant.findMany({
    where: {
      OR: [
        { occupation: { equals: "pending", mode: "insensitive" } },
        { education: { equals: "pending", mode: "insensitive" } },
        { incomeRange: { equals: "pending", mode: "insensitive" } },
      ],
    },
    select: {
      id: true,
      occupation: true,
      education: true,
      incomeRange: true,
    },
  });

  if (applicants.length === 0) {
    console.log("No pending placeholder values found.");
    return;
  }

  let updated = 0;
  for (const applicant of applicants) {
    const nextOccupation = normalizePending(applicant.occupation) ?? "";
    const nextEducation = normalizePending(applicant.education) ?? "";
    const nextIncomeRange = normalizePending(applicant.incomeRange) ?? "";

    if (
      nextOccupation === applicant.occupation &&
      nextEducation === applicant.education &&
      nextIncomeRange === applicant.incomeRange
    ) {
      continue;
    }

    await db.applicant.update({
      where: { id: applicant.id },
      data: {
        occupation: nextOccupation,
        education: nextEducation,
        incomeRange: nextIncomeRange,
      },
    });
    updated += 1;
  }

  console.log(`Updated ${updated} applicant record(s).`);
}

main()
  .catch((error) => {
    console.error("Backfill failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
