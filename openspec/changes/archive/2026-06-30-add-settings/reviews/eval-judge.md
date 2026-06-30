# Eval judge — add-settings (dimension: ua-error-clarity)

Fresh eval-judge (maker≠checker) grading the live Settings copy (read from
`src/modules/settings/ui/settings-content.ts`) against the case rubric in
`evals/cases/settings.eval.ts`. Produced output graded: see
`reviews/eval-produced-output.txt`.

**SCORE: 93/100 — VERDICT: PASS** (threshold 70; peer cases ~93)

Notes per criterion:

1. CRITICAL — MET. Every string is Ukrainian-first; "AI" is rendered as the native
   abbreviation «ШІ» («Постачальник ШІ», «розбір внесень через ШІ»). Remaining Latin
   tokens are unavoidable proper nouns/format names («OpenAI», «CSV») or the standard
   localized technical term «API-ключ» — not gratuitous English jargon.

2. CRITICAL — MET. The not-configured state names both the consequence («…розбір
   внесень через ШІ не працюватиме — внесення збережеться, але завершиться помилкою
   розбору.») and the next step («Введіть ключ, щоб додати або замінити його.» /
   «…доки не додасте новий ключ.»). The "saves but fails parsing" detail is accurate.

3. CRITICAL — MET. Write-only is explicit («Він зберігається на сервері й ніколи не
   показується повторно.») and blank-field semantics are explicit and correct
   («Залиште поле порожнім, щоб не змінювати збережений ключ.»).

4. MET. The three errors (required / whitespace / too-long) are distinguishable,
   actionable, and blame-free (they point at the pasted value, not the user); none
   are generic.

5. MET. Export copy is calm and read-only-explicit («Експорт лише читає дані —
   нічого не змінює й не видаляє.») with the destructive-reset disclaimer
   («Деструктивного очищення даних у версії 1 немає.») and finance-grade precision
   on included soft-deleted ops («зокрема вилучені (зі статусом)»).

Deductions: minor only — «API-ключ» vs «Ключ OpenAI» vs «Ключ» alternate across
labels; a polished pass would unify the term. Sole reason it sits at peer level
(~93) rather than higher; no critical or substantive miss found.
