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
- `npm run build` – generate the Prisma client and compile the backend plus client
- `npm start` – node dist/src/server.js
- `npm run typecheck` – tsc --noEmit
- `npm test` – vitest
- `npm run test:watch` – vitest --watch

## Architecture

See `src/app.ts` (no listener, testable) vs `src/server.ts` (listener + graceful shutdown).

Key dirs:
- `src/config/` – env (Zod), logger (Pino), CORS, component registry & repository config
- `src/lib/` – Prisma singleton with `pg` adapter, Supabase client
- `src/middleware/` – authenticate (Supabase JWT), authorize, request-context, error-handler, not-found
- `src/routes/` – health, component metadata & preview routes
- `src/services/` – component-resolver, source, and repository-provider services
- `src/modules/projects/` – minimal validated CRUD (auth required, owner-scoped)
- `src/integrations/` — provider boundaries and integration notes; inspect `src/services/` for the implemented GitHub App read integration
- `src/shared/` – errors, types, constants
- `src/jobs/` – placeholder for future workers
- `prisma/` – schema (v7: no URL, uses prisma.config.ts)
- `tests/` – unit + integration (Vitest + Supertest)

## Patch workflow integrations

See [API.md](./API.md) for the versioned request contracts. PATCHWORK currently stores patch, validation, release, and deployment lifecycle records. A trusted worker can report generation and validation outcomes through the signed internal callbacks; there is no queue, code-generation provider, or automatic worker dispatch in this repository. Starting a patch's `GENERATING` transition returns the server-created `generationId` the worker must use.

The GitHub App integration can install and enumerate authorized repositories, retrieve metadata, read bounded source files, create namespaced patch branches, commit bounded text changes with fast-forward-only ref updates, and open idempotent pull requests. It never merges, deletes branches, or writes to protected/default branches. Configure the App's Contents and Pull requests repository permissions as documented in [API.md](./API.md); environment variables alone do not grant GitHub permissions. Deployment endpoints create and update tracking records only; no Vercel API integration or webhook verifier is configured.

---

## Component Registry & Source Resolver

The Component Registry & Source Resolver module maps component IDs (`data-patchwork-id`) received from the visual editing frontend to their authorized source-code locations and loads the source code context for downstream LLM code-generation.

### Security Guarantees

1. **Client input is untrusted:** The browser sends only a component ID (`data-patchwork-id`). It is never allowed to specify or supply file paths.
2. **Path traversal protection:** Registered relative paths are strictly validated to prevent `..` escapes or symlink boundary crossings outside the configured repository root.
3. **Restricted editing scope:** Only components explicitly marked `editable: true` can be resolved or retrieved.
4. **Information hiding:** The public metadata endpoint (`GET /api/components/:componentId`) never exposes filesystem paths or source code to the client.

### How to Add a Component to the Registry

Edit `src/config/component-registry.ts`:

```ts
export const componentRegistry: ComponentRegistry = {
  // Add your component entry:
  'hero-heading': {
    id: 'hero-heading',                            // Must match data-patchwork-id and record key
    filePath: 'src/components/Hero.tsx',           // Repository-relative path (no absolute paths or '..')
    componentName: 'Hero',                         // Exported React symbol name
    editable: true,                                // Must be true for resolution
    editableScope: 'content',                      // 'content' | 'styles' | 'component'
    allowedOperations: ['text', 'styling'],        // Permitted operations for LLM prompting
    description: 'Main hero headline text',        // Context passed to LLM
    framework: 'react',                            // 'react' | 'next'
  },
};
```

Validate the registry schema at any time using:
```ts
import { validateRegistrySchema } from './src/config/component-registry';
validateRegistrySchema(componentRegistry);
```

### How to Switch to the Real Demo Repository

1. Set the target repository checkout path in your `.env`:
   ```env
   TARGET_REPOSITORY_PATH=/path/to/demo-website-repo
   ```
2. Replace entries in `src/config/component-registry.ts` with the actual `data-patchwork-id` values, component names, and file paths present in the demo repository.
3. Run tests to verify path resolution and file existence:
   ```bash
   npm test
   ```
No resolver logic, routes, controllers, or LLM service interfaces need to be modified when switching repositories or updating components.

### API Endpoints

- `GET /api/components` – List safe metadata for all registered editable components.
- `GET /api/components/:componentId` – Retrieve safe metadata for a specific component.
- `GET /api/components/:componentId/source` – Development/internal source context preview (requires auth in production).

### Assumptions & Limitations

- **Local repository provider:** The initial provider reads from a local Git checkout directory. Future iterations can plug in a `GitHubRepositoryProvider` via the `RepositoryProvider` interface without altering the resolver.
- **Manual registry:** The current registry is configuration-driven. AST-based auto-discovery can be integrated later behind the same `ComponentRegistry` interface.
- **Framework support:** Initial targets are React and Next.js repositories.

