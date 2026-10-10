# Jobs

Future background jobs and workers for PATCHWORK:

- `preview-generation` – orchestrate preview deployments and run Playwright checks.
- `conflict-detection` – scan pending patches for overlapping selectors.
- `deployment-poller` – track Vercel deployment status.
- `audit-compaction` – archive or verify audit hash chain.

For the initial scaffold, no queue is wired. Suggested stack when needed:

- **BullMQ + Redis** or **Trigger.dev** or **Supabase pg_cron + pgmq**.
- Keep jobs idempotent and traceable via `requestId`.

This folder will hold job definitions, handlers, and schedulers.
