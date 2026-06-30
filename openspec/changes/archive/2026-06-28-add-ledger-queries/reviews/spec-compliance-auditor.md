# Raw reviewer output — spec-compliance-auditor (add-ledger-queries)

Fresh project-factory spec-compliance-auditor, maker≠checker, over the staged
diff. Verbatim final report. The [major] process finding was a timing artifact
(auditor ran before `reviews/` + `review-findings.json` were persisted) and is
resolved by this review step; the two [minor] findings were addressed (see
review-findings.json).

---

## Coverage summary
9 scenarios: 9 implemented, 0 partial, 0 missing, 0 contradicted. Spec delta correctly uses `## MODIFIED Requirements` (not ADDED) against the backfilled baseline at `openspec/specs/ledger/spec.md`.

## Scenario-by-scenario verdict
1. **Ledger queries read ledger items directly** (FR-LEDGER-01) — implemented. `src/domain/ledger-query.ts` folds `LedgerItem[]` only; repo read primitive is `SELECT * FROM ledger_items`. No transaction/posting table.
2. **Pending and approved affect balance; deleted excluded** (FR-LEDGER-02) — implemented via `affectsBalance` in `balanceItems`. Tested.
3. **Account balance derived from non-deleted items, no stored field** (FR-LEDGER-03/FR-ACCT-02) — implemented; `computeAccountBalance`; page derives via `ledger.getAccountBalances()`; Account type stores no balance. Tested.
4. **Overall balance sums all non-deleted across accounts** (FR-LEDGER-03) — implemented; `computeOverallBalance`. Tested.
5. **Archived-account items still count toward overall** (FR-ACCT-05) — implemented; `listNonDeleted` filters by item status only. Regression-tested in `ledger.smoke.test.ts`.
6. **Archived-account items still count toward per-account balance** (FR-ACCT-05) — implemented; grouping keyed on `accountId` only. Tested after archive.
7. **Aggregates split income/expense by sign, deleted excluded** (FR-LEDGER-04) — implemented; `computeAggregates`. Tested.
8. **Category totals group by raw category text, deleted excluded, no join** (FR-LEDGER-04/FR-CAT-04) — implemented; `computeCategoryTotals` groups raw `item.category`. Tested.
9. **Downstream modules use ledger queries, no independent computation** (FR-LEDGER-05) — implemented; Accounts page consumes `LedgerQueryService`; accounts service has no balance computation. Boundary-tested.

FR-ACCT-06 (no stored balance/opening balance) confirmed: `AccountBalance` is derived-only.

## Findings
**[major] Maker≠checker review evidence absent while waiver claims it exists.**
- evidence: at audit time no `reviews/` dir and no `review-findings.json` under the change folder.
- suggestion: produce reviewer raw outputs under `reviews/` and a `review-findings.json` with `rawEvidence` links before claiming review-clean.

**[minor] FR-CAT-04 has no `@trace` annotation.**
- evidence: category-totals behavior tested but tagged only `@trace FR-LEDGER-04`; trace report flags FR-CAT-04 has no annotated test.
- suggestion: add `@trace FR-CAT-04` to the category-totals tests.

**[minor] tasks.md checkboxes all unchecked despite artifacts existing.**
- suggestion: tick completed tasks before commit/archive.

## Scope drift
None significant. `formatUahMinor` is a pure display helper supporting FR-ACCT-02, appropriately scoped.

## Verdict
Spec compliance complete and correct: all 9 scenarios implemented with matching tests, RED/GREEN evidence present, Accounts integration uses ledger queries with no independent balance store, change correctly MODIFIES the backfilled spec. The one substantive gap is process-side (review evidence) — resolve before archive/PR.
