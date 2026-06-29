## Why

Bank statements are the next approved channel after manual text input. Users need to upload Monobank or PrivatBank exports, preserve the original input, normalize statement rows deterministically, and create pending ledger items without a separate preview gate.

## What Changes

- Add the `add-bank-statement-imports` slice for `/imports/bank`.
- Add provider selection for `monobank` / `privatbank`, supported file validation, original statement preservation as a `bank` `input_event`, provider-specific deterministic row normalization, parser invocation, pending item creation, and Ledger redirect summaries.
- Add row-level insert-if-absent behavior for bank retries so existing `(input_event_id, import_row_number)` items are skipped and not overwritten.
- Add Ukrainian-first validation/error surfaces for unsupported providers, unsupported file types, empty statements, normalization failures, and parser failures.
- No separate bank preview step; review remains in the Ledger.

## Capabilities

### New Capabilities

### Modified Capabilities
- `bank-imports`: implement the existing bank-statement import requirements FR-BANK-01 through FR-BANK-06 with the already-defined parsing and item-creation contracts.

## Impact

- New bank import domain/module code under `src/domain` and `src/modules/bank-imports`.
- `/imports/bank` route and server action wiring.
- Small shared repository/contract additions only where needed for bank row idempotency.
- Tests for bank normalization, import orchestration, server-action validation, and row retry/idempotency.
- OpenSpec evidence, RED/GREEN artifacts, reviews, trace/trajectory reports, and final slice report.
