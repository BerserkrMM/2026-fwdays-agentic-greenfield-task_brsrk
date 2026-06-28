# Design — add-accounts

## Context

Foundation owns the shared schema and DB boundary (TC-MOD-02) and already shipped
the `AccountsPort` seam plus a `ledger_items.account_id` column that is
`NOT NULL` but has **no foreign key yet** — `bootstrap.sql` explicitly defers the
FK to "the `accounts` capability (a coordination change)". This slice is that
coordination change. It introduces the `accounts` table and its repositories on
the Foundation-owned DB surface, while owning all accounts *behavior* in
`src/modules/accounts/`.

## Decisions

### D1 — `accounts` table + FK added via this coordination change (not a new boundary)

The codebase centralizes all persistence behind one DB boundary (`src/db`: one
client, one `Repositories` set, shared `bootstrap.sql`). Rather than invent a
per-module schema-registration mechanism for one table, this slice extends the
existing boundary: add the `accounts` table to `bootstrap.sql`, add the deferred
`ledger_items` FK (idempotent `DO` block), and add `AccountRepository` to the
shared `Repositories` interface with in-memory + Postgres implementations.

- **Why:** matches the established pattern and the explicit invitation in
  `bootstrap.sql`; avoids over-engineering a registry for v1's fixed capability
  set. The accounts *behavior* still lives only in `src/modules/accounts/`.
- **Trade-off:** touches Foundation-owned files (`bootstrap.sql`, `rows.ts`,
  `mappers.ts`, `memory.ts`, `postgres.ts`, `domain/ports.ts`). That is sanctioned
  precisely because shared-schema changes must go through a Foundation/Coordination
  change (DoD §5) — this slice *is* one, and says so.

### D2 — Single-default invariant enforced in the database, maintained in the service

At most one account may be `is_default = true`, enforced by a **partial unique
index** `ux_accounts_single_default ON accounts (is_default) WHERE is_default`.
"Exactly one" (the at-least-one half) is maintained by the service: the seed
creates the first default, switching default is atomic (clear-all-then-set in a
transaction on Postgres; sequential on the in-memory fallback), and archive
refuses to remove the current default.

- **Why:** the DB makes the dangerous half (two defaults) structurally
  impossible; the service owns the policy half. Defense in depth.
- **Alternative rejected:** enforcing only in the service — a bug could silently
  produce two defaults.

### D3 — Delete = soft archive (`archived_at`), never a hard delete

Archiving sets `archived_at`; the row and its ledger items are retained so their
balance contribution survives (FR-ACCT-05, FR-LEDGER-05). Archived accounts are
hidden from the active list and from default selection. The service refuses to
archive **the default** or **the last active** account, returning an explicit
Ukrainian message through the error surface.

### D4 — Seeded `Готівка` default at first run (FR-ACCT-06)

`ensureSeededDefault()` inserts a single default `Готівка` (UAH) account when no
account exists, so item creation can resolve a default on a clean checkout. It is
idempotent (no-op when any account exists) and invoked lazily by the accounts
service entry points and the `/accounts` page load. No opening balance is stored —
the `Account` type has no balance field; balances are always derived from
non-deleted `ledger_items` (deferred to `ledger`).

### D5 — Reusable inline error surface (`?formError=` + banner)

Accounts is the first capability with mutating forms, so it establishes the shared
pattern the Operating rules mandate: server actions validate, and on a rejected
action `redirect('/accounts?formError=<code>')`; the server component reads
`searchParams.formError` and renders a calm `ErrorState`-styled banner. Success
paths `revalidatePath('/accounts')`. No raw 500 on user input; pages stay server
components so the DB boundary is never imported client-side (TC-STACK-02).

## Risks

- **FR-ACCT-02 deferral.** Showing per-account balance figures needs `ledger`
  queries that do not exist yet; only the no-opening-balance guarantee ships now.
  Tracked in the plan; the `accounts` balance view lands with/after `ledger`.
- **Idempotent FK on an existing column.** `ledger_items.account_id` already holds
  data paths in tests via the in-memory fallback (no FK there); the FK applies
  only when Postgres is configured. The `DO`-block guard makes re-running
  `bootstrap.sql` safe.

## Migration / Spec note

The baseline `openspec/specs/accounts/spec.md` was backfilled during the Project
Factory retrofit, so its five requirements already exist. This change therefore
carries them as `## MODIFIED Requirements` (OpenSpec rejects `ADDED` for a
requirement that already exists) to finalize-and-implement them; archiving
replaces the identical baseline blocks with no drift.
