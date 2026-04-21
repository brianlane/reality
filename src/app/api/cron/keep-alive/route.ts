import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

// Prevent Next from trying to statically optimize / cache this route.
export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * Keep-alive endpoint for Supabase free tier.
 *
 * Supabase auto-pauses free-tier projects after 7 days of inactivity.
 * This route is hit daily by a Vercel Cron (see vercel.json) and makes a
 * cheap call against both:
 *   - the Supabase REST/Auth API (so Supabase's "last activity" timer resets), and
 *   - the Postgres connection pool via Prisma (belt-and-suspenders).
 *
 * Auth: Vercel's cron system sends `Authorization: Bearer <CRON_SECRET>`
 * when the `CRON_SECRET` env var is set in the Vercel project. We also
 * accept Vercel's internal `x-vercel-cron` header as a fallback.
 *
 * See: https://vercel.com/docs/cron-jobs/manage-cron-jobs#securing-cron-jobs
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const isVercelCron = request.headers.get("x-vercel-cron") === "1";
  const secret = process.env.CRON_SECRET;

  if (secret) {
    const expected = `Bearer ${secret}`;
    if (authHeader !== expected && !isVercelCron) {
      return NextResponse.json(
        { error: { code: "UNAUTHORIZED", message: "Invalid cron secret" } },
        { status: 401 },
      );
    }
  }

  const results: Record<string, unknown> = {
    timestamp: new Date().toISOString(),
  };

  try {
    await db.$queryRaw`SELECT 1`;
    results.db = "ok";
  } catch (err) {
    results.db = `error: ${(err as Error).message}`;
  }

  try {
    const supabase = createSupabaseAdminClient();
    if (!supabase) {
      results.supabase = "skipped: missing env vars";
    } else {
      const { error } = await supabase.auth.admin.listUsers({
        page: 1,
        perPage: 1,
      });
      results.supabase = error ? `error: ${error.message}` : "ok";
    }
  } catch (err) {
    results.supabase = `error: ${(err as Error).message}`;
  }

  return NextResponse.json(results);
}
