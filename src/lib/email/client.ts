/**
 * Email Client
 *
 * Handles email sending via Resend API with database logging.
 */

import { Resend } from 'resend';
import { SendEmailParams } from './types';
import { db } from '@/lib/db';

const resend = new Resend(process.env.RESEND_API_KEY);

export async function sendEmail(params: SendEmailParams) {
  // Validate required environment variables
  if (!process.env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY environment variable is not set');
  }

  if (!process.env.EMAIL_FROM_ADDRESS) {
    throw new Error('EMAIL_FROM_ADDRESS environment variable is not set');
  }

  const fromName = process.env.EMAIL_FROM_NAME || 'Reality Matchmaking';
  const fromAddress = process.env.EMAIL_FROM_ADDRESS;

  // Send email via Resend
  const { data, error } = await resend.emails.send({
    from: `${fromName} <${fromAddress}>`,
    to: params.to,
    subject: params.subject,
    html: params.html,
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
        status: error ? 'FAILED' : 'SENT',
        failureReason: error?.message || null,
        applicantId: params.applicantId || null,
      },
    });
  } catch (logError) {
    console.error('Failed to log email to database:', logError);
    // Continue execution - logging failure shouldn't prevent email sending
  }

  if (error) {
    console.error('Email sending failed:', {
      emailType: params.emailType,
      recipient: params.to,
      error: error.message,
    });
    throw new Error(`Failed to send email: ${error.message}`);
  }

  console.log('Email sent successfully:', {
    emailType: params.emailType,
    recipient: params.to,
    resendId: data?.id,
  });

  return data;
}
