// Prisma v7 configuration – central CLI config
// See: https://www.prisma.io/docs/orm/prisma-config and https://pris.ly/prisma-config
import 'dotenv/config';
import { defineConfig } from 'prisma/config';

// For `prisma generate` the datasource URL does not need to be a live DB.
// We allow a dummy fallback so that `npm run prisma:generate` works without
// a configured DATABASE_URL (useful for CI, scaffolding, and tests).
// At runtime, src/config/env.ts validates DATABASE_URL and src/lib/prisma.ts
// will throw a clear error if DATABASE_URL is missing or is the dummy placeholder.
const databaseUrl =
  process.env.DATABASE_URL || 'postgresql://dummy:dummy@localhost:5432/dummy?schema=public';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    // In production this should be a real Postgres connection string, e.g. Supabase pooled URL.
    // If you use Supabase PgBouncer (port 6543) for pooled connections, set DIRECT_URL to the
    // direct connection (port 5432) for migrations and uncomment directUrl below.
    url: databaseUrl,
    // directUrl: process.env.DIRECT_URL,
  },
});
