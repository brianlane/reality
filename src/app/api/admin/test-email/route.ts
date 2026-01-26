/**
 * Test Email Endpoint
 *
 * Admin-only endpoint for testing email templates and Resend integration.
 */

import { getAuthUser, requireAdmin } from '@/lib/auth';
import { errorResponse, successResponse } from '@/lib/api-response';
import { sendWaitlistConfirmationEmail, sendWaitlistInviteEmail } from '@/lib/email/waitlist';
import { sendPaymentConfirmationEmail } from '@/lib/email/payment';
import { sendApplicationApprovalEmail } from '@/lib/email/approval';
import { sendEventInvitationEmail } from '@/lib/email/events';
import { sendApplicationStatusEmail } from '@/lib/email/status';

type TestEmailType =
  | 'WAITLIST_CONFIRMATION'
  | 'WAITLIST_INVITE'
  | 'PAYMENT_CONFIRMATION'
  | 'APPLICATION_APPROVAL'
  | 'EVENT_INVITATION'
  | 'STATUS_UPDATE_SCREENING'
  | 'STATUS_UPDATE_REJECTED'
  | 'STATUS_UPDATE_PAYMENT_PENDING';

type RequestBody = {
  emailType: TestEmailType;
  recipientEmail: string;
};

export async function POST(request: Request) {
  // Verify admin authentication
  const auth = await getAuthUser();
  if (!auth) {
    return errorResponse('UNAUTHORIZED', 'User not authenticated', 401);
  }
  if (!auth.email) {
    return errorResponse('UNAUTHORIZED', 'Email not available', 401);
  }
  try {
    requireAdmin(auth.email);
  } catch (error) {
    return errorResponse('FORBIDDEN', (error as Error).message, 403);
  }

  let body: RequestBody;
  try {
    body = await request.json();
  } catch {
    return errorResponse('VALIDATION_ERROR', 'Invalid request body', 400);
  }

  const { emailType, recipientEmail } = body;

  if (!emailType || !recipientEmail) {
    return errorResponse(
      'VALIDATION_ERROR',
      'emailType and recipientEmail are required',
      400
    );
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(recipientEmail)) {
    return errorResponse('VALIDATION_ERROR', 'Invalid email address', 400);
  }

  try {
    let result;

    switch (emailType) {
      case 'WAITLIST_CONFIRMATION':
        result = await sendWaitlistConfirmationEmail({
          to: recipientEmail,
          firstName: 'Test User',
          applicationId: 'test_app_123',
        });
        break;

      case 'WAITLIST_INVITE':
        result = await sendWaitlistInviteEmail({
          to: recipientEmail,
          firstName: 'Test User',
          inviteToken: 'test_token_123',
        });
        break;

      case 'PAYMENT_CONFIRMATION':
        result = await sendPaymentConfirmationEmail({
          to: recipientEmail,
          firstName: 'Test User',
          amount: 19900, // $199.00 in cents
          currency: 'usd',
          receiptUrl: 'https://stripe.com/receipts/test',
        });
        break;

      case 'APPLICATION_APPROVAL':
        result = await sendApplicationApprovalEmail({
          to: recipientEmail,
          firstName: 'Test User',
          applicantId: 'test_applicant_123',
        });
        break;

      case 'EVENT_INVITATION':
        const testDate = new Date();
        testDate.setDate(testDate.getDate() + 7); // 7 days from now

        const testStartTime = new Date(testDate);
        testStartTime.setHours(19, 0, 0, 0); // 7:00 PM

        const testEndTime = new Date(testDate);
        testEndTime.setHours(22, 0, 0, 0); // 10:00 PM

        result = await sendEventInvitationEmail({
          to: recipientEmail,
          firstName: 'Test User',
          eventTitle: 'Spring Matchmaking Mixer',
          eventDate: testDate,
          eventLocation: 'The Metropolitan Club',
          eventAddress: '123 Main Street, New York, NY 10001',
          startTime: testStartTime,
          endTime: testEndTime,
          rsvpUrl: `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/events/test/rsvp`,
        });
        break;

      case 'STATUS_UPDATE_SCREENING':
        result = await sendApplicationStatusEmail({
          to: recipientEmail,
          firstName: 'Test User',
          status: 'SCREENING_IN_PROGRESS',
        });
        break;

      case 'STATUS_UPDATE_REJECTED':
        result = await sendApplicationStatusEmail({
          to: recipientEmail,
          firstName: 'Test User',
          status: 'REJECTED',
          message: 'This is a test rejection message.',
        });
        break;

      case 'STATUS_UPDATE_PAYMENT_PENDING':
        result = await sendApplicationStatusEmail({
          to: recipientEmail,
          firstName: 'Test User',
          status: 'PAYMENT_PENDING',
        });
        break;

      default:
        return errorResponse(
          'VALIDATION_ERROR',
          `Unknown email type: ${emailType}`,
          400
        );
    }

    return successResponse({
      message: 'Test email sent successfully',
      emailType,
      recipientEmail,
      resendId: result?.id,
    });
  } catch (error) {
    console.error('Test email send failed:', error);
    return errorResponse(
      'INTERNAL_SERVER_ERROR',
      `Failed to send test email: ${(error as Error).message}`,
      500
    );
  }
}
