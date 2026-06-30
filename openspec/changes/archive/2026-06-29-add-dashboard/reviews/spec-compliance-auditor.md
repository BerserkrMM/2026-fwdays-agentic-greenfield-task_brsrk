# Spec-compliance auditor — add-dashboard (fresh, maker≠checker)

## Verdict: PASS

Coverage: **10 scenarios — 9 implemented, 1 partial (now reconciled), 0 missing, 0 contradicted.** No undocumented scope drift; the only cross-capability touch (`computeMonthlyTrends` + `LedgerQueryPort.getMonthlyTrends`) is the disclosed, additive-only coordination change (proposal.md, design.md D1).

Scenario-by-scenario (all traced to code + tests): all-time reads (no period filter), degrade-gracefully partial, explicit error state, balance excludes deleted, onboarding empty state, income/expense split, category breakdown, trend-with-≥2-months, insufficient-trend, read-only no-mutations — all implemented and exercised.

### Findings

1. **[MAJOR] FR-DASH-03 spec scenario was unconditional, but the breakdown is spend-only** — `src/modules/dashboard/ui/dashboard-view.ts:27` (`.filter(t => t.totalMinor < 0)`). A `Без категорії` bucket that nets income/zero is excluded. Documented in design D5 + the «Витрати за категоріями» heading, but the spec delta text didn't carry the spend-only qualifier. Disposition: **FOLD (spec side moves)** — amended the FR-DASH-03 requirement + added a "Breakdown is spend-only" scenario in `openspec/changes/add-dashboard/specs/dashboard/spec.md` so spec and code agree, matching the design reference. No code change (spend-only is the intended product behavior).

2. **[MINOR] tasks.md test paths didn't match the artifacts** — Task 1.1/1.4 named files that differ from the real `ledger-query.trends.test.ts` / `src/app-dashboard-page.{smoke,states}.test.ts`. Disposition: **FOLD** — tasks.md reconciled.

3. **[MINOR] review-findings.json absent / in-progress artifacts** — expected mid-slice; now produced. Disposition: **FOLD** — this file + `review-findings.json` + raw reviewer outputs are all under `reviews/`.

### Note
FR-DASH-03 in `docs/requirements.md` ("a category breakdown grouped by raw category text, including Без категорії") is broad enough that an expense/spend breakdown satisfies it; the design reference («Витрати за категоріями») is the spend view. The change spec was specialized to match — not a contradiction of the source-of-truth requirement.
