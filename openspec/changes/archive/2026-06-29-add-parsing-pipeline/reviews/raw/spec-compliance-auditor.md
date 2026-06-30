## Review

**Verdict: FAIL (spec-compliance).** Parser-only core is mostly aligned with FR-PARSE-01..08, but I found two contradicted OpenSpec scenarios and one FR-PARSE-04 downstream persistence gap/risk.

- Correct: `ParsingService` verifies the `input_event`, normalizes before adapter invocation, returns drafts plus the created `parser_run`, and records success/failure runs without ledger writes (`src/modules/parsing/service.ts:22-56`). Service tests cover success, retry, failed adapter output, unknown input events, and no ledger item writes (`src/modules/parsing/service.test.ts:25-190`).
- Correct: Draft canonicalization validates description, non-zero signed `amountMinor`, `expense`/`income`, `UAH`, parseable `occurredAt`, optional source refs, and confidence `[0,1]` (`src/domain/parsing.ts:71-126`, `src/domain/parsing.test.ts:11-58`).
- Correct: Deterministic keyless normalization masks obvious email/phone/card-like values and runs before adapter calls (`src/domain/parsing.ts:50-68`, `src/domain/parsing.test.ts:61-77`, `src/modules/parsing/service.test.ts:51-64`).
- Correct: OpenAI is behind an injectable `ParserAdapter` boundary, not coupled into callers (`src/domain/parsing.ts:31-33`, `src/modules/parsing/service.ts:16-20`, `src/modules/parsing/adapters.ts:20-55`).
- Correct: No out-of-scope UI/settings/channel implementation changed. `git status --short --untracked-files=all` shows parsing domain/module files, OpenSpec artifacts, trace/coverage/index updates only; no `app/imports`, `app/settings`, or ledger route/action files are modified. In parsing production code, the only persistence write is `repos.parserRuns.create` (`src/modules/parsing/service.ts:37-53`); ledger access appears only as test assertions (`src/modules/parsing/service.test.ts:69`, `src/modules/parsing/service.test.ts:156`).
- Fixed: none. Review-only task; I did not edit implementation/tests.
- Blocker: **Major / contradicted scenario** — `src/modules/parsing/adapters.ts:65-67` treats OpenAI content that parses but lacks a `drafts` array as a successful empty result; `src/modules/parsing/adapters.test.ts:88-97` explicitly locks this in. The change spec requires adapter failures for invalid provider responses to be recorded as failed parse attempts (`openspec/changes/add-parsing-pipeline/specs/parsing/spec.md:106-110`), and the domain validator also expects a drafts array (`src/domain/parsing.ts:71-75`). With the current adapter behavior, a malformed `{}` provider response can become a successful parser run with zero drafts.
- Blocker: **Major / contradicted scenario** — non-empty category text is not always returned as-is. `canonicalizeDraft` trims every category with `stringField(input.category).trim()` (`src/domain/parsing.ts:104`), while the PRD says category text is returned/stored as-is when the parser can provide it (`docs/requirements.md:141`) and the OpenSpec scenario says non-empty parser category text is exposed as-is (`openspec/changes/add-parsing-pipeline/specs/parsing/spec.md:45-49`; base spec also says downstream stores it as-is at `openspec/specs/parsing/spec.md:35-44`). There is no test for preserving leading/trailing whitespace or otherwise proving “as-is” semantics.
- Note: **FR-PARSE-04 downstream persistence gap/risk** — parser drafts preserve confidence, but the OpenSpec text also says confidence is persisted with the item and not shown in UI (`openspec/specs/parsing/spec.md:51-67`). Existing item creation ignores `draft.confidence` (`src/modules/foundation/item-creation.ts:28-58`) and `LedgerItem` has no confidence field (`src/domain/ledger-item.ts:17-38`). Because this slice intentionally avoids ledger writes/UI, either this persistence requirement needs an explicit deferral/ownership note or a coordinated item-schema/creation change in the owning slice.
- Note: The requested root files `/home/user/Desktop/2026-fwdays-agentic-greenfield-task_brsrk/plan.md` and `/home/user/Desktop/2026-fwdays-agentic-greenfield-task_brsrk/progress.md` were absent (ENOENT). I used `openspec/changes/add-parsing-pipeline/proposal.md`, `tasks.md`, PRD requirements, base parsing spec, and changed code/tests instead.

### Scenario coverage summary

- **Base OpenSpec (`openspec/specs/parsing/spec.md`)**: 8/11 scenarios fully covered, 2 contradicted (`category as-is`; invalid/malformed provider response handling via change-spec expansion), 1 downstream confidence persistence/UI scenario not proven in this parser-only slice.
- **Change OpenSpec (`openspec/changes/add-parsing-pipeline/specs/parsing/spec.md`)**: 14/17 scenarios covered, 2 contradicted, 1 deferred/missing.
  - FR-PARSE-01: covered — success and unknown input event paths (`src/modules/parsing/service.test.ts:25-69`, `src/modules/parsing/service.test.ts:175-190`).
  - FR-PARSE-02: covered — canonical fields and invalid draft failure (`src/domain/parsing.test.ts:11-58`, `src/modules/parsing/service.test.ts:118-156`).
  - FR-PARSE-03: partially covered/contradicted — default category covered (`src/domain/parsing.test.ts:11-36`), but non-empty category is trimmed rather than preserved as-is (`src/domain/parsing.ts:104`).
  - FR-PARSE-04: parser-level covered for preservation/range (`src/domain/parsing.ts:110-124`, `src/domain/parsing.test.ts:19-34`, `src/domain/parsing.test.ts:48-49`); item persistence/UI non-display remains unproven/deferred.
  - FR-PARSE-05: covered — normalization before adapter and keyless masking (`src/domain/parsing.ts:50-68`, `src/modules/parsing/service.test.ts:51-64`).
  - FR-PARSE-06: mostly covered — adapter boundary and OpenAI-compatible adapter exist (`src/modules/parsing/adapters.ts:20-55`), but malformed provider content without `drafts` is incorrectly accepted as success (`src/modules/parsing/adapters.ts:65-67`).
  - FR-PARSE-07: covered — service returns drafts only and tests assert no ledger items (`src/modules/parsing/service.ts:37-44`, `src/modules/parsing/service.test.ts:69`, `src/modules/parsing/service.test.ts:156`).
  - FR-PARSE-08: mostly covered — success/failure/retry parser runs covered (`src/modules/parsing/service.ts:37-53`, `src/modules/parsing/service.test.ts:72-115`), except malformed provider response lacking `drafts` can be recorded as success.

### Validation performed

- `npm test -- src/domain/parsing.test.ts src/modules/parsing/service.test.ts src/modules/parsing/adapters.test.ts` — passed, 3 files / 12 tests.
- `npx openspec validate add-parsing-pipeline --strict` — passed.
- `git status --short --untracked-files=all` and `git diff --cached --name-only` — inspected changed/untracked scope and confirmed no staged files.

```acceptance-report
{
  "criteriaSatisfied": [
    {
      "id": "criterion-1",
      "status": "satisfied",
      "evidence": "Concrete findings cite src/modules/parsing/adapters.ts:65-67, src/modules/parsing/adapters.test.ts:88-97, src/domain/parsing.ts:104, src/modules/foundation/item-creation.ts:28-58, and relevant OpenSpec/PRD lines."
    }
  ],
  "changedFiles": [
    "docs/qa/traceability-report.md",
    "quality/coverage-baseline.json",
    "src/domain/index.ts",
    "src/domain/parsing.ts",
    "src/domain/parsing.test.ts",
    "src/modules/parsing/adapters.ts",
    "src/modules/parsing/adapters.test.ts",
    "src/modules/parsing/ports.ts",
    "src/modules/parsing/service.ts",
    "src/modules/parsing/service.test.ts",
    "trace/trace.json",
    "openspec/changes/add-parsing-pipeline/proposal.md",
    "openspec/changes/add-parsing-pipeline/tasks.md",
    "openspec/changes/add-parsing-pipeline/specs/parsing/spec.md",
    "openspec/changes/add-parsing-pipeline/evidence/red-run.json",
    "openspec/changes/add-parsing-pipeline/evidence/green-run.json",
    "openspec/changes/add-parsing-pipeline/eval-decision.md",
    "openspec/changes/add-parsing-pipeline/trajectory-eval-waiver.md"
  ],
  "testsAddedOrUpdated": [
    "src/domain/parsing.test.ts",
    "src/modules/parsing/adapters.test.ts",
    "src/modules/parsing/service.test.ts"
  ],
  "commandsRun": [
    {
      "command": "npm test -- src/domain/parsing.test.ts src/modules/parsing/service.test.ts src/modules/parsing/adapters.test.ts",
      "result": "passed",
      "summary": "3 test files passed; 12 tests passed."
    },
    {
      "command": "npx openspec validate add-parsing-pipeline --strict",
      "result": "passed",
      "summary": "Change 'add-parsing-pipeline' is valid."
    },
    {
      "command": "git status --short --untracked-files=all && git diff --cached --name-only",
      "result": "passed",
      "summary": "Inspected scope; parsing/OpenSpec/trace changes only; no staged files."
    }
  ],
  "validationOutput": [
    "Spec verdict: FAIL due contradicted category as-is handling and malformed OpenAI response handling.",
    "Scenario coverage: change spec 14/17 covered, 2 contradicted, 1 deferred/missing; base spec 8/11 fully covered with same residuals.",
    "Out-of-scope check: no modified app/imports, app/settings, or ledger route/action files; parsing production code writes parser_runs only."
  ],
  "residualRisks": [
    "OpenAI content that parses as JSON but lacks a drafts array can be recorded as a successful empty parse instead of failed invalid provider response.",
    "Non-empty category text is trimmed, contradicting as-is category preservation semantics.",
    "Confidence is preserved in parser drafts but not persisted on LedgerItem by existing item creation/domain; ownership/deferral should be clarified."
  ],
  "noStagedFiles": true,
  "diffSummary": "Adds parsing domain/service/OpenAI adapter boundary and tests plus OpenSpec/evidence artifacts; updates trace/coverage/index files; no UI/settings/channel route changes detected.",
  "reviewFindings": [
    "major: src/modules/parsing/adapters.ts:65-67 - malformed OpenAI JSON without drafts is accepted as success, contradicting invalid provider response failure scenario.",
    "major: src/domain/parsing.ts:104 - non-empty category text is trimmed instead of preserved as-is.",
    "note: src/modules/foundation/item-creation.ts:28-58 and src/domain/ledger-item.ts:17-38 - confidence persistence with ledger items is not implemented/proven for FR-PARSE-04 OpenSpec text."
  ],
  "manualNotes": "Root plan.md and progress.md requested by the task were absent (ENOENT); review used the OpenSpec change proposal/tasks and current requirements/specs instead. Report written to the requested raw review path."
}
```
