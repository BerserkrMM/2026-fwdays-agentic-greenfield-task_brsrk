# Design — add-ledger-queries

## Context

Foundation owns the `ledger_items` schema and the shared DB boundary (TC-MOD-02);
the write path (`ItemCreationService` → `LedgerItemRepository.insert`) already
exists. The `ledger` capability owns the **read side** over that table
(`docs/mvp-capability-plan.md` §ledger): balance and aggregate queries that treat
`ledger_items` as the single source of truth (FR-LEDGER-01/05). This slice adds
that read side and uses it to close the per-account-balance figure FR-ACCT-02 that
`add-accounts` deferred.

## Decisions

### D1 — One canonical computation, in the framework-free domain (FR-LEDGER-05)

All balance/aggregate math lives in `src/domain/ledger-query.ts` as pure functions
over `readonly LedgerItem[]`. Inclusion is decided by the existing
`affectsBalance(status)` predicate (`pending` + `approved` in, `deleted` out), so
FR-LEDGER-02 has exactly one definition reused everywhere. The `LedgerQueryService`
and both repository backends route through these functions; no module sums amounts
on its own.

- **Why:** "single source of truth for balances; no other module computes balance
  independently" (FR-LEDGER-05) is strongest when there is literally one summation
  in the codebase. It is also trivially unit-testable with no DB or Next import.
- **Trade-off:** the read primitive `listNonDeleted()` fetches rows and the
  service folds them in app code rather than pushing `SUM`/`GROUP BY` into SQL.
  For v1 (single user, modest history, BC-SCOPE-01) this is correct and keeps one
  canonical compute path; the port is shaped so a future slice can add
  SQL-aggregate methods behind the same `LedgerQueryPort` without touching callers.

### D2 — Narrow read port; one new repository primitive (coordination, TC-MOD-02)

`LedgerQueryPort` is the read API downstream modules depend on
(`getOverallBalance`, `getAccountBalances`, `getAccountBalance`, `getAggregates`,
`getCategoryTotals`). The only schema-boundary change is adding
`listNonDeleted(): Promise<LedgerItem[]>` to the Foundation-owned
`LedgerItemRepository` (and its two implementations). This is a sanctioned
coordination change to a shared contract (TC-MOD-01/02): it adds a read method,
introduces no table, and adds **no** balance/opening-balance column
(FR-ACCT-06, FR-LEDGER-05).

- **Alternative rejected:** a separate `LedgerQueryRepository` over the same table
  — two repositories for one table is heavier than one extra read method, and the
  existing pattern already groups per-entity persistence in one repository.

### D3 — Per-account balance depends on item status, not account archive state (FR-ACCT-05)

`computeAccountBalances` groups **all** non-deleted items by `accountId`,
regardless of whether that account is archived. Archiving is a soft-archive on the
`accounts` row (`archived_at`); it never touches `ledger_items`. So an archived
account's historical items keep contributing to both its per-account balance and
the overall balance. This is asserted at the pure-compute, service, and boundary-
smoke levels (the regression the task calls out).

### D4 — Aggregates use the signed amount (FR-LEDGER-04)

`computeAggregates` returns `incomeMinor` (sum of positive `amount_minor`),
`expenseMinor` (sum of negative `amount_minor`, kept **signed/negative**), and
`netMinor = incomeMinor + expenseMinor` (which equals the overall balance). The
spec scenario keys income/expense off the sign of `amount_minor`; keeping
`expenseMinor` signed makes `income + expense = net = balance` exact and lossless,
and the UI formats the magnitude. `computeCategoryTotals` groups by the raw
`category` text (FR-CAT-04 / FR-DASH-03 reuse), summing signed amounts.

### D5 — Close FR-ACCT-02 by wiring, not by storing

The `/accounts` server component (already `force-dynamic`, already reads the DB
boundary) now also constructs a `LedgerQueryService` and shows each account's
balance from `getAccountBalances()`. No balance is persisted; the figure is always
derived from non-deleted items (FR-ACCT-06). A pure `formatUahMinor` helper is
added to `src/domain/money.ts` (UAH, Ukrainian formatting) for the display; it is
framework-free and reusable by Dashboard later.

## Risks

- **Read-all scaling.** D1 reads non-deleted rows per request. Acceptable for v1
  single-user; the port shape leaves a SQL-aggregate optimization open without a
  caller change. Documented, not mitigated now.
- **Touching an accounts-owned file.** Wiring FR-ACCT-02 edits
  `app/accounts/page.tsx` + `accounts-content.ts`. That is in-scope: FR-ACCT-02 is
  the deferred work this slice is chartered to close, and the accounts eval reads
  only the unchanged copy fields, so its graded output is unaffected.

## Migration / Spec note

`openspec/specs/ledger/spec.md` was backfilled during the Project Factory
retrofit, so its five ledger requirements already exist. This change therefore
carries them as `## MODIFIED Requirements` (OpenSpec rejects `ADDED` for a
requirement that already exists). The only substantive spec change is an added
scenario under "Account and overall balance queries" making the archived-account
**per-account** balance explicit; archiving replaces the baseline blocks with no
drift.

## Eval decision

No new eval case. Ledger queries are deterministic numeric computations fully
pinned by unit + smoke tests (there is no error-surface, empty-state copy, or
free-text quality for an LLM judge to grade beyond what the existing `accounts`
eval already covers). Recorded in `eval-decision.md`; the eval ratchet baseline is
unchanged.
