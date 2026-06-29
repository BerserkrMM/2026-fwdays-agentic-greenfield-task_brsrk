## Context

`add-receipt-photo-imports` is slice 8 (the last channel) in the approved MVP
order. The repository already has the shared schema (`input_events` with
`storage_uri`/`mime_type`, `parser_runs`, `ledger_items`), Parsing with an
OpenAI-compatible adapter boundary, the item-creation contract, default-account
seeding, Ledger review, and the manual-text and bank-statement channels. This
slice is a thin channel over those contracts plus the one genuinely new piece the
MVP still lacks: an AI **vision** parse path. There is no preview gate even though
the design reference shows preview-like states; the PRD/plan/specs are
authoritative.

The user (product owner) confirmed two v1 decisions for this slice:
1. **Photo storage:** store the original bytes as a `data:<mime>;base64,…` URI in
   the existing `input_events.storage_uri` column — no new infra/schema, no object
   storage, single-user/local-friendly, and the same bytes feed the vision call.
2. **Preprocessing depth:** deterministic validation + magic-byte MIME detection
   only; full binary EXIF/metadata stripping is documented deferred work (no
   hand-rolled JPEG byte-surgery without a library).

## Goals / Non-Goals

**Goals:**
- `/imports/files` accepts one receipt image; deterministic validation rejects
  non-images/PDF/empty with explicit Ukrainian errors.
- Preserve the original as a `photo` `input_event` (`storage_uri` = data URI,
  `mime_type` = detected image type) before any parse.
- Pass the image to Parsing via a `kind: "photo"` payload; the OpenAI adapter runs
  a vision parse and returns receipt line-item drafts.
- Create one pending ledger item per valid draft (partial-success) through the
  item-creation contract; redirect to the Ledger with a created/failed summary.
- Surface parse-failure with retry, preserving the `input_event` + failed
  `parser_run`.

**Non-Goals:**
- No multi-photo receipts, no PDF, no preview/row-selection UI, no account mapping.
- No binary EXIF rewrite (deferred).
- No new balance/category logic; Ledger remains the review/balance surface.
- No live OpenAI key management here (Settings owns FR-SET-02; with no key, a real
  upload surfaces `parse-failed` by design, as in the text/bank channels).

## Decisions

1. **Framework-free image domain.** Add `src/domain/receipt-photo.ts`:
   magic-byte MIME detection (JPEG/PNG/WEBP), supported-file assertion, and
   `data:` URI construction. No Next/DB/Parsing imports (TC-PURE-01). Trust is
   magic bytes, not the client-supplied MIME, so a renamed `.jpg` text/PDF is
   rejected.

2. **Original bytes as a data URI (storage_uri).** The `photo` input_event stores
   the original image as a `data:` URI in `storage_uri` and the detected MIME in
   `mime_type`. The original is preserved as-is (NFR-PRIV-02); since v1 does no
   binary stripping, the preprocessed payload equals the original bytes — the
   "preprocessing" is deterministic validation + isolating the image from any
   surrounding text/PII before the AI call (FR-FILE-03, BC-PRIVACY-01).

3. **Vision via the existing adapter boundary.** Extend the shared `ParserPayload`
   with an optional `image?: { dataUri; mimeType }` used only for `kind: "photo"`,
   and branch `OpenAiParserAdapter.parse` to build a vision message
   (`image_url` content part) with a receipt-specific system prompt when the
   payload is a photo. This keeps a single adapter boundary (FR-PARSE-06) and lets
   the channel stay thin. `normalizeParserPayload` passes `image` through untouched
   (no text masking of the base64). The parsing baseline already declares
   `kind: "photo"`, so this completes an anticipated seam rather than inventing one.

4. **Channel service mirrors the other channels.** `FileImportService.importPhoto`
   validates, stores the `photo` event, calls `ParsingService.parse`, and creates
   pending items with partial-success (a per-draft failure is counted, not rolled
   back; systemic `NoDefaultAccount`/`MissingInputEvent` propagate). A
   `retryInputEvent` re-parses from the stored data URI (the FR-ITEM-07 retry
   **UI** remains owned by ledger-items, deferred — consistent with the bank
   slice). The v1 retry UX on `/imports/files` is a re-upload ("Спробувати ще
   раз"); `retryInputEvent` is reserved for the later ledger-side retry over the
   preserved `input_event`.

5. **Server action mirrors `/imports/bank`.** Validate the FormData file, read its
   bytes once, decode/validate inside the try/catch so a bad image becomes a
   friendly `file-invalid` redirect (never a 500), seed the default account, call
   the service, redirect parse/validation errors back to
   `/imports/files?formError=…` and success to `/ledger?imported=&failed=`.

## Risks / Trade-offs

- **Shared-contract addition without a separate coordination change.** Adding
  `ParserPayload.image` and a vision branch touches the parsing module from a
  channel slice. This mirrors the bank slice (which added `findByInputEventRow`
  and bank prompt guidance) and completes the pre-declared `kind: "photo"` seam;
  it is the smallest change the channel needs. Flagged here for review.
- **No binary EXIF stripping (deferred).** Per the product decision, v1 does
  validation + MIME detection only. The original is preserved and only the image
  (no surrounding text) is sent to AI, so PII leakage surface is limited; embedded
  image metadata stripping is tracked as deferred work.
- **Data URI size in a text column.** Single-user/local v1 accepts large base64
  blobs in `storage_uri`; no hard size limit (FR-FILE-01). A future object-storage
  swap would only change where `storage_uri` points.
- **Live vision behavior unverified here.** As with the text/bank channels, live
  OpenAI calls need a key (Settings slice). Deterministic validation, payload
  wiring, partial-success, and redirects are fully covered; the live vision parse
  is exercised via an injected fetch in the adapter test, not a real provider.
