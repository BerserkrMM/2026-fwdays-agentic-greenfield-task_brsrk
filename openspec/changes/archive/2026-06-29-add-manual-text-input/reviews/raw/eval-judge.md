# Eval-judge — ua-error-clarity (manual-input)

Fresh eval-judge (maker≠checker) over the produced output, verified to match the
live source modules (`manual-input-content.ts` lines 4-19, `import-summary.ts`
lines 34-40).

```json
{
  "score": 93,
  "pass": true,
  "threshold": 70,
  "criteriaMet": [
    "CRITICAL 1 — Ukrainian-first, no English jargon: every span is Ukrainian. AI is localized as «ШІ» (e.g. 'ШІ розпізнає окремі операції', 'Перевірте налаштування ШІ'); no raw English product terms anywhere.",
    "CRITICAL 2 — parse-failure explains + points to retry/AI settings: 'Не вдалося розпізнати текст. Перевірте налаштування ШІ або спробуйте ще раз.' states what failed and gives two concrete next actions.",
    "CRITICAL 3 — empty-text tells user what to do: 'Введіть текст для імпорту.' is a direct imperative.",
    "Criterion 4 — summary states created/failed counts: ok 'Створено операцій: 2.'; partial 'Створено операцій: 1. Не вдалося зберегти: 2.' — explicit and only shown when relevant.",
    "Criterion 5 — calm, finance-oriented, not generic: neutral finance phrasing, no alarming or generic 'something went wrong' string in the visible output."
  ],
  "criteriaMissed": [],
  "weaknesses": [
    "A generic fallback 'Сталася помилка. Спробуйте ще раз.' exists in manualTextErrorMessage (line 24) for unknown codes. NOT in the graded output, so it does not lower the score, but it is the 'something went wrong' pattern criterion 5 warns against and would surface for any unmapped formError code.",
    "Partial-summary 'Не вдалося зберегти: 2.' reports a failure count but gives no cause/next step; acceptable for a banner."
  ],
  "reasoning": "All three CRITICAL criteria satisfied by quotable Ukrainian spans; both non-critical criteria met. Held at 93 (on par with sibling baseline), not inflated."
}
```
