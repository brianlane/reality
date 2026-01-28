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
        html = getWaitlistConfirmationHTML("Test User", "test_app_123");
        break;

      case "WAITLIST_INVITE":
        html = getWaitlistInviteHTML("Test User", "test_token_123");
        break;

      case "PAYMENT_CONFIRMATION":
      case "APPLICATION_APPROVAL":
      case "EVENT_INVITATION":
      case "STATUS_UPDATE_SCREENING":
      case "STATUS_UPDATE_PAYMENT_PENDING":
        html = "<h1>Template not yet implemented</h1>";
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
