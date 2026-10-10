# PATCHWORK

**Patchwork** is a developer tool designed to fix live websites without requiring a rebuild or redeployment. Fixes are stored as independent "patches" (a target element + a safe operation). A single, lightweight 6kb script tag on the target site fetches the currently released patches and applies them safely at page load.

Built for the hackathon, this project demonstrates a highly robust architecture addressing the core problems of client-side DOM patching: element drift, conflicting operations, and unverified rollbacks.

## Architecture & Monorepo Structure

This project uses a strict Monorepo setup to guarantee complete isolation (No shared state, no fakes). It consists of three independent applications and shared packages:

*   **`apps/dashboard`**: A beautiful, vanilla CSS React SPA (Vite + React Router + Zustand) acting as the control center. Includes a Visual WYSIWYG Editor that iframes the target site to select elements and preview changes in real-time.
*   **`apps/server`**: A lightweight Node.js Express API. Serves patches to the target site, manages Drafts and Releases, detects conflicting overlapping patches, and maintains a strict SHA-256 cryptographic audit trail of all mutations.
*   **`apps/target-site`**: A mock "Acme Store" eCommerce website running on a separate origin. It only knows about Patchwork via a single embedded `<script>` tag. Includes a V1 and V2 layout to test the self-healing algorithm.
*   **`packages/runtime`**: The compiled 6kb `pw.js` execution engine. It embeds into the target site, communicates securely with the Dashboard via `window.postMessage`, and executes the DOM modifications and healing logic.
*   **`packages/shared`**: Strongly typed TypeScript models shared strictly across all workspaces.

## Key Features Implemented

1.  **Visual Element Editor**: 
    Hover, select, and edit elements directly on the live website through a secure iframe bridge. Supports live text and CSS style modifications (color, background).
2.  **Self-Healing AI Algorithm (`heal.ts`)**: 
    If a website updates and an element's selector breaks, the runtime executes a Jaccard-similarity scoring algorithm. It evaluates the element's text content, DOM attributes, relative ancestor depth, and adjacent sibling text to definitively locate the mutated element and apply the patch anyway.
3.  **Strict Operation Whitelist**: 
    The runtime completely sanitizes and rejects malicious CSS values (e.g., `url()`, `expression()`) and completely blocks all script injections (e.g., `javascript:` links). 
4.  **Cryptographic Audit Trail**: 
    Every single mutation event (Patch created, Release deployed, Release rolled back) is hashed against the previous event's hash (`prevHash`). The chain can be mathematically verified at any time to prove compliance.
5.  **Smart Conflict Detection**: 
    Before any release is deployed, the server compares the CSS properties and target selectors of all pending patches. It uses overlap-detection to stop multiple developers from unintentionally overriding the exact same style on the exact same element.
6.  **Instant Rollbacks**: 
    Because patches are mathematically pure and stateless, you can roll back to a previous "Release Snapshot" instantly. The target site picks up the rolled-back configuration on the next page load.

## Getting Started

**Prerequisites:** Node.js (v20+)

1.  **Install Dependencies:**
    \`\`\`bash
    npm install
    \`\`\`

2.  **Seed the Database:**
    Creates a fresh, clean slate for the local JSON data store.
    \`\`\`bash
    npm run seed
    \`\`\`

3.  **Run the Applications:**
    This utilizes \`concurrently\` to boot the Dashboard (5173), Server (4001), and Target Site (4000) all at once.
    \`\`\`bash
    npm run dev
    \`\`\`

4.  **Run Automated Tests:**
    Validates the Cryptographic Audit Chain and the Self-Healing Jaccard algorithm.
    \`\`\`bash
    npm run test -w @patchwork/server
    npm run test -w @patchwork/runtime
    \`\`\`

## Hackathon Workflow (How to Demo)

1. Open **http://localhost:5173** to view the Dashboard.
2. Navigate to **Websites** -> Click **Open Editor**.
3. In the Editor, hover over the "Acme Store" preview. Click on an element (like the "Proceed to Checkout" button).
4. Change its text or color in the properties panel and watch it live-update.
5. Click **Save Draft**.
6. Navigate to the **Releases** page to group your patch into a release and deploy it.
7. Open **http://localhost:4000** in a new tab. You will see the patch applied live!
8. View the **Audit Trail** in the Dashboard to see the cryptographic proof of your actions.
