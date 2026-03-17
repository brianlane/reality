/**
 * Email Client
 *
 * Handles email sending via Resend API with database logging.
 */

import { Resend } from "resend";
import { minify } from "html-minifier-terser";
import { SendEmailParams } from "./types";
import { db } from "@/lib/db";
import { logger } from "@/lib/logger";

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
    logger.warn(
      `Missing plain text content for ${params.emailType} email. Plain text versions improve deliverability.`,
      { emailType: params.emailType },
    );
  } else if (params.text.length < 100) {
    logger.warn(
      `Plain text content is very short (${params.text.length} chars) for ${params.emailType} email`,
      { emailType: params.emailType },
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

    logger.info(
      `Email minification: ${originalSize} → ${minifiedSize} bytes (${savingsPercent}% reduction)`,
      { emailType: params.emailType },
    );

    // Warn if still approaching Gmail's 102KB limit
    if (minifiedSize > 80000) {
      logger.warn(
        `Email HTML size is ${minifiedSize} bytes, approaching Gmail's 102KB clipping limit`,
        { emailType: params.emailType },
      );
    }
  } catch (minifyError) {
    logger.error("HTML minification failed, using original HTML", {
      error:
        minifyError instanceof Error
          ? minifyError.message
          : String(minifyError),
    });
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
    logger.error("Failed to log email to database", {
      error: logError instanceof Error ? logError.message : String(logError),
    });
    // Continue execution - logging failure shouldn't prevent email sending
  }

  if (error) {
    logger.error("Email sending failed", {
      emailType: params.emailType,
      error: error.message,
    });
    throw new Error(`Failed to send email: ${error.message}`);
  }

  logger.info("Email sent successfully", {
    emailType: params.emailType,
    resendId: data?.id,
  });

  return data;
}
