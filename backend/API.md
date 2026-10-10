# PATCHWORK Backend API contracts

All user endpoints require `Authorization: Bearer <Supabase access token>`. The API derives user identity from the verified token and scopes project operations to that user's `ownerId`. Responses use `{ "success": true, "data": ... }`; errors use the shared `{ "success": false, "error": { "code", "message" } }` shape.

## Projects

- `POST /api/projects` — create a project. Body: `{ "name": "Storefront", "description": "optional", "repositoryIdentifier": "123456", "repositoryUrl": "https://github.com/acme/storefront", "productionBranch": "main" }`. `repositoryUrl`, `repositoryIdentifier`, `description`, and `productionBranch` are optional. The authenticated user becomes the owner. Creation is audited.
- `GET /api/projects` — list the authenticated user's projects.
- `GET /api/projects/:id` — retrieve an owned project; inaccessible IDs return 404.
- `PATCH /api/projects/:id` — update one or more of `name`, `description`, `repositoryUrl`, `repositoryIdentifier`, and `productionBranch`. Send `null` to clear nullable fields. Updates are owner-scoped and audited.

## Patches and history

- `POST /api/projects/:projectId/patches` — create a draft from `{ "prompt": "..." }`.
- `GET /api/projects/:projectId/patches` — list patches for an owned project.
- `GET /api/projects/:projectId/patches/:patchId` — retrieve a patch in its project.
- `PATCH /api/projects/:projectId/patches/:patchId/status` — owner-driven allowed transitions only: `DRAFT → GENERATING/CANCELLED`, `GENERATED → VALIDATING`, and `READY_FOR_REVIEW → APPROVED/REJECTED`. This endpoint cannot claim generation or validation success.
- `GET /api/projects/:projectId/patches/:patchId/history?page=1&limit=20` — owner-scoped audit activity, ordered newest first by timestamp then ID. `limit` is 1–100. Sensitive/unrecognized audit metadata is omitted.

## Trusted generation and validation callbacks

These callbacks require an HMAC signature made with `INTERNAL_WORKER_SECRET`; a Supabase bearer token is not sufficient. Configure a random secret of at least 32 bytes in the backend environment and the trusted worker's secret store. Never send it to a browser.

The worker signs the exact raw UTF-8 JSON request body using this message:

```text
<unix-seconds>.<UPPERCASE-METHOD>.<path-without-query>.<raw-body>
```

Send `X-Patchwork-Timestamp: <unix-seconds>` and `X-Patchwork-Signature: sha256=<lowercase HMAC-SHA256 hex>`. The timestamp must be within five minutes. Example Node signing code:

```ts
const timestamp = String(Math.floor(Date.now() / 1000));
const path = '/api/internal/projects/project-id/patches/patch-id/generation-result';
const rawBody = JSON.stringify(payload);
const signature = createHmac('sha256', workerSecret)
  .update(`${timestamp}.POST.${path}.`)
  .update(rawBody)
  .digest('hex');
// X-Patchwork-Signature: sha256=${signature}
```

- `POST /api/internal/projects/:projectId/patches/:patchId/generation-result` records a generation outcome. Success body:

```json
{
  "type": "generation",
  "generationId": "b87e8488-986c-4c06-bd12-bcc2fc49d928",
  "success": true,
  "branchName": "patch/header",
  "baseCommitSha": "<40-or-64-hex-sha>",
  "headCommitSha": "<40-or-64-hex-sha>",
  "summary": "Updated the header",
  "filesChanged": 1,
  "additions": 2,
  "deletions": 0
}
```

Failure uses `success: false`, `failureCategory` (`GENERATION_ERROR`, `VALIDATION_ERROR`, `TIMEOUT`, `CANCELLED`, or `UNKNOWN`) and a bounded `errorSummary`. It records `FAILED`; it does not claim a branch or commit was created. A patch must be in `GENERATING`. Repeated matching callbacks are idempotent; a different/stale attempt is rejected. Generation details are not included in ordinary patch responses.

- `POST /api/internal/projects/:projectId/patches/:patchId/validation-result` records validation for the same `generationId` after an owner has moved the patch to `VALIDATING`. Body: `{ "type": "validation", "generationId": "...", "passed": true, "results": [{ "name": "typecheck", "status": "PASSED", "summary": "optional" }] }`. Result status is `PASSED`, `FAILED`, or `SKIPPED`; up to 100 results are allowed. Passed validation moves to `READY_FOR_REVIEW`; failure moves to `VALIDATION_FAILED`. Identical retries are idempotent. Raw error summaries are not exposed by the history API.

Callbacks validate that the patch belongs to the project in the path and write the patch result plus its audit event in one transaction. There is no generation engine or queue in this repository; Person 3 must call the existing patch status API to start/advance work, perform generation/validation, then send these signed callbacks. The backend never fabricates successful results.

## Deployment tracking

- `POST /api/projects/:projectId/deployments` — records a `QUEUED` attempt for an owned project. Body: `{ "environment": "PREVIEW", "releaseId": "optional", "commitSha": "optional 40/64 hex", "branchName": "optional" }`. It does not trigger a provider.
- `GET /api/projects/:projectId/deployments?page=1&limit=20` — paginated list for an owned project.
- `GET /api/projects/:projectId/deployments/:deploymentId` — retrieve one owned-project deployment.
- `PATCH /api/internal/deployments/:deploymentId/status` — trusted HMAC callback, with the same headers/signing rules above. Body status is `BUILDING`, `READY`, `FAILED`, or `CANCELLED`. `READY` requires an HTTPS `deploymentUrl`; `FAILED` requires a bounded `errorSummary`. Provider deployment ID, alias URL, commit, and branch are optional. Allowed progression is `QUEUED → BUILDING/READY/FAILED/CANCELLED` and `BUILDING → READY/FAILED/CANCELLED`; terminal updates cannot be overwritten. Repeated same-state events are idempotent. Failure text is withheld from ordinary deployment responses.

No Vercel trigger, webhook verifier, or poller is implemented. A provider adapter/worker must perform a real deployment and call the signed status endpoint with actual provider results.

## Releases

- `POST /api/projects/:projectId/releases` — create a `PENDING` release record from an owned, `APPROVED` patch that has generated branch and commit metadata. Body: `{ "patchId": "...", "version": "optional", "notes": "optional" }`. It records intent and does not merge anything.
- `GET /api/projects/:projectId/releases?page=1&limit=20` — paginated release list for an owned project.
- `GET /api/projects/:projectId/releases/:releaseId` — retrieve one release in an owned project.
- `PATCH /api/internal/releases/:releaseId/status` — trusted HMAC callback. Status may be `MERGED` (requires actual `commitSha`), `FAILED` (requires `errorSummary`), or `REVERTED`; transitions are `PENDING → MERGED/FAILED` and `MERGED → REVERTED`.

No GitHub merge, revert, or rollback operation is implemented. A trusted integration must perform that operation before reporting its result. No release can be created for a draft/unapproved patch.

## Environment variables

- Frontend: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, optional `VITE_API_URL`.
- Backend: `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, server-only `SUPABASE_SECRET_KEY`, `DATABASE_URL`, `FRONTEND_URL`, `ALLOWED_ORIGINS`, GitHub App configuration, and `INTERNAL_WORKER_SECRET` for worker callbacks.
- Example worker secret generation: `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`. Store the resulting value only in backend and worker secret stores; do not paste it into source files or documentation.

GitHub OAuth login through Supabase and GitHub App repository installation remain separate flows; see [GITHUB_INTEGRATION.md](../GITHUB_INTEGRATION.md).
