# Eval decision — add-ledger-queries

**Decision: no new eval case is added for this slice.**

## Rationale

The Project Factory eval layer grades *qualitative* output that assertions
cannot — error-message clarity, empty-state usability, Ukrainian-first copy tone.
This slice's deliverable is the **ledger read side**: deterministic numeric
computations (balances, income/expense aggregates, category totals) over
`ledger_items`. Every behavior has an exact expected value and is pinned by
unit + service + boundary-smoke tests:

- `src/domain/ledger-query.test.ts` — status inclusion (pending+approved in,
  deleted out), per-account, overall, aggregates by sign, category totals.
- `src/modules/ledger/service.test.ts` — the service over the in-memory repo.
- `src/modules/ledger/ledger.smoke.test.ts` — end-to-end through the DB boundary,
  including the archived-account regression.
- `src/domain/money.test.ts` — `formatUahMinor` formatting.

There is no free-text, error-surface, or empty-state *copy* introduced that an
LLM judge could grade beyond what is already covered:

- The only user-facing copy added is a balance label/hint in
  `accounts-content.ts`. The existing `eval-accounts-error-clarity` case already
  grades the Accounts screen's Ukrainian-first copy and tone; its `produce()`
  reads the unchanged graded fields (title, description, defaultBadge,
  setDefaultLabel, archiveLabel, ACCOUNT_ERRORS), so that eval still applies and
  its baseline score is unaffected.

Adding a numeric-correctness "eval" would duplicate the unit tests with a weaker,
non-deterministic LLM signal. Therefore no eval case is warranted, and the eval
ratchet baseline (`quality/eval-baseline.json`) is intentionally unchanged.

## Consequence

- No `eval-judge` reviewer is run for this slice (there is no eval to judge);
  the maker≠checker review uses the code, security, and spec-compliance reviewers.
- `evals/results/latest.json` and `quality/eval-baseline.json` are unchanged.
