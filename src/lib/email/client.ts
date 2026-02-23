/**
 * Email Client
 *
 * Handles email sending via Resend API with database logging.
 */

import { Resend } from "resend";
import { minify } from "html-minifier-terser";
import { SendEmailParams } from "./types";
import { db } from "@/lib/db";

// Lazy initialization to avoid build-time errors
let resendClient: Resend | null = null;

function getResendClient(): Resend {
  if (!resendClient) {
    if (!process.env.RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY environment variable is not set");
    }
    resendClient = new Resend(process.env.RESEND_API_KEY);
  }
  return resendClient;
}

export async function sendEmail(params: SendEmailParams) {
  // Validate required environment variables
  if (!process.env.RESEND_API_KEY) {
    throw new Error("RESEND_API_KEY environment variable is not set");
  }

  if (!process.env.EMAIL_FROM_ADDRESS) {
    throw new Error("EMAIL_FROM_ADDRESS environment variable is not set");
  }

  // Warn if text content is missing (important for deliverability and accessibility)
  if (!params.text) {
    console.warn(
      `[Email Warning] Missing plain text content for ${params.emailType} email to ${params.to}. ` +
        "Plain text versions improve deliverability and prevent email client clipping.",
    );
  } else if (params.text.length < 100) {
    console.warn(
      `[Email Warning] Plain text content is very short (${params.text.length} chars) for ${params.emailType} email to ${params.to}. ` +
        "Short text content may cause email clients like Gmail to clip the message.",
    );
  }

  const fromName = process.env.EMAIL_FROM_NAME || "Reality Matchmaking";
  const fromAddress = process.env.EMAIL_FROM_ADDRESS;

  // Minify HTML to prevent Gmail clipping (102KB limit)
  let minifiedHtml = params.html;
  try {
    minifiedHtml = await minify(params.html, {
      collapseWhitespace: true,
      removeComments: true,
      removeEmptyAttributes: false, // Keep for email compatibility
      removeRedundantAttributes: true,
      removeScriptTypeAttributes: true,
      removeStyleLinkTypeAttributes: true,
      minifyCSS: true, // Minify inline styles
      minifyURLs: false, // Don't minify URLs
      keepClosingSlash: true, // Required for XHTML email compatibility
    });

    const originalSize = Buffer.byteLength(params.html, "utf8");
    const minifiedSize = Buffer.byteLength(minifiedHtml, "utf8");
    const savings = originalSize - minifiedSize;
    const savingsPercent = ((savings / originalSize) * 100).toFixed(1);

    console.log(
      `[Email Minification] ${params.emailType}: ${originalSize} → ${minifiedSize} bytes (${savingsPercent}% reduction)`,
    );

    // Warn if still approaching Gmail's 102KB limit
    if (minifiedSize > 80000) {
      console.warn(
        `[Email Warning] ${params.emailType} HTML size is ${minifiedSize} bytes, approaching Gmail's 102KB clipping limit`,
      );
    }
  } catch (minifyError) {
    console.error(
      "HTML minification failed, using original HTML:",
      minifyError,
    );
    // Continue with original HTML if minification fails
  }

  // Send email via Resend
  const resend = getResendClient();
  const { data, error } = await resend.emails.send({
    from: `${fromName} <${fromAddress}>`,
    to: params.to,
    subject: params.subject,
    html: minifiedHtml,
    ...(params.text && { text: params.text }),
    ...(params.replyTo && { reply_to: params.replyTo }),
  });

  // Log email send to database (don't throw if logging fails)
  try {
    await db.emailLog.create({
      data: {
        resendId: data?.id || null,
        recipientEmail: params.to,
        emailType: params.emailType,
        subject: params.subject,
        status: error ? "FAILED" : "SENT",
        failureReason: error?.message || null,
        applicantId: params.applicantId || null,
      },
    });
  } catch (logError) {
    console.error("Failed to log email to database:", logError);
    // Continue execution - logging failure shouldn't prevent email sending
  }

  if (error) {
    console.error("Email sending failed:", {
      emailType: params.emailType,
      recipient: params.to,
      error: error.message,
    });
    throw new Error(`Failed to send email: ${error.message}`);
  }

  console.log("Email sent successfully:", {
    emailType: params.emailType,
    recipient: params.to,
    resendId: data?.id,
  });

  return data;
}
