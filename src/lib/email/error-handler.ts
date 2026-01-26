/**
 * Email Error Handler
 *
 * Provides retry logic with exponential backoff for failed email sends.
 */

import { EmailSendResult } from "./types";

export async function sendEmailWithRetry(
  emailFn: () => Promise<unknown>,
  maxRetries = 3,
): Promise<EmailSendResult> {
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await emailFn();
      console.log(`Email sent successfully on attempt ${attempt}`);
      return { success: true, data: result };
    } catch (error) {
      lastError = error as Error;
      console.error(`Email attempt ${attempt}/${maxRetries} failed:`, {
        error: lastError.message,
        attempt,
      });

      // Don't retry on the last attempt
      if (attempt < maxRetries) {
        // Exponential backoff: 1s, 2s, 4s
        const delayMs = Math.pow(2, attempt - 1) * 1000;
        console.log(`Retrying in ${delayMs}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  console.error(`All ${maxRetries} email send attempts failed`);
  return {
    success: false,
    error: lastError?.message || "Unknown error occurred",
  };
}
