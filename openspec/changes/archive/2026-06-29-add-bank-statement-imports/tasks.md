## 1. Tests-first evidence

- [x] 1.1 Add bank-statement domain normalization tests covering supported file/provider validation, Monobank rows, PrivatBank rows, noise removal, empty result, and no ledger writes.
- [x] 1.2 Add bank-imports service tests covering original event preservation, parser payload rows, pending item creation, partial-success, parse failure preservation, and row retry/idempotent skip.
- [x] 1.3 Add `/imports/bank` server-action/UI tests covering unsupported provider/file, malformed FormData, parse error redirect, success redirect summary, and Ukrainian copy.
- [x] 1.4 Run the new tests before implementation and save `evidence/red-run.json` with command, non-zero exitCode, gitHead, timestamp, and failingTests.

## 2. Implementation

- [x] 2.1 Implement framework-free `src/domain/bank-statement.ts` for provider/file validation and deterministic provider row normalization.
- [x] 2.2 Implement the minimal row-idempotency repository primitive needed by bank imports across in-memory and Postgres repos.
- [x] 2.3 Implement `src/modules/bank-imports/service.ts` to store the original bank input event, normalize rows, call Parsing, and create pending items via the item-creation contract with insert-if-absent row behavior.
- [x] 2.4 Implement `/imports/bank` page/action wiring with Ukrainian-first form, validation/error states, no preview gate, default-account seeding, and Ledger summary redirect.
- [x] 2.5 Add module port/copy helpers only within bank-imports where useful; avoid changing unrelated capabilities.

## 3. Evidence, review, and archive

- [x] 3.1 Run the new tests and required verification commands; save `evidence/green-run.json`.
- [x] 3.2 Record eval decision or eval case, and record trajectory-eval waiver/run result.
- [x] 3.3 Run maker≠checker reviews (code, security, spec-compliance, eval judge if applicable), save raw outputs under `reviews/`, fix/justify findings, and write `review-findings.json` with `rawEvidence` links. Two rounds complete: fresh re-review (`*-rerun.md`) on Claude reviewer agents found and fixed MAJOR-1 (comma-join cell corruption), MAJOR-2 (corrupt-XLSX 500), the zip-bomb cap, and BF-2 (action-redirect tests); a confirmation pass returned code APPROVE, security PASS_WITH_NOTES, spec-compliance PASS, eval-judge 94/100 PASS. `review-findings.json` is `clean:true`.
- [x] 3.4 Run strict OpenSpec validation, trace, red/green, handoff, claims, coverage, and deterministic trajectory checks.
- [x] 3.5 Archive the change, regenerate trace/trajectory reports, run fallow, generate slice report, update `docs/current-state.md` last, commit with `Slice:`/`Refs:` trailers, push, and open the PR to `dev`.
