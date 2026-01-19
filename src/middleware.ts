import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

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

export async function middleware(request: NextRequest) {
  const response = NextResponse.next();
  const e2eEnabled = process.env.E2E_AUTH_ENABLED === "true";
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

  const { pathname } = request.nextUrl;
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
      return NextResponse.redirect(redirectUrl);
    }
  }

  if (isApplicantRoute(pathname) && !user) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/sign-in";
    redirectUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/dashboard/:path*",
    "/application/:path*",
    "/events/:path*",
    "/matches/:path*",
    "/settings/:path*",
  ],
};
