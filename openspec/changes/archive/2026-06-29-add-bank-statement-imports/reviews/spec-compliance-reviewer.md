## Review
- Correct: Root `plan.md` and `progress.md` requested by the task are absent (read attempts returned ENOENT), so review used the authoritative docs and active OpenSpec artifacts instead.
- Correct: FR-BANK-02 is implemented: `/imports/bank` renders a required provider select with only `monobank` and `privatbank` options (`app/imports/bank/page.tsx:57-68`), server-side validation rejects non-string/unsupported providers before DB access (`app/imports/bank/actions.ts:36-43`; `src/domain/bank-statement.ts:64-67`), and the selected provider is stored on the `input_event` (`src/modules/bank-imports/service.ts:45-56`).
- Correct: FR-BANK-03 is covered for delimited text exports: normalization is framework-free, removes obvious noise rows, keeps source row numbers, emits only date/description/amount/currency fields, and does not write ledger items (`src/domain/bank-statement.ts:89-123`, `src/domain/bank-statement.ts:200-207`; tests at `src/domain/bank-statement.test.ts:29-84`).
- Correct: FR-BANK-04 is implemented for parser-returned row drafts: normalized rows are sent to `ParsingService`, drafts with `sourceRef.rowNumber` create pending items via the shared item-creation contract, malformed rowless drafts are counted failed, and per-row creation failures do not roll back saved rows (`src/modules/bank-imports/service.ts:70-129`; tests at `src/modules/bank-imports/service.test.ts:74-109` and `142-167`).
- Correct: FR-BANK-05 is mostly implemented: the page has no preview gate (`app/imports/bank/page.tsx:24-95`), successful action redirects to `/ledger?imported=&failed=` (`app/imports/bank/actions.ts:73-74`), and Ukrainian copy tells users to review rows in the Ledger (`src/modules/bank-imports/ui/bank-import-content.ts:1-9`).
- Correct: FR-BANK-06 is implemented at service/repository level: Postgres can find existing `(input_event_id, import_row_number)` rows (`src/db/postgres.ts:167-174`), the existing DB unique index is present (`src/db/bootstrap.sql:78-83`), retry reprocesses the original bank input event (`src/modules/bank-imports/service.ts:61-68`), and already-created rows are skipped without overwriting (`src/modules/bank-imports/service.ts:89-129`; test at `src/modules/bank-imports/service.test.ts:188-208`).
- Fixed: none; review-only run.
- Blocker: FR-BANK-01 is not fully satisfied for XLS/XLSX. Requirements and plan explicitly require CSV/XLS/XLSX uploads (`docs/requirements.md:128`, `docs/mvp-capability-plan.md:104`, `openspec/specs/bank-imports/spec.md:15-18`). The UI and validator advertise/accept `.xls` and `.xlsx` (`app/imports/bank/page.tsx:75-80`; `src/domain/bank-statement.ts:41-49`), but the action always reads the upload with `File.text()` (`app/imports/bank/actions.ts:45-52`) and normalization only parses delimiter-separated text lines (`src/domain/bank-statement.ts:89-123`, `src/domain/bank-statement.ts:142-164`). A real binary XLS/XLSX workbook will not be decoded into rows and will be rejected as `empty-statement`; tests only prove XLSX validation acceptance, not workbook parsing (`src/domain/bank-statement.test.ts:11-19`). Either implement actual workbook extraction for XLS/XLSX or narrow the accepted/spec-supported formats.
- Note: Parse-failure preservation is plausible via event-before-parse (`src/modules/bank-imports/service.ts:49-58`) and `ParsingService` failed-run creation, but the bank service test named “preserves input_event and failed parser_run” does not actually assert either object after failure (`src/modules/bank-imports/service.test.ts:111-132`). Add observable assertions if repository ports allow it.
- Note: The page's parse-failure action is a link back to a blank upload form (`app/imports/bank/page.tsx:31-43`) and the redirect drops the failed `inputEventId` (`app/imports/bank/actions.ts:67-68`). The service has `retryInputEvent`, so row-level retry behavior exists, but there is no route/action that retries the preserved input event from the error screen. This is a gap against the OpenSpec wording requiring an explicit retry action with preserved original event/run (`openspec/specs/bank-imports/spec.md:83-93`) unless retry UI is intentionally deferred to another owner.
- Note: FR-BANK-06 tests cover skipping all existing rows, including a deleted row (`src/modules/bank-imports/service.test.ts:188-208`), but do not cover the second OpenSpec retry scenario where a partially imported statement creates only missing rows (`openspec/changes/add-bank-statement-imports/specs/bank-imports/spec.md:119-123`). Implementation appears capable of it, but coverage is incomplete.

### FR-BANK coverage summary
- FR-BANK-01: partial / blocked — CSV path and preservation are covered; real XLS/XLSX parsing is missing.
- FR-BANK-02: covered.
- FR-BANK-03: covered for delimited provider exports; provider-specific behavior is shallow but limited/deterministic.
- FR-BANK-04: covered.
- FR-BANK-05: covered for no preview + Ledger redirect; original-event retry UI is a note.
- FR-BANK-06: covered in implementation; one partial-retry scenario lacks a direct test.

```acceptance-report
{
  "criteriaSatisfied": [
    {
      "id": "criterion-1",
      "status": "not_satisfied",
      "evidence": "Scope is mostly bounded to bank-imports, but FR-BANK-01 is contradicted because XLS/XLSX are advertised and accepted while only delimiter text parsing is implemented."
    }
  ],
  "changedFiles": [
    "app/imports/bank/actions.ts",
    "app/imports/bank/page.tsx",
    "docs/qa/traceability-report.md",
    "evals/cases/bank-imports.eval.ts",
    "openspec/changes/add-bank-statement-imports/.openspec.yaml",
    "openspec/changes/add-bank-statement-imports/design.md",
    "openspec/changes/add-bank-statement-imports/evidence/green-run.json",
    "openspec/changes/add-bank-statement-imports/evidence/red-run.json",
    "openspec/changes/add-bank-statement-imports/proposal.md",
    "openspec/changes/add-bank-statement-imports/specs/bank-imports/spec.md",
    "openspec/changes/add-bank-statement-imports/tasks.md",
    "quality/coverage-baseline.json",
    "src/app-actions/import-bank-action.test.ts",
    "src/db/memory.ts",
    "src/db/postgres.ts",
    "src/domain/bank-statement.test.ts",
    "src/domain/bank-statement.ts",
    "src/domain/ports.ts",
    "src/modules/bank-imports/service.test.ts",
    "src/modules/bank-imports/service.ts",
    "src/modules/bank-imports/ui/bank-import-content.test.ts",
    "src/modules/bank-imports/ui/bank-import-content.ts",
    "src/modules/parsing/adapters.ts",
    "trace/trace.json"
  ],
  "testsAddedOrUpdated": [
    "src/app-actions/import-bank-action.test.ts",
    "src/domain/bank-statement.test.ts",
    "src/modules/bank-imports/service.test.ts",
    "src/modules/bank-imports/ui/bank-import-content.test.ts"
  ],
  "commandsRun": [
    {
      "command": "git status --short && git diff --stat && git diff --name-only && git diff --cached --name-only",
      "result": "passed",
      "summary": "Inspected current diff and confirmed no staged files from empty cached diff output."
    },
    {
      "command": "npm run test:run -- src/domain/bank-statement.test.ts src/modules/bank-imports/service.test.ts src/modules/bank-imports/ui/bank-import-content.test.ts src/app-actions/import-bank-action.test.ts",
      "result": "passed",
      "summary": "4 test files passed; 19 tests passed."
    },
    {
      "command": "npx openspec validate add-bank-statement-imports --strict",
      "result": "passed",
      "summary": "Change 'add-bank-statement-imports' is valid."
    },
    {
      "command": "npx tsc --noEmit",
      "result": "passed",
      "summary": "TypeScript completed with no output/errors."
    }
  ],
  "validationOutput": [
    "Targeted Vitest: Test Files 4 passed, Tests 19 passed.",
    "OpenSpec: Change 'add-bank-statement-imports' is valid.",
    "TypeScript: npx tsc --noEmit passed.",
    "Evidence artifact green-run.json reports npm run test:run exitCode 0 with 30 test files / 153 tests."
  ],
  "residualRisks": [
    "Blocker: real XLS/XLSX workbook imports are accepted/advertised but not parsed.",
    "Parse-failure preservation test does not actually assert input_event/parser_run preservation.",
    "No direct test for retry creating only missing rows after a partial import.",
    "No route/action currently retries the preserved failed bank input_event from the parse-failure screen."
  ],
  "noStagedFiles": true,
  "diffSummary": "Adds bank import route/action, bank-statement normalization domain, bank import service, row-idempotency repository lookup, OpenAI prompt support for bank row source refs, tests/eval case, and OpenSpec/evidence/trace artifacts.",
  "reviewFindings": [
    "blocker: app/imports/bank/actions.ts:52 and src/domain/bank-statement.ts:89 - XLS/XLSX files are accepted/advertised but only File.text() plus delimited text normalization is implemented, contradicting FR-BANK-01.",
    "note: src/modules/bank-imports/service.test.ts:111 - parse-failure preservation test does not actually assert the preserved input_event or failed parser_run.",
    "note: app/imports/bank/actions.ts:67 - parse-failure redirect drops inputEventId, so the error screen cannot retry the preserved event despite retryInputEvent existing."
  ],
  "manualNotes": "Review output written to the required reviews/spec-compliance-reviewer.md path. Root plan.md/progress.md requested by the task were missing."
}
```
