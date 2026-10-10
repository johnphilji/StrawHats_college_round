# PATCHWORK --- Project Context, Requirements & Implementation Workflow

> **Project:** PATCHWORK --- Hotfix the Internet\
> **Event:** GDG On Campus CRCE --- Bit N Build\
> **Time constraint:** 8-hour hackathon\
> **Category:** Web/App Development\
> **Primary implementation direction:** LLM-assisted source-code
> editing, Git-based review and version control, and Vercel deployment.

## 1. Executive Summary

PATCHWORK is a visual, LLM-powered website editing platform. A user
selects a website component, describes a desired change in natural
language, and PATCHWORK uses an LLM to generate a source-code
modification. The change is isolated on a Git branch, previewed and
validated, approved, merged into the production branch, and deployed
through Vercel.

The goal is to make website changes safer and easier to manage by
combining:

-   Visual editing of website components.
-   LLM-generated source-code changes.
-   Git branches, commits, approvals, and release history.
-   Isolated previews and automated verification.
-   Conflict detection and collaboration support.
-   Deployment tracking and rollback.
-   An audit trail of modifications and release activity.

**Core workflow:**

`Select component → Describe change → Generate code diff → Create branch → Preview and test → Review/approve → Merge → Deploy with Vercel → Verify → Roll back if needed`

## 2. Original Problem Statement: Requirements to Address

The original PATCHWORK problem statement describes a platform that lets
developers modify existing websites through independently managed
patches without rebuilding the original application. It specifically
calls out these capabilities.

### 2.1 Visual Patching

Allow users to modify website elements, layouts, content, and supported
behaviour through a visual interface.

**Planned implementation:** The user selects an element in a controlled
React/Next.js demo website and describes a change. PATCHWORK maps the
selected element to its source component and asks an LLM to propose a
source-code diff. The interface displays the proposed changes for
review.

### 2.2 Smart Element Tracking

Identify when website updates invalidate existing patches and locate
moved elements using structural and semantic context.

**Planned implementation:** For the hackathon, use stable component
identifiers and an explicit mapping from editable elements to source
files/components. Validate that the target still exists before applying
a change. More advanced structural/semantic matching can be a stretch
goal.

**Scope note:** Stable IDs in a controlled demo do not fully implement
general semantic tracking across arbitrary website redesigns. Do not
claim that they do.

### 2.3 Collaborative Editing

Allow multiple developers to create, review, and merge patches while
detecting conflicting changes.

**Planned implementation:** Use Git branches and commits as the
foundation for concurrent changes. Add basic conflict handling and a
review/approval state. For an eight-hour MVP, multiple people can work
on separate branches even if a polished real-time collaboration UI is
deferred.

Conflict examples include two branches changing the same component
property to incompatible values. A Git merge conflict is one type of
conflict; application-level conflicts may also need explicit detection.

### 2.4 Isolated Preview

Test proposed patches without affecting the published website.

**Planned implementation:** Use a branch-based preview deployment, such
as a Vercel preview deployment, or a local/isolated preview environment.
Only merge approved changes into the production branch. Confirm that a
draft edit cannot alter production.

### 2.5 Automated Verification

Execute browser interactions and visual checks to identify regressions
before deployment.

**Planned implementation:** Run relevant build/type/lint checks and a
small number of Playwright tests. Where time allows, capture screenshots
and compare them with a baseline to flag visual regressions.

### 2.6 Versioned Deployment and Rollback

Track patch releases, detect failed changes, and restore a previously
working state.

**Planned implementation:** Record each release's Git commit,
preview/production deployment reference, status, and timestamps. If a
deployment fails or introduces a problem, revert to a known-good commit
or use Vercel's rollback capability. Keep the failed release in history.

### 2.7 Audit Trail

Maintain a history of modifications, deployments, conflicts, and
reversions.

**Planned implementation:** Record the user/change request, affected
files, branch and commit references, validation outcomes, approval,
merge, deployment status, detected conflicts, and rollback actions. Do
not erase failed or reverted release records.

## 3. Important Architecture Decision and Trade-off

The original problem statement emphasizes independently managed patches
that do not require rebuilding the original application. The current
implementation proposal uses a different deployment model:

-   The LLM modifies actual website source files.
-   Git stores the code changes.
-   Approved changes are merged into the production branch.
-   Vercel builds and deploys the resulting application.

This is practical for a controlled React/Next.js repository and gives
PATCHWORK a real Git-based workflow. However, it is **not identical** to
applying an independent runtime patch without rebuilding the original
application: a normal Vercel production deployment rebuilds/redeploys
the app.

For the hackathon, explicitly scope the prototype to a website
repository we control and describe the solution accurately as
**LLM-assisted visual code changes with isolated Git branches, review,
deployment, and rollback**. Do not claim that arbitrary third-party
sites can be edited or that the original app never needs to be rebuilt.

If strict independent runtime patching is required by the judges, a
separate runtime patch loader would be needed. That is a different
architecture and should not be mixed into the MVP unless the core
Git/Vercel path is already working.

## 4. Product Mental Model

PATCHWORK has three main parts:

1.  **Visual editor:** Lets the user select a supported component and
    request a change.
2.  **LLM code editor:** Produces a constrained diff against actual
    source files.
3.  **Git and deployment workflow:** Isolates, validates, approves,
    merges, deploys, and tracks changes.

Git is the source of truth for website source code. The database stores
workflow metadata and references. JSON is useful for structured requests
and metadata, but the entire website does not need to be represented as
a mutable JSON document.

## 5. End-to-End Workflow

### Step 1 --- Connect a controlled website repository

Connect a GitHub repository containing a supported React or Next.js
application. Configure the repository and production branch. The
hackathon demo should use a small website created and controlled by the
team.

### Step 2 --- Select a component visually

Open the website in the editing interface and select a supported element
such as a button, heading, card, or hero section.

For the MVP, add stable identifiers such as:

``` tsx
<button data-patchwork-id="checkout-button">
  Checkout
</button>
```

Maintain a mapping from the identifier to the relevant source file or
component. Arbitrary DOM-to-source discovery across any website is
outside the initial scope.

### Step 3 --- Describe the requested change

Example:

> Change the checkout button to green and rename it to "Continue to
> Payment".

Send the request, selected component identifier, and relevant source
context to the backend.

### Step 4 --- Generate a source-code diff

The backend asks the LLM to propose a narrowly scoped change. The model
should return a diff or structured edit instructions rather than blindly
rewriting entire files.

Example:

``` diff
- <button className="bg-blue-600 text-white">
-   Checkout
+ <button className="bg-green-600 text-white">
+   Continue to Payment
  </button>
```

Validate the generated result. Restrict which files can be changed,
reject malformed diffs, and never let generated code bypass the review
and validation workflow.

### Step 5 --- Create a branch and commit

Create a branch such as `patch/checkout-redesign`, apply the validated
change, and commit it. Production remains unchanged.

Keep the branch name, commit SHA, change request, affected files,
author, timestamp, and status.

### Step 6 --- Preview and test

Create an isolated preview for the branch. Run checks appropriate to the
application, such as:

-   Diff and file-scope validation.
-   Formatting, lint, and TypeScript checks.
-   Application build.
-   Targeted Playwright browser interactions.
-   Visual screenshot comparison, if time permits.
-   Target existence and change-conflict checks.

Show useful failure information. A failed test should block approval or
clearly mark the branch as not ready.

### Step 7 --- Review and approve

Show the generated diff and preview to the user. Approval means the
change is eligible to merge; it does not itself deploy the site.

### Step 8 --- Merge into the production branch

Merge the approved branch into `main` (or the repository's configured
production branch). If the merge conflicts, block it until the conflict
is resolved. Do not silently overwrite another developer's changes.

### Step 9 --- Deploy through Vercel

Vercel is connected to the GitHub repository. A merge into the
configured production branch triggers a production build/deployment.
Branches or pull requests can use preview deployments.

Track the actual Vercel deployment status. A successful Git merge is not
proof that the deployment succeeded.

### Step 10 --- Verify and record

Record the commit, release, deployment identifier/URL, timestamps,
status, and relevant verification result. Where possible, confirm the
expected change is visible on the deployed site.

### Step 11 --- Roll back if necessary

Restore a known-good version using an appropriate Vercel rollback or a
source revert followed by redeployment. Record the action and restored
version. Preserve the failed release and its history.

## 6. Branch, Release, and Status Model

Do not treat branch state, merge state, and deployment state as one
status.

Suggested change lifecycle:

`Draft → Testing → Approved → Merged → Deploying → Deployed`

Failure paths:

-   Validation failure → return to Draft/Testing with errors.
-   Merge conflict → blocked until resolved.
-   Build or deployment failure → Failed.
-   Release issue → Rollback to a known-good version.

Concepts:

-   **Branch:** Isolated development of a proposed change.
-   **Commit:** Immutable source-code snapshot.
-   **Preview:** Testable deployment of a branch, separate from
    production.
-   **Approval:** Human decision that a change can be merged.
-   **Merge:** Integrates approved code into the production branch.
-   **Release:** Identifies a code version and its associated
    deployment.
-   **Deployment:** A particular build/deployment instance.
-   **Rollback:** Restores a previously working version without deleting
    history.

## 7. Proposed Architecture and Stack

  -----------------------------------------------------------------------
  Component               Proposed technology     Responsibility
  ----------------------- ----------------------- -----------------------
  Dashboard and visual    React + TypeScript +    Component selection,
  editor                  Vite                    prompts, diffs, preview
                                                  and workflow UI

  Styling                 Tailwind CSS            Dashboard styling

  Backend                 Node.js + Express       APIs, orchestration,
                                                  workflow states and
                                                  integration logic

  LLM                     Model API               Generate proposed
                                                  source-code diffs

  Source control          Git + GitHub            Real source files,
                                                  branches, commits and
                                                  merge history

  Database                PostgreSQL + Prisma     Projects, requests,
                                                  statuses, approvals and
                                                  deployment metadata

  Preview/testing         Vercel preview          Isolated preview and
                          deployments and         browser verification
                          Playwright              

  Production deployment   Vercel                  Build and deploy from
                                                  the configured
                                                  production branch
  -----------------------------------------------------------------------

Use one backend and one database. Do not add microservices, Redis, job
queues, or real-time collaboration infrastructure before the core
workflow works. The stack can be adjusted if a required integration or
the existing repository makes another choice more practical.

## 8. Data and API Responsibilities

### Database should track

-   Project and repository configuration.
-   Edit request and user instruction.
-   Selected component identifier and affected file references.
-   Branch name and commit SHA.
-   Diff reference or stored patch text, where appropriate.
-   Validation results and test artifacts.
-   Review and approval records.
-   Merge outcome and conflicts.
-   Release and Vercel deployment identifiers/URLs.
-   Deployment status and timestamps.
-   Rollback events and restored version.
-   Audit history.

Git should remain the source of truth for the source code. Avoid
maintaining an unrelated, competing copy of the whole codebase in the
database.

### Suggested API operations

-   `POST /api/projects` --- Register a project.
-   `POST /api/edits` --- Submit a visual edit request.
-   `POST /api/edits/:id/generate` --- Generate a proposed diff.
-   `POST /api/edits/:id/validate` --- Validate the change.
-   `POST /api/branches` --- Create a branch.
-   `POST /api/branches/:id/commit` --- Commit a change.
-   `POST /api/branches/:id/preview` --- Create or retrieve a preview.
-   `POST /api/branches/:id/approve` --- Approve a change.
-   `POST /api/branches/:id/merge` --- Merge an approved branch.
-   `GET /api/projects/:id/releases` --- List releases.
-   `GET /api/projects/:id/deployments` --- List deployments.
-   `POST /api/releases/:id/rollback` --- Initiate rollback.

These are conceptual endpoints. Simplify the API if the same user-facing
workflow can be implemented safely with fewer routes.

## 9. Eight-Hour MVP Priorities

### P0 --- Must demonstrate

1.  Controlled React/Next.js website in a GitHub repository.
2.  Visual selection of at least one supported component.
3.  Natural-language edit request.
4.  LLM-generated source-code diff.
5.  Real isolated branch and commit.
6.  Preview that does not affect production.
7.  Basic validation/build check.
8.  Approval and merge into the production branch.
9.  Real Vercel production deployment.
10. Deployment status and basic history.
11. A demonstrated rollback path.

### P1 --- Implement if time permits

-   Target validation and useful errors.
-   Playwright browser interaction test.
-   Screenshot-based visual regression check.
-   Basic conflict detection and resolution flow.
-   Multi-developer branch/review workflow.
-   Audit log for changes, deployments, conflicts, and rollbacks.
-   Basic detection of a component identifier that no longer exists.

### P2 --- Defer

-   General semantic matching for arbitrary DOM changes.
-   Real-time collaborative editing.
-   Universal support for arbitrary third-party websites.
-   Advanced visual regression tooling.
-   Autonomous agents that approve and deploy their own changes.
-   Complex role/permission systems.
-   Microservices, queues, and distributed infrastructure.

The priorities are for the eight-hour prototype. The seven
problem-statement capabilities must still guide the design and be
represented honestly in the demo or roadmap. Do not claim a feature is
implemented if it is only planned.

## 10. Recommended Demonstration

Use a small e-commerce website with a checkout button.

**Initial state** - Button text: `Checkout` - Button colour: Blue -
Production version: v1

**Demo flow** 1. Select the checkout button in PATCHWORK. 2. Ask:
"Change this button to green and rename it to Continue to Payment." 3.
Show the LLM-generated source diff. 4. Create `patch/checkout-redesign`
and commit the change. 5. Open the isolated preview and verify the
visual result. 6. Run validation and a targeted browser test. 7. Approve
the change. 8. Merge it into `main`. 9. Show Vercel deploying the new
version. 10. Verify the production website changed. 11. Demonstrate
rollback to the known-good version. 12. Verify the original button
appearance is restored. 13. Show the audit history with the change,
commit, deployment, and rollback.

Only call a deployment "real" when the deployed website actually
reflects the selected version. Label any simulated step clearly.

## 11. Security and Reliability Rules

-   Never expose privileged GitHub or Vercel tokens in browser code or
    send them to the LLM.
-   Keep repository and deployment operations in the backend or a
    secured integration.
-   Restrict which repository, branch, and files an edit can modify.
-   Treat LLM output as untrusted until validated.
-   Do not merge unreviewed changes into production.
-   Do not claim build success or deployment success before receiving
    the actual result.
-   Preserve failed releases and audit records.
-   Make rollback target a known-good version.
-   Use a controlled demo website rather than promising compatibility
    with every third-party website.

## 12. Definition of Done

The end-to-end MVP is complete when a judge can observe:

1.  A user selects a website component visually.
2.  The user requests a change in natural language.
3.  The LLM generates an actual source-code diff.
4.  PATCHWORK commits it to a separate Git branch.
5.  The change is previewed and validated without affecting production.
6.  The user approves and merges it.
7.  Vercel deploys the updated application.
8.  The live change is verified.
9.  A previous known-good version can be restored.
10. The modification, conflict/review events, deployment, and rollback
    are traceable in history.

## 13. Final Product Description

**PATCHWORK is an LLM-powered visual website editing platform that turns
natural-language requests into version-controlled source-code changes,
validates them in isolated previews, manages reviews and conflicts, and
deploys approved changes through Git and Vercel with release history and
rollback.**

The original problem statement's requirements---visual patching, smart
element tracking, collaborative editing, isolated preview, automated
verification, versioned deployment/rollback, and an audit trail---must
remain the product requirements. The initial implementation should
demonstrate the most important path end to end and clearly identify
which advanced capabilities are implemented versus deferred.
