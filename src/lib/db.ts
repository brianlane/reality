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

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
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
