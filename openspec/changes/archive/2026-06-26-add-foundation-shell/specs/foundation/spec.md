## ADDED Requirements

### Requirement: Installable PWA app shell

The system SHALL provide an installable Progressive Web App shell that wraps every
route with persistent global navigation to Dashboard, Ledger, Imports, Accounts,
and Settings. The shell SHALL be the application's root layout and SHALL be served
from the Next.js App Router root. (FR-SHELL-01, TC-STACK-01)

#### Scenario: Global navigation is present on every route

- **WHEN** the user is on any in-app route (`/`, `/dashboard`, `/ledger`, `/imports`, `/accounts`, `/settings`)
- **THEN** the shell renders persistent navigation entries for Dashboard, Ledger, Imports, Accounts, and Settings
- **AND** activating an entry navigates to that route without a full page reload

#### Scenario: Active navigation entry is indicated

- **WHEN** the current route matches a navigation entry
- **THEN** that entry is rendered in a visually distinct active state

#### Scenario: A valid web app manifest is served

- **WHEN** the app is loaded
- **THEN** a web app manifest is served with `name`, `icons`, `start_url`, `display: standalone`, and `theme_color`/`background_color`
- **AND** the manifest values match the `fin-*` theme (see the design-token exception below)

#### Scenario: Browser offers installation (manual/observational)

- **WHEN** the app is loaded over HTTPS in a browser that supports installation and the manifest + service worker are present
- **THEN** the browser surfaces its install affordance (verified manually, not asserted in automated tests)

### Requirement: Responsive shell layout with safe-area support

The shell SHALL adapt between a desktop layout (persistent sidebar or topbar) and a
mobile/PWA layout (compact navigation, e.g. bottom bar), and SHALL respect device
safe areas using `env(safe-area-inset-*)` so navigation and content are never
clipped by notches or home indicators. For the insets to resolve, the document
SHALL set `viewport-fit=cover` via the Next.js 16 `export const viewport`
convention. (FR-SHELL-02, NFR-A11Y-01)

#### Scenario: Desktop layout

- **WHEN** the viewport is at a desktop width
- **THEN** the shell shows the persistent desktop navigation (sidebar/topbar) alongside the page content

#### Scenario: Mobile / installed-PWA layout

- **WHEN** the viewport is at a mobile width or the app runs as an installed PWA
- **THEN** the shell shows the compact mobile navigation
- **AND** navigation and content honor `env(safe-area-inset-*)` so nothing is clipped by device safe areas

#### Scenario: Safe-area insets are enabled

- **WHEN** the document viewport is configured
- **THEN** the exported `viewport` includes `viewportFit: 'cover'` so `env(safe-area-inset-*)` resolves to real device values rather than `0`

#### Scenario: Touch targets are touch-friendly

- **WHEN** any interactive shell control is rendered on a touch device
- **THEN** its interactive hit area is at least 44×44 CSS pixels with mobile-safe spacing and exposes no hover-only action

### Requirement: Shared screen-state primitives

The system SHALL provide reusable shell-owned primitives for the empty, loading,
partial, offline, unsupported, and error states so that every feature screen
renders an explicit state rather than a blank or broken view. The states are
defined as: **empty** (no data yet), **loading** (data in flight), **partial**
(only some data loaded or a partial-success result, e.g. some items of a
multi-item import failed), **offline** (no connectivity), **unsupported** (a
required browser/device capability — e.g. service worker or camera — is
unavailable), and **error** (an operation failed). (FR-SHELL-03)

#### Scenario: All six states are available to features

- **WHEN** a feature screen needs to communicate empty, loading, partial, offline, unsupported, or error
- **THEN** it can render the corresponding shared state primitive with Ukrainian-first copy
- **AND** each state is visually distinct and accessible

#### Scenario: Partial state communicates incomplete data

- **WHEN** a screen has only partial data or a partial-success result
- **THEN** it renders the partial state explaining what loaded and what did not, rather than showing a complete or empty view

#### Scenario: Unsupported state communicates a missing capability

- **WHEN** a screen requires a browser/device capability that is unavailable
- **THEN** it renders the unsupported state with Ukrainian-first copy explaining the limitation

#### Scenario: Offline state reflects real connectivity

- **WHEN** the application loses network connectivity
- **THEN** the shell surfaces the offline state/indicator
- **AND** when connectivity is restored the offline state clears

#### Scenario: Error state is recoverable

- **WHEN** a screen renders the error state
- **THEN** the user is shown a calm Ukrainian-first error message and a way to retry or navigate away

### Requirement: Design-token ownership

The Foundation capability SHALL be the sole owner of `app/layout.tsx`,
`app/page.tsx`, `app/globals.css`, and the `fin-*` design tokens. Feature code
SHALL consume tokens via `var(--fin-*)` or the Tailwind `fin-*` utilities and
SHALL NOT introduce raw hex colors. The sole sanctioned exception is the
JavaScript-only `app/manifest.ts` and the exported `viewport.themeColor`, which
cannot read CSS variables and therefore carry literal hex kept in sync with the
`fin-*` tokens. (FR-SHELL-04, TC-UI-01, TC-MOD-02)

#### Scenario: Tokens are the styling source of truth

- **WHEN** the shell and its screens are styled
- **THEN** colors, radii, and elevation are taken from the `fin-*` tokens defined in `app/globals.css`
- **AND** no raw hex color is used in feature-facing component styles, except the manifest/`viewport.themeColor` literals noted above

#### Scenario: Shell ownership is documented

- **WHEN** a contributor inspects the cross-cutting shell and token files
- **THEN** documentation states these files change only through a Foundation / Coordination change (TC-MOD-02)

### Requirement: Offline-capable service worker

The system SHALL register a minimal service worker that makes the app shell
installable and able to render an offline state, following the Next.js 16 PWA
guidance. The service worker SHALL NOT cache or mutate financial data in v1.
(FR-SHELL-01, FR-SHELL-03, TC-STACK-01)

#### Scenario: Service worker registers on a healthy session

- **WHEN** the app loads in a browser that supports service workers
- **THEN** the service worker registers without console warnings or errors (NFR-OBS-01)

#### Scenario: Shell renders while offline

- **WHEN** the app is launched offline after a prior visit
- **THEN** the app shell renders and shows the offline state instead of a browser error page

### Requirement: Imports hub skeleton

The system SHALL provide an `/imports` hub that links to the three input channels —
text (`/imports/text`), receipt photos (`/imports/files`), and bank statements
(`/imports/bank`). In this change the three channel routes and the five primary
navigation destinations MAY be placeholders, but every navigation target SHALL
resolve to a real route with an explicit state (no dead links). (FR-IMPORT-01)

#### Scenario: Imports hub links the three channels

- **WHEN** the user opens `/imports`
- **THEN** the hub shows entry points to text, receipt-photo, and bank-statement imports
- **AND** each entry links to its channel route

#### Scenario: Placeholder routes resolve

- **WHEN** the user navigates to any nav destination or import channel route not yet implemented
- **THEN** the route renders the shared empty/unsupported state with Ukrainian-first "coming soon" copy rather than a 404 or blank page

### Requirement: Input-event storage contract preserves the raw original

The system SHALL define and own the `input_event` storage contract that import
channels use to record the original raw input for traceability. The contract and
type SHALL capture the source (`text` / `photo` / `bank`), the raw original (raw
text or `storage_uri` + `mime_type`), and the selected bank provider where
relevant. The contract SHALL enforce referential ordering: a `parser_run` or a
`ledger_item` may only reference an `input_event` that already exists, so the raw
input is necessarily recorded before parsing produces anything. Per-channel
runtime ordering is verified by each channel's own spec. (FR-IMPORT-02,
NFR-PRIV-02)

#### Scenario: Input-event type captures source and raw original

- **WHEN** the `input_event` storage contract/type is defined
- **THEN** it captures the source channel, the raw original (raw text or `storage_uri` + `mime_type`), and the bank provider where relevant
- **AND** the raw original is preserved as-is for traceability (NFR-PRIV-02)

#### Scenario: References require a pre-existing input event

- **WHEN** a `parser_run` or `ledger_item` is created through the contracts
- **THEN** it must reference an `input_event` that already exists, enforced by a NOT NULL foreign key to `input_events` at the schema layer
- **AND** the contract rejects a reference to a missing `input_event`

### Requirement: Shared Postgres client boundary with in-memory fallback

The system SHALL expose a single shared database boundary at `src/db/client.ts`
(plus `src/db/rows.ts` and `src/db/mappers.ts`) using the `postgres` client,
configured by `DATABASE_URL`. When `DATABASE_URL` is unset the boundary SHALL fall
back to named in-memory repositories so the app runs on a clean checkout. No module
SHALL construct its own database client. (TC-STACK-03, TC-STACK-04, TC-DATA-01)

#### Scenario: Postgres is used when configured

- **WHEN** `DATABASE_URL` is set
- **THEN** the shared boundary connects with the `postgres` client and serves all repositories from it

#### Scenario: In-memory fallback on a clean checkout

- **WHEN** `DATABASE_URL` is unset
- **THEN** the boundary serves named in-memory repositories
- **AND** the app starts and the shell renders without a database connection error

#### Scenario: Single client ownership

- **WHEN** a feature module needs database access
- **THEN** it obtains repositories through the shared `src/db` boundary
- **AND** it does not instantiate its own `postgres` client

### Requirement: Owned shared schema for input events, parser runs, and ledger items

The Foundation capability SHALL own and create the `input_events`, `parser_runs`,
and `ledger_items` tables and their domain types, derived from the PRD domain
model. `ledger_items` SHALL store a signed integer `amount_minor` in kopiyky
(expense negative, income positive), currency fixed to `UAH`, a status of
`pending` / `approved` / `deleted`, required category text (defaulting to
`Без категорії`), an account reference, an optional `occurred_at`, and a link to
the originating `input_event` and `parser_run`. All timestamp columns
(`created_at`, `occurred_at`) SHALL be timezone-aware (`timestamptz`); the
application computes display and aggregation in the `Europe/Kyiv` timezone
(BC-SCOPE-03). Because foundation owns the schema (TC-MOD-02), it SHALL also
create the `(input_event_id, import_row_number)` UNIQUE index that later gives
bank imports row idempotency (FR-BANK-06); only the upsert *behavior* is owned by
`bank-imports`. Foundation creates the `parser_runs` table/types only; the run
*behavior* is owned later by `parsing`. (TC-MOD-02, TC-STACK-03, BC-SCOPE-02,
BC-SCOPE-03, NFR-PRIV-02)

#### Scenario: Schema is derived from the PRD domain model

- **WHEN** the schema is created
- **THEN** it defines `input_events`, `parser_runs`, and `ledger_items` with the fields and invariants above
- **AND** currency is fixed to `UAH` and `amount_minor` is a signed integer in kopiyky

#### Scenario: Timestamps are timezone-aware for Europe/Kyiv

- **WHEN** the schema defines timestamp columns
- **THEN** `created_at` and `occurred_at` are `timestamptz` (timezone-aware)
- **AND** display/aggregation is computed in `Europe/Kyiv` (BC-SCOPE-03)

#### Scenario: Bank-row idempotency index exists at the schema layer

- **WHEN** the `ledger_items` schema is created
- **THEN** a UNIQUE index on `(input_event_id, import_row_number)` exists so a later retried bank parse cannot duplicate statement rows (FR-BANK-06)
- **AND** the index relies on default NULL-distinct semantics (NOT `NULLS NOT DISTINCT`) so non-bank items, whose `import_row_number` is `NULL`, are never constrained against each other
- **AND** the upsert behavior that relies on it is owned by `bank-imports`, not foundation

#### Scenario: Ledger item status drives balance inclusion

- **WHEN** a `ledger_item` is stored
- **THEN** its status is one of `pending`, `approved`, or `deleted`
- **AND** the schema records the link to its originating `input_event` and `parser_run` for traceability (NFR-PRIV-02)

#### Scenario: Schema changes are coordinated

- **WHEN** a later capability needs to change this shared schema
- **THEN** the change must go through a Foundation / Coordination change, not a feature-owned migration (TC-MOD-02)

### Requirement: Item-creation contract

The Foundation capability SHALL define the item-creation contract that every import
channel uses to create `pending` ledger items from `ParsedLedgerItemDraft` values.
The contract SHALL accept an optional `account_id`; when none is supplied it SHALL
require the default account to be resolved (via the accounts port) before the item
is persisted, and SHALL store category text as-is or `Без категорії` when absent.
The contract SHALL be the only sanctioned write path for ledger items; the parser
never writes items directly. (TC-MOD-02, FR-ITEM-06, FR-CAT-03, FR-PARSE-07)

#### Scenario: Draft becomes a pending ledger item

- **WHEN** an import channel submits a `ParsedLedgerItemDraft` to the item-creation contract
- **THEN** a `ledger_item` is created with status `pending`, signed `amount_minor`, currency `UAH`, and the draft's description, type, category, and source reference
- **AND** the item is linked to its `input_event` and `parser_run`

#### Scenario: Default account assignment seam

- **WHEN** a draft is submitted without an `account_id`
- **THEN** the contract resolves the default account through the accounts port before persisting the item
- **AND** persistence fails cleanly if no default account is available rather than saving an account-less item

#### Scenario: Missing category defaults

- **WHEN** a draft carries no category text
- **THEN** the created item stores `Без категорії`

### Requirement: Framework-free domain contracts and module-port convention

The system SHALL place framework-free contracts in `src/domain/**` (no Next.js,
React, or `postgres` imports) and SHALL define the convention that business modules
integrate through ports at `src/modules/*/ports.ts`. The `LedgerItem` domain type,
its mappers, the `ParsedLedgerItemDraft` shape, and the item-creation contract
SHALL live behind this boundary. (TC-PURE-01, TC-MOD-01)

#### Scenario: Domain layer is framework-free

- **WHEN** any file under `src/domain/**` is inspected
- **THEN** it imports no framework or infrastructure modules (no Next.js, React, or database client)

#### Scenario: Modules integrate through ports

- **WHEN** a business module depends on another capability
- **THEN** it depends on a port interface declared in `src/modules/*/ports.ts`, not on the other module's internals

### Requirement: Server-side backend convention

The system SHALL implement all backend behavior through Next.js Server Actions and
Route Handlers within the App Router; there SHALL be no separate backend service in
v1. The item-creation contract and repository access SHALL run server-side and be
invoked from server actions / route handlers, never directly from client
components. The convention SHALL be enforced structurally at foundation time by a
check asserting the `postgres` client / `src/db` boundary is never imported in a
`"use client"` file; downstream channel specs verify the runtime behavior.
(TC-STACK-02)

#### Scenario: No client-side database access is structurally enforced

- **WHEN** the project is checked at foundation time
- **THEN** an automated check confirms the `postgres` client / `src/db` boundary is not imported into any `"use client"` component
- **AND** the check fails if such an import is introduced

#### Scenario: Mutations run through server actions (verified downstream)

- **WHEN** a later capability mutates data (e.g. creates a ledger item)
- **THEN** it does so through a Server Action or Route Handler that calls the shared `src/db` boundary, with no separate backend service
- **AND** this runtime behavior is asserted by that capability's own spec

### Requirement: Ukrainian-first UI with a silent console

All user-facing shell copy SHALL be Ukrainian-first with a calm, minimal,
finance-oriented tone, and a healthy session SHALL produce no console warnings or
errors. `npm run lint` and `npx tsc --noEmit` SHALL pass on a clean checkout.
(NFR-I18N-01, BC-BRAND-01, NFR-OBS-01, NFR-DX-01)

#### Scenario: Shell copy is Ukrainian-first

- **WHEN** the shell, navigation, and shared states render
- **THEN** all user-facing copy is in Ukrainian

#### Scenario: Console is silent and checks pass

- **WHEN** the app runs a healthy session and the project is checked
- **THEN** no console warnings or errors are emitted
- **AND** `npm run lint` and `npx tsc --noEmit` both pass
