## Context

`add-bank-statement-imports` is slice 7 in the approved MVP order. The repository already has the shared schema (`input_events`, `parser_runs`, `ledger_items` with unique `(input_event_id, import_row_number)`), Parsing, the item-creation contract, default-account seeding, Ledger review, and manual text import. This slice should be a thin channel over those contracts and must not introduce a preview gate even though the design reference shows preview-like visual states; the PRD/plan/specs are authoritative.

## Goals / Non-Goals

**Goals:**
- Implement `/imports/bank` for CSV/XLS/XLSX uploads with explicit provider selection.
- Preserve the original statement as a `bank` `input_event` before normalization/parsing.
- Normalize Monobank and PrivatBank rows deterministically into a parser payload that includes source row numbers.
- Invoke Parsing and create pending ledger items through the item-creation contract.
- Preserve row idempotency by skipping already-created `(input_event_id, import_row_number)` rows on retry.
- Surface Ukrainian-first validation, empty-normalization, parse-failure, and import summary states.

**Non-Goals:**
- No bank preview step, row-selection UI, or account mapping UI.
- No direct bank API integration and no PDF support.
- No final categorization/type inference in normalization; AI parser remains responsible for canonical drafts.
- No new balance logic; Ledger remains the review/balance surface.
- No receipt-photo channel work.

## Decisions

1. **Channel-owned module and framework-free normalization.**
   Add `src/domain/bank-statement.ts` for provider/file/row normalization and `src/modules/bank-imports/service.ts` for orchestration. The domain file will parse delimited text and choose provider-specific columns/row filters, but it will not import Next, DB, Parsing, or Ledger code.

2. **Store original file text as `raw_text`, not binary blobs.**
   For v1, the input event preserves the statement content read from the uploaded `File` plus `mime_type`; `storage_uri` remains null because no file storage service exists. This matches the current schema and the manual-input precedent while preserving the original input before processing.

3. **Parser payload is document rows.**
   The bank channel passes `{ kind: "bank", content: serializeBankRows(provider, rows), locale: "uk-UA" }` to Parsing (see `src/modules/bank-imports/service.ts`). The serialized content carries normalized rows, each with `rowNumber` and string fields such as date, description, amount, and currency when available. Parsing already preserves `sourceRef.rowNumber` and the item-creation contract maps it to `import_row_number`.

4. **Idempotency is enforced before inserting.**
   Add the smallest repository primitive needed to find an existing ledger item by `input_event_id` and `import_row_number`. Bank-imports will skip such rows and only call the item-creation contract for absent rows. The existing DB unique index remains the final safety net.

5. **Server action mirrors manual-input.**
   The `/imports/bank` action validates FormData types/provider/file, seeds the default account after validation, calls the service, redirects parse/validation errors back to `/imports/bank?formError=...`, and redirects success to `/ledger?imported=&failed=`.

## Risks / Trade-offs

- **XLS/XLSX parsing without an added binary workbook dependency** → The first implementation treats uploaded content through the Web `File.text()` boundary and validates supported extensions/MIME types. Binary workbook fidelity is a known v1 risk; if test or review evidence shows real workbook parsing is required now, add a small parser dependency or stop for owner guidance.
- **Provider exports vary** → Normalization uses tolerant Ukrainian/English column aliases and removes obvious noise, with tests for representative Monobank/PrivatBank CSV rows. Unknown/empty rows fail explicitly rather than guessing.
- **Race on duplicate row retry** → Pre-insert skip is user-facing behavior; the database unique index remains a concurrency guard. Duplicate insert errors are treated as skipped/failed per row, not as overwrites.
- **Design reference preview conflict** → PRD FR-BANK-05 and OpenSpec baseline say no preview gate. The route may show guidance/states, but not a preview approval flow.
