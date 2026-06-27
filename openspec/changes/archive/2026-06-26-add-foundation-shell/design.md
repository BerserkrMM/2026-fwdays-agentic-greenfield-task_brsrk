## Context

Finup is a single-user, UAH-only, `Europe/Kyiv` installable PWA (BC-SCOPE-01..03).
The repo currently holds the create-next-app starter (`app/layout.tsx`,
`app/page.tsx`, `app/globals.css` — the last already seeded with `fin-*` tokens
per DESIGN.md), Next.js 16.2.9, React 19.2, TypeScript strict, and Tailwind v4.
No `src/`, no database boundary, no domain layer yet.

Per TC-MOD-02 the shell files, the shared schema, and the cross-cutting contracts
may only be introduced through a single Foundation / Coordination change — this
one. Every other capability is blocked on it. AGENTS.md warns this Next.js build
carries breaking changes from training-data assumptions; the relevant guides under
`node_modules/next/dist/docs/01-app/` (PWA, server actions, layouts, cache
components) MUST be read before writing the corresponding code.

This change deliberately ships the *seams* (boundaries, contracts, schema, shell,
placeholder routes) without implementing downstream features. It is the platform
the other nine capabilities build on.

## Goals / Non-Goals

**Goals:**
- A real installable-PWA app shell with persistent, never-dead navigation and the
  six shared screen states, Ukrainian-first, on the `fin-*` tokens.
- A single shared Postgres boundary (`src/db/{client,rows,mappers}.ts`) with an
  in-memory fallback so the app runs with no `DATABASE_URL` on a clean checkout.
- The owned shared schema (`input_events`, `parser_runs`, `ledger_items`) + domain
  types, derived from the PRD, with currency fixed to `UAH` and signed kopiyky.
- The item-creation contract as the single sanctioned ledger-item write path, with
  a default-account resolution seam delegated to the (future) accounts port.
- The framework-free `src/domain/**` layer and the `src/modules/*/ports.ts`
  convention that later capabilities integrate through.

**Non-Goals:**
- No feature behavior: no real ledger list, no parsing, no balance/aggregate
  queries, no account CRUD, no dashboard, no working import channels. Those are
  later capabilities; here the routes are placeholders.
- No default-account *creation* — that is owned by `accounts`. Foundation only
  defines the resolution seam.
- No `parser_run` write/retry *behavior* — owned by `parsing`. Foundation creates
  only the table/types.
- No production-grade offline data caching; the service worker only makes the
  shell installable and the offline state real (no financial data cached in v1).
- No migration tooling decision beyond a single SQL bootstrap derived from the PRD.

## Decisions

### D1 — One `foundation` capability spec, not several
The planning doc (`docs/capabilities.md`) maps each capability to exactly one
`openspec/specs/<capability>/` folder and downstream changes reference `foundation`
ownership. Splitting into `app-shell` / `data-foundation` would invent names not in
the planning doc and risk drift. **Chosen:** a single `foundation` spec grouped by
concern. *Alternative considered:* multiple capability specs — rejected to preserve
the 10-capability map and the TC-MOD-02 ownership references.

### D2 — DB boundary with a fallback driver, selected once at the seam
`src/db/client.ts` decides at module load: if `DATABASE_URL` is set, build the
`postgres` client; otherwise expose named in-memory repositories implementing the
same repository interfaces. `rows.ts` holds the raw row shapes; `mappers.ts`
converts rows ↔ framework-free domain types. Modules receive repositories, never a
client. **Why:** satisfies TC-STACK-04 (single client, shared boundary), TC-DATA-01
(in-memory fallback), and TC-PURE-01 (domain stays framework-free). *Alternative:*
let each module fall back independently — rejected; it duplicates the seam and
violates single-ownership.

### D3 — Schema derived from the PRD; one bootstrap SQL, Postgres-shaped, mirrored by the in-memory repos
No `bootstrap.sql` exists, so derive it from the PRD domain model. `ledger_items`:
`id`, `account_id`, `input_event_id`, `parser_run_id` (nullable for manual),
`description`, `amount_minor` (signed bigint, kopiyky), `currency` CHECK = `'UAH'`,
`type` (`expense`/`income`), `category` (NOT NULL, default `Без категорії`),
`status` (`pending`/`approved`/`deleted`), `import_row_number` (nullable),
`occurred_at` (nullable `timestamptz`), `created_at` (`timestamptz`).
`input_events`: `id`, `source` (`text`/`photo`/`bank`), `provider` (nullable;
`monobank`/`privatbank`), `raw_text` / `storage_uri` / `mime_type` (nullable per
source), `created_at` (`timestamptz`). `parser_runs`: `id`, `input_event_id`,
`status` (`success`/`failed`), `normalized_payload`, `result_json` / `error`
(nullable), `created_at` (`timestamptz`) — table/types only; behavior later.
Because the schema is foundation-owned (TC-MOD-02), the bank-row idempotency
UNIQUE index on `(input_event_id, import_row_number)` (FR-BANK-06) is created
**here**, not in `bank-imports` — adding a UNIQUE constraint later would be exactly
the feature-owned schema mutation TC-MOD-02 forbids; `bank-imports` owns only the
upsert *behavior* over it. The index uses Postgres default NULL-distinct semantics
(not `NULLS NOT DISTINCT`), so manual/photo items with a `NULL` `import_row_number`
are never constrained against each other — only bank rows with real row numbers are
deduplicated. All timestamps are `timestamptz`; display/aggregation
runs in `Europe/Kyiv` (BC-SCOPE-03). **Why:** balances read `status != 'deleted'`;
signed minor units avoid a separate operation sign; UAH CHECK enforces BC-SCOPE-02
at the schema.

### D4 — Item-creation contract is the only write path; default account via a port
The contract lives in the domain/foundation layer and takes a
`ParsedLedgerItemDraft` (+ optional `account_id`, required `input_event_id`,
optional `parser_run_id`). It resolves a missing `account_id` through an
`AccountsPort` interface declared now and implemented by `accounts` later; if no
default is resolvable, it fails cleanly rather than persisting an account-less
item. **Why:** FR-PARSE-07 (parser never writes), FR-ITEM-06 (default before save),
TC-MOD-01/02 ownership split. *Alternative:* foundation hard-codes a default
account — rejected; account ownership belongs to `accounts`.

### D5 — Installable PWA via App Router `manifest.ts` + minimal service worker
Use the Next.js 16 App Router metadata `manifest` convention and the PWA guide
(`02-guides/progressive-web-apps.md`) for the manifest and SW registration, rather
than a third-party PWA plugin (NFR-COST-01: no new paid/heavy deps). The SW does a
shell-only precache so the offline state is real. **Read the PWA + layout guides in
`node_modules/next/dist/docs/` before writing this — APIs may differ from training
data (AGENTS.md).**

### D6 — Shell layout & shared states as `fin-*`-token components
`app/layout.tsx` renders the responsive shell (desktop sidebar/topbar + mobile
bottom nav, `env(safe-area-inset-*)`), `lang="uk"`. In Next.js 16 `themeColor` and
`viewport` moved **out of `metadata`** into a separate `export const viewport:
Viewport`; the shell exports `viewport` with `viewportFit: 'cover'` (so the
safe-area insets resolve to real device values instead of `0`) and `themeColor`
synced to the `fin-*` tokens. Interactive controls use ≥44×44px hit areas
(NFR-A11Y-01). Shared state primitives (empty/loading/partial/offline/
unsupported/error) live as shell-owned components reused by features, each with a
clear definition (partial = partial data/partial-success; unsupported = missing
browser/device capability). Offline state binds to `navigator.onLine` + SW events.
**Read the layout/metadata guide in `node_modules/next/dist/docs/` to confirm the
`viewport`/`themeColor` export shape before writing it.** **Why:** FR-SHELL-02/03/04,
NFR-A11Y-01, NFR-I18N-01.

### D7 — Server-side backend convention (TC-STACK-02)
All backend behavior runs through Next.js Server Actions and Route Handlers; there
is no separate backend service in v1. The item-creation contract and the `src/db`
boundary are server-only and invoked from server actions / route handlers; the
`postgres` client is never imported into a client component. **Why:** TC-STACK-02,
and it keeps the in-memory/Postgres seam and secrets server-side. *Alternative:* a
standalone API service — rejected for v1 (out of scope, adds ops cost).

## Risks / Trade-offs

- **Next.js 16 breaking changes vs. training data** → Read the specific guides
  under `node_modules/next/dist/docs/01-app/` (PWA, layouts, server actions, cache
  components) before writing each piece; do not assume v13/14 APIs.
- **In-memory fallback diverging from Postgres semantics** → Keep repository
  interfaces narrow and shared; the in-memory repos implement the exact same
  interface and mappers, and integration against real Postgres is exercised by
  later capabilities. Risk accepted for v1 DX (TC-DATA-01).
- **Schema churn from later capabilities** (e.g. accounts table) → Add all known
  columns and constraints now (`import_row_number` + its UNIQUE index, `account_id`
  FK), and route any later change through a Foundation/Coordination change
  (TC-MOD-02) to avoid feature-owned migrations.
- **Service worker caching stale assets** → Shell-only precache with a versioned
  cache name and cleanup on activate; never cache financial data or API responses
  in v1. Mitigates NFR-OBS-01 surprises and stale UI.
- **Transitive PostCSS advisory** (`GHSA-qx2v-qp2m-jg93`) via bundled Next.js →
  Do **not** run `npm audit fix --force` (downgrades Next.js); track for a safe
  override (per requirements.md known risks).
- **Accounts port unimplemented at Foundation ship** → The contract compiles
  against the port interface and fails cleanly when no default account resolver is
  wired, so Foundation is independently shippable and `accounts` plugs in later.

## Migration Plan

1. Read the relevant `node_modules/next/dist/docs/01-app/` guides (PWA, layout,
   server actions, cache components).
2. Add the `postgres` dependency; introduce `src/db`, `src/domain`, `src/modules`
   conventions and the bootstrap SQL (applied only when `DATABASE_URL` is set).
3. Replace the starter `app/layout.tsx` / `app/page.tsx`; add `manifest.ts`,
   icons, service worker + registration; build shell + shared states.
4. Add `/imports` hub and placeholder routes for the five nav destinations + three
   channels, each rendering a shared state (no dead links).
5. Verify NFR-DX-01 (`npm run lint`, `npx tsc --noEmit`) and NFR-OBS-01 (silent
   console) before completing.

Rollback: this is the first change; rollback = revert the change branch. The
in-memory fallback means there is no database state to migrate back.

## Open Questions

- **Unit test runner (NFR-DX-01 "chosen unit runner").** Not yet selected. Propose
  Vitest (Vite/TS-native, fast) and lock it in this change so later capabilities
  have a runner; confirm during apply if a different runner is preferred.
- **Service-worker scope for a Next.js 16 PWA** — exact registration pattern to be
  confirmed against the bundled PWA guide during implementation (may differ from
  older `next-pwa` patterns).
