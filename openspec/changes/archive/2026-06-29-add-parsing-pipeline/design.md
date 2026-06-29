## Context

`foundation` already owns the shared schema and framework-free types for `input_events`, `parser_runs`, and parsed drafts. `accounts`, `ledger`, and `ledger-items` are archived, so a default-account/item-creation path exists for later channel slices. The next dependency is the shared `parsing` capability: channels will pass already source-normalized payloads to it, and it must return drafts only while logging every attempt.

The slice owns FR-PARSE-01..08 plus parsing-side NFR-PRIV-01/NFR-PRIV-02 and TC-STACK-05. It does not own source-specific channel normalization, Settings UI, import routes, or ledger writes.

## Goals / Non-Goals

**Goals:**

- Provide a framework-free parsing service/port under `src/modules/parsing` that consumes a stored `InputEvent` id plus normalized payload metadata and returns a `ParsingResult`.
- Run deterministic keyless privacy/noise normalization immediately before adapter calls and persist that exact normalized payload in `parser_runs`.
- Define an adapter boundary for OpenAI-compatible text/vision/document parsing with a deterministic in-process adapter usable in tests/dev.
- Validate and normalize adapter output into canonical `ParsedLedgerItemDraft` values, including category defaulting and confidence range checks.
- Record both successful and failed attempts in the existing `parser_runs` repository and keep the original `input_event` retryable.

**Non-Goals:**

- No `/imports/text`, `/imports/bank`, `/imports/files`, or React/Next.js UI work.
- No Settings screen or database storage for API keys; this slice can read optional process configuration and leave Settings to its own slice.
- No new import-channel ledger creation flow; import channels will call the existing item-creation contract after parsing.
- No new database tables. A nullable `ledger_items.confidence` column is allowed as a minimal coordination addition because FR-PARSE-04 requires persisting parser confidence when available.

## Decisions

1. **Parsing module owns orchestration; adapters are injected.**
   - Decision: add `ParsingService` that depends on `Repositories` and a `ParserAdapter` port. The service checks the input event exists, normalizes payload, invokes the adapter, validates drafts, writes a `parser_run`, and returns `{ parserRun, drafts }`.
   - Rationale: callers do not couple to OpenAI or persistence details, satisfying FR-PARSE-06 and FR-PARSE-08.
   - Alternative considered: channels write `parser_runs` themselves. Rejected because each channel would duplicate retry/error semantics.

2. **Persist normalized payload as JSON string.**
   - Decision: represent payloads as typed objects in code, but persist the normalized adapter payload as stable JSON in `parser_runs.normalized_payload`.
   - Rationale: current foundation schema uses string columns, and JSON string preserves traceability without schema churn.
   - Alternative considered: change schema to JSONB. Deferred as a coordination/schema change unless later scaling requires it.

3. **Keyless normalization is conservative.**
   - Decision: trim/collapse whitespace, drop blank/noise lines, and mask obvious emails, phone-like digit runs, and long card/account-like digit sequences in text fields before adapter calls. Do not use AI or secret keys.
   - Rationale: meets FR-PARSE-05/NFR-PRIV-01 without pretending to solve all PII detection.
   - Alternative considered: provider-specific bank cleanup or image metadata stripping. Rejected here because channel-specific normalization belongs to bank/file slices.

4. **OpenAI boundary without mandatory network in tests.**
   - Decision: expose an `OpenAiParserAdapter` class behind the port, but keep tests and default service construction able to use an injected deterministic adapter. Missing OpenAI configuration is reported as an adapter failure and recorded as a failed run.
   - Rationale: v1 names OpenAI while CI must be deterministic and not require external calls.
   - Alternative considered: add the official OpenAI SDK now. Rejected to avoid unnecessary dependency/API-key coupling; route handlers can later wrap `fetch` or add SDK via a focused change if needed.

5. **Draft validation is explicit.**
   - Decision: adapter drafts are checked for description, signed amount/type consistency, `UAH`, optional ISO-ish `occurredAt`, confidence `[0,1]`, and category defaulting to `Без категорії`. Non-empty category text is preserved as returned.
   - Rationale: parser returns drafts only, but downstream item creation should receive canonical data.
   - Alternative considered: let item creation reject malformed drafts. Rejected because parsing owns the adapter contract.

6. **Confidence persistence is a tiny coordination addition.**
   - Decision: add nullable `confidence` to the ledger item domain/schema and copy `draft.confidence` through the existing item-creation contract.
   - Rationale: FR-PARSE-04 requires confidence to be persisted when available and hidden from v1 UI; storing it on the item keeps import-channel behavior simple.
   - Alternative considered: only persist confidence in `parser_runs.result_json`. Rejected because the PRD explicitly says the score is persisted with the item.

## Risks / Trade-offs

- **Conservative privacy masking misses some personal data** → document the scope and test the deterministic cases; channels can add source-specific cleanup later.
- **No real OpenAI call in CI** → keep adapter boundary and failure recording covered; manual/provider integration can be validated when Settings/API-key slice exists.
- **JSON string payload/result fields are less queryable than JSONB** → acceptable for v1 audit logs; avoid schema change in a feature-owned slice.
- **Validation rejects ambiguous adapter output** → failures are recorded as retryable `parser_run` errors instead of creating partial/corrupt drafts.
