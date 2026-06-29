## Review
- Correct: Score **94/100 — PASS** for `eval-bank-import-error-clarity`. I inspected `evals/cases/bank-imports.eval.ts:26-49` and its live copy dependencies instead of grading a mock: `src/modules/bank-imports/ui/bank-import-content.ts:1-31` and `src/modules/manual-input/ui/import-summary.ts:49-58`.
- Correct: The critical rubric is met. The bank import copy is Ukrainian-first, provider/file/empty-statement errors are specific (`bank-import-content.ts:20-27`), parse failure is recoverable (`Перевірте файл або спробуйте ще раз`, line 27), and the hint sends rows to the Ledger for later review without a preview gate (`bank-import-content.ts:8-9`). Ledger summaries include created and failed counts (`import-summary.ts:54-57`).
- Fixed: none; review-only eval judging, no product/test edits applied.
- Blocker: none.
- Note: Minor deduction only: the visible error uses the technical loanword `провайдера` and the page necessarily shows provider/file-format names (`Monobank`, `PrivatBank`, `CSV/XLS/XLSX`). These do not break the Ukrainian-first requirement, but slightly reduce polish.
- Note: Requested root files `/home/user/Desktop/2026-fwdays-agentic-greenfield-task_brsrk/plan.md` and `/home/user/Desktop/2026-fwdays-agentic-greenfield-task_brsrk/progress.md` were not present; I proceeded from the eval case, requirements, and live copy dependencies.

### Produced output graded
```text
Route: /imports/bank
Heading: Виписка банку
Intro: Завантажте CSV/XLS/XLSX виписку, оберіть банк — ми створимо операції зі статусом «очікує перевірки».
Provider label: Банк
Providers: Monobank, PrivatBank
File label: Файл виписки
Hint: Оригінал зберігається перед обробкою. Рядки потраплять у Журнал, де їх можна перевірити, змінити або видалити.
Submit: Імпортувати виписку
Error title: Не вдалося імпортувати виписку
Error[provider-invalid]: Оберіть підтримуваного провайдера: Monobank або PrivatBank.
Error[file-invalid]: Завантажте файл виписки у форматі CSV, XLS або XLSX.
Error[empty-statement]: У виписці не знайдено рядків, які можна імпортувати.
Error[parse-failed]: Не вдалося розпізнати рядки виписки. Перевірте файл або спробуйте ще раз.
Ledger summary (ok): Додано до журналу: 3.
Ledger summary (partial): Додано до журналу: 2. Не вдалося зберегти: 1.
```

```acceptance-report
{
  "criteriaSatisfied": [
    {
      "id": "criterion-1",
      "status": "satisfied",
      "evidence": "Eval judge scope only: graded evals/cases/bank-imports.eval.ts against its rubric by inspecting produce() dependencies; no product/test edits applied; result 94/100 PASS."
    }
  ],
  "changedFiles": [
    "openspec/changes/add-bank-statement-imports/reviews/eval-judge.md"
  ],
  "testsAddedOrUpdated": [],
  "commandsRun": [
    {
      "command": "npm run check:eval",
      "result": "passed",
      "summary": "Existing eval ratchet passed: explicit-state-clarity 96, ua-error-clarity 93, ua-ux-clarity 95."
    },
    {
      "command": "git status --short && git diff --cached --name-status",
      "result": "passed",
      "summary": "Working tree has bank-import slice changes; no staged files were reported."
    },
    {
      "command": "nl -ba evals/cases/bank-imports.eval.ts src/modules/bank-imports/ui/bank-import-content.ts src/modules/manual-input/ui/import-summary.ts",
      "result": "passed",
      "summary": "Inspected line-numbered eval case and live copy dependencies used by produce()."
    }
  ],
  "validationOutput": [
    "Eval score: 94/100 PASS for eval-bank-import-error-clarity.",
    "check:eval output: OK explicit-state-clarity 96; OK ua-error-clarity 93; OK ua-ux-clarity 95."
  ],
  "residualRisks": [
    "Minor copy polish risk: `провайдера` is understandable but less user-friendly than `банк`.",
    "Root plan.md and progress.md requested by task were absent."
  ],
  "noStagedFiles": true,
  "diffSummary": "Review-only output file added; bank-import implementation files were inspected but not edited by this judge.",
  "reviewFindings": [
    "no blockers",
    "note: bank-import-content.ts:20-21 uses `провайдера`; acceptable but slightly less polished than bank-specific wording"
  ],
  "manualNotes": "Observed working-tree bank-import slice files include app/imports/bank/page.tsx, app/imports/bank/actions.ts, evals/cases/bank-imports.eval.ts, src/domain/bank-statement.ts/tests, src/modules/bank-imports/*, and related DB/ports/parsing/report artifacts; this judge did not modify them."
}
```
