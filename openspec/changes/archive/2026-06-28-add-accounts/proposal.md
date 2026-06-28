## Why

Item creation already resolves a default account through the `AccountsPort`
seam (`getDefaultAccountId`) that Foundation defined, but **nothing implements
that seam yet** — there is no `accounts` table, no account records, and no way
for a user to manage them. Until a default account exists, no ledger item can be
saved (FR-ITEM-06), so `accounts` is the first hard dependency on the critical
path after Foundation (see `docs/mvp-capability-plan.md` §2).

This slice delivers the `accounts` capability: account metadata, the
single-default invariant, full create / rename / switch-default / soft-archive
management, and a seeded `Готівка` default so the app works on a clean checkout.
It is also the first capability with user-mutating forms, so it establishes the
reusable inline form-error surface (`?formError=` + banner) that later
capabilities reuse (Operating rules → error-surface principle).

## What Changes

- **Accounts domain model (TC-PURE-01).** A framework-free `Account` type
  (UAH-only, `isDefault`, soft-archive `archivedAt`, **no stored opening
  balance**) plus pure validation and the archive-guard invariants
  (cannot archive the default or the last active account).
- **Shared schema + DB boundary — coordination change (TC-MOD-02).** Foundation's
  `bootstrap.sql` already anticipates this: *"its FK to the accounts table is
  added by the `accounts` capability (a coordination change)."* This slice adds
  the `accounts` table, a partial-unique index enforcing **at most one default**,
  the deferred `ledger_items.account_id` foreign key, the `AccountRepository`
  port, and its in-memory + Postgres implementations behind the single shared DB
  boundary. No feature module constructs its own client.
- **Accounts service (TC-MOD-01).** `src/modules/accounts/` — list, create,
  rename, switch-default, soft-archive use-cases enforcing the single-default and
  archive-guard invariants, plus `ensureSeededDefault()` (FR-ACCT-06). The service
  also implements the narrow `AccountsPort` (`getDefaultAccountId`) Foundation's
  item-creation contract already consumes.
- **Accounts screen (FR-ACCT-01/03/04/05/06).** Replace the `/accounts`
  placeholder with a real Ukrainian-first management screen: list with the default
  clearly marked, create form, switch-default and rename actions, and soft-archive
  with explicit rejection messages. Server actions only (TC-STACK-02); the
  reusable inline error-surface banner is introduced here.
- **Tests-first + an eval case.** Unit tests for the pure invariants and the
  service (red before green), a boundary smoke flow through `getRepositories()`,
  and one `accounts` eval case grading the Ukrainian-first clarity of the
  archive-rejection and default-account copy.

## Scope

**In:** FR-ACCT-01, FR-ACCT-03, FR-ACCT-04, FR-ACCT-05, FR-ACCT-06, and the
default-account resolution half of FR-ITEM-06 (the `AccountsPort` implementation).

**Out (this slice):** the **live balance figures** per account (FR-ACCT-02) — the
plan defers the balance *view* to land with/after `ledger`, because balances are
derived from non-deleted `ledger_items` via ledger queries that do not exist yet.
The structural guarantee FR-ACCT-02 rests on — accounts store **no** opening
balance — is delivered and tested here (the `Account` type has no balance field).
No multi-user, no non-UAH currency, no account-level destructive reset
(BC-SCOPE-01/02).
