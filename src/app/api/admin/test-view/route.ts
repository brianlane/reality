/**
 * Test View Endpoint
 *
 * Returns rendered HTML for test views using the same templates as emails.
 * This ensures test views and email previews show identical content.
 */

import { getAuthUser, requireAdmin } from "@/lib/auth";
import { errorResponse } from "@/lib/api-response";
import {
  getSimpleStatusViewHTML,
  type SimpleStatusViewParams,
} from "@/lib/email/simple-status-view";
import type { StatusContentKey } from "@/lib/status-content";
import { NextResponse } from "next/server";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

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
  const viewId = searchParams.get("viewId");

  if (!viewId) {
    return errorResponse(
      "VALIDATION_ERROR",
      "View ID is required (use ?viewId=status-waitlist-invited)",
      400,
    );
  }

  let html: string;

  try {
    // Map view IDs to status keys
    const statusMap: Record<string, StatusContentKey> = {
      "status-draft": "DRAFT",
      "status-submitted": "SUBMITTED",
      "status-payment-pending": "PAYMENT_PENDING",
      "status-screening": "SCREENING_IN_PROGRESS",
      "status-approved": "APPROVED",
      "status-waitlist-invited": "WAITLIST_INVITED",
      "status-research-invited": "RESEARCH_INVITED",
      "status-research-in-progress": "RESEARCH_IN_PROGRESS",
      "status-research-completed": "RESEARCH_COMPLETED",
      "status-soft-rejected": "SOFT_REJECTED",
    };

    const statusKey = statusMap[viewId];

    if (statusKey) {
      // Use shared simple status view for status pages
      let buttonUrl = `${APP_URL}/dashboard`;

      // Customize button URL for specific statuses
      if (statusKey === "WAITLIST_INVITED") {
        buttonUrl = `${APP_URL}/apply/continue?token=preview_token`;
      } else if (statusKey === "PAYMENT_PENDING") {
        buttonUrl = `${APP_URL}/apply/payment`;
      } else if (
        statusKey === "RESEARCH_INVITED" ||
        statusKey === "RESEARCH_IN_PROGRESS"
      ) {
        buttonUrl = `${APP_URL}/research?code=preview_code`;
      }

      html = getSimpleStatusViewHTML({
        statusKey,
        buttonUrl,
        appId: "preview-app-001",
      });
    } else {
      return errorResponse(
        "VALIDATION_ERROR",
        `View not supported by this endpoint: ${viewId}. Use the regular test views page for non-status views.`,
        400,
      );
    }

    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html",
      },
    });
  } catch (error) {
    console.error("Test view generation failed:", error);
    return errorResponse(
      "INTERNAL_SERVER_ERROR",
      `Failed to generate view: ${(error as Error).message}`,
      500,
    );
  }
}
