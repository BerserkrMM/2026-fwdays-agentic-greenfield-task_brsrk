## Why

The Dashboard is the read-only financial overview — the home screen of the app —
and the last MVP read surface before Settings. Every aggregate it needs (overall
balance, income/expense split, category totals) is already produced by the
`ledger` capability over non-deleted items; the only missing aggregate is the
all-time monthly income/expense **trend** (FR-DASH-04). This slice builds the
`/dashboard` route on top of those queries, with no new write paths, so the
Dashboard never recomputes balances independently (FR-LEDGER-05).

## What Changes

- Add the `add-dashboard` slice for the `/dashboard` route, replacing the
  foundation placeholder screen with the real read-only overview.
- Surface the current balance summary, income/expense totals, and category
  breakdown (incl. `Без категорії`) by consuming the existing `LedgerQueryPort`.
- Add the one missing aggregate — an all-time monthly income/expense trend
  grouped by calendar month in `Europe/Kyiv` — to the canonical ledger query
  domain/port, so the Dashboard reads it instead of computing it (FR-LEDGER-04/05).
- Show trends only when ≥2 distinct months contain non-deleted items; otherwise
  an explicit insufficient-data state (FR-DASH-04).
- Add Ukrainian-first empty (onboarding CTA), partial, and error states so a
  failed or empty read degrades gracefully instead of a blank/500 page
  (FR-SHELL-03), keeping the screen strictly read-only (FR-DASH-05).

## Capabilities

### New Capabilities

### Modified Capabilities
- `dashboard`: implement the existing read-only overview requirements
  FR-DASH-01 through FR-DASH-05 over the `ledger` query API, plus explicit
  empty/partial/error data states.

## Impact

- New dashboard view-model + Ukrainian copy under `src/modules/dashboard`, and
  the real `app/dashboard/page.tsx` server component (replaces the placeholder).
- Coordination touch on the `ledger` capability (disclosed): a pure
  `computeMonthlyTrends` added to `src/domain/ledger-query.ts` and a
  `getMonthlyTrends()` method on the shared `LedgerQueryPort` + `LedgerQueryService`,
  fulfilling FR-LEDGER-04's stated role of providing dashboard aggregates. No
  schema, layout, or write-path changes.
- Tests for monthly-trend computation, the dashboard view-model (percentages,
  insufficient-data + empty decisions), and a route smoke test.
- OpenSpec evidence, RED/GREEN artifacts, an eval case, reviews, trace/trajectory
  reports, and the final slice report.
