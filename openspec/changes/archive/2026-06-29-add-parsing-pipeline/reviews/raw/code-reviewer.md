## Review

**Verdict: REQUEST_CHANGES**

- **Correct:** `ParsingService` checks the `input_event` before invoking the adapter and records success/failure `parser_run`s with the normalized payload (`src/modules/parsing/service.ts:22-55`). It returns drafts only and the service tests assert no ledger writes (`src/modules/parsing/service.test.ts:25-157`).
- **Correct:** Draft canonicalization covers required fields, category defaulting, signed amount/type consistency, confidence bounds, and source refs (`src/domain/parsing.ts:71-125`), with focused tests in `src/domain/parsing.test.ts`.
- **Major:** `src/modules/parsing/adapters.ts:65-67` silently converts an OpenAI response whose JSON lacks a `drafts` array into `{ drafts: [] }`. That contradicts the adapter-failure scenario for invalid provider responses (`openspec/changes/add-parsing-pipeline/specs/parsing/spec.md:106-110`) and bypasses the domain guard that requires a drafts array (`src/domain/parsing.ts:71-74`). The current test locks in the wrong behavior (`src/modules/parsing/adapters.test.ts:88-97`). This should throw `ParsingError("adapter-failed", ...)` so `ParsingService` records a failed `parser_run` instead of a misleading successful empty parse.
- **Minor:** None found.
- **Blocker:** None found.
- **Note:** `git diff origin/dev..HEAD` for the requested scoped paths is empty; the review inspected the scoped working-tree changes shown by `git status` instead. Requested `/plan.md` and `/progress.md` were not present in the repository.

Commands run:
- `npm test -- src/domain/parsing.test.ts src/modules/parsing/service.test.ts src/modules/parsing/adapters.test.ts` — passed (3 files / 12 tests).
- `npx openspec validate add-parsing-pipeline --strict` — passed.
- `npx tsc --noEmit` — passed.
- `npm test` — passed (20 files / 104 tests).

```acceptance-report
{
  "criteriaSatisfied": [
    {
      "id": "criterion-1",
      "status": "satisfied",
      "evidence": "Returned severity-tagged finding with exact references: major at src/modules/parsing/adapters.ts:65-67, supporting test at src/modules/parsing/adapters.test.ts:88-97, and spec evidence at openspec/changes/add-parsing-pipeline/specs/parsing/spec.md:106-110."
    }
  ],
  "changedFiles": [
    "src/domain/index.ts",
    "src/domain/parsing.ts",
    "src/modules/parsing/adapters.ts",
    "src/modules/parsing/ports.ts",
    "src/modules/parsing/service.ts",
    "openspec/changes/add-parsing-pipeline/proposal.md",
    "openspec/changes/add-parsing-pipeline/design.md",
    "openspec/changes/add-parsing-pipeline/tasks.md",
    "openspec/changes/add-parsing-pipeline/specs/parsing/spec.md",
    "openspec/changes/add-parsing-pipeline/eval-decision.md",
    "openspec/changes/add-parsing-pipeline/trajectory-eval-waiver.md",
    "openspec/changes/add-parsing-pipeline/evidence/red-run.json",
    "openspec/changes/add-parsing-pipeline/evidence/green-run.json"
  ],
  "testsAddedOrUpdated": [
    "src/domain/parsing.test.ts",
    "src/modules/parsing/service.test.ts",
    "src/modules/parsing/adapters.test.ts"
  ],
  "commandsRun": [
    {
      "command": "git diff --name-status origin/dev..HEAD -- src/domain/parsing src/modules/parsing tests openspec/changes/add-parsing-pipeline openspec/specs",
      "result": "passed",
      "summary": "No committed scoped diff; scoped changes are currently uncommitted/untracked in the working tree."
    },
    {
      "command": "npm test -- src/domain/parsing.test.ts src/modules/parsing/service.test.ts src/modules/parsing/adapters.test.ts",
      "result": "passed",
      "summary": "3 parsing test files passed, 12 tests total."
    },
    {
      "command": "npx openspec validate add-parsing-pipeline --strict",
      "result": "passed",
      "summary": "Change 'add-parsing-pipeline' is valid."
    },
    {
      "command": "npx tsc --noEmit",
      "result": "passed",
      "summary": "TypeScript reported no errors."
    },
    {
      "command": "npm test",
      "result": "passed",
      "summary": "20 test files passed, 104 tests total."
    }
  ],
  "validationOutput": [
    "Vitest targeted: 3 files / 12 tests passed.",
    "OpenSpec strict validation passed for add-parsing-pipeline.",
    "TypeScript noEmit passed.",
    "Vitest full suite: 20 files / 104 tests passed."
  ],
  "residualRisks": [
    "origin/dev..HEAD has no committed scoped diff, so this review is over the current working-tree changes rather than committed HEAD.",
    "OpenAI responses with missing/non-array drafts are currently treated as successful empty parses until the major finding is fixed."
  ],
  "noStagedFiles": true,
  "diffSummary": "Adds parsing domain helpers, ParsingService orchestration, OpenAI-compatible adapter, parsing tests, and OpenSpec artifacts for add-parsing-pipeline; scoped changes are uncommitted/untracked in the working tree.",
  "reviewFindings": [
    "major: src/modules/parsing/adapters.ts:65-67 - Missing or non-array OpenAI drafts are silently normalized to an empty successful result, contradicting invalid-provider-response failure handling in openspec/changes/add-parsing-pipeline/specs/parsing/spec.md:106-110.",
    "no blockers",
    "no minors"
  ],
  "manualNotes": "Requested plan.md and progress.md were not found at the repository root."
}
```
