/**
 * Email Preview Endpoint
 *
 * Returns rendered HTML for email templates without sending them.
 * For development/design purposes only.
 *
 * Uses the single source of truth from src/lib/email/templates.ts
 */

import { getAuthUser, requireAdmin } from "@/lib/auth";
import { errorResponse } from "@/lib/api-response";
import type { TestEmailType } from "@/lib/email/types";
import {
  getWaitlistConfirmationHTML,
  getWaitlistInviteHTML,
  getResearchInviteHTML,
  getPaymentConfirmationHTML,
  getApplicationApprovalHTML,
  getEventInvitationHTML,
  getStatusUpdateHTML,
} from "@/lib/email/templates";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  // Verify admin authentication
  const auth = await getAuthUser();
  if (!auth) {
    return errorResponse("UNAUTHORIZED", "User not authenticated", 401);
  }
  if (!auth.email) {
    return errorResponse("UNAUTHORIZED", "Email not available", 401);
  }
  try {
    requireAdmin(auth.email);
  } catch (error) {
    return errorResponse("FORBIDDEN", (error as Error).message, 403);
  }

  const { searchParams } = new URL(request.url);
  const emailType = searchParams.get("type") as TestEmailType | null;

  if (!emailType) {
    return errorResponse(
      "VALIDATION_ERROR",
      "Email type is required (use ?type=WAITLIST_CONFIRMATION)",
      400,
    );
  }

  let html: string;

  try {
    switch (emailType) {
      case "WAITLIST_CONFIRMATION":
        html = getWaitlistConfirmationHTML();
        break;

      case "WAITLIST_INVITE":
        html = getWaitlistInviteHTML("Test User", "test_token_123");
        break;

      case "RESEARCH_INVITE":
        html = getResearchInviteHTML("Test User", "test_code_abc123");
        break;

      case "PAYMENT_CONFIRMATION":
        html = getPaymentConfirmationHTML({
          firstName: "Test User",
          amount: 19900, // $199.00 in cents
          currency: "usd",
          receiptUrl: "https://example.com/receipt/test_123",
        });
        break;

      case "APPLICATION_APPROVAL":
        html = getApplicationApprovalHTML("Test User");
        break;

      case "EVENT_INVITATION":
        // Create test event dates
        const eventDate = new Date("2026-03-15T19:00:00");
        const startTime = new Date("2026-03-15T19:00:00");
        const endTime = new Date("2026-03-15T22:00:00");

        html = getEventInvitationHTML({
          firstName: "Test User",
          eventTitle: "Spring Mixer at The Rooftop",
          eventDate,
          eventLocation: "The Rooftop Lounge",
          eventAddress: "123 Main Street, San Francisco, CA 94102",
          startTime,
          endTime,
          rsvpUrl: "https://example.com/events/rsvp/test_123",
        });
        break;

      case "STATUS_UPDATE_SCREENING":
        html = getStatusUpdateHTML({
          firstName: "Test User",
          status: "SCREENING_IN_PROGRESS",
        });
        break;

      case "STATUS_UPDATE_PAYMENT_PENDING":
        html = getStatusUpdateHTML({
          firstName: "Test User",
          status: "PAYMENT_PENDING",
        });
        break;

      default:
        return errorResponse(
          "VALIDATION_ERROR",
          `Unknown email type: ${emailType}`,
          400,
        );
    }

    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html",
      },
    });
  } catch (error) {
    console.error("Email preview generation failed:", error);
    return errorResponse(
      "INTERNAL_SERVER_ERROR",
      `Failed to generate preview: ${(error as Error).message}`,
      500,
    );
  }
}
