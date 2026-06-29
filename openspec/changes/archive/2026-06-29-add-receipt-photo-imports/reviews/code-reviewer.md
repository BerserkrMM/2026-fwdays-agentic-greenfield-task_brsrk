# Code review — add-receipt-photo-imports (fresh, independent)

## Verdict: APPROVE_WITH_NITS

Faithfully mirrors the bank-imports pattern: framework-free domain, magic-byte trust over client MIME, original preserved before parse, vision parse through the single adapter boundary, partial-success with systemic-error propagation, Ukrainian-first copy. No BLOCKER or MAJOR issues.

## Findings

**1. `byteLength` stores base64 character count, not byte length — MINOR (correctness/naming)**
- `src/domain/parsing.ts:78,82-85` — `dataUriByteLength` returns base64 string length (~4/3 of real size) but the field is named `byteLength`. Rename or decode to real bytes.

**2. `retryInputEvent` mime fallback can mislabel non-JPEG retries — MINOR (low confidence)**
- `src/modules/file-imports/service.ts` — `event.mimeType ?? "image/jpeg"`; a stored PNG/WEBP with null mime would be relabeled. Harmless (vision keys off the data URI), affects only redacted traceability. Derive mime from the `data:` URI prefix, or treat null mime as MissingInputEventError.

**3. "Retry action" is a re-upload, not a retry of the preserved run — MINOR (consistent deferral)**
- The action redirects to `/imports/files?formError=parse-failed`; `retryInputEvent` exists but is not wired to UI. FR-ITEM-07 retry UI is explicitly deferred to ledger-items (same as bank). Confirm it stays in deferred-work. No code change required.

**4. Valid-image-but-no-drafts redirects to Ledger — MINOR (UX)**
- `created:0, failed:0` → `/ledger?imported=0&failed=0`. Matches bank behavior. (Note: the shared Ledger summary banner renders the empty-import message for this case, so the user does get feedback.)

**5. EXIF/embedded-metadata PII sent to the provider and stored — MINOR (privacy, explicitly deferred)**
- Original bytes forwarded as-is; binary EXIF stripping deferred in v1 per design/spec. Keep the deferral tracked; the "no PII" spec phrasing is stronger than v1 delivers.

## Verified correct
- Partial-success: `failed` seeded from `invalidDrafts.length`; non-systemic per-draft failures increment; `NoDefaultAccountError`/`MissingInputEventError` re-throw (propagate).
- Base64 not duplicated into `parser_runs` (redaction applied to stored payload while full payload reaches the adapter; test asserts no `"base64,"`).
- Magic-byte trust over client MIME; empty rejection; WEBP RIFF…WEBP double-check.
- Adapter fails fast on a photo payload missing its image, before timer/network allocation.
- `getRepositories()` memoized → the two action calls share one repo set; seed visible to service.
- Async `searchParams` awaited; `firstParam` array branch covered by smoke test.
