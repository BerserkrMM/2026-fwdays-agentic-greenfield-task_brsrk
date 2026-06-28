# PRD — Finup (Personal Finance Tracker)

Last updated: 2026-06-26

This document is the **single source of truth** for what the product does and
what constraints govern it. Every requirement has a stable ID. Specs, tests, PRs,
epics, and recordings reference these IDs to keep traceability intact.

Refer to [docs/product-brief.md](product-brief.md) for narrative context. This
PRD and the product brief are the current source of truth. Older planning files
under `docs/finup/` may be absent in this repository; agents must not assume they
exist. If a missing planning file is referenced by older code or comments, derive
the needed behavior from this PRD, or create a small implementation-specific plan
before changing code.

## ID conventions

| Prefix   | Meaning                    | Example                                          |
| -------- | -------------------------- | ------------------------------------------------ |
| `FR-*`   | Functional Requirement     | `FR-ITEM-04` — user approves a pending ledger item |
| `NFR-*`  | Non-Functional Requirement | `NFR-PRIV-01` — personal-data removal is keyless |
| `TC-*`   | Technical Constraint       | `TC-STACK-01` — Next.js App Router + Postgres    |
| `BC-*`   | Business / UX Constraint   | `BC-SCOPE-01` — single user, no auth in v1       |

Status values: `proposed` · `accepted` · `shipped` · `dropped`.

Implementation ownership should follow the functional sections in this PRD until
separate module-boundary documents are created.

## Domain terminology and invariants

Canonical names for v1:

| Product term | Domain/API name | Meaning |
| ------------ | --------------- | ------- |
| Event / внесення | `InputEvent` / `input_events` | One act of user input: text, one receipt photo, or one bank-statement upload. |
| Item / операція | `LedgerItem` / `ledger_items` | The atomic financial row. This is what balances and dashboard read. |
| Ledger / журнал операцій | Ledger queries/UI | The journal/list/query surface over `ledger_items`. |

There is no separate `transaction` domain entity in v1. If legacy wording says
"transaction", agents should map it to `LedgerItem` unless the PRD explicitly says
otherwise. `raw_input` is not a separate domain entity; raw text/file references
belong to `InputEvent`.

Ledger item status semantics:

| Status | Included in balance/dashboard? | Meaning |
| ------ | ------------------------------ | ------- |
| `pending` | Yes | Created by parsing or manual input; user has not reviewed it yet. |
| `approved` | Yes | User reviewed and agreed with the item. |
| `deleted` | No | User removed it from the financial picture; kept as a log. |

Amount convention: `LedgerItem.amount_minor` is a signed integer in kopiyky.
Expenses are negative and income is positive. Future transfers are represented as
two ledger items at the same time when needed; v1 does not need a separate
transfer entity or transfer operation type. Currency is fixed to `UAH` in v1. If
no account is provided, the default account is assigned before saving the item.
Category is always stored as text on `LedgerItem`: use the category text returned
by AI, and when AI returns no category store `Без категорії`. There is no separate
category table in v1.

Parser result contract, in TypeScript shape:

```ts
type ParsedLedgerItemDraft = {
  description: string
  amountMinor: number // signed kopiyky: expense < 0, income > 0
  currency: "UAH"
  type: "expense" | "income"
  occurredAt?: string // ISO date/time when known
  category: string // AI-provided text, or "Без категорії"
  confidence?: number // 0..1 when available
  sourceRef?: {
    rowNumber?: number // required for bank-statement rows when available
    photoIndex?: number // v1 normally 0 because one photo per input_event
  }
}
```

## Functional requirements

### Shell & navigation (Epic 0 — Foundation / App Shell)

| ID          | Description                                                                                                       | Status   |
| ----------- | ----------------------------------------------------------------------------------------------------------------- | -------- |
| FR-SHELL-01 | Installable PWA shell with global navigation to Dashboard, Ledger, Imports, Accounts, Settings                    | proposed |
| FR-SHELL-02 | Responsive layout: desktop sidebar/topbar app shell and mobile/PWA navigation with safe-area support             | proposed |
| FR-SHELL-03 | Every screen provides explicit states for empty, loading, partial, offline, unsupported, and error flows          | proposed |
| FR-SHELL-04 | Shared shell, global styles, and `fin-*` design tokens are owned by Foundation/App Shell only                     | proposed |

### Imports hub (Epic 0 shell + feature epics)

| ID           | Description                                                                                                      | Status   |
| ------------ | ---------------------------------------------------------------------------------------------------------------- | -------- |
| FR-IMPORT-01 | `/imports` is a hub that links to the three input channels: text, receipt photos, and bank statements             | proposed |
| FR-IMPORT-02 | Every import channel stores the original input as an `input_event` before normalization or parsing                | proposed |

### Manual text input (Epic 2, capability `manual-input`)

| ID          | Description                                                                                                       | Status   |
| ----------- | ----------------------------------------------------------------------------------------------------------------- | -------- |
| FR-TEXT-01  | User submits free-form text (e.g. "40 грн ковбаса, 20 грн хліб") on `/imports/text`                               | proposed |
| FR-TEXT-02  | Submitted text is stored as an `input_event` with source `text`                                                  | proposed |
| FR-TEXT-03  | The stored text is normalized and passed to the AI parser to produce ledger item drafts                          | proposed |
| FR-TEXT-04  | Each draft is created as a `pending` ledger item via the item-creation contract                                  | proposed |
| FR-TEXT-05  | After submission the user can navigate to the Ledger screen for the created items                                | proposed |

### File imports: receipt photos (Epic 4, capability `file-imports`)

| ID          | Description                                                                                                       | Status   |
| ----------- | ----------------------------------------------------------------------------------------------------------------- | -------- |
| FR-FILE-01  | User uploads one receipt photo on `/imports/files`; multiple-photo receipts are out of scope for v1               | proposed |
| FR-FILE-02  | The original file reference is stored as an `input_event` (source `photo`) with `storage_uri` and `mime_type`     | proposed |
| FR-FILE-03  | Deterministic, non-AI preprocessing is applied before any AI call where possible, including validation and avoidable metadata stripping; the original file reference remains preserved on the `input_event` | proposed |
| FR-FILE-04  | An AI vision parser is invoked on the normalized/preprocessed payload to extract receipt line items and item metadata | proposed |
| FR-FILE-05  | Parsed item drafts are created as `pending` ledger items via the item-creation contract                          | proposed |

### Bank statement imports (Epic 3, capability `bank-imports`)

| ID          | Description                                                                                                       | Status   |
| ----------- | ----------------------------------------------------------------------------------------------------------------- | -------- |
| FR-BANK-01  | User uploads a CSV/XLS/XLSX statement file on `/imports/bank`; stored as an `input_event`                         | proposed |
| FR-BANK-02  | User selects the provider (`monobank` or `privatbank`) before import; the selected provider is recorded on the `input_event` | proposed |
| FR-BANK-03  | Provider-specific deterministic normalization only removes obvious non-transaction rows/columns and prepares clean rows with source row numbers for AI parsing; it does not categorize, infer final item types, create items, or write to the ledger | proposed |
| FR-BANK-04  | The clean rows are passed to the AI parser; the parser is expected to return at most one ledger item per source row, and the document result creates one `pending` ledger item per parsed statement row | proposed |
| FR-BANK-05  | Bank-statement imports do not require a separate preview step; the user reviews, approves, edits, or deletes resulting items later | proposed |
| FR-BANK-06  | `(input_event_id, import_row_number)` is unique, so retrying a parse does not duplicate statement rows            | proposed |

### AI parsing (Epic 5, capability `parsing`)

| ID           | Description                                                                                                      | Status   |
| ------------ | ---------------------------------------------------------------------------------------------------------------- | -------- |
| FR-PARSE-01  | Parser consumes a normalized `InputEvent` payload and returns a `ParsingResult` of ledger item drafts             | proposed |
| FR-PARSE-02  | Parser extracts atomic ledger items with `description`, signed `amount_minor`, operation type (`expense` / `income`), date when known, and source reference where available | proposed |
| FR-PARSE-03  | Parser returns category text as-is when it can; if it returns no category, the item category is `Без категорії`   | proposed |
| FR-PARSE-04  | Each item draft carries an AI confidence score in `[0,1]` where available                                        | proposed |
| FR-PARSE-05  | Deterministic privacy/noise normalization runs before AI calls where applicable (see NFR-PRIV-01)                | proposed |
| FR-PARSE-06  | OpenAI is the v1 adapter; the parser exposes an adapter boundary for a future local LLM                          | proposed |
| FR-PARSE-07  | The parser never writes ledger items directly; it only returns drafts through its port                           | proposed |
| FR-PARSE-08  | Every parse attempt is recorded as a `parser_run` with status (`success` / `failed`), normalized payload, result JSON or error, and retry support | proposed |

### Ledger items review (Epic 1, capability `ledger-items`)

| ID          | Description                                                                                                       | Status   |
| ----------- | ----------------------------------------------------------------------------------------------------------------- | -------- |
| FR-ITEM-01  | Ledger screen lists ledger items with their status (`pending` / `approved` / `deleted`) visible                  | proposed |
| FR-ITEM-02  | List supports filtering and search                                                                               | proposed |
| FR-ITEM-03  | User can open and edit any field of a `pending` or `approved` ledger item                                        | proposed |
| FR-ITEM-04  | Approving a `pending` item sets status to `approved`; both `pending` and `approved` items affect balances        | proposed |
| FR-ITEM-05  | Deleting an item sets status to `deleted`; deleted items do not affect balances but remain available as a log     | proposed |
| FR-ITEM-06  | If the user or parser does not provide an `account_id`, the default account is assigned before the item is saved  | proposed |
| FR-ITEM-07  | A failed parse can be retried from the original `input_event`; deleted items do not block re-entering the same input later | proposed |

### Accounts (Epic 6, capability `accounts`)

| ID          | Description                                                                                                       | Status   |
| ----------- | ----------------------------------------------------------------------------------------------------------------- | -------- |
| FR-ACCT-01  | User can list accounts; exactly one account is the default                                                        | proposed |
| FR-ACCT-02  | Each account shows its balance, sourced from non-deleted ledger items                                            | proposed |
| FR-ACCT-03  | Account metadata can be edited as needed for v1 (UAH only)                                                        | proposed |

### Category text (Epic 9, capability `settings` / `ledger-items`)

| ID         | Description                                                                                                        | Status   |
| ---------- | ------------------------------------------------------------------------------------------------------------------ | -------- |
| FR-CAT-01  | `LedgerItem.category` is required free text stored directly on the item; there is no separate category table in v1 | proposed |
| FR-CAT-02  | AI-provided category text is stored as-is on the ledger item                                                       | proposed |
| FR-CAT-03  | If AI or the user provides no category, the item stores `Без категорії`                                            | proposed |
| FR-CAT-04  | Category breakdown groups by raw `LedgerItem.category` text; no category table join is required in v1             | proposed |

### Settings (Epic 9, capability `settings`)

| ID         | Description                                                                                                        | Status   |
| ---------- | ------------------------------------------------------------------------------------------------------------------ | -------- |
| FR-SET-01  | Settings screen manages technical configuration                                                                   | proposed |
| FR-SET-02  | AI provider settings are configurable if needed                                                                   | proposed |

### Ledger (Epic 7, capability `ledger`)

| ID            | Description                                                                                                     | Status   |
| ------------- | --------------------------------------------------------------------------------------------------------------- | -------- |
| FR-LEDGER-01  | A ledger item is the atomic financial row in v1; there is no separate transaction/posting entity in the domain model | proposed |
| FR-LEDGER-02  | `pending` and `approved` items affect balances; `deleted` items never affect balances                         | proposed |
| FR-LEDGER-03  | A balance query is provided for accounts and overall, reading all non-deleted items                           | proposed |
| FR-LEDGER-04  | Income/expense aggregates are provided for dashboard and category totals from all non-deleted items            | proposed |
| FR-LEDGER-05  | Ledger items are the single source of truth for balances; no other module computes balance independently       | proposed |

### Dashboard (Epic 8, capability `dashboard`)

| ID          | Description                                                                                                       | Status   |
| ----------- | ----------------------------------------------------------------------------------------------------------------- | -------- |
| FR-DASH-01  | Dashboard shows current balance summary from `ledger_items where status != 'deleted'`                            | proposed |
| FR-DASH-02  | Dashboard shows income and expense totals from non-deleted ledger items                                          | proposed |
| FR-DASH-03  | Dashboard shows a category breakdown grouped by raw `LedgerItem.category` text, including `Без категорії`        | proposed |
| FR-DASH-04  | Dashboard shows trends when enough non-deleted data exists                                                       | proposed |
| FR-DASH-05  | Dashboard is read-only; it never mutates ledger items, imports, or accounts                                    | proposed |

## Non-functional requirements

| ID            | Description                                                                                                          | Status   |
| ------------- | -------------------------------------------------------------------------------------------------------------------- | -------- |
| NFR-PRIV-01   | Personal-data and obvious-noise reduction before AI calls is **deterministic and keyless** where applicable; no AI is used to sanitize, and raw originals remain preserved on `input_event` | accepted |
| NFR-PRIV-02   | The original raw input is preserved as-is and linked to the ledger items and parser runs it produced (traceability) | accepted |
| NFR-COST-01   | The only paid dependency is the AI provider (OpenAI); the adapter boundary allows swapping in a free local LLM       | proposed |
| NFR-OBS-01    | Console is silent at runtime (no warnings, no errors) on a healthy session                                          | proposed |
| NFR-DX-01     | `npm run lint` and `npx tsc --noEmit` pass on a clean checkout; tests run via the chosen unit runner                | proposed |
| NFR-I18N-01   | User-facing UI copy is Ukrainian-first                                                                              | accepted |
| NFR-A11Y-01   | Interactive elements are touch-friendly with mobile-safe spacing and no hover-only actions                          | proposed |

## Technical constraints

| ID            | Description                                                                                                                      | Status   |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------- | -------- |
| TC-STACK-01   | Next.js App Router (16.x) + React 19 + TypeScript (strict); installable PWA                                                     | accepted |
| TC-STACK-02   | Backend via Next.js Server Actions and Route Handlers; no separate backend service in v1                                        | accepted |
| TC-STACK-03   | PostgreSQL is the database; the authoritative bootstrap schema lives in `src/db/bootstrap.sql` and is applied through `src/db/client.ts::ensureSchema()` | accepted |
| TC-STACK-04   | DB access via the `postgres` client behind a shared boundary (`src/db/client.ts`, `mappers.ts`, `rows.ts`); modules must not create their own client | accepted |
| TC-STACK-05   | AI parsing uses the OpenAI API with an adapter boundary reserved for a future local LLM                                         | accepted |
| TC-DATA-01    | `DATABASE_URL` configures Postgres; modules may fall back to named in-memory repos when unset                                  | accepted |
| TC-PURE-01    | `src/domain/**` holds framework-free contracts; business modules integrate through ports (`src/modules/*/ports.ts`)             | accepted |
| TC-MOD-01     | Each functional section should own its module + route subtree; cross-cutting shared contracts/schema changes require coordination | accepted |
| TC-MOD-02     | Shared contracts, DB schema, `src/app/layout.tsx`/`page.tsx`/`globals.css`, and package files change only via a Foundation / Coordination change | accepted |
| TC-UI-01      | UI work follows the available design references in the repository; if design-reference files are absent, use existing `fin-*` tokens and the calm Ukrainian-first tone | accepted |

## Agent guidance for currently missing planning files

Some older instructions or comments may mention files that are not present in the
current repository. Agents should handle them as follows:

- Missing legacy `docs/finup/bootstrap.sql`: use the current authoritative schema
  in `src/db/bootstrap.sql` instead of inventing a legacy pending/posted
  transaction schema or a separate category table.
- Missing `docs/finup/module-boundaries.md` or `epic-plan.md`: use this PRD's
  functional sections as module boundaries and coordinate shared schema/contracts.
- Missing `docs/finup/app-routes.md`: infer routes from this PRD (`/imports`,
  `/imports/text`, `/imports/files`, `/imports/bank`, `/ledger`, `/dashboard`,
  `/accounts`, `/settings`).
- Missing design references: preserve the existing visual system and Ukrainian-
  first calm finance tone; do not block implementation solely because a referenced
  design document is absent.

## Business / UX constraints

| ID             | Description                                                                                                          | Status   |
| -------------- | -------------------------------------------------------------------------------------------------------------------- | -------- |
| BC-SCOPE-01    | v1 is single-user with no authentication, no roles, no teams                                                        | accepted |
| BC-SCOPE-02    | v1 is UAH-only (currency fixed to `UAH` at the schema level)                                                        | accepted |
| BC-SCOPE-03    | Application timezone is `Europe/Kyiv`                                                                               | accepted |
| BC-SCOPE-04    | `pending` and `approved` ledger items affect the balance immediately; only `deleted` items are excluded           | accepted |
| BC-SCOPE-05    | Deleted items and failed parser runs are retained as logs and do not block retrying or re-entering the same raw input | accepted |
| BC-BRAND-01    | User-facing UI is Ukrainian-first; tone is minimal, calm, finance-oriented                                         | accepted |
| BC-BRAND-02    | UI follows the design reference for both desktop browser and installed PWA/mobile, including offline/sync/update states | accepted |
| BC-PRIVACY-01  | Personal data and obvious noise are reduced with deterministic, linear tools — without AI — before AI processing where applicable | accepted |

## Out of scope (v1)

- Multi-user mode, roles, teams.
- Multi-currency.
- PDF import for receipts or statements.
- Direct bank-API integration (automatic Monobank / PrivatBank import).
- Telegram bot and Discord bot input sources (pipeline is designed to accept them later).
- A generic integration API as an input source.
- Budgets and financial goals.

## Known risks & open questions

Current known risks and open questions:

- **Parser-run retry and idempotency.** A failed parser run keeps the original
  `input_event` so parsing can be retried. Retried bank-statement parses use
  upsert by `(input_event_id, import_row_number)` to avoid duplicate items and
  must not overwrite `approved` items without explicit user action. Relates to
  FR-PARSE-08, FR-BANK-06.
- **Multi-item imports are not atomic.** Creating many ledger items from one parse
  can partially fail. Candidate fixes: batch atomicity, idempotency keys, or
  explicit partial-success UI. Relates to FR-BANK-04, FR-FILE-05.
- **Free-form AI categories may be messy.** v1 stores the category text returned
  by AI as-is, or `Без категорії` when AI returns no category. Later product
  decisions may constrain categories or add a category-mapping review flow.
  Relates to FR-PARSE-03.
- **Transitive PostCSS advisory** via bundled Next.js (`GHSA-qx2v-qp2m-jg93`).
  Do not run `npm audit fix --force` (it downgrades Next.js). Track for a safe
  patch/override before production.
- **UI token consistency.** Accounts and File Imports still use raw Tailwind colors
  in places; migrate to `fin-*` tokens without changing behavior. Relates to TC-UI-01.
