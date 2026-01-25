import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { rateLimit, RATE_LIMITS, type RateLimitConfig } from "@/lib/rate-limit";

type AuthUser = {
  id: string;
  email: string | null;
};

const applicantPrefixes = [
  "/dashboard",
  "/application",
  "/events",
  "/matches",
  "/settings",
];

function isApplicantRoute(pathname: string) {
  return applicantPrefixes.some((prefix) => pathname.startsWith(prefix));
}

function redirectWithCookies(response: NextResponse, url: URL): NextResponse {
  const redirectResponse = NextResponse.redirect(url);
  response.cookies.getAll().forEach((cookie) => {
    redirectResponse.cookies.set(cookie);
  });
  return redirectResponse;
}

function getIdentifier(
  request: NextRequest,
  configKey: keyof typeof RATE_LIMITS,
) {
  const forwarded = request.headers.get("x-forwarded-for");
  const realIp = request.headers.get("x-real-ip");
  const ip = forwarded?.split(",")[0]?.trim() || realIp?.trim() || "anonymous";

  if (configKey === "API") {
    return `${ip}:${configKey.toLowerCase()}:${request.nextUrl.pathname}`;
  }

  return `${ip}:${configKey.toLowerCase()}`;
}

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const method = request.method;

  // CSRF Protection: Verify origin for state-changing requests to API routes
  if (
    pathname.startsWith("/api/") &&
    !pathname.startsWith("/api/webhooks/") &&
    (method === "POST" ||
      method === "PUT" ||
      method === "DELETE" ||
      method === "PATCH")
  ) {
    const origin = request.headers.get("origin");
    const referer = request.headers.get("referer");
    const expectedOrigin =
      process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

    let originValid = false;

    if (origin) {
      try {
        const originUrl = new URL(origin);
        const expectedUrl = new URL(expectedOrigin);
        originValid = originUrl.origin === expectedUrl.origin;
      } catch {
        originValid = false;
      }
    } else if (referer) {
      try {
        const refererUrl = new URL(referer);
        const expectedUrl = new URL(expectedOrigin);
        originValid = refererUrl.origin === expectedUrl.origin;
      } catch {
        originValid = false;
      }
    } else {
      // No origin or referer - reject for API routes
      originValid = false;
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

  // Rate Limiting
  let configKey: keyof typeof RATE_LIMITS = "API";

  if (pathname.includes("/api/webhooks/")) {
    configKey = "WEBHOOK";
  } else if (
    method === "POST" &&
    (pathname.includes("/sign-in") ||
      pathname.includes("/admin/login") ||
      pathname.includes("/api/auth") ||
      pathname.includes("/forgot-password") ||
      pathname.includes("/reset-password") ||
      pathname.includes("/create-password"))
  ) {
    configKey = "AUTH";
  } else if (pathname.includes("/upload")) {
    configKey = "UPLOAD";
  }

  const config: RateLimitConfig = RATE_LIMITS[configKey];
  const identifier = getIdentifier(request, configKey);

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

  const response = NextResponse.next();

  // Add rate limit headers
  response.headers.set("X-RateLimit-Limit", String(result.limit));
  response.headers.set("X-RateLimit-Remaining", String(result.remaining));
  response.headers.set("X-RateLimit-Reset", String(result.reset));

  const e2eEnabled =
    process.env.E2E_AUTH_ENABLED === "true" &&
    (process.env.NODE_ENV !== "production" ||
      (process.env.CI === "true" && process.env.E2E_AUTH_ALLOW_CI === "true"));
  const e2eUserId = request.headers.get("x-e2e-user-id");
  const e2eUserEmail = request.headers.get("x-e2e-user-email");
  const e2eUser: AuthUser | null =
    e2eEnabled && (e2eUserId || e2eUserEmail)
      ? { id: e2eUserId ?? "e2e-user", email: e2eUserEmail ?? null }
      : null;

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  let user: AuthUser | null = e2eUser;

  if (!user && supabaseUrl && supabaseAnonKey) {
    const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
      cookies: {
        get(name) {
          return request.cookies.get(name)?.value;
        },
        set(name, value, options) {
          response.cookies.set({ name, value, ...options });
        },
        remove(name, options) {
          response.cookies.set({ name, value: "", ...options });
        },
      },
    });

    const {
      data: { user: supabaseUser },
    } = await supabase.auth.getUser();
    user = supabaseUser
      ? { id: supabaseUser.id, email: supabaseUser.email ?? null }
      : null;
  }

  const isAdminRoute = pathname.startsWith("/admin");
  const isAdminLogin = pathname.startsWith("/admin/login");

  if (isAdminRoute && !isAdminLogin) {
    const adminEmail = process.env.ADMIN_EMAIL;
    const isAdmin =
      user?.email && adminEmail
        ? user.email.toLowerCase() === adminEmail.toLowerCase()
        : false;

    if (!isAdmin) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/admin/login";
      redirectUrl.searchParams.set("next", pathname);
      return redirectWithCookies(response, redirectUrl);
    }
  }

  if (isApplicantRoute(pathname)) {
    const adminEmail = process.env.ADMIN_EMAIL;
    const isAdmin =
      user?.email && adminEmail
        ? user.email.toLowerCase() === adminEmail.toLowerCase()
        : false;

    if (isAdmin) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/admin";
      return redirectWithCookies(response, redirectUrl);
    }
  }

  if (isApplicantRoute(pathname) && !user) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/sign-in";
    redirectUrl.searchParams.set("next", pathname);
    return redirectWithCookies(response, redirectUrl);
  }

  return response;
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
