// prisma.config.ts
import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    // Use direct (non-pooled) connection for migrations
    // Falls back to DATABASE_URL in CI environments where only DATABASE_URL is set
    // Uses placeholder URL when no database is available (e.g., for type generation in CI)
    url:
      process.env.DIRECT_DATABASE_URL ||
      process.env.DATABASE_URL ||
      "postgresql://placeholder:placeholder@localhost:5432/placeholder",
  },
});
