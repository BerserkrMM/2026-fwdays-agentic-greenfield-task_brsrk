# Tasks — add-dashboard

## 1. Tests-first (RED)

- [x] 1.1 `src/domain/ledger-query.trends.test.ts`: `computeMonthlyTrends` —
  Europe/Kyiv month grouping by effective date (`occurredAt ?? createdAt`),
  income/expense/net per month, ascending order, deleted excluded. (FR-DASH-04)
- [x] 1.2 `src/modules/dashboard/ui/dashboard-view.test.ts`: spend breakdown
  percentages (incl. `Без категорії`), `hasSufficientTrend` (≥2 months), empty
  decision, trend bar normalization. (FR-DASH-03, FR-DASH-04, FR-DASH-01)
- [x] 1.3 `src/modules/ledger/service.test.ts`: `getMonthlyTrends()` folds
  `listNonDeleted()` through the pure function. (FR-DASH-04, FR-LEDGER-04)
- [x] 1.4 `src/app-dashboard-page.smoke.test.ts` (overview + empty state) and
  `src/app-dashboard-page.states.test.ts` (error/partial/unavailable/insufficient):
  page reads only. (FR-DASH-01, FR-DASH-05, FR-SHELL-03)
- [x] 1.5 Capture `evidence/red-run.json` (command, non-zero exitCode, gitHead,
  timestamp, failingTests).

## 2. Implementation (GREEN)

- [x] 2.1 `src/domain/ledger-query.ts`: add `MonthlyTrendPoint` +
  `computeMonthlyTrends`. (FR-DASH-04, FR-LEDGER-04)
- [x] 2.2 `src/domain/ports.ts` + `src/modules/ledger/service.ts`: add
  `getMonthlyTrends()` to `LedgerQueryPort` and `LedgerQueryService` (disclosed
  coordination touch). (FR-DASH-04, FR-LEDGER-04/05)
- [x] 2.3 `src/modules/dashboard/ui/dashboard-content.ts`: Ukrainian-first copy.
  (NFR-I18N-01)
- [x] 2.4 `src/modules/dashboard/ui/dashboard-view.ts`: pure view-model
  (breakdown %, trend bars + sufficiency, empty decision). (FR-DASH-03/04)
- [x] 2.5 `app/dashboard/page.tsx`: real read-only server component — balance
  summary, income/expense, category breakdown, trend, with empty/partial/error/
  per-section-unavailable states; replaces the placeholder. (FR-DASH-01..05,
  FR-SHELL-03)
- [x] 2.6 Capture `evidence/green-run.json`.

## 3. Eval

- [x] 3.1 `evals/cases/dashboard.eval.ts`: dimension `ua-error-clarity` over the
  empty/insufficient-data/error copy; recorded in `evals/results/latest.json`
  (graded 93 PASS by a fresh judge).

## 4. Gates & review

- [x] 4.1 lint, `tsc --noEmit`, `test:run`, `test:coverage`, coverage ratchet,
  `next build`, `openspec validate --all --strict`, `check:trace`,
  `check:trajectory`, `check:red-green --strict`, `check:handoff`, `check:claims`.
- [x] 4.2 maker≠checker review (code, security, spec-compliance, eval-judge); raw
  outputs under `reviews/`; `review-findings.json` `clean:true` after fixes.

## 5. Archive & handoff

- [x] 5.1 Archive the change; regenerate trace/trajectory; `slice:report --write`.
- [x] 5.2 fallow audit; update `docs/current-state.md` last; commit with
  `Slice: add-dashboard` / `Refs: FR-DASH-01..05`; push; PR to `dev`.
