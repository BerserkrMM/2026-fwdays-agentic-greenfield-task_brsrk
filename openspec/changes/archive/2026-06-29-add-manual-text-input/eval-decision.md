# Eval decision — add-manual-text-input

A qualitative eval case IS added for this slice.

Rationale: unlike the deterministic parsing boundary, this channel surfaces
user-facing Ukrainian copy — an empty-text validation error, a parse-failure
error with a retry action, and a post-import created/failed summary on the
Ledger. That is exactly the `ua-error-clarity` dimension that unit tests cannot
grade (a test asserts the string, not whether it is clear and actionable).

Eval case: `evals/cases/manual-input.eval.ts`
(`eval-manual-input-error-clarity`, dimension `ua-error-clarity`). `produce()`
reads the real copy modules (`manual-input-content.ts` + `import-summary.ts`),
so the judge grades the live product copy. Graded by a fresh eval-judge
(maker≠checker); raw output under `reviews/`, score recorded in
`evals/results/latest.json` and guarded by the eval ratchet
(`quality/eval-baseline.json`).
