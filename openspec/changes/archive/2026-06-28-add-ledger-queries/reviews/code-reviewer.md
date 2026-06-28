# Raw reviewer output — code-reviewer (add-ledger-queries)

Fresh project-factory code-reviewer, maker≠checker, over the staged diff
(`git diff --cached`). Verbatim final report. Findings 1, 2, 4 were addressed
after this review (see review-findings.json); finding 3 is accepted with rationale.

---

## Findings

### 1. Postgres `listNonDeleted` ordering has no tiebreaker — non-deterministic group order
- **file**: `src/db/postgres.ts:170-171`
- **severity**: minor
- **evidence**: `SELECT * FROM ledger_items WHERE status <> 'deleted' ORDER BY created_at`. `created_at` defaults to `now()`, so a bulk import that inserts many rows in one statement/transaction gives them identical timestamps. `computeAccountBalances` / `computeCategoryTotals` derive their "first-seen order" from this row order, so the *order* of the returned groups can vary run-to-run (the sums are unaffected). The in-memory repo orders by Map insertion order, so the two backends are not order-equivalent.
- **suggestion**: add a deterministic tiebreaker, e.g. `ORDER BY created_at, id`.

### 2. Accounts page couples account-management availability to the ledger read
- **file**: `app/accounts/page.tsx:42-45`
- **severity**: minor (confidence: low)
- **evidence**: `Promise.all([service.listActive(), ledger.getAccountBalances()])`. `getAccountBalances` reads every non-deleted row through `toLedgerItem`, which throws on a non-safe-integer `amount_minor`. Both reads awaited together, so any failure in the balance read throws the whole page — the user can no longer rename/archive/set-default accounts. Previously the accounts screen had no dependency on ledger data.
- **suggestion**: isolate the balance read (try/catch, fall back to a balance-unavailable indicator) so a corrupt ledger row degrades one number rather than the whole screen.

### 3. `LedgerQueryService` re-reads the full table on every method
- **file**: `src/modules/ledger/service.ts:24-42`
- **severity**: minor
- **evidence**: each of the five methods independently calls `await this.ledgerItems.listNonDeleted()`. Read-all-and-fold is acceptable for v1, but a future dashboard needing overall + aggregates + category totals together will trigger three full scans. The accounts page makes only one call, so no current defect.
- **suggestion**: if the dashboard lands, add a single method that folds all aggregates from one `listNonDeleted()` pass, or accept the items array as a parameter.

### 4. `formatUahMinor` grouping uses an ASCII space while the comment claims uk-UA style
- **file**: `src/domain/money.ts:34-35`
- **severity**: nit
- **evidence**: comment says "uk-UA style" but the regex inserts a plain ASCII space; real uk-UA grouping uses a non-breaking space. Choice is deliberate and documented (determinism), but the wording is slightly misleading.
- **suggestion**: soften the comment, or use ` `.

## Verified correct (no findings)
- Inclusion/sign logic: every computation funnels through `balanceItems` → `affectsBalance` (`status !== "deleted"`); pending+approved counted, deleted excluded everywhere. `computeAggregates` keeps `expenseMinor` signed so `income + expense === net === overall balance`. The DB sign CHECK forbids zero amounts, so `>= 0` income classification has no ambiguous-zero case.
- `formatUahMinor`: correct for 0, sub-1-UAH, negatives, thousands grouping; no `"-0,00"` artifact reachable.
- Money integrity across the DB boundary: `amount_minor` is `bigint`; `toLedgerItem` coerces with a `Number.isSafeInteger` guard, so sums stay integer arithmetic.
- Accounts page Map lookup: `balanceByAccount.get(account.id) ?? 0` defaults no-item accounts to 0; `getAccountBalances()` is called once (no N+1).
- Server/DB boundary: `app/accounts/page.tsx` is a server component; `src/db/client.ts` is `import "server-only"`; `no-client-db-import.test.ts` enforces it.
- Module ownership (TC-MOD): read side in `src/domain/ledger-query.ts` + `src/modules/ledger/*`; only shared-contract changes are `LedgerItemRepository.listNonDeleted()` and `LedgerQueryPort`. Clean.
- Process discipline: OpenSpec delta uses `## MODIFIED Requirements` against the backfilled baseline; RED and GREEN evidence present.

## Verdict
APPROVE — no blockers or majors. Logic, DB-boundary data integrity, Next.js 16 server-component boundaries, and module ownership are all sound. The four minor/nit items are quality improvements, not release-blocking.
