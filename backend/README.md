# PATCHWORK Backend

Hotfix the Internet – modular Express + TypeScript foundation.

## Quick start (no DB or Supabase required for health check)

```bash
npm install
cp .env.example .env   # no real secrets needed for health check
npm run dev            # http://localhost:4000/api/health
```

## With database (Prisma v7 + Postgres via Supabase)

1. Set `DATABASE_URL` (and optionally `DIRECT_URL` if using PgBouncer) in `.env`.
2. Set `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` (anon) for auth.
3. Generate client and validate:

```bash
npm run prisma:generate
npm run prisma:validate
npm run prisma:migrate:dev   # only when you want a migration
```

See root `README.md` for the full PATCHWORK plan.

## Scripts

- `npm run dev` – tsx watch
- `npm run build` – tsc
- `npm start` – node dist/server.js
- `npm run typecheck` – tsc --noEmit
- `npm test` – vitest
- `npm run test:watch` – vitest --watch

## Architecture

See `src/app.ts` (no listener, testable) vs `src/server.ts` (listener + graceful shutdown).

Key dirs:
- `src/config/` – env (Zod), logger (Pino), CORS
- `src/lib/` – Prisma singleton with `pg` adapter, Supabase client
- `src/middleware/` – authenticate (Supabase JWT), authorize, request-context, error-handler, not-found
- `src/routes/` – health
- `src/modules/projects/` – minimal validated CRUD (auth required, owner-scoped)
- `src/integrations/` – llm, github, vercel, playwright (stubs)
- `src/shared/` – errors, types, constants
- `src/jobs/` – placeholder for future workers
- `prisma/` – schema (v7: no URL, uses prisma.config.ts)
- `tests/` – unit + integration (Vitest + Supertest)
