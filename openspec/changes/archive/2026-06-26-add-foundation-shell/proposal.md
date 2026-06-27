## Why

Nothing in Finup can render or persist until the shared shell, the database
boundary, and the cross-cutting domain contracts exist. Per TC-MOD-02 these
files and the shared schema may only change through a single Foundation /
Coordination change — so this is the one place allowed to introduce them. Every
other capability (`accounts`, `ledger`, `ledger-items`, `parsing`, the three
import channels, `dashboard`, `settings`) is blocked until Foundation ships the
app shell, the `ledger_items` / `input_events` / `parser_runs` schema, and the
item-creation contract they all build on.

## What Changes

- **App shell & navigation (FR-SHELL-01, FR-SHELL-02).** Replace the
  create-next-app starter `app/layout.tsx` and `app/page.tsx` with a real
  installable-PWA shell: persistent global navigation to Dashboard, Ledger,
  Imports, Accounts, Settings; desktop sidebar/topbar; mobile/PWA bottom nav with
  `env(safe-area-inset-*)` support. **BREAKING** for the starter page only (no
  feature depends on it).
- **Shared screen states (FR-SHELL-03).** Reusable shell primitives for the
  empty, loading, partial, offline, unsupported, and error states that every
  screen reuses, plus an offline/online indicator wired to the PWA.
- **Design-token ownership (FR-SHELL-04).** Foundation is declared the sole owner
  of `app/layout.tsx`, `app/page.tsx`, `app/globals.css`, and the `fin-*` tokens;
  documents the "feature code consumes `var(--fin-*)` / Tailwind `fin-*`
  utilities, never raw hex" rule already seeded in `globals.css`.
- **Installable PWA (TC-STACK-01).** Web app manifest, icons, and a minimal
  offline-capable service worker registered so the shell is installable and the
  offline state is real, following the Next.js 16 PWA guide.
- **Imports hub skeleton (FR-IMPORT-01).** `/imports` hub route that links to the
  three channels (`/imports/text`, `/imports/files`, `/imports/bank`) as
  not-yet-implemented placeholders, plus the placeholder routes for the five nav
  destinations so navigation is never dead.
- **DB client boundary (TC-STACK-03/04, TC-DATA-01).** `src/db/client.ts`,
  `src/db/rows.ts`, `src/db/mappers.ts` exposing the single shared `postgres`
  client behind a boundary, configured by `DATABASE_URL`, with a named in-memory
  fallback when `DATABASE_URL` is unset so the app runs on a clean checkout. No
  module may construct its own client.
- **Shared domain contracts (TC-PURE-01, TC-MOD-01).** Framework-free
  `src/domain/**` types and the `src/modules/*/ports.ts` port convention that
  business modules integrate through.
- **Backend convention (TC-STACK-02).** Establishes that all backend behavior runs
  through Next.js Server Actions and Route Handlers (no separate backend service);
  contracts and repositories are server-side only.
- **Owned shared schema + item-creation contract (TC-MOD-02, FR-IMPORT-02).** The
  `input_events`, `parser_runs`, and `ledger_items` tables and their domain
  types, plus the **item-creation contract** every import channel uses to create
  `pending` ledger items. `input_event` is written before any normalization or
  parsing. Foundation creates the `parser_runs` table/types only; `parsing` later
  owns the run *behavior*.

## Capabilities

### New Capabilities
- `foundation`: The app shell, navigation, installable PWA, shared screen states,
  `fin-*` design-token ownership, imports-hub skeleton, the shared Postgres
  client boundary with in-memory fallback, the framework-free domain contracts
  and module-port convention, and the cross-cutting `input_events` /
  `parser_runs` / `ledger_items` schema plus the item-creation contract — the
  TC-MOD-02 coordination owner of every shared/cross-cutting file and schema.

### Modified Capabilities
<!-- None. This is the first change; openspec/specs/ is empty. -->

## Impact

- **Code (owned, cross-cutting — TC-MOD-02):** `app/layout.tsx`, `app/page.tsx`,
  `app/globals.css`; new `app/manifest.ts`, service worker + registration, PWA
  icons under `public/`; nav/shell/state components; `/imports` hub +
  placeholder routes for the five nav destinations.
- **New shared modules:** `src/domain/**` (framework-free contracts),
  `src/db/{client,rows,mappers}.ts` (Postgres boundary + in-memory fallback),
  the item-creation contract, and the `src/modules/*/ports.ts` convention.
- **Schema:** introduces `input_events`, `parser_runs`, `ledger_items` (UAH-only,
  signed `amount_minor` kopiyky, status `pending`/`approved`/`deleted`, category
  text). Derived from the PRD domain model; no bootstrap SQL exists yet.
- **Config / deps:** `DATABASE_URL` env contract (optional on a clean checkout);
  adds the `postgres` client dependency. No paid dependency added (NFR-COST-01).
- **Downstream:** unblocks every other capability; all later changes consume
  these contracts and must not re-own this schema or these shell files.
- **Stack scope:** foundation owns TC-STACK-01..04 (App Router/PWA, server-side
  backend, Postgres, shared client boundary) and TC-DATA-01. **TC-STACK-05**
  (OpenAI adapter) is owned by `parsing`, not foundation.
- **Constraints honored:** BC-SCOPE (single-user, no auth, UAH-only,
  `Europe/Kyiv` incl. `timestamptz` columns per BC-SCOPE-03), NFR-I18N-01
  (Ukrainian-first copy), NFR-OBS-01 (silent console), NFR-A11Y-01 (≥44px
  touch targets, no hover-only), NFR-DX-01 (`lint` + `tsc --noEmit` clean).
