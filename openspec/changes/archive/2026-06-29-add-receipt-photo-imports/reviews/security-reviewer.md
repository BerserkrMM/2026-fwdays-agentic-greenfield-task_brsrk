# Security review — add-receipt-photo-imports (fresh, independent)

## Verdict: PASS_WITH_NOTES

Core security properties hold: content (magic-byte) image validation with client MIME ignored; raw base64 stripped from `parser_runs.normalized_payload`; no injection into the OpenAI request body; no logging of image/key; clean secrets hygiene.

## Findings

### NOTE-1 — Unbounded upload → memory/cost amplification; large real photos hit the generic 500 path instead of the friendly redirect
- files: `app/imports/files/actions.ts:37`, `src/domain/receipt-photo.ts:73-76`, `next.config.ts` (no `serverActions.bodySizeLimit`)
- severity: NOTE (DoS surface is a documented FR-FILE-01 deferral; the error-path half is a real but minor gap)
- No app-level size cap; file fully buffered, base64-encoded (~1.33x), persisted as data URI, sent to paid OpenAI. With no auth (BC-SCOPE-01) this is a cost/DoS lever. A legitimate large photo exceeding the framework default action body limit fails through `throw error` (actions.ts:52) as a generic error, not the friendly `?formError=file-invalid` redirect.
- suggestion: explicit generous max-byte check raising `ReceiptPhotoError`, and set `serverActions.bodySizeLimit` deliberately.

### NOTE-2 — Embedded image metadata (EXIF GPS/device) forwarded to the AI provider
- files: `src/modules/parsing/adapters.ts:323`, `src/modules/file-imports/service.ts:60-68`, `src/domain/receipt-photo.ts`
- severity: NOTE (explicitly deferred: spec "Binary EXIF/metadata stripping is deferred in v1")
- The original bytes are sent verbatim; EXIF inside the image (GPS, device serial) is PII that rides along. The requirement's "no PII" phrasing is stronger than what v1 delivers. Documented deferral, so a risk to acknowledge, not a blocker.

### MINOR-1 — `dataUriByteLength` reports base64 character count, not actual byte length
- file: `src/domain/parsing.ts:78,82-85`
- severity: MINOR (traceability accuracy only; not a leak)
- `byteLength` persisted for traceability is ~1.33x the real image size. No security impact (raw base64 is correctly removed).

## Checklist (clean items)
- Magic-byte validation PASS (JPEG/PNG/WEBP true signatures; renamed PDF/text rejected; client MIME never used for the decision; empty rejected).
- No exploitable local image processing PASS (bytes only base64-encoded + forwarded; no decode/sharp/ImageMagick).
- Server-action input validation & error mapping PASS (non-File/empty → file-invalid; ReceiptPhotoError → file-invalid; ParsingError → parse-failed; no stack-leak 500s; raw ParsingError text never surfaced).
- Vision-path injection / request-body integrity PASS (data URI in structured `image_url.url`, whole body JSON.stringify-ed; MIME is an internal constant).
- Raw image redaction before persistence PASS (verified: serializedPayload computed once, used for both success and failed runs; raw bytes only on input_events.storage_uri).
- Log leakage PASS (no console.*; key/body/image never logged).
- Secrets hygiene PASS (OPENAI_API_KEY only via env/injected; missing key fails fast; no NEXT_PUBLIC exposure; no tracked .env*).
- Redirect/summary output PASS (only numeric counts interpolated).

## Out of scope for v1 (noted)
- Auth/authorization, rate limiting, tenant scoping intentionally absent per BC-SCOPE-01. The unbounded-upload + paid-API combination (NOTE-1) is the main thing to revisit on any network/multi-user exposure.
