## Review

**Verdict: PASS** — Re-review found FR-PARSE-01..08 implemented for the `add-parsing-pipeline` slice. The previous focus issues are resolved: category as-is preservation, confidence persistence while hidden from UI, invalid provider responses, and failed/retry parser runs.

- Correct: FR-PARSE-01 consumes a stored input-event id plus normalized payload, rejects missing input events before adapter invocation, and returns drafts with the created `parserRun` (`src/modules/parsing/service.ts:22-44`; tests `src/modules/parsing/service.test.ts:25-70`, `src/modules/parsing/service.test.ts:175-190`).
- Correct: FR-PARSE-02 validates canonical draft fields and fails invalid shapes/sign mismatches without ledger writes (`src/domain/parsing.ts:71-127`; `src/modules/parsing/service.ts:35-55`; tests `src/domain/parsing.test.ts:53-72`, `src/modules/parsing/service.test.ts:118-156`).
- Correct: FR-PARSE-03 category handling now preserves non-empty category text exactly as returned while defaulting missing/blank text to `Без категорії` (`src/domain/parsing.ts:104-105`; `src/modules/foundation/item-creation.ts:38-50`). Tests pin both parser and downstream item-creation behavior (`src/domain/parsing.test.ts:11-51`; `src/modules/foundation/item-creation.test.ts:100-108`).
- Correct: FR-PARSE-04 confidence is exposed unchanged when valid, rejected outside `[0,1]`, persisted on created ledger items, and not rendered in the ledger UI (`src/domain/parsing.ts:111-125`; `src/domain/ledger-item.ts:31-33`; `src/modules/foundation/item-creation.ts:40-50`; `src/db/bootstrap.sql:67-88`; `src/db/mappers.ts:84-104`; `src/db/postgres.ts:150-157`; UI display in `app/ledger/page.tsx:213-305` shows description/status/account/category/date/amount/edit fields, not confidence). Tests cover parser confidence and persistence (`src/domain/parsing.test.ts:11-72`; `src/modules/foundation/item-creation.test.ts:110-120`).
- Correct: FR-PARSE-05 normalization runs before adapter calls and masks obvious email/phone/card-like values while not mutating the stored input event (`src/domain/parsing.ts:50-68`; `src/modules/parsing/service.ts:31-35`; tests `src/domain/parsing.test.ts:75-91`, `src/modules/parsing/service.test.ts:51-64`).
- Correct: FR-PARSE-06 uses an injected `ParserAdapter` boundary and provides an OpenAI-compatible adapter (`src/domain/parsing.ts:31-33`; `src/modules/parsing/service.ts:16-20`; `src/modules/parsing/adapters.ts:15-75`). Invalid provider responses now fail explicitly instead of becoming empty drafts: HTTP failure, invalid JSON content, no content, and missing `drafts` array are rejected (`src/modules/parsing/adapters.ts:57-73`; tests `src/modules/parsing/adapters.test.ts:62-98`).
- Correct: FR-PARSE-07 parser service returns drafts only and does not write ledger items; ledger item creation remains in the item-creation contract (`src/modules/parsing/service.ts:37-44`; `src/modules/foundation/item-creation.ts:21-58`; test assertion `src/modules/parsing/service.test.ts:69`, `src/modules/parsing/service.test.ts:156`).
- Correct: FR-PARSE-08 records success and failure parser runs with normalized payload/result or error, and retries create a new parser run while the input event remains reusable (`src/modules/parsing/service.ts:31-55`; tests `src/modules/parsing/service.test.ts:61-68`, `src/modules/parsing/service.test.ts:72-115`, `src/modules/parsing/service.test.ts:118-156`).

### Scenario coverage

- Change OpenSpec `openspec/changes/add-parsing-pipeline/specs/parsing/spec.md`: **17/17 scenarios covered**.
  - FR-PARSE-01: normalized payload parsed; missing input event rejected.
  - FR-PARSE-02: canonical fields returned; invalid draft shape records failed parse and writes no ledger items.
  - FR-PARSE-03: non-empty category exposed/stored as-is; omitted/blank category defaults to `Без категорії`.
  - FR-PARSE-04: confidence returned unchanged, omitted confidence valid, persisted on items, not shown or used as a UI threshold.
  - FR-PARSE-05: normalization before adapter; obvious PII masked while raw input_event remains untouched.
  - FR-PARSE-06: adapter boundary; missing config/provider/invalid response failures become explicit failed parse attempts when invoked through the service.
  - FR-PARSE-07: parser returns drafts only.
  - FR-PARSE-08: success, failure, and retry parser-run behavior covered.
- Base parsing spec `openspec/specs/parsing/spec.md`: **11/11 scenarios covered**.

### Fixed verification from prior review focus

- Fixed: **FR-PARSE-03 category as-is** — parser and item creation no longer trim non-empty category text (`src/domain/parsing.ts:104-105`; `src/modules/foundation/item-creation.ts:38-50`).
- Fixed: **FR-PARSE-04 confidence persistence/not shown** — nullable `LedgerItem.confidence` and DB plumbing persist confidence, item creation copies `draft.confidence`, and ledger UI does not render confidence (`src/domain/ledger-item.ts:31-33`; `src/modules/foundation/item-creation.ts:40-50`; `app/ledger/page.tsx:213-305`).
- Fixed: **FR-PARSE-06 invalid provider response** — OpenAI adapter rejects parseable JSON content without `drafts` and other invalid provider responses (`src/modules/parsing/adapters.ts:57-73`; `src/modules/parsing/adapters.test.ts:62-98`).
- Fixed: **FR-PARSE-08 failed run** — service records failed runs for adapter and invalid-draft failures and allows retry as a new run (`src/modules/parsing/service.ts:45-55`; `src/modules/parsing/service.test.ts:72-156`).

### Remaining issues

- Blocker: none found.
- Note: root `/home/user/Desktop/2026-fwdays-agentic-greenfield-task_brsrk/plan.md` and `/home/user/Desktop/2026-fwdays-agentic-greenfield-task_brsrk/progress.md` were requested but absent (ENOENT). Review used the OpenSpec change proposal/design/tasks, PRD, base spec, changed implementation, and tests.
- Note: full deterministic gates are still not marked complete in `openspec/changes/add-parsing-pipeline/tasks.md:16-18`; this review ran targeted parsing/item-creation tests and strict OpenSpec validation only.
- Residual risk: no live OpenAI/network integration was exercised; CI coverage uses injected/fake fetch responses, which matches the slice design but leaves real provider contract validation to later integration/manual checks.

Commands run:

- `npm test -- src/domain/parsing.test.ts src/modules/parsing/service.test.ts src/modules/parsing/adapters.test.ts src/modules/foundation/item-creation.test.ts` — passed, 4 files / 21 tests.
- `npx openspec validate add-parsing-pipeline --strict` — passed, change is valid.
- Read-only inspection commands: `git status --short`, `git diff --stat`, `git diff --name-status`, `git diff --cached --name-only`, `nl -ba ...` snippets.

```acceptance-report
{
  "criteriaSatisfied": [
    {
      "id": "criterion-1",
      "status": "satisfied",
      "evidence": "Concrete PASS review with file/line evidence for FR-PARSE-01..08 and prior focus fixes; no blockers found."
    }
  ],
  "changedFiles": [
    "openspec/changes/add-parsing-pipeline/reviews/raw/spec-compliance-rerun.md"
  ],
  "testsAddedOrUpdated": [],
  "commandsRun": [
    {
      "command": "npm test -- src/domain/parsing.test.ts src/modules/parsing/service.test.ts src/modules/parsing/adapters.test.ts src/modules/foundation/item-creation.test.ts",
      "result": "passed",
      "summary": "4 test files passed, 21 tests passed."
    },
    {
      "command": "npx openspec validate add-parsing-pipeline --strict",
      "result": "passed",
      "summary": "Change 'add-parsing-pipeline' is valid."
    },
    {
      "command": "git diff --cached --name-only",
      "result": "passed",
      "summary": "No staged files."
    }
  ],
  "validationOutput": [
    "PASS: 17/17 add-parsing-pipeline change-spec scenarios covered; 11/11 base parsing scenarios covered.",
    "Targeted tests passed: src/domain/parsing.test.ts, src/modules/parsing/service.test.ts, src/modules/parsing/adapters.test.ts, src/modules/foundation/item-creation.test.ts.",
    "OpenSpec strict validation passed for add-parsing-pipeline."
  ],
  "residualRisks": [
    "Full deterministic gates are not marked complete in tasks.md; this rerun executed targeted tests and OpenSpec validation only.",
    "Live OpenAI/provider integration was not exercised; adapter behavior was verified with injected fake responses."
  ],
  "noStagedFiles": true,
  "diffSummary": "Review-only output file written; implementation changes were inspected but not modified by this review.",
  "reviewFindings": [
    "no blockers",
    "note: requested root plan.md and progress.md were absent (ENOENT).",
    "note: tasks.md still shows full deterministic gates/review/archive steps incomplete; not a FR-PARSE spec blocker."
  ],
  "manualNotes": "Verdict PASS for FR-PARSE-01..08 spec compliance after fixes, especially category as-is, confidence persistence/hidden UI, invalid provider response, and failed-run retry behavior."
}
```
