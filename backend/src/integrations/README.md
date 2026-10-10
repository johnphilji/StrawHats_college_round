# Integrations

External systems are encapsulated here. No SDK calls should leak into controllers.

## Layout

- `llm/` — no provider integration is implemented. Keep future credentials server-side; never execute LLM-generated code in the Express process.
- GitHub App repository access currently lives in `src/services/github-app.service.ts`. It lists repositories authorized to the installation, retrieves metadata, and reads bounded source files. It can create `patchwork/` refs, commit validated UTF-8 source files without force updates, and open pull requests. It never merges, deletes branches, or writes to protected/default branches. Dashboard permissions are required; see `backend/API.md`.
- `vercel/` — no provider integration is implemented. Deployment APIs currently track records and accept signed worker/provider status callbacks; they do not trigger or poll Vercel.
- `playwright/` – Smoke verification of candidate releases.

Each integration exposes a small interface / adapter to make testing easy:

```ts
export interface LlmPort {
  generateDiff(input: { prompt: string; context: string }): Promise<{ diff: string }>;
}
```

Add environment variables only when the corresponding provider integration is implemented. Current GitHub App and worker variables are documented in `backend/.env.example` and `backend/API.md`.
