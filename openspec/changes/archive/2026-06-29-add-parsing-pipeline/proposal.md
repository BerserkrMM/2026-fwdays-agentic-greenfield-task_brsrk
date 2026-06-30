## Why

The next approved Project Factory slice is `add-parsing-pipeline`. Import channels cannot ship until the shared Parsing capability exists: it must turn already-normalized input-event payloads into ledger-item drafts, record every parse attempt, and expose an adapter seam without writing ledger items itself.

## What Changes

- Add a framework-free parsing domain/service layer that accepts normalized input-event payloads and returns `ParsingResult` drafts.
- Add parsing-level deterministic keyless privacy/noise normalization immediately before adapter calls.
- Add an OpenAI-compatible adapter boundary with a deterministic local/test adapter for development and tests, without coupling callers directly to OpenAI.
- Persist every parse attempt as a `parser_run` with success/failed status, normalized payload, result JSON or error, and retryable input-event linkage.
- Validate parser draft shape, signed amount/type consistency, confidence range, category defaulting, and source references.
- Add the minimal shared-schema/domain plumbing needed for FR-PARSE-04 so parser confidence is persisted on ledger items when downstream item creation receives it, while keeping it hidden from v1 UI.
- Do not add import-channel UI/routes, settings UI, or new ledger item creation behavior beyond preserving confidence in the existing item-creation contract.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `parsing`: implement the existing Parsing capability requirements FR-PARSE-01 through FR-PARSE-08, with NFR-PRIV-01/NFR-PRIV-02 and TC-STACK-05 coverage.

## Impact

- New domain parsing helpers under `src/domain/**` and module code under `src/modules/parsing/**`.
- Repository port usage for existing `input_events` and `parser_runs`; one backward-compatible nullable `ledger_items.confidence` coordination addition for FR-PARSE-04, with no new table ownership.
- Tests with `@trace FR-PARSE-*` and evidence under `openspec/changes/archive/2026-06-29-add-parsing-pipeline/`.
- Later manual-input, bank-imports, and file-imports slices will consume this parsing port and then create pending ledger items through the existing item-creation contract.
