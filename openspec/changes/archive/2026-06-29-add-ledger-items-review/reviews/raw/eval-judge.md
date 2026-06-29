# Eval judge — eval-ledger-items-error-clarity (dimension: ua-error-clarity)

Fresh project-factory:eval-judge (maker≠checker), 1 judge. Graded the produced
output (reviews/eval-produced-output.txt), confirmed to match the live source
src/modules/ledger-items/ui/ledger-content.ts exactly.

score: 93
pass: true (>=70)
judges: 1

criteriaMet:
- CRITICAL — Ukrainian-first, no English jargon: every string is Ukrainian
  ("Журнал операцій", "Затвердити", "Вилучити"); loanwords ("імпорт", "архівовано")
  are standard Ukrainian, not English product jargon.
- CRITICAL — invalid-status/validation errors explain WHY + remedy: invalid-status
  states the cause and the allowed action; description-required / date-required name
  the offending field and that it is required.
- CRITICAL — two distinct empty states: "Журнал порожній …" vs "Нічого не знайдено …"
  separated by title and body.
- amount-invalid concrete example: "напр. 200 або 200,50 (без знака)".
- Calm, finance-oriented tone; never a generic "something went wrong" in the graded
  surface (the generic fallback only fires for unmapped codes, outside the rubric).

criteriaMissed:
- None substantive. Minor: "Невірна сума" slightly blunt vs the calmer phrasing
  elsewhere; unmapped-code fallback is generic (not part of graded output).

verdict: PASS, score 93 — par with the accounts baseline; no regression to the
ua-error-clarity dimension.
