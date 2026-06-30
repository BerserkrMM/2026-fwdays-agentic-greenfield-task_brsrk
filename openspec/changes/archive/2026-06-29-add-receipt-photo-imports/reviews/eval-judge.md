# Eval-judge — add-receipt-photo-imports (fresh, independent)

Case: `eval-file-import-error-clarity` (dimension `ua-error-clarity`).

## Verdict

**Score: 93 / 100 — PASS** (threshold 70; on par with the `ua-error-clarity` baseline of 93)

### Reconstructed produced output
```
Route: /imports/files
Heading: Фото чека
Intro: Завантажте одне фото чека — ми розпізнаємо позиції та створимо операції зі статусом «очікує перевірки».
File label: Фото чека
Hint: Підтримуються зображення JPEG, PNG або WEBP. PDF не підтримується. Оригінал зберігається перед обробкою; позиції потраплять у Журнал, де їх можна перевірити, змінити або видалити.
Submit: Розпізнати чек
Error title: Не вдалося імпортувати чек
Error[file-invalid]: Завантажте одне фото чека у форматі JPEG, PNG або WEBP. PDF не підтримується.
Error[parse-failed]: Не вдалося розпізнати чек. Перевірте, що фото чітке, або спробуйте ще раз.
Ledger summary (ok): Додано до журналу: 4.
Ledger summary (partial): Додано до журналу: 3. Не вдалося зберегти: 1.
```

### Per-criterion notes
- CRITICAL Ukrainian-first, no untranslated jargon — MET (only Latin tokens are the format names JPEG/PNG/WEBP).
- CRITICAL file-invalid lists accepted formats and excludes PDF — MET.
- CRITICAL parse-failure recoverable, not a generic 500 — MET.
- CRITICAL recognized items go to Ledger for review, no preview gate — MET.
- Ledger summary states created and failed counts — MET.
- Calm, practical finance tone — MET.

### Minor deductions (-7)
- Partial-summary uses «зберегти» while the parse error uses «розпізнати»; one consistent verb would read cleaner.
- The Hint sentence is dense (four clauses).

**Summary:** Clean Ukrainian-first receipt-import copy; all four CRITICAL + both quality criteria satisfied; minor verb-consistency/density nits hold it to 93, on par with baseline.
