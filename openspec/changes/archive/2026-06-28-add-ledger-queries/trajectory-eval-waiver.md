# Trajectory-eval waiver — add-ledger-queries

**Deterministic trajectory checks: RUN and PASS.**
`node scripts/check-trajectory.mjs` → 0 failures (review evidence clean, raw
reviewer outputs linked, `Slice:` trailer present after commit, design+tasks
present). RED→GREEN evidence is durable and verified by
`npm run check:red-green -- --slice add-ledger-queries --strict` → 0 failures.

**LLM trajectory-eval (fresh judge over the diff for test-first ordering and
"no test was weakened"): WAIVED for this slice.**

## Why waived

The repository ships the *deterministic* trajectory validator
(`scripts/check-trajectory.mjs`) and the RED/GREEN evidence checker, but no
trajectory-eval *workflow* (an LLM judge) is wired as a runnable command in this
repo. Consistent with the immediately preceding slice (`add-accounts`, which also
did not run an LLM trajectory-eval), this slice records the gap rather than
fabricating a result.

What IS proven here instead:
- Durable, machine-checkable RED evidence (`evidence/red-run.json`, non-zero
  exit, failing suites named) captured **before** implementation, and GREEN
  evidence (`evidence/green-run.json`) after — verified in `--strict` mode.
- Maker≠checker review by fresh code, security, and spec-compliance reviewers
  (raw outputs under `reviews/`, summarized in `review-findings.json`).

## Consequence — honest claim boundary

Because LLM trajectory-eval was not run, this handoff does **not** claim the
"entire Project Factory loop" is complete. The accurate claim is: *deterministic
G4-style gates passed and maker≠checker review is clean*; test-first ordering is
evidenced by the durable RED→GREEN artifacts, not by an LLM trajectory judge.
