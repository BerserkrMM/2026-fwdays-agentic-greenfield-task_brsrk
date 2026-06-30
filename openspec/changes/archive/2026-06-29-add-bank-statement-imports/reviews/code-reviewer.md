## Review

Verdict: REQUEST_CHANGES

- Correct: The bank import flow preserves the original statement before normalization/parsing: `BankImportService.importStatement` creates a `bank` `input_event` with `provider`, `rawText`, and `mimeType` before calling `processEvent` (`src/modules/bank-imports/service.ts:45-58`).
- Correct: The service uses the existing parsing and item-creation boundaries rather than writing ledger items directly; row idempotency checks happen through `LedgerItemRepository.findByInputEventRow` before `ItemCreationContract.createPendingItem` (`src/modules/bank-imports/service.ts:75-108`).
- Correct: Targeted bank-import tests pass locally: 4 files / 19 tests. `npx tsc --noEmit` also passes.
- Blocker (High): XLS/XLSX files are advertised and accepted but not actually parsed. `assertSupportedBankFile` accepts `xls`/`xlsx` extensions and Excel MIME types (`src/domain/bank-statement.ts:41-49`, `src/domain/bank-statement.ts:69-87`), while the server action always reads uploads with `File.text()` (`app/imports/bank/actions.ts:52`) and normalization only line-splits delimited text (`src/domain/bank-statement.ts:89-123`, `src/domain/bank-statement.ts:142-164`). There is also no workbook parser dependency in `package.json:31-49`. A real binary `.xls`/`.xlsx` export will be treated as text/gibberish and fail as `empty-statement`, so FR-BANK-01's CSV/XLS/XLSX support is not delivered. Either implement workbook parsing or narrow validation/UI/spec to the actually supported CSV-like text formats.
- Major: Bank row provenance is not validated against the normalized source rows. `processEvent` computes `rows` (`src/modules/bank-imports/service.ts:75`) but later accepts any parser-provided `sourceRef.rowNumber` as long as it is present (`src/modules/bank-imports/service.ts:89-108`). A hallucinated row number not present in `rows` can create a ledger item with an untraceable `import_row_number`, which weakens FR-BANK-03/04 traceability. Add a set of normalized row numbers and count drafts outside that set as failed.
- Minor (tests): The parse-failure test is named as if it proves preserved `input_event` and failed `parser_run`, but it only asserts zero ledger items and then checks an empty promise list (`src/modules/bank-imports/service.test.ts:111-132`). The production path likely records the failed parser run via `ParsingService`, but this test should assert the event/run evidence or be renamed.
- Note: The requested `/home/user/Desktop/2026-fwdays-agentic-greenfield-task_brsrk/plan.md` and `/home/user/Desktop/2026-fwdays-agentic-greenfield-task_brsrk/progress.md` were not present, so this review used the OpenSpec change files, docs, and current diff/status instead.

```acceptance-report
{
  "criteriaSatisfied": [
    {
      "id": "criterion-1",
      "status": "not_satisfied",
      "evidence": "Scope is mostly limited to bank imports, but advertised XLS/XLSX support is accepted without actual workbook parsing, so the requested FR-BANK-01 behavior is not fully implemented."
    }
  ],
  "changedFiles": [
    "app/imports/bank/page.tsx",
    "app/imports/bank/actions.ts",
    "docs/qa/traceability-report.md",
    "evals/cases/bank-imports.eval.ts",
    "openspec/changes/add-bank-statement-imports/",
    "quality/coverage-baseline.json",
    "src/app-actions/import-bank-action.test.ts",
    "src/db/memory.ts",
    "src/db/postgres.ts",
    "src/domain/bank-statement.test.ts",
    "src/domain/bank-statement.ts",
    "src/domain/ports.ts",
    "src/modules/bank-imports/",
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
      "command": "npm run test:run -- src/domain/bank-statement.test.ts src/modules/bank-imports/service.test.ts src/modules/bank-imports/ui/bank-import-content.test.ts src/app-actions/import-bank-action.test.ts",
      "result": "passed",
      "summary": "4 test files / 19 tests passed"
    },
    {
      "command": "npx tsc --noEmit",
      "result": "passed",
      "summary": "TypeScript completed with no output/errors"
    },
    {
      "command": "git diff --cached --name-only",
      "result": "passed",
      "summary": "No staged files listed"
    }
  ],
  "validationOutput": [
    "Vitest targeted bank-import suite: Test Files 4 passed, Tests 19 passed",
    "tsc --noEmit: passed"
  ],
  "residualRisks": [
    "Real binary XLS/XLSX imports are not supported by the current File.text + delimited-text parser path.",
    "Parser-returned row numbers are not checked against normalized source rows."
  ],
  "noStagedFiles": true,
  "diffSummary": "Adds the /imports/bank page/action, bank-statement normalization domain, bank-import orchestration service, row-idempotency repository primitive, OpenAI prompt support for bank rows, tests/eval case, and OpenSpec evidence/report updates.",
  "reviewFindings": [
    "blocker/high: src/domain/bank-statement.ts:41 and app/imports/bank/actions.ts:52 - XLS/XLSX are accepted but only read/parsed as delimited text, so real workbook imports fail despite FR-BANK-01.",
    "major: src/modules/bank-imports/service.ts:75-108 - parser sourceRef.rowNumber is not validated against normalized rows, allowing untraceable/hallucinated import_row_number values.",
    "minor: src/modules/bank-imports/service.test.ts:111-132 - parse-failure preservation test does not assert input_event or parser_run preservation."
  ],
  "manualNotes": "No files were modified except this required review output. Root plan.md and progress.md were missing."
}
```
