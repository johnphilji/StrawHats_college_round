# PATCHWORK Implementation Plan

## 1. What Exists
Currently, the repository contains a fully functional **Phase 1 & 2 Prototype** of the Dashboard (built with React, Vite, Tailwind CSS, and shadcn/ui components).
It includes:
- A polished UI shell with routing and navigation.
- A functional visual editor (`EditorPage`) simulating patch creation using an embedded React mock.
- A global state manager (Zustand) that saves drafts, patches, conflicts, releases, and audit logs to `localStorage`.
- Typed mock logic (`src/features/patch-engine`, `release-management`, `conflict-detection`) and basic unit tests (`tests/`).

## 2. What Will Be Reused
- **UI & Layouts**: All React pages, Tailwind configurations, Radix primitives, and routing logic will remain intact.
- **Zustand State**: Will be retained strictly for UI layout state, but the data source will swap from `localStorage` to REST API fetching.
- **Business Logic Modules**: The conflict detection engine, patch validation allowlist, and release engine logic will be migrated to the server. The `Vitest` test suites for these features will also be reused on the server.
- **Design Tokens & CSS**: Global styles and Tailwind variants will be kept exactly as they are for the Dashboard.

## 3. What Will Be Replaced or Restructured
- **Monorepo Conversion**: The entire current React codebase will be moved into an npm workspace at `apps/dashboard/`.
- **Zustand Local Storage Persistence**: Will be entirely replaced by server-side JSON-file storage via `apps/server/`.
- **Visual Editor Canvas**: The embedded React `<EditableElement>` mock will be deleted and replaced with an `<iframe>` rendering the separate `apps/target-site` using origin-checked `postMessage` bridging.
- **Mock Services**: The fake `auditService.ts` and client-side patch evaluations will be deleted from the dashboard and rebuilt fully on the server.

## 4. Phase 0 Restructure Action Plan
1. Scaffold monorepo folders (`apps/dashboard`, `apps/server`, `apps/target-site`, `packages/shared`).
2. Move all current React dashboard files to `apps/dashboard`.
3. Set up the root `package.json` with npm workspaces and `concurrently`.
4. Create the shared types package.
5. Verify the dashboard still builds and tests still run natively.
