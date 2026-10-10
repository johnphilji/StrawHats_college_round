# Integrations

External systems are encapsulated here. No SDK calls should leak into controllers.

## Layout

- `llm/` – LLM code-diff generation (prompt building, diff validation). Keep credentials server-side; never execute LLM-generated code in the Express process.
- `github/` – GitHub App / OAuth, branch creation, commit, PR, merge. Use Octokit with narrow scopes.
- `vercel/` – Preview and production deployment triggers, deployment polling.
- `playwright/` – Smoke verification of candidate releases.

Each integration exposes a small interface / adapter to make testing easy:

```ts
export interface LlmPort {
  generateDiff(input: { prompt: string; context: string }): Promise<{ diff: string }>;
}
```

Add environment variables only when the integration is implemented.
