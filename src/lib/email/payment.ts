/**
 * Payment Confirmation Email
 *
 * Sends payment confirmation emails with receipt information.
 */

import { sendEmail } from "./client";

const EMAIL_ASSET_BASE_URL = (
  process.env.EMAIL_ASSET_BASE_URL ||
  process.env.NEXT_PUBLIC_APP_URL ||
  "https://www.realitymatchmaking.com"
).replace(/\/$/, "");

interface PaymentConfirmationParams {
  to: string;
  firstName: string;
  amount: number;
  currency: string;
  receiptUrl: string;
  applicantId?: string;
}

export async function sendPaymentConfirmationEmail(
  params: PaymentConfirmationParams,
) {
  const subject = "Payment Received - Reality Matchmaking";

  // Format amount (convert from cents to dollars)
  const formattedAmount = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: params.currency.toUpperCase(),
  }).format(params.amount / 100);

  // Escape HTML
  const escapeHtml = (str: string) => {
    const htmlEscapes: Record<string, string> = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return str.replace(/[&<>"']/g, (char) => htmlEscapes[char] ?? char);
  };

  const safeFirstName = escapeHtml(params.firstName);

  const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f8f9fa;">
  <div style="max-width: 600px; margin: 40px auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
    <!-- Header -->
    <div style="background: linear-gradient(135deg, #1a2332 0%, #2d3e50 100%); padding: 40px 20px; text-align: center;">
      <img
        src="${EMAIL_ASSET_BASE_URL}/email-logo.png"
        alt="Reality Matchmaking logo"
        width="60"
        height="60"
        style="display: inline-block; margin-bottom: 16px; border: 0; outline: none; text-decoration: none;"
      />
      <h1 style="color: white; margin: 0; font-size: 28px; font-weight: 600;">Payment Confirmed</h1>
    </div>

    <!-- Content -->
    <div style="padding: 40px 32px;">
      <p style="color: #1a2332; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
        Hi ${safeFirstName},
      </p>

      <p style="color: #1a2332; font-size: 16px; line-height: 1.6; margin: 0 0 24px;">
        Thank you for your payment! We've successfully received your application fee and you're one step closer to finding your match.
      </p>

      <!-- Payment Details -->
      <div style="background-color: #f8f9fa; border-radius: 8px; padding: 24px; margin: 32px 0;">
        <h3 style="color: #1a2332; margin: 0 0 20px; font-size: 18px; font-weight: 600;">Payment Details</h3>
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 12px 0; color: #4a5568; font-weight: 600; border-bottom: 1px solid #e2e8f0;">Amount Paid:</td>
            <td style="padding: 12px 0; color: #1a2332; font-weight: 700; font-size: 18px; text-align: right; border-bottom: 1px solid #e2e8f0;">${formattedAmount}</td>
          </tr>
          <tr>
            <td style="padding: 12px 0; color: #4a5568; font-weight: 600;">Date:</td>
            <td style="padding: 12px 0; color: #1a2332; text-align: right;">${new Date().toLocaleDateString(
              "en-US",
              {
                year: "numeric",
                month: "long",
                day: "numeric",
              },
            )}</td>
          </tr>
        </table>
      </div>

      <!-- Receipt Button -->
      <div style="text-align: center; margin: 32px 0;">
        <a href="${params.receiptUrl}" style="display: inline-block; background-color: #c8915f; color: white; text-decoration: none; padding: 14px 28px; border-radius: 6px; font-size: 15px; font-weight: 600; box-shadow: 0 2px 4px rgba(200, 145, 95, 0.3);">
          View Receipt
        </a>
      </div>

      <div style="background-color: #f8f9fa; border-left: 4px solid #c8915f; padding: 20px; margin: 32px 0; border-radius: 4px;">
        <h3 style="color: #1a2332; margin: 0 0 16px; font-size: 18px; font-weight: 600;">What's Next?</h3>
        <ol style="color: #4a5568; margin: 0; padding-left: 20px; line-height: 1.8;">
          <li style="margin-bottom: 12px;"><strong>Complete Your Profile:</strong> Fill in your detailed questionnaire</li>
          <li style="margin-bottom: 12px;"><strong>Background Check:</strong> Complete your identity verification and background check</li>
          <li style="margin-bottom: 12px;"><strong>Review Process:</strong> Our team will review your complete application</li>
          <li style="margin-bottom: 12px;"><strong>Approval:</strong> Once approved, you'll be invited to our next matchmaking event</li>
        </ol>
      </div>

      <p style="color: #4a5568; font-size: 14px; line-height: 1.6; margin: 32px 0 0; text-align: center;">
        Questions about your payment? Reply to this email and we'll be happy to help.
      </p>
    </div>

    <!-- Footer -->
    <div style="background-color: #f8f9fa; padding: 24px 32px; text-align: center; border-top: 1px solid #e2e8f0;">
      <p style="color: #718096; font-size: 12px; margin: 0 0 8px;">
        Reality Matchmaking
      </p>
      <p style="color: #a0aec0; font-size: 11px; margin: 0;">
        You received this email because you made a payment to Reality Matchmaking
      </p>
    </div>
  </div>
</body>
</html>
  `.trim();

  const text =
    `Hi ${safeFirstName},\n\n` +
    "Thank you for your payment! We've successfully received your application fee and you're one step closer to finding your match.\n\n" +
    "PAYMENT DETAILS\n\n" +
    `Amount Paid: ${formattedAmount}\n` +
    `Date: ${new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    })}\n\n` +
    `View your receipt: ${params.receiptUrl}\n\n` +
    "WHAT'S NEXT?\n\n" +
    "1. Complete Your Profile: Fill in your detailed questionnaire\n" +
    "2. Background Check: Complete your identity verification and background check\n" +
    "3. Review Process: Our team will review your complete application\n" +
    "4. Approval: Once approved, you'll be invited to our next matchmaking event\n\n" +
    "Questions about your payment? Reply to this email and we'll be happy to help.";

  return sendEmail({
    to: params.to,
    subject,
    html,
    text,
    emailType: "PAYMENT_CONFIRMATION",
    applicantId: params.applicantId,
  });
}
