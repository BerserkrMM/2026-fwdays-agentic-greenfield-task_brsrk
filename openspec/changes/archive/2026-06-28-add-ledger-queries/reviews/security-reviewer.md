# Raw reviewer output — security-reviewer (add-ledger-queries)

Fresh project-factory security-reviewer, maker≠checker, over the staged diff
(`git diff --cached`). Verbatim final report.

---

**Verdict: PASS — no security findings.** This is a read-only ledger query slice with no new dependencies, no secrets, no user-controlled input reaching queries, and a correctly preserved server-only DB boundary. The structural test (`TC-STACK-04`) and all new suites pass.

### 1. SQL injection / query construction — CLEAN
`src/db/postgres.ts` `PgLedgerItemRepository.listNonDeleted`:
`SELECT * FROM ledger_items WHERE status <> 'deleted' ORDER BY created_at`
This is a `postgres` tagged template with zero interpolation — the only literal (`'deleted'`) is hardcoded, and the method takes no arguments/no user input. No injection surface. `getAccountBalance(accountId)` does its filtering in the pure domain layer (`computeAccountBalance`), not in SQL, so even the one ID-bearing path never reaches a query string. The in-memory equivalent is a plain array filter. Confirmed safe and parameterized.

### 2. Sensitive data exposure — CLEAN
`app/accounts/page.tsx` only projects `balanceMinor` (a number) onto the page via `formatUahMinor`. `AccountBalance` carries `accountId`, but `account.id` is already rendered server-side in existing hidden form fields — no new ID is leaked. The full `LedgerItem[]` from `listNonDeleted()` stays server-side inside `LedgerQueryService`; only the aggregated number crosses to the rendered output. `formatUahMinor` is a pure number→string formatter and exposes nothing internal. Single-user, no-auth app (BC-SCOPE-01), so no cross-tenant/IDOR concern by design.

### 3. Server-only boundary (TC-STACK-04) — CLEAN
`app/accounts/page.tsx` remains a server component: no `"use client"`, `export const dynamic = "force-dynamic"`, `async`/`await`. The newly imported `LedgerQueryService` imports only from `@/src/domain/*` — it does not import `@/src/db`, so the DB boundary stays out of any client bundle. The structural test `src/db/no-client-db-import.test.ts` passes. TC-STACK-04 not broken.

### 4. Error handling / empty & missing data — CLEAN
No unhandled-500 path:
- Empty ledger: `computeAccountBalances([])` → `[]`, `computeOverallBalance([])` → `0` (explicitly tested).
- Missing account: `balanceByAccount.get(account.id) ?? 0` and `computeAccountBalance(items, "missing")` → `0`; `formatUahMinor(0)` → `"0,00 ₴"`.
- Malformed amounts can't reach the math: `toLedgerItem` coerces `amount_minor` and throws on non-safe-integers before it enters a `reduce`.

### 5. New dependency / secret / injection surface — CLEAN
No new package imports (only intra-repo `@/src/...`), no env vars, no secrets, no `NEXT_PUBLIC_` additions. The thousands-grouping regex in `formatUahMinor` runs only over a bounded numeric string, so no ReDoS concern.

### Minor (non-security, informational)
- Read-all per request: `LedgerQueryService` calls `listNonDeleted()` once per query method. Acknowledged in `design.md` (D1/Risks) as acceptable for single-user v1; port shape allows a future SQL-aggregate optimization without caller changes. Not exploitable; noted for completeness.
