## Why

Receipt photos are the last import channel in the approved MVP order (slice 8,
capability `file-imports`). Users need to upload one receipt photo, preserve the
original, run an AI vision parse, and create pending ledger items — reusing the
parsing and item-creation contracts already shipped, with no new preview gate.

## What Changes

- Implement the `add-receipt-photo-imports` slice for `/imports/files`.
- Validate one uploaded receipt image deterministically (magic-byte + MIME), reject
  non-images/PDF, and preserve the original as a `photo` `input_event` whose
  `storage_uri` holds the original bytes as a `data:` URI and `mime_type` is the
  detected image type (FR-FILE-01/02).
- Run deterministic, keyless preprocessing before the AI call (validation + image
  isolation); the original reference stays preserved on the `input_event`
  (FR-FILE-03).
- Extend the existing OpenAI adapter boundary with a vision path: a `kind: "photo"`
  parser payload carries the image and the adapter invokes an AI vision parse
  returning receipt line-item drafts (FR-FILE-04, FR-PARSE-01/02/06).
- Create one `pending` ledger item per valid receipt draft via the shared
  item-creation contract (partial-success); redirect to the Ledger with a
  created/failed summary (FR-FILE-05, FR-ITEM-04).
- Add Ukrainian-first validation, parse-failure (with retry), and summary surfaces.
- No EXIF byte-rewrite, no multi-photo flow, no PDF, no preview gate.

## Capabilities

### New Capabilities

### Modified Capabilities
- `file-imports`: implement the existing receipt-photo requirements FR-FILE-01
  through FR-FILE-05 against the already-defined parsing, vision-adapter, and
  item-creation contracts.

## Impact

- New file-import domain/module code under `src/domain/receipt-photo.ts` and
  `src/modules/file-imports`.
- `/imports/files` route + server action wiring (replaces the placeholder screen).
- Minimal shared additions: an optional `image` field on the `ParserPayload`
  contract and a vision branch in the existing OpenAI adapter (the smallest change
  the channel needs; the parsing baseline already declares `kind: "photo"`).
- Tests for image validation, import orchestration, vision adapter wiring, and
  server-action redirects.
- OpenSpec evidence, RED/GREEN artifacts, reviews, trace/trajectory reports, and
  the final slice report.
