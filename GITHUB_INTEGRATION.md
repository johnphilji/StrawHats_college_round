# GitHub authentication and repository access

PATCHWORK login uses Supabase Auth's GitHub OAuth provider. Repository access is separately granted to the PATCHWORK GitHub App. A successful OAuth login alone never grants repository access.

## Configure Supabase

1. In Supabase Authentication > Providers, enable GitHub and configure a GitHub OAuth App client ID and secret for login.
2. Add `http://localhost:5173/auth/callback` to the Supabase redirect URL allow list (and the production frontend callback URL).
3. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY` in `frontend/.env`.
4. Set `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, and the server only `SUPABASE_SECRET_KEY` in `backend/.env`. The secret key is used only to bind an installation to the Supabase user who started setup.

The GitHub OAuth App above handles PATCHWORK login only. Do not request repository scopes from that OAuth App.

## Configure a GitHub App

Create a GitHub App and configure its setup URL behavior to return to:

`http://localhost:4000/api/github/callback`

Set the App's repository permissions to **Contents: read-only** and **Metadata: read-only**. Do not grant write permissions. Enable installation on user accounts and organizations as needed. The installation chooser lets the user choose all repositories or selected repositories. Use the App ID, App slug, and generated private key in the backend environment:

```dotenv
GITHUB_APP_ID=123456
GITHUB_APP_SLUG=patchwork
GITHUB_APP_PRIVATE_KEY="-----BEGIN RSA PRIVATE KEY-----\n...\n-----END RSA PRIVATE KEY-----\n"
```

Set the GitHub App's **Setup URL** to `http://localhost:4000/api/github/callback`. The callback state is signed and expires after ten minutes. The backend verifies the installation with GitHub, associates its ID with the initiating Supabase user in `app_metadata`, and redirects to the frontend. No Prisma changes or migrations are required. Keep the App private key and Supabase secret key out of frontend variables and source control.

For production, use HTTPS callback URLs and store backend secrets in the hosting platform's secret manager. Add the production frontend URL to `ALLOWED_ORIGINS` and set `FRONTEND_URL` accordingly.

## Repository API

All repository API requests require the existing Supabase bearer token:

```http
Authorization: Bearer <supabase_access_token>
```

- `POST /api/github/installation/setup` starts the GitHub App install flow.
- `GET /api/github/callback?installation_id=...&setup_action=install&state=...` is the GitHub App callback; it is state-authenticated and does not accept a browser bearer token.
- `GET /api/github/installation` returns the requesting user's linked installation (`{ connected, installationId? }`) without calling GitHub, so the UI can render installed/not-connected states.
- `GET /api/github/repositories?page=1&per_page=50` returns a page (up to 100) of repositories visible to the user's linked installation.
- `GET /api/github/repositories/:repositoryId` returns repository metadata if the installation can access that repository.
- `GET /api/github/repositories/:repositoryId/patchwork?ref=main` reports whether the repository carries a `patchwork-registry.json` manifest for the visual editing workflow (`{ supported, componentCount? | reason: no-manifest | invalid-manifest | manifest-unavailable }`).
- `GET /api/github/repositories/:repositoryId/source?path=src%2FApp.tsx&ref=main` retrieves one allowed source file (256 KB maximum).

Example list response:

```json
{
  "success": true,
  "data": [{
    "id": 123456,
    "name": "site",
    "fullName": "acme/site",
    "owner": "acme",
    "private": true,
    "description": "Storefront",
    "url": "https://github.com/acme/site",
    "defaultBranch": "main"
  }]
}
```

Example source response:

```json
{
  "success": true,
  "data": {
    "repository": {
      "id": 123456,
      "name": "site",
      "fullName": "acme/site",
      "owner": "acme",
      "private": true,
      "description": "Storefront",
      "url": "https://github.com/acme/site",
      "defaultBranch": "main"
    },
    "path": "src/App.tsx",
    "ref": "main",
    "source": "export function App() { /* ... */ }",
    "size": 42
  }
}
```

Repository operations accept only numeric GitHub repository IDs. The backend obtains each installation token itself and asks GitHub to resolve the repository through that installation before metadata or file access. It never accepts API URLs or trusts an owner/name pair from the client. Source paths must be relative, cannot traverse directories, and are limited to source/documentation extensions; environment, credential, secret, and private key files are blocked. Only one file is returned per request.

## Editing-pipeline wiring

`GithubAppService.createRepositoryProvider(user, repositoryId, ref?)` returns a `RepositoryProvider` (same contract as the local provider) bound to one verified installation + repository + ref: `SourceService` and `EditOrchestrationService` already accept any `RepositoryProvider`, so a selected GitHub repository can later participate in the validated editing workflow with no interface changes. Reads mint short-lived installation tokens per call and perform no writes. The local provider remains the default; provider selection stays explicit at the call site so local development and tests are unaffected. Use `GET .../patchwork` first: repositories without a valid `patchwork-registry.json` manifest are reported unsupported rather than edited blindly.

The source response is ready for a later code-generation workflow. The existing component registry and local source resolver remain unchanged; the GitHub endpoint supports selecting a repository file before a project-specific registry mapping exists.
