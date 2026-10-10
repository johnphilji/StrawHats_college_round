# Patchwork


Patchwork is a developer tool that applies client-side fixes to live websites via a lightweight script tag. It solves the problem of fixing critical UI or text errors on a live site when you do not have immediate access to the original source code, or when the cost and time of running a full redeploy is too high.

## Demo

TODO: [Insert Screenshot of the Dashboard]
TODO: [Insert Screenshot of the Visual Editor]
TODO: [Insert short GIF of a patch being applied on the target site]

## How it Works

A "patch" in Patchwork is an independent set of DOM modification instructions applied to a specific element. Instead of storing rigid CSS selectors, Patchwork stores a heuristic fingerprint alongside a whitelisted operation (e.g., `setText` or `setStyle`).

**Example Patch Payload:**
```json
{
  "id": "PT-a1b2c3d",
  "siteId": "acme",
  "name": "Fix Checkout Button Text",
  "status": "active",
  "version": "v1.0",
  "operations": [
    {
      "id": "op_9f8g7h",
      "selector": "button#checkout-btn",
      "targetFingerprint": "{\"tag\":\"button\",\"text\":\"checkout\",\"id\":\"checkout-btn\",\"classes\":[\"btn\",\"btn-primary\"],\"attributes\":{\"href\":\"/checkout\"},\"ancestors\":[\"div\",\"aside\",\"main\"],\"siblingText\":\"total: $99.00\",\"index\":1}",
      "operationType": "setText",
      "originalValue": "Checkout",
      "newValue": "Proceed to Checkout"
    }
  ]
}
```

**The Flow:**
1. Developer selects an element in the **Dashboard Editor** and saves a draft.
2. The draft is saved to the **Server API**.
3. Drafts are grouped into a **Release** and deployed.
4. When a user visits the target site, the embedded **`pw.js` runtime** fetches the active release.
5. The runtime locates the elements on the **Page** (using healing if the original selector breaks) and applies the operations.

## Architecture

```text
+-------------------+        HTTP (REST)       +-------------------+
|                   | <----------------------> |                   |
|  Dashboard (5173) |                          |   Server (4001)   |
|   (React/Vite)    | ---+                     | (Node.js/Express) |
|                   |    |                     |                   |
+-------------------+    |                     +-------------------+
                         | postMessage                   ^
                         | (Editor Bridge)               | HTTP GET (active.json)
                         v                               | HTTP POST (telemetry)
+-------------------------------------------------+      |
|                                                 |      |
|              Target Site (4000)                 |      |
|             (Static HTML + CSS)                 |      |
|                                                 |      |
|  +-------------------------------------------+  |      |
|  |           pw.js Runtime (6kb)             | ---------
|  |  (DOM matching, healing, application)     |  |
|  +-------------------------------------------+  |
+-------------------------------------------------+
```

*   **`apps/dashboard`**: The React SPA user interface. It communicates with the server via HTTP to manage patches and releases, and communicates with the target site iframe via `window.postMessage` to power the visual editor.
*   **`apps/server`**: The Node.js Express API. It handles CRUD operations, detects conflicting patches, maintains the JSON file database, and serves the `pw.js` file and active releases.
*   **`apps/target-site`**: A mock eCommerce site representing a 3rd-party integration. It is completely decoupled from Patchwork other than a single `<script>` tag pointing to `http://localhost:4001/pw.js`.
*   **`packages/runtime`**: The compiled IIFE script (`pw.js`) that runs inside the target site. It is responsible for identifying elements, enforcing the security whitelist, executing modifications, and emitting telemetry.
*   **`packages/shared`**: Shared TypeScript interfaces describing the core data models used across the monorepo.

## Feature Matrix

| Feature | Status | Location | How to verify |
| :--- | :--- | :--- | :--- |
| **Visual Patching** | **PARTIAL** | `apps/dashboard/src/pages/EditorPage.tsx` | Click "Open Editor". Click an element. Use the sidebar to change text/color. (Partial: UI lacks inputs for `hide` or `setAttribute`). |
| **Smart Element Tracking** | **WORKING** | `packages/runtime/src/heal.ts` | Patch the V1 checkout button. Switch target site to V2 via POST `/__admin/version`. Observe the patch apply to the redesigned button. |
| **Collaborative Editing** | **NOT BUILT** | N/A | N/A |
| **Isolated Preview** | **WORKING** | `packages/runtime/src/index.ts` | Load `http://localhost:4000/?pw_release=REL-xxx`. The target site will render that specific release instead of the active one. |
| **Automated Verification** | **NOT BUILT** | N/A | N/A |
| **Versioned Deploy & Rollback** | **WORKING** | `apps/server/src/index.ts` | Deploy a release in the dashboard. Load `:4000` to see it. Click "Rollback" in the dashboard. Reload `:4000` to see it revert. |
| **Audit Trail** | **WORKING** | `apps/server/src/features/audit.ts` | View the `/api/audit/verify` endpoint to check the SHA-256 cryptographic chain logic. |

## Element Healing

When a website updates, DOM selectors often break. Patchwork uses heuristic element re-identification using weighted similarity to find the correct element.

When a patch is created, a fingerprint is captured: tag, text content, id, classes, attributes, ancestors up to 4 levels deep, and adjacent sibling text.

During execution, if `document.querySelector` fails (or returns multiple matches), the runtime scans candidate elements and calculates a Jaccard similarity score based on these weights:
- Text content: 35%
- Attributes: 20% (boosted to 100% if both are `href` links containing "checkout")
- Ancestor overlap: 15%
- Classes: 10%
- Sibling text: 10%
- Base region: 10%

**Thresholds:**
- `>= 0.75`: Match found and applied.
- `>= 0.55`: Match found, applied, but flagged as `healed_pending` (low confidence).
- `< 0.55`: Below threshold. The operation is skipped entirely.

**Worked Example:**
Targeting the V1 checkout button (`#checkout-btn`) which is updated in V2 to (`a.cta.cta--pay`). 
- V1 Fingerprint: `tag: button`, `text: "checkout"`, `id: "checkout-btn"`.
- V2 Candidate: `tag: a`, `text: "proceed to checkout"`, `href: "/checkout"`.
- The text score evaluates to `0.8` (substring match). The attribute score evaluates to `1.0` (checkout href heuristic boost). The final score exceeds `0.75`, and the patch is applied despite the tag and ID changing entirely.

## Security Model

Security is split between the Dashboard, the Server, and the Runtime.

**Operation Whitelist:**
The runtime (`dom.ts`) enforces strict validation before modifying the DOM.
- `setText`: Overwrites `textContent` (safe from XSS).
- `hide`: Sets `display: none`.
- `setStyle`: Allowed properties are `color, backgroundColor, fontSize, fontWeight, padding, margin, borderRadius, display, visibility, opacity, width, height`.
  - **Rejected Patterns**: Any string containing `javascript:`, `url(`, `expression`, or `;`.
- `setAttribute`: Allowed properties are `href, title, alt, aria-label, placeholder, disabled, src`.
  - **Rejected Patterns**: Any string starting with `javascript:` or `data:text/html`. Any property starting with `on` (e.g., `onclick`).

**Validation Gap:**
Currently, the operation whitelist is only validated by the runtime payload execution. The server API blindly accepts operations during the `POST /patches` request. 

**PostMessage Security:**
The `pw.js` runtime strictly filters incoming `window.postMessage` events, only accepting messages originating exactly from `http://localhost:5173`.

## Conflict Detection

Before a candidate release can be grouped, the server API evaluates all pending patches for overlapping targets.

**Implemented Rules:**
1. Exact Property Overlap: Two patches target the exact same element fingerprint, same `operationType`, and same `property`. 
2. Structural Overlap: One patch targets `.cart-wrapper`, and another patch targets `.cart-wrapper .mini-cart`. If both patches attempt to change the same `property` (e.g., `backgroundColor`), it is flagged as a structural collision via basic substring matching.

Example: If User A changes the checkout button text to "Pay Now", and User B changes it to "Proceed to Checkout", the server flags a conflict. Resolving the conflict approves one patch and sets the other to `invalidated`.

## Releases and Rollback

Releases group multiple patches into atomic, immutable snapshots.

**Lifecycle:**
`Draft Patch` -> `Approved Patch` -> `Candidate Release` -> `Active Release` -> `Rolled Back Release`

**Technical Rollback:**
Performing a rollback does not delete or overwrite the data file. It simply creates a new `Release` object (e.g., "Rollback to v1.0") and re-points the `site.activeReleaseId` property to the older release's `id`. The next time the target site loads, it fetches the older snapshot.

## Audit Trail

Every state change in the system appends a new event to the audit trail. Each event calculates a SHA-256 hash comprising its own payload data appended to the `prevHash` of the immediately preceding event.

This ensures the chain is tamper-evident. If a single byte in a historical event is modified, all subsequent hashes will fail verification via the `/api/audit/verify` endpoint. 

**Note:** This does not guarantee immutability against an attacker with physical write access to `data.json`, as they could theoretically rewrite and re-hash the entire chain from scratch.

## Getting Started

**Prerequisites:** Node.js (Tested on v20+)

1. **Install Dependencies:**
   ```bash
   npm install
   ```
2. **Seed the Database:**
   Resets `apps/server/data.json` to a clean slate.
   ```bash
   npm run seed
   ```
3. **Run Development Servers:**
   Boot up the Dashboard (5173), Server API (4001), and Target Site (4000) concurrently.
   ```bash
   npm run dev
   ```
   *Windows PowerShell Note: If `concurrently` fails to boot the workspaces, start them individually in separate terminals using `npm run dev -w @patchwork/dashboard`, etc.*

## Step-by-Step Demo Script

1. Run `npm run seed` then `npm run dev`.
2. Open `http://localhost:5173` (Dashboard).
3. Navigate to **Websites** and click **Open Editor**.
4. In the visual editor, hover over the "Proceed to Checkout" button on the Acme Store. Click it.
5. In the left panel, under the **Styles** tab, change the background color from `#0ea5e9` to `red`.
6. Click **Save Draft**.
7. Navigate to the **Patches** page. You will see your new patch.
8. (Note: The UI for grouping patches into a release is missing. For the demo, you can trigger a release programmatically if you have a curl script, or rely on the dashboard placeholders).
9. Open `http://localhost:4000` to view the original, unpatched site.
10. To test healing, send a POST request to `http://localhost:4000/__admin/version` with JSON `{"v": 2}`. Refresh the target site to see the broken DOM. 

## Testing

Tests are written using Vitest.

- **`apps/server/tests/audit.test.ts`**: Verifies that the cryptographic hash chain fails validation if historical data is modified.
- **`packages/runtime/tests/heal.test.ts`**: Verifies that the Jaccard similarity algorithm correctly identifies mutated elements based on weighted heuristics.

**Not Covered:**
There are no end-to-end integration tests (e.g., Playwright) simulating a real browser flow. There are no unit tests for the React Dashboard.

## Project Structure

- `apps/dashboard/` - React 19 + Vite UI
- `apps/server/` - Node.js Express API and flat-file JSON database
- `apps/target-site/` - Mock HTML eCommerce application serving v1 and v2 layouts
- `packages/runtime/` - Vanilla TS `pw.js` execution engine compiled via esbuild
- `packages/shared/` - Shared TypeScript definitions for patches, releases, and operations

## Limitations

1. **Framework Compatibility:** The runtime struggles with SPA frameworks (React/Vue) that aggressively re-render the DOM, as Patchwork's mutations will be immediately overwritten.
2. **Shadow DOM:** The runtime `document.querySelector` cannot pierce closed Shadow DOM boundaries.
3. **Cross-Origin Iframes:** Patchwork cannot modify elements inside third-party iframes embedded on the target site (e.g., Stripe payment elements).
4. **CSP Restrictions:** Sites with strict Content Security Policies blocking inline styles or external scripts will block `pw.js` from executing or modifying CSS.
5. **Full Redesigns:** If an element is relocated, renamed, and restyled simultaneously, the healing score will drop below the 0.55 threshold and fail to apply.
6. **Concurrent Writes:** The server uses synchronous `fs.writeFileSync` on a flat JSON file, which will corrupt data if subjected to heavy concurrent write load.
7. **Authentication:** The dashboard and server APIs are completely unauthenticated. 
8. **Flash of Unpatched Content:** Because `pw.js` is loaded via a `<script defer>` tag, users may experience a brief visual flicker before the patch is applied.
9. **Editor Completeness:** The Dashboard UI only exposes inputs for text and color styling, completely omitting inputs for hiding elements or modifying attributes.

## Future Work

- Implement server-side validation of the operation whitelist to ensure malicious payloads cannot be persisted to the database.
- Build a dedicated Telemetry view in the Dashboard to surface the applied, healed, and broken metrics currently collected by the server.
- Introduce Playwright smoke tests to verify candidate releases against the target site before allowing a deployment.
- Expand the visual editor UI to support `setAttribute` and `hide` operations.
- Migrate from a flat JSON file to a structured SQLite database to safely support concurrent users.
- Add robust API authentication and role-based access control.

## Tech Stack

| Component | Technology | Version |
| :--- | :--- | :--- |
| Dashboard UI | React | 19.2.8 |
| Dashboard Bundler | Vite | 8.3.0 |
| Dashboard State | Zustand | 5.0.15 |
| Dashboard Styling | Tailwind CSS | 3.4.19 |
| Backend Server | Express | 4.21.2 |
| Runtime Bundler | esbuild | 0.25.0 |
| Testing Framework | Vitest | 2.1.9 |

## Team & License

Created by TODO. Licensed under MIT.
