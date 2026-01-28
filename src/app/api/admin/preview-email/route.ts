/**
 * Email Preview Endpoint
 *
 * Returns rendered HTML for email templates without sending them.
 * For development/design purposes only.
 */

import { getAuthUser, requireAdmin } from "@/lib/auth";
import { errorResponse } from "@/lib/api-response";
import type { TestEmailType } from "@/lib/email/types";
import { NextResponse } from "next/server";

// Import email template generators (we'll extract HTML generation logic)
function getWaitlistConfirmationHTML(firstName: string, applicationId: string) {
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>You're on the Reality Matchmaking Waitlist</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8f9fa;">
  <div style="max-width: 600px; margin: 40px auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #1a2332 0%, #2d3e50 100%); padding: 40px 20px; text-align: center;">
      <div style="width: 60px; height: 60px; margin: 0 auto 16px; background-color: #c8915f; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
        <span style="font-size: 32px; color: white;">✓</span>
      </div>
      <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600;">You're on the Waitlist</h1>
    </div>

    <!-- Content -->
    <div style="padding: 40px 32px;">
      <p style="color: #1a2332; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
        Hi ${firstName},
      </p>

      <p style="color: #1a2332; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
        Thank you for your interest in Reality Matchmaking. We've received your qualification and you're now on our waitlist.
      </p>

      <div style="background-color: #f8f9fa; border-left: 4px solid #c8915f; padding: 20px; margin: 32px 0; border-radius: 4px;">
        <h3 style="color: #1a2332; margin: 0 0 16px; font-size: 18px; font-weight: 600;">What happens next?</h3>
        <ol style="color: #4a5568; margin: 0; padding-left: 20px; line-height: 1.8;">
          <li style="margin-bottom: 12px;"><strong>Review:</strong> Our team will carefully review your qualification</li>
          <li style="margin-bottom: 12px;"><strong>Invitation:</strong> You'll receive an email invitation to continue your application</li>
        </ol>
      </div>

      <div style="background-color: #f8f9fa; padding: 16px; border-radius: 4px; margin: 24px 0;">
        <p style="color: #4a5568; font-size: 14px; margin: 0;">
          <strong>Application Reference:</strong> ${applicationId}
        </p>
      </div>
    </div>

    <!-- Footer -->
    <div style="background-color: #f8f9fa; padding: 24px 32px; text-align: center; border-top: 1px solid #e2e8f0;">
      <p style="color: #718096; font-size: 12px; margin: 0 0 8px;">
        Reality Matchmaking
      </p>
      <p style="color: #a0aec0; font-size: 11px; margin: 0;">
        ${APP_URL}
      </p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

function getWaitlistInviteHTML(firstName: string, inviteToken: string) {
  const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const inviteUrl = `${APP_URL}/apply/continue?token=${inviteToken}`;

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Reality Matchmaking Invitation</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8f9fa;">
  <div style="max-width: 600px; margin: 40px auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
    <div style="background: linear-gradient(135deg, #c8915f 0%, #d4a574 100%); padding: 40px 20px; text-align: center;">
      <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600;">You're Invited!</h1>
    </div>
    <div style="padding: 40px 32px;">
      <p style="color: #1a2332; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
        Hi ${firstName},
      </p>
      <p style="color: #1a2332; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
        Great news! Your application has been reviewed and you've been selected to continue with Reality Matchmaking.
      </p>
      <div style="text-align: center; margin: 32px 0;">
        <a href="${inviteUrl}" style="display: inline-block; background-color: #c8915f; color: white; text-decoration: none; padding: 16px 32px; border-radius: 6px; font-size: 16px; font-weight: 600; box-shadow: 0 2px 4px rgba(200, 145, 95, 0.3);">
          Continue Application
        </a>
      </div>
      <p style="color: #718096; font-size: 14px; line-height: 1.6; margin: 24px 0 0;">
        This invitation is unique to you. Please don't share this link with others.
      </p>
    </div>
    <div style="background-color: #f8f9fa; padding: 24px 32px; text-align: center; border-top: 1px solid #e2e8f0;">
      <p style="color: #718096; font-size: 12px; margin: 0 0 8px;">Reality Matchmaking</p>
      <p style="color: #a0aec0; font-size: 11px; margin: 0;">${APP_URL}</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

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
      case "STATUS_UPDATE_REJECTED":
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
