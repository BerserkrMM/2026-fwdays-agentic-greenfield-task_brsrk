## 1. Tests-first evidence

- [x] 1.1 Add receipt-photo domain tests covering magic-byte MIME detection
  (JPEG/PNG/WEBP), rejection of non-image/PDF/empty uploads, `data:` URI
  construction, and the real `check.JPEG` fixture validating to a data URI.
- [x] 1.2 Add file-imports service tests covering original photo event preservation
  (`source: photo`, `storage_uri` data URI, detected `mime_type`), the vision
  parser payload (`kind: "photo"` carrying the image), pending item creation,
  partial-success, parse-failure preservation, and retry re-parse.
- [x] 1.3 Add OpenAI adapter vision-path test: a `kind: "photo"` payload builds an
  `image_url` vision message and the adapter returns receipt drafts.
- [x] 1.4 Add `/imports/files` server-action/redirect tests covering invalid file,
  parse-failure redirect, success summary redirect, and Ukrainian copy.
- [x] 1.5 Run the new tests before implementation and save `evidence/red-run.json`
  with command, non-zero exitCode, gitHead, timestamp, and failingTests.

## 2. Implementation

- [x] 2.1 Implement framework-free `src/domain/receipt-photo.ts` for image
  validation, magic-byte MIME detection, and `data:` URI construction.
- [x] 2.2 Extend the shared `ParserPayload` with an optional `image` field and add
  the vision branch + receipt system prompt to the existing OpenAI adapter.
- [x] 2.3 Implement `src/modules/file-imports/service.ts` to store the original
  photo input event, call Parsing with the vision payload, and create pending items
  via the item-creation contract (partial-success), plus `retryInputEvent`.
- [x] 2.4 Implement `/imports/files` page/action wiring with a Ukrainian-first form,
  validation/error states, no preview gate, default-account seeding, and Ledger
  summary redirect; add the file-imports copy module.
- [x] 2.5 Keep changes within file-imports + the minimal parsing seam; avoid
  touching unrelated capabilities.

## 3. Evidence, review, and archive

- [x] 3.1 Run the new tests and the required verification commands; save
  `evidence/green-run.json`.
- [x] 3.2 Add the eval case (`ua-error-clarity`) for the receipt-photo copy and
  record the trajectory-eval waiver.
- [x] 3.3 Run maker≠checker reviews (code, security, spec-compliance, eval judge),
  save raw outputs under `reviews/`, fix/justify findings, and write
  `review-findings.json` with `rawEvidence` links.
- [x] 3.4 Run strict OpenSpec validation, trace, red/green, handoff, claims,
  coverage, and deterministic trajectory checks.
- [x] 3.5 Archive the change, regenerate trace/trajectory reports, run fallow,
  generate the slice report, update `docs/current-state.md` last, commit with
  `Slice:`/`Refs:` trailers, push, and open the PR to `dev`.
