# PATCHWORK — Merge & Feature Summary (Persons 1–3)

## 1. What this merge is

| Item | Value |
|---|---|
| Branch | `testin` |
| Created from | `origin/github-backend-integration` (`307d239`) |
| Merged in | `final-git-integration` (`9c95ec9`, Person 3 LLM+Git integration) |
| Merge commit | `c686ba2` |
| Base of both sides | `2605a1f` (local edit pipeline + iframe selection) |

`testin` now unites the two workstreams that had diverged:

- **`github-backend-integration`** — GitHub App install status, patchwork-registry
  checks, and a GitHub-backed repository provider.
- **`final-git-integration`** — Person 3's LLM + Git execution pipeline (Groq
  provider, diff validation, orchestration, branch/commit/PR, worker callbacks),
  which already contained Person 1's frontend branch and Person 2's `origin/backend`
  work (commit `4e5a54d`) folded in.

### Conflicts resolved (9 files)

| File | Resolution |
|---|---|
| `backend/src/services/github-app.service.ts` | Kept `404 → notFound` and `403 → forbidden` (needed by `checkPatchworkSupport` / `readSource`), **and** `409/422 → conflict` from the integrated side. Both write ops and the ported `getInstallation` / `checkPatchworkSupport` / `createRepositoryProvider` are present. |
| `backend/src/modules/github/github.routes.ts` | Kept **both** the `installation` + `patchwork` routes and the write routes (`branches` / `commits` / `pulls`). |
| `backend/src/routes/index.ts` | Took the integrated superset (health, patches, projects, llm, components, edits, github, internal/workflow, deployments, releases). |
| `backend/src/config/env.ts` | Took the integrated superset (`GROQ_*`, `INTERNAL_WORKER_SECRET`, GitHub App vars). |
| `backend/.env.example` | Took the integrated superset. |
| `frontend/.env.example` | Superset; retained `VITE_API_URL` (used by the current dashboard). |
| `.gitignore` | Took the integrated version. |
| `frontend/src/App.tsx` | Took the current dashboard UI. |
| `frontend/src/App.css` | Took the current dashboard styles. |

`backend/src/services/repository-provider.service.ts` auto-merged and now includes
the `GithubRepositoryProvider` / `GithubContentReader` additions.

### Verification after the merge

- Backend `tsc --noEmit` — clean
- Backend `npm run build` — clean
- Backend tests — **24 files / 179 tests passing** (was 148 on `final-git-integration`; the
  branch's GitHub App/route tests came in with the merge)
- Frontend `tsc -b && vite build` — clean; `oxlint` — clean
- No conflict markers remain anywhere in tracked files

---

## 2. Features by owner

### Person 1 — Frontend & Visual Editor

Owns the editing UI and the human interaction layer.

- **Editor shell / dashboard** — `frontend/src/App.tsx`, `Sidebar.tsx`,
  `PreviewPane.tsx`, `Inspector.tsx`, `WebsitesView.tsx`, `App.css`.
- **Click-to-select supported elements** — `frontend/src/patchwork-bridge.ts` and
  `frontend/src/selection-protocol.ts` implement the iframe ↔ dashboard message
  contract; the backend `component-registry` maps the reported `data-patchwork-id`
  to a trusted source file.
- **Inspector panel** — element properties, natural-language prompt input, diff
  viewer, simulated badge, and branch / commit / PR metadata display.
- **GitHub connection UX** — "Sign in with GitHub", repository browsing,
  **install-status badge** (`GET /api/github/installation` →
  `Installed · #<id>` / `Not connected`), and a **patchwork-support indicator**
  (`GET /api/github/repositories/:id/patchwork`).
- **Typed API client** — `frontend/src/api-client.ts` (accepts both
  `VITE_API_URL` and `VITE_API_BASE_URL` spellings).

### Person 2 — Backend & Database

Owns API contracts, persistence, and state transitions.

- **Express backend + middleware** — auth, trusted-worker HMAC auth, error
  handling, security headers, health endpoint (`backend/src/app.ts`,
  `backend/src/routes/index.ts`).
- **Database / ORM** — Prisma schema and migrations for `Project`, `Patch`, and
  `AuditLog`, including `Patch` lifecycle columns (branch/base/head SHA, PR
  number/URL, changed files, validation details) and extended `AuditAction`
  enum values.
- **Projects & patches modules** — owner-scoped CRUD, a **forward-only status
  state machine** (DRAFT → GENERATING → GENERATED → VALIDATING →
  READY_FOR_REVIEW → APPROVED → MERGED, with FAILED / CANCELLED / REJECTED
  terminals), and audit logging.
- **Component registry & source resolution** — trusted server-side
  component→file mapping and source reads (`config/component-registry.ts`,
  `services/component-resolver.service.ts`, `services/source.service.ts`).
- **GitHub App service & routes** — App JWT auth, install setup/callback with
  signed state, repository listing, source retrieval, **install status**, and
  **patchwork-registry support checks**; plus the GitHub-backed
  `GithubRepositoryProvider`.
- **Workflow callbacks** — trusted worker path with HMAC signature verification,
  timestamp bounds, raw-body checks, and idempotent/stale-result rejection.
- **Deployments & releases modules** for release/deployment history.

### Person 3 — LLM & Git (intelligence + source-control engine)

Owns turning a natural-language request into a safe, isolated, reviewable change.

- **Groq integration** — `backend/src/integrations/llm/groq.ts` (constrained
  prompt building, retry on transient errors, timeout, response parsing) and
  `provider.ts` (Mock + Groq behind a `PatchProvider` interface, explicit
  selection via `LLM_PROVIDER`, no silent fallback).
- **Style-consistent generation** — `backend/src/services/style-context.service.ts`
  extracts the target site's design tokens, reusable classes, and co-located
  component CSS into a bounded style guide injected into the prompt, so edits
  match the page's look while still honoring the user's instruction.
- **Diff validation** — `backend/src/services/patch-validation.service.ts`
  (unified-diff parsing, traversal/absolute-path rejection, context matching,
  single-file enforcement, size + extension allow-list).
- **Edit orchestration** — `backend/src/services/edit-orchestration.service.ts`
  applies accepted hunks to an isolated temp copy and proves the repository is
  untouched; `POST /api/edits/generate` and `POST /api/llm/generate-patch`.
- **Patch generation engine** — `backend/src/services/patch-generation.service.ts`:
  trusted source resolution, state-machine integration, server-issued
  generation-ID binding, two-phase validation, real Git branch/commit via the
  GitHub App, and persisted failure categories.
- **Git operations** — `backend/src/integrations/git/branch.ts` (safe
  `patch/<component>-<slug>` naming) and the GitHub write flow (idempotent
  branch creation, blob/tree/commit with `force:false`, approval-gated PR
  creation with content markers).
- **Source-control safety** — expected-head SHA protection, single-file scope,
  no default-branch mutation before approval, and no credential/source leakage.

---

## 3. End-to-end path after the merge

1. Person 1 selects a registry-backed element in the iframe and submits an
   instruction.
2. Person 2's backend resolves the component to its trusted file, persists a
   patch record, and drives status transitions + audit.
3. Person 3 builds a constrained prompt (**with the page's style context**),
   calls Groq, validates the diff against fresh source, then creates an isolated
   branch and commits the change.
4. Person 1 reviews the diff / branch / commit in the Inspector; approval gates
   PR creation.
5. Preview / deployment coordination (Person 4) consumes the branch + commit SHA.

## 4. Notes / follow-ups

- `context/person3_summary.md` and `context/test_person3.md` were left
  **untracked**. `test_person3.md` contains a live Groq API key and must **not**
  be committed — rotate it and keep it out of version control.
- The base surgery is verified (typecheck/build/tests/lint), but a live
  end-to-end run against a real Groq key and a test GitHub App installation is
  still required before release.
