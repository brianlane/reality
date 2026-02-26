import { sendEmail } from "./client";

type CoupleData = {
  applicant1: {
    name: string;
    prolificPid?: string;
    applicationId: string;
  };
  applicant2: {
    name: string;
    prolificPid?: string;
    applicationId: string;
  };
};

export async function sendCoupleCompletionEmail(data: CoupleData) {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL || "https://www.realitymatchmaking.com";

  const subject = "🎉 Couple Study Completion: Both Partners Finished";

  const html = `
    <h2>Both Partners Completed the Research Questionnaire</h2>

    <p>Great news! Both partners in a couple have completed your research study.</p>

    <h3>Participant 1</h3>
    <ul>
      <li><strong>Name:</strong> ${data.applicant1.name}</li>
      <li><strong>Prolific ID:</strong> ${data.applicant1.prolificPid || "N/A"}</li>
      <li><strong>View Submission:</strong> <a href="${baseUrl}/admin/applicants/${data.applicant1.applicationId}">View in Admin</a></li>
    </ul>

    <h3>Participant 2</h3>
    <ul>
      <li><strong>Name:</strong> ${data.applicant2.name}</li>
      <li><strong>Prolific ID:</strong> ${data.applicant2.prolificPid || "N/A"}</li>
      <li><strong>View Submission:</strong> <a href="${baseUrl}/admin/applicants/${data.applicant2.applicationId}">View in Admin</a></li>
    </ul>

    <h3>Next Steps</h3>
    <ol>
      <li>Review both submissions in the admin panel</li>
      <li>Verify their answers match (same partner IDs, etc.)</li>
      <li>Process bonus payment in Prolific</li>
    </ol>

    <p><strong>Bonus Payment:</strong> In Prolific, go to your study → Submissions → Filter by "Married Couples" group → Select both participants → "Pay Bonus"</p>
  `;

  const text = `
Both Partners Completed the Research Questionnaire

Great news! Both partners in a couple have completed your research study.

Participant 1:
- Name: ${data.applicant1.name}
- Prolific ID: ${data.applicant1.prolificPid || "N/A"}
- View: ${baseUrl}/admin/applicants/${data.applicant1.applicationId}

Participant 2:
- Name: ${data.applicant2.name}
- Prolific ID: ${data.applicant2.prolificPid || "N/A"}
- View: ${baseUrl}/admin/applicants/${data.applicant2.applicationId}

Next Steps:
1. Review both submissions in the admin panel
2. Verify their answers match (same partner IDs, etc.)
3. Process bonus payment in Prolific

Bonus Payment: In Prolific, go to your study → Submissions → Filter by "Married Couples" group → Select both participants → "Pay Bonus"
  `.trim();

  const adminEmail = process.env.ADMIN_EMAIL || "admin@realitymatchmaking.com";

  await sendEmail({
    to: adminEmail,
    subject,
    html,
    text,
    emailType: "COUPLE_COMPLETION_NOTIFICATION",
  });
}
