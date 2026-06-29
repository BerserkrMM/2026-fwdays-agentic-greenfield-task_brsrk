# Tasks — add-manual-text-input

## 1. Spec & change
- [x] 1.1 Author proposal/design and the MODIFIED `manual-input` spec delta.
- [x] 1.2 `npx openspec validate add-manual-text-input --strict` passes.

## 2. Tests-first (RED)
- [x] 2.1 `src/domain/manual-text.test.ts` — normalize trims; empty/blank rejected (`empty-text`). `@trace FR-TEXT-01, FR-TEXT-03`.
- [x] 2.2 `src/modules/manual-input/service.test.ts` — stores original text as `input_event` source `text`; passes normalized payload to parser; partial-success pending-item creation; parse failure preserves event + failed run; returns created/failed summary. `@trace FR-TEXT-01..05`.
- [x] 2.3 `src/modules/manual-input/ui/import-summary.test.ts` — param parse + Ukrainian banner text. `@trace FR-TEXT-05`.
- [x] 2.4 `src/modules/manual-input/manual-input.smoke.test.ts` — boundary smoke through `getRepositories()`. `@trace FR-TEXT-04`.
- [x] 2.5 Capture RED: `openspec/changes/add-manual-text-input/evidence/red-run.json`.

## 3. Implement (GREEN)
- [x] 3.1 `src/domain/manual-text.ts` — `normalizeManualText`, `assertManualText`, `ManualTextError`.
- [x] 3.2 `src/modules/manual-input/service.ts` — `ManualInputService` (orchestration).
- [x] 3.3 `src/modules/manual-input/ui/manual-input-content.ts` — Ukrainian copy + error map.
- [x] 3.4 `src/modules/manual-input/ui/import-summary.ts` — pure summary helper.
- [x] 3.5 `app/imports/text/actions.ts` — server action (wire + error/redirect mapping).
- [x] 3.6 `app/imports/text/page.tsx` — real server-component form + states.
- [x] 3.7 `app/ledger/page.tsx` — render the post-import summary banner from query params.
- [x] 3.8 `src/modules/manual-input/ports.ts` — module port surface (TC-MOD-01).
- [x] 3.9 Capture GREEN: `openspec/changes/add-manual-text-input/evidence/green-run.json`.

## 4. Gates
- [x] 4.1 lint, tsc, test:run, test:coverage, coverage ratchet.
- [x] 4.2 `openspec validate --all --strict`, check:trace, check:red-green --strict, check:handoff, check:claims, check:trajectory.

## 5. Review & evidence
- [x] 5.1 Maker≠checker: code, security, spec-compliance reviewers + eval decision.
- [x] 5.2 Save raw outputs under `reviews/`; summarize in `review-findings.json` (`clean:true` after fixes).
- [x] 5.3 Eval decision recorded (`eval-decision.md`); trajectory-eval waiver.

## 6. Ship
- [x] 6.1 Archive change; regenerate trace/trajectory; `slice:report --write`.
- [x] 6.2 Update `docs/current-state.md` last; fallow audit; push + PR to `dev`.
