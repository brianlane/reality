/**
 * Application Status Update Email
 *
 * Sends status update emails with customized content based on application status.
 */

import { sendEmail } from "./client";
import { getStatusUpdateHTML } from "./templates";
import { EMAIL_STATUS_CONTENT, type StatusContentKey } from "../status-content";

interface ApplicationStatusParams {
  to: string;
  firstName: string;
  status: string;
  message?: string;
  applicantId?: string;
}

export async function sendApplicationStatusEmail(
  params: ApplicationStatusParams,
) {
  // Get subject from shared content if available
  const statusKey = params.status.toUpperCase() as StatusContentKey;
  const sharedContent = EMAIL_STATUS_CONTENT[statusKey];

  let subject = sharedContent?.emailSubject || "Application Status Update - Reality Matchmaking";

  // Override for rejected status (not in shared content yet)
  if (params.status.toUpperCase() === "REJECTED") {
    subject = "Update on Your Application - Reality Matchmaking";
  }

  const html = getStatusUpdateHTML({
    firstName: params.firstName,
    status: params.status,
    message: params.message,
  });

  // Generate plain text version
  let textContent = `Hi ${params.firstName},\n\n`;

  switch (params.status.toUpperCase()) {
    case "SCREENING_IN_PROGRESS":
      textContent +=
        "We're currently processing your background check and identity verification. This typically takes 2-3 business days.\n\n" +
        "What's being checked:\n" +
        "- Identity verification\n" +
        "- Criminal background check\n" +
        "- Sex offender registry\n\n";
      break;
    case "REJECTED":
      textContent +=
        "Thank you for your interest in Reality Matchmaking. After careful review, we've decided not to move forward with your application at this time.\n\n" +
        "This decision is based on our matching criteria and current member composition. " +
        "We maintain high standards to ensure the best experience for all members.\n\n";
      if (params.message) {
        textContent += `${params.message}\n\n`;
      }
      textContent +=
        "We wish you the best in your search for a meaningful relationship.\n\n";
      break;
    case "PAYMENT_PENDING":
      textContent +=
        "To continue with your application, please complete the $199 application fee payment.\n\n" +
        "What happens after payment:\n" +
        "1. Complete full application questionnaire (80 questions)\n" +
        "2. Identity verification and background check\n" +
        "3. Review by our team\n" +
        "4. Approval and event invitation\n\n" +
        `Complete your payment: ${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/apply/payment\n\n`;
      break;
    case "SUBMITTED":
      textContent +=
        "We've received your complete application and our team is currently reviewing it. We'll be in touch within 3-5 business days.\n\n" +
        "Our review process includes:\n" +
        "- Compatibility assessment\n" +
        "- Profile completeness check\n" +
        "- Background check verification\n" +
        "- Fit with current member community\n\n";
      break;
    default:
      textContent +=
        params.message || "Your application status has been updated.";
      textContent += "\n\n";
  }

  textContent +=
    "Questions? Reply to this email and our team will be happy to help.";

  return sendEmail({
    to: params.to,
    subject,
    html,
    text: textContent,
    emailType: "STATUS_UPDATE",
    applicantId: params.applicantId,
  });
}
