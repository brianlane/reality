/**
 * Payment Confirmation Email
 *
 * Sends payment confirmation emails with receipt information.
 */

import { sendEmail } from "./client";
import { getPaymentConfirmationHTML } from "./templates";

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
  const html = getPaymentConfirmationHTML(params);

  // Format amount (convert from cents to dollars)
  const formattedAmount = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: params.currency.toUpperCase(),
  }).format(params.amount / 100);

  const text =
    `Hi ${params.firstName},\n\n` +
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
