import "dotenv/config";
import { defineConfig } from "prisma/config";

const databaseUrl =
  process.env.DATABASE_URL ||
  "postgresql://dummy:dummy@localhost:5432/dummy?schema=public";

const migrationUrl = process.env.DIRECT_URL || databaseUrl;

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  datasource: {
    url: migrationUrl,
  },
});