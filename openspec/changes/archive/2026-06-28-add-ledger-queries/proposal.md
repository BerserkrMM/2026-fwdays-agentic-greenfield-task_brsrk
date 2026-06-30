## Why

`ledger_items` is already the persisted atomic financial row (Foundation owns the
table), but **nothing reads it for balances yet**. The write path exists
(`ItemCreationService`), the repository can `insert`/`findById`, and the schema
declares `ledger_items` the single source of truth for balances
(FR-LEDGER-01/05) — but there is no query that turns those rows into a balance or
an income/expense aggregate. As a result the `accounts` slice had to **defer the
per-account balance figures of FR-ACCT-02**: `bootstrap.sql` and the accounts
screen both say balance "appears with the ledger", and there is no ledger query
to supply it.

This slice delivers the `ledger` capability's read side: per-account and overall
balance queries plus income/expense and per-category aggregates, all derived from
non-deleted `ledger_items`. It closes the deferred half of FR-ACCT-02 by wiring a
real per-account balance into the accounts screen through these queries.

## What Changes

- **Ledger query domain (TC-PURE-01).** A framework-free `src/domain/ledger-query.ts`
  with the balance/aggregate value types (`AccountBalance`, `LedgerAggregates`,
  `CategoryTotal`) and the **single** pure computation of each
  (`computeOverallBalance`, `computeAccountBalances`, `computeAccountBalance`,
  `computeAggregates`, `computeCategoryTotals`). Inclusion follows
  `affectsBalance(status)` — `pending` + `approved` count, `deleted` is excluded
  (FR-LEDGER-02). This is the only place a balance is summed (FR-LEDGER-05).
- **Read port + repository primitive (coordination — TC-MOD-02).** A narrow
  `LedgerQueryPort` (the read API downstream modules depend on) in the shared
  ports, and one read primitive on the Foundation-owned `LedgerItemRepository`:
  `listNonDeleted()`. Implemented on both backends behind the single DB boundary
  (in-memory + Postgres `WHERE status <> 'deleted'`). No new table, **no stored
  balance/opening-balance column** (FR-ACCT-06, FR-LEDGER-05).
- **Ledger service (TC-MOD-01).** `src/modules/ledger/` — `LedgerQueryService`
  implements `LedgerQueryPort` over the repository + the domain computations. It
  is the seam Accounts and (later) Dashboard consume so no module recomputes
  balances independently (FR-LEDGER-05).
- **Close FR-ACCT-02.** The `/accounts` screen now shows each account's real
  balance, computed via `LedgerQueryService.getAccountBalances()`. Per-account
  balances include the historical items of **archived** accounts (inclusion
  depends on item status, not account archive state — FR-ACCT-05 regression).
- **Tests-first.** Pure-compute unit tests (status inclusion, per-account,
  overall, income/expense, category totals), a service test over the in-memory
  repo, and a boundary smoke flow through `getRepositories()` that archives an
  account and proves its items still count toward per-account and overall balance.

## Scope

**In:** FR-LEDGER-02, FR-LEDGER-03, FR-LEDGER-04, FR-LEDGER-05, and the deferred
per-account-balance half of FR-ACCT-02 (wired into the accounts screen through
ledger queries). Regression coverage that archived accounts' ledger items still
count toward balances.

**Out (this slice):** the Dashboard screen and its summary/trends/category UI
(FR-DASH-\*, owned by the `dashboard` capability — it will consume these queries),
ledger-item list/filter/edit/delete UI (FR-ITEM-\*, owned by `ledger-items`), and
CSV export (FR-SET-03). No multi-currency, no `Europe/Kyiv`/UAH assumption change,
no stored balance field (BC-SCOPE-02/03, FR-LEDGER-05).
