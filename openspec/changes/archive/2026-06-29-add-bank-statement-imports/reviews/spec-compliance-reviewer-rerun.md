# Spec-Compliance Audit (rerun) — add-bank-statement-imports

Reviewer role: maker≠checker spec-compliance auditor (independent rerun).
Date: 2026-06-29
Spec delta audited: `openspec/changes/add-bank-statement-imports/specs/bank-imports/spec.md`
Scope: uncommitted working tree (`git diff HEAD` / untracked bank-imports files).

## Verdict

PASS (with findings). All 12 scenarios across 7 MODIFIED requirements are
implemented in code and exercised by passing tests (22/22 green for the slice).
No scenario is missing or contradicted. Two integration/test-coverage gaps and
several minor drift notes are recorded below; none invalidate a scenario as
written, but the parse-failure "retry" finding (BF-1) should be addressed or
explicitly deferred before any "end-to-end retry" completion language is used.

Coverage summary: **12 scenarios: 12 implemented, 0 partial, 0 missing, 0 contradicted.**

## Per-scenario coverage table

| # | Requirement / Scenario | Verdict | Evidence (file:line) |
|---|---|---|---|
| R1-S1 | Upload — Statement file is preserved | implemented | `src/modules/bank-imports/service.ts:50-58` (create input_event before processEvent); test `service.test.ts:54-72` |
| R1-S2 | Upload — Unsupported file type rejected | implemented | `src/domain/bank-statement.ts:71-89`; `app/imports/bank/actions.ts:50-55`; tests `import-bank-action.test.ts:29-39`, `bank-statement.test.ts:22-27` |
| R2-S1 | Provider — recorded with input event | implemented | `actions.ts:42-48`; `service.ts:50-56` (`provider` on event); test `service.test.ts:67-68` |
| R2-S2 | Provider — unsupported rejected, no input_event, UA message | implemented | `actions.ts:42-48` (redirect before any DB); `bank-statement.ts:66-69`; UA msg `bank-import-content.ts:20-21`; test `import-bank-action.test.ts:17-27` (asserts `getRepositories` not called) |
| R3-S1 | Normalize — clean rows, source row #, no ledger items | implemented | `bank-statement.ts:91-125` (header/noise filter, rowNumber retained, pure); test `bank-statement.test.ts:32-64` (asserts no "category"/"expense") |
| R3-S2 | Normalize — empty statement rejected, no parser/item creation | implemented | `bank-statement.ts:121-123` throws `empty-statement`; normalize runs before parse `service.ts:75-76`; test `bank-statement.test.ts:100-110` |
| R4-S1 | Parse — rows → pending items (≤1/row, partial-success) | implemented | `service.ts:90-110` (per-row loop, item-creation contract); `item-creation.ts:40-57` (status `pending`, maps `sourceRef.rowNumber`→`importRowNumber`); test `service.test.ts:75-94` |
| R4-S2 | Parse — draft without source row counted failed, no rollback | implemented | `service.ts:91-95` (rowNumber undefined/invalid → failed, no insert); test `service.test.ts:97-109` |
| R5-S1 | Review in ledger — no preview gate, redirect with created/failed | implemented | `actions.ts:82-83` redirect `/ledger?imported=&failed=`; `page.tsx` has no preview UI; test `bank-import-content.test.ts:6-17` (no "прев"); see BF-2 (redirect mapping untested) |
| R6-S1 | Parse failure — explicit error + retry action; input_event + failed parser_run preserved | implemented | failed run `parsing/service.ts:45-56`; input_event preserved `service.ts:50-58`; action `actions.ts:76-78`; UI retry link `page.tsx:31-46`; test `service.test.ts:112-146`; see BF-1 (retry link does not reuse preserved event) |
| R7-S1 | Retry — skip rows already producing item in any status | implemented | `service.ts:96-103` (`findByInputEventRow` skip); DB unique index `db/bootstrap.sql:82-83`; repos `memory.ts`/`postgres.ts findByInputEventRow`; test `service.test.ts:243-262` (deleted status) |
| R7-S2 | Retry — create items only for rows without one | implemented | `service.ts:61-103` (`retryInputEvent` → processEvent skip logic); test `service.test.ts:202-240` |

## Findings

### BF-1 (major) — "Retry" action does not reuse the preserved input_event; `retryInputEvent` is unreachable from any route
- File: `app/imports/bank/page.tsx:36-44`, `app/imports/bank/actions.ts` (no retry action), `src/modules/bank-imports/service.ts:61-68`.
- Evidence — spec R6 ("...the original `input_event` and the failed `parser_run` SHALL be preserved for a later retry") and R7 insert-if-absent retry. The service exposes `retryInputEvent(inputEventId)` which re-processes the preserved event with insert-if-absent skipping — but `grep` shows it is called ONLY from tests (`service.test.ts:150,232,254`). The user-facing retry is a `<Link href="/imports/bank">` ("Спробувати ще раз") that returns to the empty upload form. Re-uploading creates a NEW `input_event`, so the preserved event/failed parser_run are never consumed and the FR-BANK-06 insert-if-absent path is unreachable in production.
- Why not critical: the literal R6-S1 scenario ("a retry action is shown" + artifacts "preserved") is satisfied, and R7 scenarios describe service behavior that is implemented and tested. This is an integration gap, not a contradicted scenario.
- Suggestion: wire a server action (e.g. hidden `inputEventId` retry form on the parse-failed error state) that calls `service.retryInputEvent(...)`, OR amend the spec/design to state v1 retry is "re-upload" and explicitly defer event-level retry. Do not use "end-to-end retry / full loop" language until resolved.

### BF-2 (major) — Action-level redirect branches (success summary, parse-error) are untested; tasks.md 1.3 overstates coverage
- File: `src/app-actions/import-bank-action.test.ts:16-40`; `openspec/changes/add-bank-statement-imports/tasks.md:9` (task 1.3, ticked).
- Evidence — task 1.3 claims action tests cover "parse error redirect, success redirect summary". The test file only covers the two rejection branches (non-string provider, unsupported file) and asserts no DB access. The success redirect `/ledger?imported=${created}&failed=${failed}` (`actions.ts:82-83`) and the `ParsingError`→`?formError=parse-failed` mapping (`actions.ts:76-78`) have no assertion. Behavior is implemented and indirectly supported by service tests, but the action's redirect mapping itself is unverified.
- Suggestion: add action tests that mock the service to return a summary (assert `/ledger?imported=&failed=` redirect) and to throw `ParsingError`/`BankStatementError` (assert `?formError=parse-failed` / `=empty-statement`), or relax the task 1.3 wording.

### BF-3 (minor) — `skipped` retry count is computed but never surfaced
- File: `src/modules/bank-imports/service.ts:130`; `app/imports/bank/actions.ts:83`.
- Evidence — `BankImportSummary.skipped` is tracked, but the ledger redirect emits only `imported`/`failed`. Spec R5 requires only a "created and failed" summary, so this is compliant; however on retry, skipped rows are invisible to the user. Tied to BF-1 (retry not UI-wired anyway).
- Suggestion: none required for spec compliance; consider surfacing `skipped` if/when retry is wired.

### BF-4 (minor) — Substantial inline XLSX/HTML-xls binary parser (documented drift, not silent)
- File: `src/domain/bank-statement.ts:131-336` (`statementBytesToText`, custom ZIP/EOCD + worksheet/sharedStrings XML + HTML-table fallback).
- Evidence — design.md decision/risk explicitly flags workbook parsing as a v1 risk and the option to "add a small parser dependency". A hand-rolled ZIP/XML reader was added instead. This is backed by FR-BANK-01 (CSV/XLS/XLSX) and disclosed in design.md, so it is documented scope, not silent drift. Branch coverage is suppressed via `/* c8 ignore */` (`bank-statement.ts:240,336`), reducing test visibility of the binary path.
- Suggestion: keep as-is for v1; ensure the coverage-ignored ZIP path retains at least the one happy-path XLSX test (`bank-statement.test.ts:87-98`), and note the fidelity limitation in handoff.

### BF-5 (minor) — Empty-statement rejection leaves an orphan input_event
- File: `src/modules/bank-imports/service.ts:50-58,75`; `bank-statement.ts:121-123`.
- Evidence — `importStatement` creates the input_event, then `processEvent`→`normalizeBankStatement` throws `empty-statement` before any parser/item work. Spec R3-S2 only forbids a parser call and ledger-item creation (both avoided), so this is compliant. The side effect is a persisted input_event with no parser_run for empty uploads.
- Suggestion: acceptable per "preserve original input before processing" (design decision 2); no action required.

## Cross-checks

- Requirement IDs: FR-BANK-01..06 (docs/requirements.md:128-133, mvp-capability-plan.md:104-109) all map to the 7 MODIFIED requirements; bank-imports owns them per the plan. NFR-I18N-01 enforced via `bank-import-content.ts` UA copy (test `bank-import-content.test.ts:4`).
- DB constraint ownership: foundation owns the unique index `ux_ledger_items_input_event_row (input_event_id, import_row_number)` (`db/bootstrap.sql:82-83`); bank-imports owns the pre-insert insert-if-absent skip (`service.ts:96-103`) plus race fallback (`service.ts:118-127`). Matches spec R7 ownership split.
- Parser payload kind "bank" is a valid `ParserPayloadKind` (`parsing.ts:9`); adapter prompt updated to emit `sourceRef.rowNumber` for bank rows (`parsing/adapters.ts` diff). Aligned with design decision 3.
- tasks.md: 1.1-2.5, 3.1, 3.2, 3.4 ticked and match artifacts present (evidence/red-run.json, green-run.json, reviews/, trajectory-eval-waiver.md). 3.3 and 3.5 are unticked and correctly reflect incomplete review/archive state. Only BF-2 (task 1.3 redirect-test overstatement) is a checkbox-vs-reality discrepancy.

## Inverse check (implemented behavior without a backing requirement)

- `retryInputEvent` service method — backed by FR-BANK-06/R7 in behavior, but with no route caller (BF-1).
- `statementBytesToText` XLSX/HTML parsing — backed by FR-BANK-01, disclosed in design.md (BF-4).
- `skipped` summary field — no requirement mandates surfacing it; harmless (BF-3).
No undisclosed scope drift that contradicts the spec was found.

## Confirmation pass

Date: 2026-06-29
Reviewer: maker≠checker spec-compliance auditor (confirmation re-audit)
Scope re-checked: `src/app-actions/import-bank-action.redirect.test.ts` (new, untracked), `app/imports/bank/actions.ts`, `openspec/changes/add-bank-statement-imports/tasks.md:5` (task 1.3), `specs/bank-imports/spec.md` R6, `docs/requirements.md` FR-BANK-01..06 + FR-ITEM-07, `docs/mvp-capability-plan.md:71,104-109`.

### BF-2 — RESOLVED

The action-level redirect coverage that tasks.md 1.3 claims now exists. `src/app-actions/import-bank-action.redirect.test.ts` drives `importBankAction` over the real service stack (in-memory repos via `createInMemoryRepositories`, only the `OpenAiParserAdapter.parse` mocked) and asserts the three redirect branches that `actions.ts` produces:

- Success → `redirect:/ledger?imported=1&failed=0` (test:55-63), plus a persisted ledger item assertion (`listAll()` length 1). Covers `actions.ts:84-85`.
- `ParsingError` → `redirect:/imports/bank?formError=parse-failed` with zero items written (test:65-73). Covers `actions.ts:78-79`.
- Corrupt `.xlsx` (`BankStatementError`) → `redirect:/imports/bank?formError=file-invalid`, parser never invoked (test:75-85). Covers `actions.ts:60-65,75-76`.

Verified green: `npx vitest run src/app-actions/import-bank-action.redirect.test.ts` → 3/3 passed. Task 1.3's "parse error redirect, success redirect summary" wording is now backed by real assertions rather than only indirect service-test support. BF-2 (major) is cleared; the checkbox-vs-reality discrepancy noted in the Cross-checks section is closed.

### BF-1 — DEFERRAL CONFIRMED as spec-acceptable

Deferring the retry-from-`input_event` UI wiring (rather than fixing it in this slice) does not violate any requirement this slice owns:

- bank-imports owns FR-BANK-01..06 (mvp-capability-plan.md:104-109). None mandates a wired retry button. FR-BANK-06 mandates insert-if-absent retry *behavior* on `(input_event_id, import_row_number)` — implemented in `BankImportService.retryInputEvent`/`processEvent` and unit-tested (R7-S1/S2 green). Spec R6-S1 mandates only that "a retry action is shown" and that the `input_event` + failed `parser_run` are "preserved for a later retry" — both satisfied at the artifact level.
- The user-reachable wired retry that re-consumes the preserved `input_event` is FR-ITEM-07, which mvp-capability-plan.md:71 assigns to the **ledger-items** capability (dependency: parsing), NOT bank-imports. R6 cites FR-ITEM-07 only as a cross-capability dependency. Deferring it here, consistent with the add-manual-text-input precedent, leaves no FR-BANK requirement unmet.

Therefore BF-1 remains a documented integration gap owned by a different slice, not a missing or contradicted FR-BANK scenario. Carry the existing caveat: do not use "end-to-end retry / full loop" completion language for the input_event-level retry until FR-ITEM-07 lands.

### Confirmation verdict

PASS. With BF-2 fixed (action redirect mapping now tested, 3/3 green) and BF-1 properly deferred to FR-ITEM-07/ledger-items, all 12 bank-imports scenarios remain implemented and the slice is spec-compliant for the FR-BANK-01..06 scope it owns. Coverage summary unchanged: **12 scenarios: 12 implemented, 0 partial, 0 missing, 0 contradicted.**
