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
const getDatabaseUrl = (): string => {
  const url = process.env.DATABASE_URL || "";
  try {
    const parsedUrl = new URL(url);
    // Remove sslmode parameter to avoid conflicts with pool SSL config
    parsedUrl.searchParams.delete("sslmode");
    return parsedUrl.toString();
  } catch {
    // If URL parsing fails, return as-is
    return url;
  }
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
