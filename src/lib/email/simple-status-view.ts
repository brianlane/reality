/**
 * Shared simple status view template
 * Used by both:
 * - Email templates (src/lib/email/templates.ts)
 * - Test views page (src/app/(admin)/admin/test-views/page.tsx)
 *
 * This is the single source of truth for status view rendering.
 * Design: Clean and simple with just icon, title, description, button, app ID.
 */

import { EMAIL_STATUS_CONTENT, type StatusContentKey } from "../status-content";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
const EMAIL_ASSET_BASE_URL = (
  process.env.EMAIL_ASSET_BASE_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  "https://www.realitymatchmaking.com"
).replace(/\/$/, "");

const htmlEscapes: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => htmlEscapes[char] ?? char);
}

export interface SimpleStatusViewParams {
  statusKey: StatusContentKey;
  buttonUrl?: string;
  appId?: string;
}

export interface SimpleEmailParams {
  title: string;
  description: string;
  buttonText: string;
  buttonUrl: string;
  appId?: string;
}

/**
 * Generates simple email HTML with custom content
 * Same design for all emails - no gradient headers
 */
export function getSimpleEmailHTML(params: SimpleEmailParams): string {
  const appId = params.appId || "preview-app-001";

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(params.title)}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8f9fa;">
  <div style="max-width: 600px; margin: 40px auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
    <div style="padding: 40px 32px; text-align: center;">
      <!-- Logo -->
      <img
        src="${EMAIL_ASSET_BASE_URL}/email-logo.png"
        alt="Reality Matchmaking logo"
        width="60"
        height="60"
        style="display: inline-block; margin-bottom: 24px; border: 0; outline: none; text-decoration: none;"
      />

      <!-- Title -->
      <h1 style="color: #1a2332; margin: 0 0 24px; font-size: 32px; font-weight: 600;">
        ${escapeHtml(params.title)}
      </h1>

      <!-- Description -->
      <p style="color: #4a5568; font-size: 16px; line-height: 1.6; margin: 0 0 32px;">
        ${escapeHtml(params.description)}
      </p>

      <!-- Button -->
      <div style="margin: 32px 0;">
        <a href="${params.buttonUrl}" style="display: inline-block; background-color: #1a2332; color: white; text-decoration: none; padding: 16px 32px; border-radius: 6px; font-size: 16px; font-weight: 500;">
          ${escapeHtml(params.buttonText)}
        </a>
      </div>

      <!-- App ID -->
      <p style="color: #cbd5e0; font-size: 12px; margin: 24px 0 0;">
        Application ID: ${escapeHtml(appId)}
      </p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Generates simple status view HTML
 * Same design for both emails and test views
 */
export function getSimpleStatusViewHTML(params: SimpleStatusViewParams): string {
  const content = EMAIL_STATUS_CONTENT[params.statusKey];
  const buttonUrl = params.buttonUrl || `${APP_URL}/dashboard`;
  const appId = params.appId || "preview-app-001";

  return getSimpleEmailHTML({
    title: content.title,
    description: content.description,
    buttonText: content.actionText,
    buttonUrl,
    appId,
  });
}
