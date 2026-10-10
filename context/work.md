For PATCHWORK's strict 8-hour hackathon, I recommend splitting the four-person team by independent workstreams with explicit integration points. The official problem statement prioritizes visual patching, smart element tracking, collaboration/conflict detection, isolated preview, automated verification, versioned deployment/rollback, and audit history. The plan below assigns owners to those requirements while keeping the core workflow deliverable first.&#x20;

Problem-Statement.txt



One architectural constraint needs to remain clear: your current LLM + Git + Vercel design modifies source code and triggers a normal build/deployment. That differs from the original problem statement's independent runtime-patch model, so the team should agree to the controlled-repository approach before splitting implementation work.

# PATCHWORK — 4-Person Implementation Plan

Team allocation · 8 hours · One integrated MVP

Person 1

Frontend & Visual Editor

Component selection, editing UI, diff viewer

Person 2

Backend & Database

Express API, Prisma 7, persistence, audit

Person 3

LLM & Git Workflow

Code diffs, branches, commits, validation

Person 4

Preview, Testing & Deployment

Vercel, Playwright, rollback, integration

## 1. Individual responsibilities

[GitHub - one-highflyer/frappe-builder: Modern website builder for modern web pages](https://images.openai.com/static-rsc-4/5h-ZKX1Pp1prnfl0SIrub-dEzC1QHkiz9dbppMzBtJ_r0oE9nkEd2OWkHNmN3Sa-l09VNv5B4l7Es7fElHNBWmgrE01FzGXrYL5XuKUZCl5ao2OfcoX_H7PrPBG_SQ0cu4MG3YJqwE9rYNiTw9yTMdruT2Km7c-InXGpfUd7wWw?purpose=inline)

## Person 1 — Frontend & Visual Editor

Owns the user experience

Tasks

- Build the dashboard layout and controlled demo website preview.
- Implement hover highlighting and click-to-select for supported elements.
- Create the text/CSS property inspector.
- Build the natural-language prompt input.
- Display generated diffs, branch status, validation results and release history.
- Connect the UI to the agreed backend API.

Deliverable: A user can select a button, describe a change, and see the proposed result and code diff.

[Diving into Collaborative Development: My First Backend Project | by Dana | Medium](https://images.openai.com/static-rsc-4/PZ26IGrjbiRuaf1KxBSXPac6w1_mVl_FZfVZjSNCzPcD1IQIbZgSVj7kK9VnI_w4Plv2oRaMQ4Rzg53moWrLHYxgfeUnVLKA-MBcbt9of5Jeq_1zbZPr1ftegsJ9H4KvpzY2ekbu6eBrJxEpGARDoAwD2JsfVltlnhACTE8pniI?purpose=inline)

## Person 2 — Backend & Database

Owns API contracts and persistence

Tasks

- Set up Express, TypeScript, environment validation and error handling.
- Configure PostgreSQL with Prisma ORM v7 and its compatible driver adapter.
- Define schemas for projects, edit requests, branches/commits, releases, deployments and audit events as needed.
- Implement APIs for creating edits, saving change metadata, retrieving status/history and recording deployment results.
- Add Supabase Auth verification if required; do not let authentication setup block the core flow.
- Coordinate API contracts with Persons 1 and 3.

Deliverable: A working backend with persistent records and documented API contracts.

[UI/UX дизайн в эпоху AI: как меняются интерфейсы, доверие и роль дизайнера | LeadStream](https://images.openai.com/static-rsc-4/A19E-FV58CghLKS51EGiOu9NE_F3xo13RQKTRTbEwUXjv1Jmi0wNIciX9Wd-cjLKqVxLjIgHG7YOK2NwASRkYlfm3FelkHg__tIT-RJbT4XIWxHZP1qIF0rbRfqyi8IhjdjTzw-1ppBRXabNLsUD9EGYrPOG6vcto6s4H4CFnY4?purpose=inline)

## Person 3 — LLM & Git Integration

Owns code generation

Tasks

- Connect the LLM provider.
- Map the selected component to its known source file.
- Generate a constrained code diff rather than rewriting the entire project.
- Validate changed files and restrict modifications to approved paths.
- Create an isolated Git branch and commit the change.
- Implement basic conflict checks and branch status transitions.
- Return the diff, branch name, commit SHA and errors through a stable interface.

Deliverable: A natural-language request produces a real source-code change on an isolated branch.

[Visual Regression Testing in a React App | Step-by-Step Tutorial](https://images.openai.com/static-rsc-4/qJ7T_XTuO8FzmLrsaXxiJMKxgGHH7RRCQwtwlC0dSUiCLFbOuGrWcXDXoF1c8_7TPRs8-b021Y60h-EAwUTGY4toFUvrzUXluzYzXzBooxb0WnKc4-U_4twNbqcATJQ880vkqEGnh7RVjNWl2ZVUthLEzzbRaau48hEYtUcDSGE?purpose=inline)

## Person 4 — Testing, Preview & Deployment

Owns end-to-end reliability

Tasks

- Prepare the controlled demo website and ensure it deploys on Vercel.
- Configure branch/PR preview deployments where practical.
- Create Playwright checks for the selected element's text, style and visibility.
- Verify that drafts and previews do not alter production.
- Connect merge and deployment status to the backend.
- Implement the rollback/redeployment demonstration.
- Run end-to-end integration tests and prepare the demo.

Deliverable: The team can verify a change in preview, deploy it to production and restore a known-good version.

## 2. Eight-hour timeline

All four people work in parallel where dependencies allow. Integrate early rather than waiting until the final hour.

Hour 0–1

### Foundation and contracts

P1: Create dashboard shell and demo page.

P2: Set up Express, Prisma v7 and database schema.

P3: Test the LLM response format and Git branch creation.

P4: Prepare the demo repository, Vercel project and initial Playwright setup.

Integration gate: End of hour: everyone can run their part; API and patch/diff formats are agreed.

Hour 1–3

### Build the core workflow

P1: Implement element selection, property inspector and prompt input.

P2: Implement edit/project APIs and persistence.

P3: Generate diffs and commit changes to isolated branches.

P4: Establish preview deployment and basic browser checks.

Integration gate: End of hour 3: a user request can reach the LLM and produce a branch change.

Hour 3–5

### Connect the system

P1: Display diffs and loading/error states.

P2: Persist branch, validation and release metadata.

P3: Add diff validation, file restrictions and basic conflict handling.

P4: Verify preview isolation and connect Playwright results.

Integration gate: End of hour 5: an edit is visible in preview and the production site remains unchanged.

Hour 5–6

### Approval and deployment

P1: Add approve, merge and release-history controls.

P2: Finalize status transitions and audit events.

P3: Integrate approved branch merge and report its outcome.

P4: Verify Vercel production deployment and rollback path.

Integration gate: End of hour 6: one real modification has made it through the release pipeline.

Hour 6–7

### Stabilize and verify

All: Run the complete workflow together.

P1: Fix editor and UI integration bugs.

P2: Fix persistence and API failures.

P3: Fix Git/diff issues.

P4: Fix deployment/test failures and verify rollback.

Integration gate: End of hour 7: no critical break in the primary demo path.

Hour 7–8

### Demo freeze

Stop adding major features.

Repeat the full demo from a clean starting state.

Prepare one known-good release and one deliberate failure/conflict case.

Assign speaking roles and prepare a fallback recording or screenshots if appropriate.

Integration gate: Final: demonstrate only features that genuinely work.

## 3. Define the contracts before coding

The biggest integration risk is that the frontend, backend and Git/LLM integration implement different assumptions about a patch.

Agree on these contracts during the first hour.

### Edit request

```
{
  "projectId": "demo-project",
  "componentId": "checkout-button",
  "instruction": "Change the button to green and rename it to Continue to Payment"
}
```

### Generated edit response

```
{
  "editId": "edit-001",
  "branch": "patch/checkout-redesign",
  "status": "testing",
  "diff": "...",
  "commitSha": "..."
}
```

These are illustrative shapes. Agree on the actual schema, error format and status names before implementation.

### Minimum shared statuses

`draft → testing → approved → merged → deploying → deployed`

Additional outcomes: `failed`, `conflict`, and `rolled_back`.

A merge must not be represented as a successful deployment. Person 2 owns the status model; Persons 1, 3 and 4 should use the same definitions.

## 4. Must-have versus optional features

| Requirement                            | Priority                 | Owner           |
| -------------------------------------- | ------------------------ | --------------- |
| Visual component selection and editing | P0                       | Person 1        |
| LLM-generated source-code diff         | P0                       | Person 3        |
| Git branch and commit                  | P0                       | Person 3        |
| Backend persistence and history        | P0                       | Person 2        |
| Isolated preview                       | P0                       | Person 4        |
| Production deployment                  | P0 for this architecture | Person 4        |
| Rollback/redeployment                  | P0                       | Person 4        |
| Basic validation                       | P0                       | Persons 3 and 4 |
| Conflict detection                     | P1                       | Persons 2 and 3 |
| Playwright browser tests               | P1                       | Person 4        |
| Audit trail                            | P1                       | Person 2        |
| Advanced semantic element tracking     | P2                       | Persons 1 and 3 |
| Real-time collaboration                | P2                       | Defer           |

Important: The original problem statement calls out all seven capabilities. The priorities above are for an eight-hour prototype, not a claim that deferred requirements are complete.

## 5. Integration rules for the team

1. Use one shared repository. Each person works on a separate feature branch.
2. Commit early. Push working code regularly; don't wait until the feature is finished.
3. Avoid overlapping ownership. Person 2 defines the API and database contracts; Person 3 owns LLM/Git operations; Person 4 owns deployment/testing; Person 1 owns the editor.
4. Use mock responses temporarily. Person 1 can build the interface with a fixed example diff while Person 3 implements the real LLM integration. Replace the mock early.
5. Use a single demo repository. Do not spend the hackathon supporting arbitrary external websites.
6. Protect production. Draft branches and previews must not change the production branch or site.
7. Keep a fallback. Maintain a known-good commit and deployment so a broken LLM response or merge does not ruin the final demo.
8. Freeze features at hour 7. Spend the final hour testing and rehearsing, not adding architecture.

## 6. Final demo acceptance checklist

### Readiness checklist

0 of 10

Select a component visually.

Submit a natural-language change request.

Display an actual LLM-generated source-code diff.

Commit the modification to an isolated Git branch.

Preview and validate without affecting production.

Approve and merge the change.

Observe the actual Vercel production deployment.

Verify the change on the live website.

Restore a known-good version through rollback/redeployment.

Show the change and deployment history.

My recommendation: Person 3 should prove the LLM-to-Git path as early as possible, while Person 1 builds against a mock API. Those are the two main unknowns. Person 2 should keep the backend minimal, and Person 4 should verify the Vercel preview and rollback path early rather than leaving deployment until the end.