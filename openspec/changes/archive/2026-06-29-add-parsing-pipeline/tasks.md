## 1. Tests-first evidence

- [x] 1.1 Add parsing domain/service/repository-boundary tests with `@trace FR-PARSE-01` through `FR-PARSE-08`, covering success, failed adapter run, retry, draft validation, category defaulting, confidence bounds, privacy normalization, and no ledger writes.
- [x] 1.2 Run the new tests before implementation and save real RED evidence to `openspec/changes/add-parsing-pipeline/evidence/red-run.json`.

## 2. Parsing domain and module implementation

- [x] 2.1 Add framework-free parsing payload/result/error/adapter types and deterministic keyless privacy/noise normalization helpers.
- [x] 2.2 Implement draft validation/canonicalization for required fields, signed amount/type consistency, `UAH`, optional date/sourceRef, category defaulting, and confidence `[0,1]`.
- [x] 2.3 Implement `ParsingService` orchestration: input-event lookup, normalization before adapter call, success/failed `parser_run` creation, retry by creating a new run, and drafts-only return.
- [x] 2.4 Add the module port exports and an OpenAI-compatible adapter boundary with deterministic test/dev injection; do not add UI or import-channel behavior.

## 3. Verification and evidence

- [x] 3.1 Run GREEN tests and save `openspec/changes/add-parsing-pipeline/evidence/green-run.json`.
- [x] 3.2 Document eval decision or add eval if needed, plus trajectory-eval waiver/run artifact.
- [x] 3.3 Run required deterministic gates (`lint`, `tsc`, `test:run`, `test:coverage`, coverage ratchet, OpenSpec strict validation, trace, red-green strict, handoff, claims, trajectory) and regenerate trace/trajectory reports.
- [x] 3.4 Run maker≠checker review, save raw outputs under `reviews/`, and summarize in `review-findings.json` with linked raw evidence.
- [x] 3.5 Archive the change, generate `slice:report --write`, run fallow, update `docs/current-state.md` last, and commit with `Slice:` / `Refs:` trailers.
