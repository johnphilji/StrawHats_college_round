<!-- Person 3 - Armaan (LLM and Git integration: implementation plan for the LLM + Git workflow) -->
# PATCHWORK — Implementation Plan for Person 3: LLM & Git Workflow

## 1. Role in the team

Person 3 is responsible for the core transformation layer that turns a user’s natural-language description into a real, reviewable code change inside a controlled Git workflow.

This role sits at the heart of PATCHWORK:

- It receives the selected component and user instruction from the frontend
- It maps that component to its source file or known editable target
- It calls the LLM with a constrained prompt and safe edit rules
- It validates that the output is a valid patch, not a full rewrite
- It creates a dedicated feature branch
- It applies the patch, commits it, and reports status back to the backend
- It checks for simple conflicts and branch-level issues before release

This is the most critical execution path in the MVP because the product only truly works if a natural-language change becomes a real committed source change with stable metadata.

---

## 2. Project context and team alignment

This plan must be interpreted with the full PATCHWORK architecture described in the project docs and the team split outlined in the work plan.

### Whole-project goal
PATCHWORK is an LLM-assisted visual website editing platform that allows a user to:

1. Select a supported webpage element
2. Describe a change in natural language
3. Generate a source-code change
4. Preview and validate it safely
5. Approve and merge it
6. Deploy through Git/Vercel
7. Maintain release history and rollback

### Team responsibilities

#### Person 1 — Frontend & Visual Editor
Owns the editing UI and human interaction layer.

Responsibilities:
- Demo website, layout, and editor shell
- Click-to-select supported elements
- Inspector panel for element properties
- Natural-language prompt input
- Diff viewer and approval UI
- Backend integration for change requests and status display

Dependency on Person 3:
- Person 1 must send a structured request payload and consume a structured response with diff, status, branch, and commit metadata.

#### Person 2 — Backend & Database
Owns API contracts, persistence, and state transitions.

Responsibilities:
- Express backend
- Database and ORM setup
- Project/edit metadata persistence
- API contracts and status tracking
- Release/deployment history
- Audit entries and project state

Dependency on Person 3:
- Person 2 stores the result of Person 3’s generated diffs, branches, commits, validation states, and deployment metadata.

#### Person 4 — Preview, Testing & Deployment
Owns the end-to-end reliability path.

Responsibilities:
- Controlled demo deployment and Vercel setup
- Preview deployments and production releases
- Playwright test checks
- Validation of live behavior
- Rollback and redeploy workflow

Dependency on Person 3:
- Person 4 relies on Person 3 to produce a valid branch-based code change that can be previewed and tested.
- Person 3 must expose branch names and commit SHAs to support preview and deployment checks.

---

## 3. Mission for Person 3

Person 3 must implement the LLM-to-Git execution pipeline that converts a component edit request into a safe, isolated, reviewable source change.

For this project, the LLM provider will be Groq using a free API key. That means Person 3 should build the integration around a lightweight, low-friction model provider that works well for quick hackathon iteration without requiring a paid plan.

The core objective is:

> A user requests a change in plain English, the system identifies the target file/component, an LLM generates a constrained patch via Groq, a Git branch is created, the patch is validated, and the result is returned in a structured format that the rest of the system can use.

This should be treated as the critical MVP capability, not a nice-to-have feature.

---

## 4. Primary deliverables

By the end of the hackathon, Person 3 must have delivered:

1. LLM provider integration with safe prompt templates
2. Controlled component-to-file mapping for supported elements
3. Structured patch generation output
4. Validation gate for diff shape and file scope
5. Branch creation and commit workflow
6. Conflict/basic branch-health checks
7. Stable API contract for backend consumption
8. Logging and error reporting for failed edit attempts
9. A repeatable end-to-end demo path for the selected website action

---

## 5. Scope and non-goals

### In scope
- Controlled demo website with known editable elements
- Natural language requests mapped to supported components
- A narrow patch to a known file or component
- Git branch creation for isolated work
- Commit creation for the generated patch
- Validation of file paths and patch structure
- Status tracking for draft/testing/approved/failed/conflict states
- Basic conflict checks across modified files

### Out of scope for MVP
- Arbitrary third-party website edits
- Semantic matching for unknown DOM structures
- Full real-time collaboration
- General-purpose patching across every file in the repo
- Complex autonomous approvals or deployments
- Deep frontend visual regression without a baseline

---

## 6. Architecture of the Person 3 workstream

Person 3 owns the following runtime responsibilities:

### 6.1 LLM response layer
This layer is responsible for:
- receiving a structured edit request
- building a safe system prompt
- sending a request to the chosen model API
- parsing the response into a normalized patch format

### 6.2 Source mapping layer
This layer knows which UI elements map to which source files or components.

For the MVP, the design should not rely on fragile DOM heuristics. Instead, use explicit IDs and identifiers such as:

```tsx
<button data-patchwork-id="checkout-button">Checkout</button>
```

and maintain a mapping like:

```ts
{
  "checkout-button": "src/components/CheckoutButton.tsx"
}
```

This gives Person 3 a predictable and safe object to edit.

### 6.3 Patch validation layer
This layer ensures that generated diffs are safe and limited.

It should validate:
- allowed file set
- expected file extension
- valid diff syntax
- no mass rewrite of unrelated files
- no deletion of whole application sections
- no unsupported code blocks
- result compiles at least structurally

### 6.4 Git workflow layer
This is the operational layer that:
- creates a feature branch
- checks out the new branch
- writes the file change
- runs focused validation commands
- stages and commits files
- returns metadata like branch name and commit SHA

### 6.5 Conflict and status layer
This layer tracks whether the change is ready for review or blocked.

It should classify statuses such as:
- draft
- testing
- approved
- merged
- failed
- conflict
- rolled_back

---

## 7. Detailed responsibilities

### 7.1 LLM integration

Person 3 must implement the connection to the model provider with a safe abstraction layer.

For this project, the selected provider is Groq with a free API key.

Tasks:
- Create a provider wrapper for Groq
- Centralize model configuration and environment variables
- Standardize prompt templates and output schema
- Add retry logic for transient failures
- Add timeout handling and safe fallbacks
- Validate response payloads before using them
- Keep the implementation compatible with the free-tier rate limits and small-context limits

Practical note:
- Use a small, fast model from Groq for patch generation
- Keep prompts minimal and focused on the selected file/component
- Prefer one targeted patch generation call over broad multi-file instructions
- Be prepared for rate-limit handling and occasional retries during demo runs

Recommended environment variables:

```bash
GROQ_API_KEY=your_free_key
GROQ_MODEL=llama-3.1-8b-instant
```

or whatever model is available in the free Groq tier at the time of the project.

Recommended structure:

```ts
// conceptual shape only
interface EditRequest {
  projectId: string;
  componentId: string;
  instruction: string;
  context?: {
    filePath?: string;
    componentName?: string;
    selectedText?: string;
  };
}

interface GeneratedPatch {
  status: "success" | "failed" | "conflict";
  branch: string;
  diff: string;
  changedFiles: string[];
  commitSha?: string;
  errors?: string[];
}
```

The LLM should be constrained to a patch generation response, not freeform prose.

### 7.2 Prompt design
The prompt must be narrow and structured.

Because Groq is free-tier and the hackathon time budget is tight, the prompt must be optimized for speed and reliability.

It should include:
- the project is controlled and limited
- allowed files and repo boundaries
- exact target component ID
- the source file mapping
- current file content or relevant excerpt context
- clear instructions to make only the requested change
- explicit warning to avoid unrelated rewrites
- strict output contract so the model returns a patch in a parseable format

A good prompt strategy is to request a minimal JSON-like or patch-like response, rather than a free-form explanation. This reduces parsing failures and keeps Groq usage efficient.

Example design prompt:

"You are editing a controlled website repo. Only change the file mapped to the selected component. Keep the patch minimal. Preserve structure and style. Do not rewrite unrelated code. Only return a structured diff describing the intended change."

### 7.3 Patch generation rules
The strongest rule for Person 3 is: do not allow model output to become a generic code rewrite.

Because the project uses a free Groq API key, the generation step must be intentionally minimal and deterministic. The model should be asked to do one specific edit, not a broad redesign.

Instead, the workflow should enforce:
- only target the mapped file
- only change the relevant component
- minimize the diff
- avoid modifying config files unless explicitly allowed
- reject responses that touch unrelated files
- limit patch size to a small, safe set of edits
- prefer exactly targeted changes that are easy to validate in preview

This is especially important because free-tier models tend to be faster and cheaper but more likely to be overly verbose or produce broad output if the prompt is not tightly controlled.

This is critical for safety and for the final demo.

### 7.4 File restrictions and validation
The patch engine must check:
- which files are allowed to change
- whether the content truly matches the selected component
- if the patch is syntactically well-formed
- if changes are within expected lines or component boundaries
- if the user request is reflected in the output
- if the output is too large for the free Groq tier or too broad to be safe

This validation should happen immediately after model output is received. If the response is too vague, too broad, malformed, or unrelated to the selected component, the system should fail gracefully and request a simpler edit.

Good validation logic includes:
- checking the diff is not empty
- checking no forbidden paths were touched
- checking no mass deletion or large refactor occurred
- checking that component IDs or selectors remain consistent

### 7.5 Git workflow
This is the operational core of Person 3.

Required functionality:
- create a branch named using a consistent convention, for example:
  - patch/checkout-redesign
  - patch/hero-copy-update
- verify branch is created successfully
- write patch to the correct file(s)
- stage changes
- commit with a readable message
- return commit SHA and branch name

Recommended branch naming convention:

```text
patch/<component-name>-<slug>
```

Examples:
- patch/checkout-button-green-cta
- patch/hero-heading-update

### 7.6 Commit quality and safety
The commit should be meaningful and small.

Git commit message template:

```text
feat: update checkout button copy and color
```

Do not let the LLM create giant monolithic commits. The patch should be specifically scoped and intentionally minimal.

### 7.7 Conflict detection
Person 3 should implement basic conflict logic before approval or merge.

Examples of conflict sources:
- same component changed by multiple branches
- same file modified by multiple edits
- target file changed since branch creation
- overlap with another patch request

Minimum conflict checks:
- compare target file and changed lines against main branch
- detect if the branch is behind the production branch
- warn if the selected file has diverged since the patch branch started
- block application if the patch cannot be safely applied

This does not need to be a complex merge engine. For the MVP, basic file-level awareness and status flags are enough.

---

## 8. Implementation plan by sprint phase

### Phase 1 — Setup and contract alignment (Hour 0-1)

Goals:
- align with Person 1 and Person 2 on request/response contracts
- verify repo structure and supported component mapping
- confirm how the LLM will return patch output

Tasks:
- Choose model provider and SDK
- Set up environment variables and secrets handling
- Define allowed repo location and edit scope
- Draft a minimal request schema for edit requests
- Draft a minimal patch response schema for the backend
- Decide branch naming, commit structure, and status strings

Deliverables:
- LLM API wrapper ready for testing
- request/response contract document
- list of allowed editable files and components

### Phase 2 — LLM patch generation (Hour 1-3)

Goals:
- produce a valid patch response from natural language
- keep the output constrained and safe

Tasks:
- Implement prompt builder for selected component context
- Add source file mapping for known components
- Add structured output parsing and error handling
- Validate output before any file write
- Test with a few representative edit requests

Important demo examples:
- "Change checkout button to green and rename it to Continue to Payment"
- "Make the hero heading more premium and update the call-to-action"

Deliverables:
- a working LLM patch generation flow
- safe parsing for status, diff, and file targets
- error response handling for invalid model output

### Phase 3 — Git branch + commit integration (Hour 3-5)

Goals:
- turn generated diff into a real isolated Git branch and commit

Tasks:
- determine repo root and source path
- create feature branch using a naming convention
- apply the patch or write the minimal file change
- validate there are no accidental edits elsewhere
- stage changes and commit with message
- return branch name and commit SHA

Deliverables:
- branch created from clean base state
- patch applied to correct file only
- commit recorded and returned to backend

### Phase 4 — Validation and conflict checks (Hour 5-6)

Goals:
- ensure branch readiness and safe preview deployment

Tasks:
- run small validation checks (lint/build if practical)
- verify changed files match allowed paths
- detect if the target file has diverged from main
- classify “testing”, “failed”, or “conflict” states
- produce readable validation feedback

Deliverables:
- validation result payload
- branch status classification
- basic conflict detection output

### Phase 5 — Demo hardening and final integration (Hour 6-8)

Goals:
- prove the full flow works end-to-end with the other team members

Tasks:
- integrate with Person 1 frontend flow
- confirm Person 2 can persist metadata
- coordinate with Person 4 preview and deployment checks
- test a successful flow and a failure flow
- ensure rollback path and audit data are understandable

Deliverables:
- full demo-ready path
- fallback working patch flow
- final presentation script and demo notes

---

## 9. Detailed technical implementation points

### 9.1 Suggested folder structure and files
Within the project, Person 3 should likely own or heavily support the LLM and Git logic in the backend and service layer.

Suggested conceptual layout:

```text
apps/server/src/
  features/
    llm/
      generatePatch.ts
      promptBuilder.ts
      schemas.ts
      provider.ts
    git/
      createBranch.ts
      applyPatch.ts
      commitPatch.ts
      checkConflict.ts
      validatePatch.ts
    workflow/
      editWorkflow.ts
      status.ts
```

This is conceptual; the exact file layout can vary, but the roles should be consistent.

### 9.2 Core service flow
The core Person 3 service can be modeled as:

```ts
const groqResponse = await fetch('https://api.groq.com/openai/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: process.env.GROQ_MODEL || 'llama-3.1-8b-instant',
    messages: [{ role: 'user', content: prompt }],
    temperature: 0.2,
  }),
});
```

This is the practical integration path for the free Groq key. The important part is that the prompt, parser, and validation layer remain strict enough that the model cannot bypass the controlled workflow.

```ts
async function handleEditRequest(req: EditRequest) {
  const target = resolveComponentTarget(req.componentId);
  const prompt = buildPrompt(req, target);

  const llmResult = await generatePatch(prompt);
  const safePatch = validatePatch(llmResult, target);

  if (!safePatch.valid) {
    return {
      status: "failed",
      errors: safePatch.errors,
    };
  }

  const branch = await createFeatureBranch(req.componentId);
  const patchApplied = await applyPatch(branch, safePatch.diff, target.filePath);

  if (!patchApplied.success) {
    return {
      status: "conflict",
      errors: patchApplied.errors,
    };
  }

  const commit = await commitPatch(branch, safePatch.diff);

  return {
    status: "testing",
    branch: branch.name,
    commitSha: commit.sha,
    diff: safePatch.diff,
    changedFiles: safePatch.changedFiles,
  };
}
```

This is the central execution path Person 3 owns.

### 9.3 Response payload contract
The backend and frontend need a stable response format. Person 3 should own the design of this payload.

Because Groq is being used via a free key, the payload must be intentionally compact and predictable. Avoid returning large free-form model text that the rest of the pipeline cannot reliably parse.

Suggested response:

```json
{
  "editId": "edit-003",
  "status": "testing",
  "branch": "patch/checkout-button-green-cta",
  "commitSha": "abc123def456",
  "diff": "--- a/src/components/CheckoutButton.tsx\n+++ b/src/components/CheckoutButton.tsx\n@@\n- Checkout\n+ Continue to Payment\n",
  "changedFiles": ["src/components/CheckoutButton.tsx"],
  "warnings": [],
  "errors": []
}
```

This payload should be easy for Person 1 to render and Person 2 to persist.

### 9.4 Validation checklist
Before returning a patch as valid, Person 3 should require all checks to pass:

- target component is recognized
- file path is allowed
- patch is not empty
- changed files belong to the project
- patch touches only expected component area
- output is parseable
- diff applies cleanly
- branch creation succeeded
- commit succeeded

If any fail, return a structured failure with clear reason codes.

---

## 10. Risk management

### Risk 1 — The LLM produces a large or unrelated rewrite
Mitigation:
- restrict prompts to known component file mapping
- require minimal-change semantics
- validate paths and changed file count
- reject if the diff is too broad
- keep all prompts small and specific because free Groq models are best used for narrow edits

### Risk 2 — The patch does not apply cleanly
Mitigation:
- create the branch from a clean base
- validate file contents before writing
- implement a patch-apply dry-run before final commit
- report conflict state and stop before merge

### Risk 3 — Branch or commit creation fails
Mitigation:
- keep branch naming and Git command wrappers small and testable
- log errors from Git operations clearly
- fail with a known status rather than silently doing partial work

### Risk 4 — Response format changes unexpectedly from the model
Mitigation:
- use a strict response schema
- parse JSON or wrapper format only
- reject malformed responses before applying any code
- use a strongly constrained response format tailored to the Groq model and free-tier limits

### Risk 5 — Team integration mismatches
Mitigation:
- agree on API contracts early
- keep status names consistent across frontend/backend/deployment
- use a shared mock or example payload shape for testing

---

## 11. Acceptance criteria for Person 3

Person 3 is successful if they can demonstrate the following:

1. A natural-language request for a supported component results in a generated patch.
2. The generated patch is constrained to the mapped file and component.
3. A branch is created and the change is committed in isolation.
4. The resulting branch name and commit SHA are returned to the system.
5. Validation errors are visible and understandable.
6. A simple conflict or invalid patch is detected before merge.
7. The change can move to preview and testing without affecting production.

---

## 12. Final demo flow for Person 3

The clean demonstration path for the hackathon should be:

1. Person 1 selects the checkout button or hero section in the demo app
2. Person 1 sends the selected component and natural-language instruction to the backend
3. Person 2 passes request metadata into the edit pipeline
4. Person 3 resolves the mapped file
5. Person 3 calls the LLM with a constrained prompt
6. Person 3 validates the patch and creates a branch
7. Person 3 applies the patch and commits it
8. Person 3 returns branch, diff, and commit info
9. Person 4 previews the result and verifies behavior
10. Approval, merge, and deployment follow

This is the golden path the team should practice during the final demo rehearsal.

---

## 13. Recommended execution strategy for the 8-hour sprint

### Key rule
Person 3 should prove the LLM-to-Git path as early as possible.

This path is the riskiest and most important feature. It should not wait until the end.

### Recommended workflow
- In the first 1-2 hours, validate the prompt and response format with a mock or real model
- In the next 2-3 hours, connect the source mapping and Git branch creation
- In the following hours, add validation and conflict checks
- In the final hour, rehearse the full demo with the rest of the team

### Practical team coordination
- Person 1 should build UI against mock data early
- Person 2 should define the data schema early
- Person 4 should prepare preview and deployment checks early
- Person 3 should deliver a minimal but real backend contract as soon as possible

This reduces risk and keeps the system integrable.

---

## 14. Final statement of ownership

Person 3 is the owner of the “intelligence + source-control engine” for PATCHWORK.

Their work is not just LLM access; it is the implementation of the safe computational middle layer between the editor and the production Git workflow.

If Person 3 succeeds, the platform can execute the most important feature in the project: turning a simple user instruction into a real, isolated, reviewable code change.

This is the central and most important technical responsibility in the team structure.

---

## 15. Current Implementation Baseline (2026-10-11)

This section records the verified state of `final-git-integration` and is the
source of truth for what remains. Earlier sections describe the target design;
they must not be read as proof that those operations are already connected.

| Area | Present on this branch | Still missing or disconnected |
|---|---|---|
| Component selection | `frontend/src/patchwork-bridge.ts`, `frontend/src/selection-protocol.ts`, and `backend/src/config/component-registry.ts` implement the iframe message contract and trusted component-to-file mappings. | The configured Persia Darbar target checkout does not currently render the registry's `data-patchwork-id` anchors or load the selection runtime. Source resolution works, but live selection-to-edit does not work end to end. |
| Local edit API | `POST /api/edits/generate` resolves a registered component, reads its source, calls the configured provider, validates a diff, and writes only an isolated temporary preview. | `getPatchProvider()` selects the mock by default. The mock inserts a simulated comment and does not implement the requested change. The target repository remains unchanged by design. |
| Groq | `backend/src/integrations/llm/groq.ts` builds a prompt, calls Groq, parses a result, and returns a proposed diff through `POST /api/llm/generate-patch`. | This is separate from the editor. It does not use the trusted source resolver, run `validatePatchDiff`, create a branch, persist a patch, or commit. Its route currently has no user authentication or rate limit. |
| Diff safety | `backend/src/services/patch-validation.service.ts` checks unified diff syntax, target path, allowed extension, hunk/source consistency, and size limits. `edit-orchestration.service.ts` applies accepted hunks to an isolated copy and checks that the source did not change. | These protections are used by local edit orchestration, not the standalone Groq endpoint. No build/typecheck is run against generated output. |
| Patch metadata | Project/patch routes persist drafts, enforce status transitions, scope access to owners, and record audit events. | Status transitions do not dispatch generation, validation, Git operations, or callbacks. Generated diff/branch/commit metadata is not written by the current generation path. |
| Git | `backend/src/integrations/git/branch.ts` creates a safe branch-name string. | There is no Git branch creation, patch application, commit, or conflict-check operation in this branch. |
| GitHub and worker APIs | GitHub write, worker-callback, and deployment/release workflow modules are not present in this branch's tracked source. | `origin/backend` has separate work (including commit `4e5a54d`) with GitHub and callback/tracking APIs; it is not included in `final-git-integration`. Review and integrate it deliberately with Person 2; do not assume those APIs exist here or copy files without reconciling contracts. Its own documentation says no generation queue/worker or Vercel trigger/poller is wired. |
| Frontend | `frontend/src/PreviewPane.tsx` loads component metadata; `frontend/src/Inspector.tsx` calls `/api/edits/generate` and displays its proposal. | The editor does not call Groq, create/list persisted projects or patches, dispatch jobs, or use real Git branch/commit/PR metadata. “Apply to Branch” and “Approve Release” update local UI state only. Other workflow screens still use demo data. |
| Local configuration | `TARGET_REPOSITORY_PATH` was set to the local Persia Darbar checkout and is ignored by Git. | On the latest safe check, `backend/.env` had no `GROQ_API_KEY` and no `GROQ_MODEL`; provider selection therefore stays mock and Groq is not ready for a fresh process. Keep credentials only in ignored local/hosted secret storage. |
| Tests | Backend tests cover the mock pipeline, registry, diff validator, patch status behavior, and Groq parsing/API behavior with mocked fetch responses. Baseline: 13 test files / 88 tests passed. | They do not prove live Groq-to-GitHub behavior, worker dispatch, real App permissions, or production deployment. |

### Existing request paths (do not conflate them)

1. **Editor path:** iframe selection → `PreviewPane` metadata lookup →
  `Inspector` → `POST /api/edits/generate` → trusted registry/local source →
  mock provider → diff validation → isolated temp copy.
2. **Standalone Groq path:** `POST /api/llm/generate-patch` → Groq → parsed
  diff/branch-name response. It stops before validation or repository changes.
3. **Persisted patch path:** create a project patch → owner-controlled status
  transitions and audit records. This currently does not invoke either path
  above.

Person 3's integration work is to connect these paths without weakening their
existing safety boundaries. Preserve existing editor and API contracts during
migration; do not remove a route or change its response shape until its callers
and tests have moved.

## 16. Integration Principles and Non-Negotiable Invariants

- **One authoritative pipeline:** the dashboard and any worker must call the
  same orchestration/provider layer. Do not keep separate Groq implementations
  for the standalone route and editor.
- **Trusted source mapping:** accept a component ID and instruction from the
  client. Resolve paths, editable scope, and allowed operations on the server.
  Never let browser input choose an arbitrary repository path.
- **Validate before writing:** parse and validate the LLM diff against the
  exact current source and one authorized file before creating commits. Reject
  empty, malformed, oversized, stale, traversal, or multi-file output.
- **No production mutation during proposal/review:** generation and preview
  may create an isolated patch branch, but must never write to the target
  repository working tree, default branch, or production before approval.
- **Expected-head protection:** branch creation and commits use the verified
  base/head SHA. Never force-update a branch. If source changes after
  generation, fail as a conflict and require regeneration/review.
- **Persist actual outcomes:** never advance a patch to `GENERATED`,
  `VALIDATED`, `APPROVED`, or `MERGED` just because a request was accepted.
  Store actual diff, changed paths, branch, base/head SHAs, validation result,
  and operation errors through the agreed backend contract.
- **Secrets stay server-side:** Groq, GitHub App, and worker secrets must not
  be sent to the browser, committed, or logged. Protect any endpoint that can
  spend the server's Groq quota against unauthorized use and abuse.
- **Explicit provider state:** mark mock output as simulated. Select Groq only
  when its key and an account-accessible model are configured; configuration
  errors must not silently fall back to mock or claim real generation.
- **Small integrations:** reuse Person 2's backend APIs when contracts match.
  Reconcile duplicate types/routes/services instead of adding parallel schemas.

## 17. Remaining Implementation Plan

Complete these phases in order. Each phase has a required gate; do not continue
if its gate fails.

### Phase A — Freeze contracts and integrate backend dependencies

1. Confirm `final-git-integration` is the working branch and record the current
  test/build baseline. Keep the existing secret and worktree hygiene.
2. Review Person 2's work on `origin/backend`, especially commit `4e5a54d`, with
  Person 2. Decide together whether to merge/cherry-pick it or port only
  required commits. It is not currently included in this branch.
3. Reconcile route paths, auth identity, patch states, audit metadata, callback
  signatures, and response DTOs. Avoid duplicate project/patch, GitHub, or
  release modules.
4. Define the shared request/response contract for Inspector, API,
  orchestration, and persisted patch record. Keep current edit-proposal fields
  until the frontend is migrated; add patch IDs and real status/branch/commit
  metadata compatibly.

**Gate A:** backend typecheck/build and existing tests pass; health, project,
patch, component, and edit routes retain their contracts; no conflict markers
or credentials are tracked.

### Phase B — Make target selection and source mapping real

1. Add the exact registry IDs as `data-patchwork-id` attributes to the matching
  Persia Darbar components. Load the selection runtime with an explicit
  dashboard-origin allow-list. Keep selection disabled by default and preserve
  normal click/navigation behavior while disabled.
2. Verify every registry ID maps to an existing source file and the selected
  element reports that same ID. Never expose file paths to the browser.
3. Verify `TARGET_REPOSITORY_PATH` points to the local checkout for development;
  configure it through host secrets/config in hosted environments.

**Gate B:** iframe handshake reaches `READY`; supported elements can be
selected and resolved by the backend; unknown IDs and stale mappings fail
cleanly. Test missing target, wrong origin, and unregistered ID cases.

### Phase C — Unify Groq and editor generation

1. Implement `GroqPatchProvider` behind the existing `PatchProvider` interface
  and select it through `LLM_PROVIDER=groq`. Give it server-resolved source,
  registry entry, allowed operations, component description, and instruction.
2. Reuse one branch-name helper. Remove duplicate naming logic only after tests
  cover the preserved naming format.
3. Make `/api/edits/generate` and the editor use this orchestration path. Keep
  `/api/llm/generate-patch` only if needed for compatibility; make it delegate
  to the same validated service instead of a parallel generator.
4. Add request timeout, bounded response size, and safe handling for rate
  limits, network failures, invalid JSON, missing content, and model errors.
  Never log credentials, authorization headers, or full private source.
5. Parse model output into a typed schema and validate the diff against the
  authorized file and current source before returning it. The prompt is not a
  security boundary; the validator is mandatory.
6. Add authentication/authorization and request throttling to routes that can
  spend the server's Groq quota.

**Gate C:** mocked tests cover valid/malformed output, timeout, rate limits,
missing key, unsupported model, and malicious/unrelated file output. The editor
receives a Groq proposal with `simulated: false`; invalid output never reaches
Git operations.

### Phase D — Connect persisted patch state and generation worker

1. On edit request, create or reuse an owned project patch record and store the
  prompt/component metadata. Do not use a frontend-only `editId` as the sole
  record of work.
2. Start generation through one controlled dispatch path. Prefer Person 2's
  trusted callback contract if integrated. Add one dispatch mechanism and one
  worker, not a second lifecycle implementation. If the team chooses a
  synchronous MVP instead, document that limitation and still use the same
  state transitions and result persistence.
3. Bind callbacks to a server-issued generation ID; authenticate worker
  callbacks with the agreed HMAC contract, timestamp bounds, raw-body
  verification, and idempotent/stale-result rejection. Keep the worker secret
  server-side.
4. Persist success/failure, diff metadata, branch/base/head identifiers, and
  audit events transactionally. Worker failure must be visible; never
  fabricate success.

**Gate D:** tests prove one dispatch per generation ID, idempotent retry, stale
callback rejection, invalid worker-signature rejection, audit persistence for
success/failure, and no secret/source leakage in public responses.

### Phase E — Validate, apply, and create the isolated Git change

1. Fetch exact source at the selected repository/base SHA through the configured
  provider. Keep the local provider for the controlled local demo; use the
  GitHub App provider for GitHub repositories. Never mix a local path with a
  different remote repository identifier.
2. Run `validatePatchDiff` against that source and authorized registry file.
  Apply the parsed patch in memory first. Run applicable build/type/lint checks
  in an isolated checkout or worker workspace.
3. Use the reviewed GitHub App service, when integrated, to create a unique
  patch branch from the verified base and commit only validated files. Pass
  expected head SHA/idempotency key; use non-force updates. Never write to the
  default branch. Return actual branch name and commit SHA.
4. Create a pull request only after commit succeeds, if required by the agreed
  workflow. Commit success is not approval, merge, or deployment.
5. Detect an existing branch/source change as a conflict. Persist the conflict
  and stop; do not auto-overwrite or silently retry against a new base.

**Gate E:** tests cover successful single-file branch/commit, wrong paths,
traversal, oversized diff, stale base/head, GitHub permission denial, network
failure, idempotent retry, and PR failure after commit. The default branch and
local target checkout remain unchanged.

### Phase F — Integrate frontend review and real workflow status

1. Replace the inspector's mock-only submit path with persisted patch APIs and
  generation results. Preserve loading, retryable errors, visible validation,
  and an explicit simulated badge in mock mode.
2. Populate branch name, commit SHA, changed files, and status from backend
  responses; remove hard-coded `local/preview`, `uncommitted`, and fake
  success values from the real-provider path.
3. Make “Apply to Branch” and approval actions call real backend operations.
  Approval must not imply merge or deploy unless the server confirms it.
  Keep labels/statuses aligned with actual server state.
4. Keep conflict/release/deployment screens marked as demo data until their
  APIs are integrated. Coordinate preview/deployment work with Person 4;
  Person 3 must not implement a parallel deployment provider.

**Gate F:** frontend build/lint and a browser flow cover selection → request →
proposal → review → reject/approve. Reload can recover persisted status;
failed requests preserve the prompt and selection.

### Phase G — End-to-end rehearsal and release readiness

Run success and failure scenarios on `final-git-integration` with a controlled
test repository and test GitHub App installation:

1. Select a registry-backed component and submit a small natural-language edit.
2. Confirm trusted source context and the configured Groq provider were used.
3. Confirm the diff is single-file, validated, and build-tested before write.
4. Confirm a non-default branch and commit SHA exist; verify the default branch
  has not changed.
5. Review the real diff/PR and test result in the frontend.
6. Exercise malformed output, missing credentials, revoked GitHub permissions,
  stale source, and network failure. Each must stop safely and record a useful
  failure.
7. Verify patch history/audit matches actual operations. Hand the validated
  branch/commit to Person 4 for isolated preview/deployment checks.

**Final gate:** backend typecheck/build/tests and frontend build/lint pass; no
unresolved conflicts or tracked credentials; live GitHub operations succeed
only on a disposable/test branch; production merge/deployment requires explicit
approval and Person 4's verification.

## 18. Regression and Safety Checklist

Run relevant checks after each phase, not only at the end:

- Backend: `npm --prefix backend run typecheck`, `npm --prefix backend test`,
  and `npm --prefix backend run build`.
- Frontend: `npm --prefix frontend run build` and
  `npm --prefix frontend run lint`.
- API regression: health, project auth/ownership, patch CRUD/status transitions,
  component metadata/source resolution, and existing edit-proposal response.
- Security regression: no client-controlled paths; no absolute/traversal paths;
  allowed file scope; GitHub writes use the authenticated user's installation;
  worker callbacks require valid signatures; secrets never appear in responses,
  logs, tests, commits, or screenshots.
- State regression: each transition is valid and audited; callbacks are
  idempotent; stale/concurrent updates become conflicts; approval is distinct
  from merge; merge is distinct from deployment.
- Repository regression: preview is isolated; commits target only the patch
  branch; no force update; original checkout/default branch remains unchanged
  until an explicitly authorized merge.
- Demo regression: label mock output accurately; never present mocked conflict,
  test, release, or deployment data as live.

If a gate fails, stop at that phase, preserve the source/default branch, fix the
narrow failing slice, and rerun the same checks before continuing. Do not hide a
failure by changing status or silently switching providers.
