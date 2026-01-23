/**
 * CSRF Protection Utilities
 *
 * Next.js App Router provides built-in CSRF protection through:
 * 1. SameSite cookie attributes (handled by Supabase Auth)
 * 2. Origin header validation
 *
 * This module provides additional utilities for critical operations.
 */

import { headers } from "next/headers";

/**
 * Verify the request origin matches the expected origin
 * Use this for state-changing API operations
 */
export async function verifyOrigin(expectedOrigin?: string): Promise<boolean> {
  const headersList = await headers();
  const origin = headersList.get("origin");
  const referer = headersList.get("referer");

  const expected =
    expectedOrigin ||
    process.env.NEXT_PUBLIC_APP_URL ||
    "http://localhost:3000";

  // Check origin header (present for CORS requests)
  if (origin) {
    return origin === expected || origin.startsWith(expected);
  }

  // Fallback to referer (less reliable)
  if (referer) {
    try {
      const refererUrl = new URL(referer);
      const expectedUrl = new URL(expected);
      return refererUrl.origin === expectedUrl.origin;
    } catch {
      return false;
    }
  }

  // No origin or referer - likely same-origin, allow it
  return true;
}

/**
 * Middleware helper to check origin for POST/PUT/DELETE/PATCH requests
 */
export async function requireSameOrigin(): Promise<
  | { valid: true }
  | { valid: false; error: string; status: number }
> {
  const isValid = await verifyOrigin();

  if (!isValid) {
    return {
      valid: false,
      error: "CSRF validation failed: Invalid origin",
      status: 403,
    };
  }

  return { valid: true };
}

/**
 * Generate CSRF token for form submissions (if needed)
 * For now, we rely on SameSite cookies and origin validation
 */
export function generateCsrfToken(): string {
  // If you need explicit CSRF tokens in the future, implement here
  // For now, Next.js built-in protection is sufficient
  return "";
}
