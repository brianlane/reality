import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { db } from "@/lib/db";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

/**
 * Keep-alive endpoint for Supabase free tier.
 *
 * Supabase auto-pauses free-tier projects after 7 days of inactivity.
 * This route is hit daily by a Vercel Cron (see vercel.json) and makes a
 * cheap call against both:
 *   - the Supabase REST/Auth API (so Supabase's "last activity" timer resets), and
 *   - the Postgres connection pool via Prisma (belt-and-suspenders).
 *
 * Auth: requires `Authorization: Bearer <CRON_SECRET>`. Vercel's cron system
 * sends this header automatically when `CRON_SECRET` is set as a project env
 * var. We deliberately do NOT trust the `x-vercel-cron` header — Vercel does
 * not document it as being stripped from external requests, so it is not a
 * safe auth signal.
 *
 * See: https://vercel.com/docs/cron-jobs/manage-cron-jobs#securing-cron-jobs
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json(
      {
        error: {
          code: "MISCONFIGURED",
          message: "CRON_SECRET is not set on the server",
        },
      },
      { status: 503 },
    );
  }

  const authHeader = request.headers.get("authorization") ?? "";
  const expected = `Bearer ${secret}`;
  if (!constantTimeEqual(authHeader, expected)) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Invalid cron secret" } },
      { status: 401 },
    );
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

function constantTimeEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a, "utf8");
  const bBuf = Buffer.from(b, "utf8");
  if (aBuf.length !== bBuf.length) {
    // Still compare against `aBuf` to keep timing roughly independent of
    // whether the lengths happened to match.
    timingSafeEqual(aBuf, aBuf);
    return false;
  }
  return timingSafeEqual(aBuf, bBuf);
}
