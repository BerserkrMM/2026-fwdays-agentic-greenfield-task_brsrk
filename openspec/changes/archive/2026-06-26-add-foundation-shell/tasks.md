## 1. Read the framework docs & set conventions

- [x] 1.1 Read the relevant Next.js 16 guides under `node_modules/next/dist/docs/01-app/` before writing code: PWA (`02-guides/progressive-web-apps.md`), layouts/metadata, server actions, and cache-components — note any API differences from training-data assumptions (AGENTS.md).
- [x] 1.2 Add the `postgres` client dependency to `package.json`; do NOT run `npm audit fix --force` (it downgrades Next.js — known PostCSS advisory `GHSA-qx2v-qp2m-jg93`).
- [x] 1.3 Add the unit test runner (Vitest, per design D-open-question) with a `test` script; confirm `npm run lint` and `npx tsc --noEmit` still pass (NFR-DX-01).
- [x] 1.4 Create the directory conventions: `src/domain/`, `src/db/`, `src/modules/` with a short README/comment stating the ownership + port rules (TC-MOD-01, TC-PURE-01).

## 2. Framework-free domain contracts (TC-PURE-01, TC-MOD-01)

- [x] 2.1 Define `src/domain` core types: `LedgerItem` (signed `amountMinor` kopiyky, `currency: "UAH"`, `type`, `category`, `status: pending|approved|deleted`, `accountId`, `inputEventId`, `parserRunId?`, `occurredAt?`), `InputEvent` (source `text|photo|bank`, provider, raw fields), `ParserRun`, and the `ParsedLedgerItemDraft` shape from requirements.md.
- [x] 2.2 Verify no file under `src/domain/**` imports Next.js, React, or `postgres` (framework-free check).
- [x] 2.3 Define the `src/modules/*/ports.ts` convention and declare the `AccountsPort` interface (resolve default account) and the item-creation contract type the channels call.

## 3. Shared DB boundary with in-memory fallback (TC-STACK-03/04, TC-DATA-01)

- [x] 3.1 Implement `src/db/client.ts`: build the `postgres` client when `DATABASE_URL` is set; otherwise expose named in-memory repositories implementing the same interfaces. Single owner — no module builds its own client.
- [x] 3.2 Implement `src/db/rows.ts` (raw row shapes) and `src/db/mappers.ts` (rows ↔ framework-free domain types).
- [x] 3.3 Write the bootstrap SQL derived from the PRD: `input_events`, `parser_runs`, `ledger_items` (UAH CHECK, signed `amount_minor` bigint, status set, category NOT NULL default `Без категорії`, FK links, nullable `import_row_number`/`occurred_at`). All timestamps are `timestamptz` (BC-SCOPE-03, Europe/Kyiv). Create the `(input_event_id, import_row_number)` UNIQUE index now (FR-BANK-06; behavior owned later by `bank-imports`). Apply only when `DATABASE_URL` is set.
- [x] 3.4 Implement matching in-memory repositories for the three tables so the app runs with no `DATABASE_URL`.

## 4. Item-creation contract (TC-MOD-02, FR-ITEM-06, FR-CAT-03, FR-PARSE-07)

- [x] 4.1 Implement the item-creation contract as the only sanctioned ledger-item write path (server-side only, invoked from server actions / route handlers — TC-STACK-02; never imported into a client component): accepts a `ParsedLedgerItemDraft` (+ optional `accountId`, required `inputEventId`, optional `parserRunId`), creates a `pending` item linked to its `input_event`/`parser_run`.
- [x] 4.2 Resolve a missing `accountId` via the `AccountsPort`; fail cleanly (no account-less item) when no default is available.
- [x] 4.3 Default category to `Без категорії` when the draft has no category text.

## 5. Design tokens & global styles ownership (FR-SHELL-04, TC-UI-01, TC-MOD-02)

- [x] 5.1 Keep `app/globals.css` as the single source of `fin-*` tokens; document at the top of the file (and in design refs) that `layout.tsx`/`page.tsx`/`globals.css`/tokens change only via a Foundation/Coordination change.
- [x] 5.2 Confirm shell styling uses only `var(--fin-*)` / Tailwind `fin-*` utilities — no raw hex in shell/feature-facing styles.

## 6. App shell, navigation & responsive layout (FR-SHELL-01/02, NFR-A11Y-01, NFR-I18N-01)

- [x] 6.1 Replace the starter `app/layout.tsx`: `lang="uk"`, render the responsive shell wrapping `children`. Export `const viewport: Viewport` with `viewportFit: 'cover'` and `themeColor` synced to the `fin-*` tokens (Next 16 moved these out of `metadata` — confirm the export shape against the bundled layout/metadata guide).
- [x] 6.2 Build the global navigation (Dashboard, Ledger, Imports, Accounts, Settings) with an active-route indicator and client-side navigation.
- [x] 6.3 Implement the responsive layout: desktop sidebar/topbar + mobile/PWA bottom nav, honoring `env(safe-area-inset-*)`; touch-friendly targets, no hover-only actions.
- [x] 6.4 Replace the starter `app/page.tsx` (home → Dashboard or a calm Ukrainian-first landing within the shell).

## 7. Shared screen-state primitives (FR-SHELL-03)

- [x] 7.1 Build shell-owned reusable primitives for empty, loading, partial, offline, unsupported, and error states with Ukrainian-first copy and accessible markup.
- [x] 7.2 Wire the offline state/indicator to real connectivity (`navigator.onLine` + service-worker events); it clears when connectivity returns.
- [x] 7.3 Make the error state recoverable (calm message + retry / navigate-away).

## 8. Installable PWA + service worker (FR-SHELL-01/03, TC-STACK-01)

- [x] 8.1 Add `app/manifest.ts` (name, icons, `start_url`, `display: standalone`, theme/background from tokens) and PWA icons under `public/`, per the bundled PWA guide.
- [x] 8.2 Add a minimal shell-only service worker (versioned cache, cleanup on activate; no financial data cached) and register it without console warnings/errors.
- [x] 8.3 Verify the shell renders offline after a prior visit and shows the offline state instead of a browser error page.

## 9. Imports hub & placeholder routes (FR-IMPORT-01, FR-IMPORT-02)

- [x] 9.1 Add the `/imports` hub linking the three channels (`/imports/text`, `/imports/files`, `/imports/bank`).
- [x] 9.2 Add placeholder routes for the five nav destinations (`/dashboard`, `/ledger`, `/imports`, `/accounts`, `/settings`) and the three channel routes — each renders a shared empty/unsupported "coming soon" state (no dead links, no 404s).
- [x] 9.3 Confirm the `input_event`-before-parsing contract is documented/exposed so channels persist the raw original first (FR-IMPORT-02, NFR-PRIV-02). (No channel writes yet — contract + storage only.)

## 10. Verification & handoff (NFR-OBS-01, NFR-DX-01)

- [x] 10.1 Run `npm run lint` and `npx tsc --noEmit` — both pass on a clean checkout.
- [x] 10.2 Run the app (`npm run dev`) and confirm a healthy session emits no console warnings or errors; navigate every route and exercise each shared state.
- [x] 10.3 Add/confirm unit tests for the item-creation contract (default-account resolution, category default, draft→pending mapping) and the DB-boundary fallback selection.
- [x] 10.4 Add the structural check enforcing TC-STACK-02: assert the `postgres` client / `src/db` boundary is never imported in a `"use client"` file (lint rule or test); confirm `parser_runs`/`ledger_items` have a NOT NULL FK to `input_events`.
- [x] 10.5 Update `docs/current-state.md` with what shipped, current state, and next steps (→ `add-accounts`).
