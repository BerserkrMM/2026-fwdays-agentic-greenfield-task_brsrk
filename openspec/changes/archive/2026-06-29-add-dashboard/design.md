# Design — add-dashboard

## Scope

Implements FR-DASH-01..05 on `/dashboard`. The Dashboard is **read-only**: it
reads through the `ledger` capability's `LedgerQueryPort` and never writes. It
owns presentation (layout, copy, formatting, data-state decisions); it owns no
balance math (FR-LEDGER-05).

## Module ownership & boundaries

- `dashboard` (this slice) owns `app/dashboard/**`, `src/modules/dashboard/**`.
- `ledger` (already merged) owns balance/aggregate math in
  `src/domain/ledger-query.ts` and the `LedgerQueryPort`. FR-LEDGER-04 already
  states the ledger aggregates are "provided for dashboard". The monthly trend is
  such an aggregate, so it is added there rather than recomputed in the Dashboard.

### D1 — Monthly trend lives in the ledger query domain (coordination touch)

The trend sums income/expense per calendar month. Computing it inside the
Dashboard from raw items would (a) bypass `LedgerQueryPort` and (b) recompute
balance-like aggregates independently — both forbidden by FR-LEDGER-05. So:

- `src/domain/ledger-query.ts` gains a framework-free
  `computeMonthlyTrends(items): MonthlyTrendPoint[]` (TC-PURE-01).
- The shared `LedgerQueryPort` gains `getMonthlyTrends(): Promise<MonthlyTrendPoint[]>`,
  implemented by `LedgerQueryService` exactly like the other folds (read
  `listNonDeleted()`, apply the pure function).

This is a disclosed shared-contract addition (TC-MOD-02), additive-only and in
service of FR-LEDGER-04 — the same "small shared contract additions only where
needed" pattern the bank slice used. No existing port method changes.

### D2 — Month grouping is Europe/Kyiv and deterministic

`MonthlyTrendPoint = { month: "YYYY-MM", incomeMinor, expenseMinor, netMinor }`.

- Grouping key is the item's **effective date** = `occurredAt ?? createdAt`, the
  same effective-date rule the ledger journal already uses for ordering.
- The month bucket is derived in `Europe/Kyiv` via `Intl.DateTimeFormat` with a
  fixed `timeZone: "Europe/Kyiv"` and a stable `en-CA`-style `YYYY-MM` key, so the
  result is deterministic and locale-independent (BC-SCOPE-03).
- Points are returned sorted ascending by `month`.

### D3 — Trend sufficiency (FR-DASH-04)

Trends are shown only when **≥2 distinct months** contain non-deleted items;
otherwise the trend area shows an explicit insufficient-data state. The decision
(`hasSufficientTrend`) and the bar view-model live in the pure dashboard
view-model so they are unit-tested without React.

### D4 — Data states (FR-SHELL-03, read-only)

Each ledger read is isolated in its own `try/catch` so one failure cannot blank
the page (mirrors the accounts screen):

| State | Trigger | Render |
|---|---|---|
| empty | no non-deleted items at all | onboarding `EmptyState` → CTA to `/imports` |
| connected | all reads succeed, data present | full overview |
| partial | some reads fail, some succeed | `PartialState` banner + the sections that loaded |
| error | the primary balance read fails | `ErrorState` (alert) with a retry link to `/dashboard` |

No state mutates anything (FR-DASH-05); the only actions are navigation links.

### D5 — View-model is pure

`src/modules/dashboard/ui/dashboard-view.ts` holds pure functions:
- `toCategoryBreakdown(totals)` → expense categories with share-of-expense
  percentages (integer, sums tolerant), spend-only, sorted by magnitude, keeping
  `Без категорії`.
- `toTrendBars(points)` → normalized bar heights + `hasSufficientTrend`.
- `isEmptyOverview(...)` → empty-state decision.
Copy lives in `src/modules/dashboard/ui/dashboard-content.ts` (Ukrainian-first).

## Out of scope (not this slice)

- Period filters (v1 is all-time, FR-DASH-04 / dashboard spec).
- Any write/mutation, import, or settings behavior.
- CSV export and AI-key config (Settings slice, FR-SET-*).
- Per-account name chips beyond what `getAccountBalances` + accounts list provide
  read-only; no new account behavior is introduced.
