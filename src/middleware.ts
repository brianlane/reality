import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { rateLimit, RATE_LIMITS } from "@/lib/rate-limit";

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const method = request.method;

  // CSRF Protection: Verify origin for state-changing requests to API routes
  if (
    pathname.startsWith("/api/") &&
    !pathname.includes("/api/webhooks/") &&
    (method === "POST" || method === "PUT" || method === "DELETE" || method === "PATCH")
  ) {
    const origin = request.headers.get("origin");
    const referer = request.headers.get("referer");
    const expectedOrigin =
      process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    let originValid = false;

    if (origin) {
      originValid = origin === expectedOrigin || origin.startsWith(expectedOrigin);
    } else if (referer) {
      try {
        const refererUrl = new URL(referer);
        const expectedUrl = new URL(expectedOrigin);
        originValid = refererUrl.origin === expectedUrl.origin;
      } catch {
        originValid = false;
      }
    } else {
      // Same-origin requests may not have origin/referer
      originValid = true;
    }

    if (!originValid) {
      return new NextResponse(
        JSON.stringify({
          error: "FORBIDDEN",
          message: "CSRF validation failed",
        }),
        {
          status: 403,
          headers: { "Content-Type": "application/json" },
        },
      );
    }
  }

  // Determine rate limit config based on path
  let config = RATE_LIMITS.API;
  let identifier = getIdentifier(request);

  if (pathname.includes("/api/webhooks/")) {
    // Webhooks should come from specific IPs, but apply generous limit
    config = RATE_LIMITS.WEBHOOK;
  } else if (
    pathname.includes("/sign-in") ||
    pathname.includes("/admin/login") ||
    pathname.includes("/api/auth")
  ) {
    // Strict rate limiting for auth endpoints
    config = RATE_LIMITS.AUTH;
  } else if (pathname.includes("/upload")) {
    config = RATE_LIMITS.UPLOAD;
  }

  // Apply rate limiting
  const result = rateLimit(identifier, config);

  if (!result.success) {
    return new NextResponse(
      JSON.stringify({
        error: "TOO_MANY_REQUESTS",
        message: "Rate limit exceeded. Please try again later.",
        retryAfter: Math.ceil((result.reset - Date.now()) / 1000),
      }),
      {
        status: 429,
        headers: {
          "Content-Type": "application/json",
          "Retry-After": String(Math.ceil((result.reset - Date.now()) / 1000)),
          "X-RateLimit-Limit": String(result.limit),
          "X-RateLimit-Remaining": String(result.remaining),
          "X-RateLimit-Reset": String(result.reset),
        },
      },
    );
  }

  // Add rate limit headers to successful responses
  const response = NextResponse.next();
  response.headers.set("X-RateLimit-Limit", String(result.limit));
  response.headers.set("X-RateLimit-Remaining", String(result.remaining));
  response.headers.set("X-RateLimit-Reset", String(result.reset));

  return response;
}

function getIdentifier(request: NextRequest): string {
  // Try to get IP from various headers (for proxies/load balancers)
  const forwarded = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  const ip = forwarded?.split(",")[0] ?? realIp ?? "anonymous";

  // For API routes, use IP + pathname for more granular limiting
  if (request.nextUrl.pathname.startsWith("/api/")) {
    return `${ip}:${request.nextUrl.pathname}`;
  }

  return ip;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization)
     * - favicon.ico, logo.png (static assets)
     */
    "/((?!_next/static|_next/image|favicon.ico|logo.png|.*\\.svg$).*)",
  ],
};
