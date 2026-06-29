## Review

**Verdict: FAIL** — one Major data-integrity/security-boundary issue should be fixed before accepting the slice.

- Correct: File/provider validation is server-side and happens before repository access for malformed provider/file submissions. `importBankAction` rejects non-string providers and empty/unsupported files before `getRepositories()` is called (`app/imports/bank/actions.ts:36-50`), with regression tests asserting no DB access on those paths (`src/app-actions/import-bank-action.test.ts:17-39`).
- Correct: Bank normalization is deterministic and limited to row/column cleanup: it selects only date/description/amount/currency columns and keeps source row numbers (`src/domain/bank-statement.ts:104-116`), with tests confirming no categorization/type inference (`src/domain/bank-statement.test.ts:31-47`).
- Correct: Parser payloads are normalized and parser attempts are recorded through the parsing service (`src/modules/parsing/service.ts:31-52`); the OpenAI adapter sends JSON bodies with parameterized headers and does not log uploaded financial text (`src/modules/parsing/adapters.ts:150-208`).
- Correct: SQL access for row-idempotency is parameterized (`src/db/postgres.ts:167-173`), and the database has a unique `(input_event_id, import_row_number)` index as a final duplicate guard (`src/db/bootstrap.sql:78-83`).
- Correct: Retry/idempotency flow skips existing rows, including deleted rows, before insert and re-checks after a creation error to handle uniqueness races (`src/modules/bank-imports/service.ts:95-125`), with retry coverage in `src/modules/bank-imports/service.test.ts:188-208`.
- Blocker: none critical.
- Major: `src/modules/bank-imports/service.ts:75-108` trusts the parser-supplied `draft.sourceRef.rowNumber` if it is merely present. The service never verifies that the row number belongs to the normalized statement rows produced at `src/modules/bank-imports/service.ts:75` / `src/domain/bank-statement.ts:116`. A hallucinated or prompt-injected parser result with `sourceRef.rowNumber: 999` (or any positive/negative integer) would pass the only check at `src/modules/bank-imports/service.ts:90-94`, bypass the duplicate lookup for real rows, and create a pending ledger item with a fabricated `import_row_number` via `src/modules/bank-imports/service.ts:103-108` and `src/modules/foundation/item-creation.ts:49-53`. This breaks bank-row traceability and weakens FR-BANK-04/FR-BANK-06 idempotency because the item no longer corresponds to an uploaded statement row. The tests only cover a missing source row (`src/modules/bank-imports/service.test.ts:96-108`), not an out-of-set row. Recommendation: build a `Set` of normalized `rows.map(row => row.rowNumber)` and count drafts whose row number is absent (or non-positive/out of source set) as failed before lookup/insert.
- Note: Upload validation intentionally follows the active spec by not imposing a hard file-size limit (`openspec/changes/add-bank-statement-imports/specs/bank-imports/spec.md`), so residual memory/large-upload risk remains accepted v1 scope. XLS/XLSX are extension/MIME-accepted but currently read through `File.text()` and normalized as delimited text (`app/imports/bank/actions.ts:45-57`, `src/domain/bank-statement.ts:89-123`); this is documented in the design risk, but real binary workbook support/content sniffing remains a follow-up risk rather than a separate security blocker here.

```acceptance-report
{
  "criteriaSatisfied": [
    {
      "id": "criterion-1",
      "status": "not_satisfied",
      "evidence": "Scope is limited to bank imports, but the implementation has a Major data-integrity gap: parser-supplied row numbers are not checked against normalized source rows before ledger-item creation."
    },
    {
      "id": "criterion-2",
      "status": "satisfied",
      "evidence": "Reviewed plan/spec/design, inspected changed files and security-sensitive code paths, ran targeted tests, typecheck, OpenSpec validation, and no-staged-files check; findings cite file paths and line numbers."
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
    "src/modules/bank-imports/ui/bank-import-content.test.ts",
    "evals/cases/bank-imports.eval.ts"
  ],
  "commandsRun": [
    {
      "command": "git status --short && git diff --name-status dev...HEAD",
      "result": "passed",
      "summary": "Identified tracked and untracked files for the active add-bank-statement-imports diff."
    },
    {
      "command": "npm run test:run -- src/domain/bank-statement.test.ts src/modules/bank-imports/service.test.ts src/app-actions/import-bank-action.test.ts src/modules/bank-imports/ui/bank-import-content.test.ts",
      "result": "passed",
      "summary": "4 test files passed; 19 tests passed."
    },
    {
      "command": "npx tsc --noEmit",
      "result": "passed",
      "summary": "TypeScript completed with no output/errors."
    },
    {
      "command": "npx openspec validate add-bank-statement-imports --strict",
      "result": "passed",
      "summary": "Change 'add-bank-statement-imports' is valid."
    },
    {
      "command": "git diff --cached --quiet; echo cached_exit=$?",
      "result": "passed",
      "summary": "cached_exit=0; no staged files."
    }
  ],
  "validationOutput": [
    "Vitest targeted bank-import run: Test Files 4 passed; Tests 19 passed.",
    "TypeScript: npx tsc --noEmit exited 0 with no output.",
    "OpenSpec: Change 'add-bank-statement-imports' is valid.",
    "No staged files: git diff --cached --quiet returned 0."
  ],
  "residualRisks": [
    "Major: parser rowNumber is not validated against normalized source rows before item creation.",
    "Accepted v1 risk: no hard file-size limit for statement uploads per active spec.",
    "Accepted follow-up risk: XLS/XLSX are accepted by extension/MIME but processed through File.text()/delimited normalization rather than real workbook parsing."
  ],
  "noStagedFiles": true,
  "diffSummary": "Adds /imports/bank server action/page, bank-statement normalization, bank-import orchestration, row-idempotency repository primitive, parser prompt rowRef guidance, tests/eval case, and OpenSpec/evidence artifacts.",
  "reviewFindings": [
    "major: src/modules/bank-imports/service.ts:75-108 - parser-supplied rowNumber is trusted without checking membership in normalized rows, allowing fabricated bank-row ledger items.",
    "no critical blockers found"
  ],
  "manualNotes": "plan.md and progress.md requested by the task were not present at the repository root (ENOENT); reviewed OpenSpec proposal/design/tasks instead. Review-only instruction prevented updating docs/current-state.md; this file is the only required output artifact."
}
```