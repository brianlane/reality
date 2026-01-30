import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

// Configure PostgreSQL connection pool with SSL support
// In development, we accept self-signed certificates
// In production, validate certificates unless explicitly disabled
const sslConfig =
  process.env.DATABASE_SSL === "false"
    ? false
    : {
        rejectUnauthorized: process.env.NODE_ENV === "production",
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
