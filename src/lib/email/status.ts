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

  let subject =
    sharedContent?.emailSubject ||
    "Application Status Update - Reality Matchmaking";

  // Override for rejected status (not in shared content yet)
  if (params.status.toUpperCase() === "REJECTED") {
    subject = "Update on Your Application - Reality Matchmaking";
  }

  const html = getStatusUpdateHTML({
    firstName: params.firstName,
    status: params.status,
    message: params.message,
  });

  // Generate plain text version matching the simplified HTML template
  const textDescription = sharedContent?.description || params.message || "Your application status has been updated.";

  let textContent = textDescription + "\n\n";

  // Add specific message for rejected status
  if (params.status.toUpperCase() === "REJECTED") {
    textContent = "Thank you for your interest in Reality Matchmaking. After careful review, we've decided not to move forward with your application at this time.\n\n";
  }

  textContent += "Questions? Reply to this email and our team will be happy to help.";

  return sendEmail({
    to: params.to,
    subject,
    html,
    text: textContent,
    emailType: "STATUS_UPDATE",
    applicantId: params.applicantId,
  });
}
