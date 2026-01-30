import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

// Configure PostgreSQL connection pool with SSL support
// SSL can be controlled via environment variables:
// - DATABASE_SSL=false: Disable SSL entirely (not recommended for remote DBs)
// - DATABASE_SSL_REJECT_UNAUTHORIZED=true: Require valid certificate chain (strict mode)
// By default, SSL is enabled but accepts self-signed/unverified certificates
// This is necessary for many managed DB providers (Supabase, Neon, etc.)
const sslConfig =
  process.env.DATABASE_SSL === "false"
    ? false
    : {
        // Default to accepting certificates; set DATABASE_SSL_REJECT_UNAUTHORIZED=true for strict mode
        rejectUnauthorized:
          process.env.DATABASE_SSL_REJECT_UNAUTHORIZED === "true",
      };

// Remove sslmode from DATABASE_URL since we configure SSL via the pool options
// This prevents conflicts between URL sslmode and pool ssl config
// Uses regex instead of URL parsing to preserve multi-host connection strings
const getDatabaseUrl = (): string => {
  const url = process.env.DATABASE_URL || "";
  // Remove sslmode parameter (handles both ?sslmode=x and &sslmode=x cases)
  return url
    .replace(/[?&]sslmode=[^&]*/g, (match, offset) => {
      // If this was the first param (started with ?), check if there are more params
      if (match.startsWith("?")) {
        // Check if there are remaining params after this one
        const remaining = url.slice(offset + match.length);
        return remaining.startsWith("&") ? "?" : "";
      }
      return "";
    })
    .replace(/\?&/, "?"); // Clean up ?& if sslmode was first of multiple params
};

const pool = new Pool({
  connectionString: getDatabaseUrl(),
  ssl: sslConfig,
});

const adapter = new PrismaPg(pool);

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    adapter,
    log: ["error", "warn"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
