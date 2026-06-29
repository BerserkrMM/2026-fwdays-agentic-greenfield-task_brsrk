# Security Review (re-run) — add-bank-statement-imports

**Reviewer role:** Application security (maker ≠ checker), re-review after fixes
**Date:** 2026-06-29
**Scope:** Uncommitted working-tree changes for the bank-statement import slice
(`git diff HEAD` + untracked). Threat model per PRD: single-user, local, no auth
(BC-SCOPE-01). Focus: untrusted statement-file parsing (ZIP/XML/HTML), injection,
secrets hygiene, unbounded-memory/DoS, unsafe handling of user financial text.

## Verdict: PASS_WITH_NOTES

The Major data-integrity finding from the prior review is **fixed**. No
critical or major security blockers remain. Two minor robustness/DoS notes and a
few explicit "clean" confirmations follow.

---

## Resolved since previous review

- **(Prev. Major — FIXED) Parser-supplied `rowNumber` now validated against
  normalized source rows.** `src/modules/bank-imports/service.ts:84-95` builds
  `validRowNumbers = new Set(rows.map(r => r.rowNumber))` and counts any draft
  whose `sourceRef.rowNumber` is `undefined` or not in that set as `failed`
  before any lookup/insert. A hallucinated/prompt-injected `rowNumber: 999` can
  no longer create a fabricated bank-row ledger item. The DB unique index on
  `(input_event_id, import_row_number)` plus the post-error re-check
  (`service.ts:121-126`) remain as defense in depth.

---

## Findings

### MINOR-1 — XLSX decompression amplification (zip-bomb) has no output cap
**File:** `src/domain/bank-statement.ts:241-265` (esp. `:260`
`inflateRawSync(compressed)`); reached from `statementBytesToText`
(`:131-146`) and `app/imports/bank/actions.ts:57-61`.

**Evidence:** For `.xlsx` uploads, `unzipFiles` walks the ZIP central directory
and eagerly `inflateRawSync`-decompresses **every** entry into memory
(`files.set(name, decode(raw))`), then `decode()`s each to a string. No
`maxOutputLength` is passed to `inflateRawSync` and there is no cap on total
decompressed bytes or entry count. A small crafted XLSX (a deflate "bomb": a
few KB that inflates to hundreds of MB / GB, e.g. a sheet of repeated bytes) is
accepted by the extension/MIME check and then expanded in full, exhausting
memory and crashing the Node process. The active spec waives a *file-size*
limit, but decompression amplification is a distinct vector a size check does
not cover. Impact is bounded by the single-user/local threat model (the user
DoSes their own process), which is why this is minor rather than major.

**Suggestion:** Pass `inflateRawSync(compressed, { maxOutputLength: N })` and
abort once a cumulative decompressed-bytes budget or entry-count budget is
exceeded; only decompress the two entries actually needed
(`xl/sharedStrings.xml` and the first `xl/worksheets/sheet*.xml`) instead of
every entry. Map the overflow to a `BankStatementError` so it surfaces as a
friendly validation error.

### MINOR-2 — `statementBytesToText` throws outside the action's error mapping
**File:** `app/imports/bank/actions.ts:57-61` (call) vs. `:65-80` (try/catch);
throw sites `src/domain/bank-statement.ts:144`, `:244`.

**Evidence:** `statementBytesToText` runs *before* the `try` block. It can throw
`BankStatementError` ("Invalid XLSX workbook" `bank-statement.ts:244`, "Workbook
has no worksheet" `:144`) or a low-level `RangeError`/zlib error on a malformed
or truncated XLSX (out-of-range `u16`/`u32` reads, bad deflate stream). Because
it is outside `try { ... } catch (BankStatementError) { redirect(formError) }`,
these become an unhandled 500 instead of the intended Ukrainian validation
message + retry action. Not an information leak (Next.js hides server error
detail in production) but a robustness/UX gap on hostile input.

**Suggestion:** Move the `statementBytesToText` call inside the existing
`try/catch`, or wrap it so `BankStatementError` redirects to
`/imports/bank?formError=...` and unexpected parse errors map to a generic
`formError=file-invalid`.

---

## Checklist results (explicit per-item)

- **SQL injection — CLEAN.** New repo primitive `findByInputEventRow` is
  parameterized via the `postgres` tagged template
  (`src/db/postgres.ts:167-173`); memory impl uses array filter
  (`src/db/memory.ts:129-135`). No string interpolation into SQL.
- **XXE / XML entity expansion (billion laughs) — CLEAN.** XLSX XML and `.xls`
  HTML are parsed with regex extraction (`bank-statement.ts:229-300`), not a DOM/
  entity-resolving parser. `xmlText` (`:308-316`) expands only the 5 fixed named
  entities; no DOCTYPE, no custom/parameter/external entities. No XXE or
  exponential entity expansion is possible.
- **ReDoS — CLEAN.** The extraction regexes use lazy `[\s\S]*?` bounded by
  literal close tags and `[^>]*` runs; none contain nested ambiguous
  quantifiers. `looksLikeAmount` (`:225-227`) and `normalizeHeader` are linear.
  No catastrophic-backtracking pattern found.
- **Path traversal — CLEAN.** No statement bytes are written to disk;
  `storageUri` is stored as `null` (`service.ts:54`). ZIP entry names are only
  used as Map keys and matched against a fixed regex
  (`bank-statement.ts:143`), never used as filesystem paths. The filename is
  used only for extension detection and stored as metadata.
- **HTML injection in financial text — CLEAN (in this slice).** Extracted
  descriptions flow to the AI parser body (JSON) and into ledger items; the page
  renders via React JSX escaping (`app/imports/bank/page.tsx`), no
  `dangerouslySetInnerHTML`. No server-side HTML/email/PDF sink in this slice.
- **CSV formula injection — N/A to this slice.** No CSV *export* is added here
  (that is FR-SET-03 / Settings). Statement descriptions are imported, not
  written to a CSV. Flag for the export slice: descriptions originating from
  these imports should get `=`/`+`/`-`/`@` prefixing when exported.
- **Mass-assignment — CLEAN.** `importStatement` maps only a fixed allow-list
  into `inputEvents.create` (`service.ts:50-56`); drafts go through
  `ensureBankSourceRow` and the item-creation contract, not blind object spread
  into a DB write. No client-controlled status/role fields.
- **Secrets & config — CLEAN (no slice-introduced leak).** OpenAI key is read
  from `process.env.OPENAI_API_KEY` and sent only in the `authorization` header;
  not logged (`src/modules/parsing/adapters.ts:170-200`). No `NEXT_PUBLIC_`
  secret exposure. `.env*` is gitignored (`.gitignore:11-13,62-63`); `.env.local`
  is untracked and the live `sk-proj-...` key is **not** in git history
  (`git log -S` empty). Note: a real, live OpenAI key sits in the working-tree
  `.env.local` — pre-existing and out of this slice's diff, but it should be
  rotated if this checkout is ever shared, since it is a usable production key.
- **Verbose errors — CLEAN.** Action maps `BankStatementError`/`ParsingError` to
  coded `formError` redirects (`actions.ts:72-79`); no internal detail returned
  to the client (see MINOR-2 for the one path that escapes mapping).
- **Input validation order — CLEAN.** Provider and file type are validated
  server-side before repository access (`actions.ts:42-55`); non-string provider
  and empty/unsupported files redirect before any DB call.

## Notes / accepted risks
- No hard upload size limit is intentional per the active spec
  (`specs/bank-imports/spec.md:5-8`); residual large-upload memory pressure is
  accepted v1 scope. MINOR-1 (decompression amplification) is distinct from raw
  size and is the one I would still address.
- XLS is handled as HTML-table or delimited text and XLSX via the hand-rolled
  ZIP reader; real binary-workbook fidelity remains a documented follow-up, not a
  security blocker.

**Reviewed (not modified):** `src/domain/bank-statement.ts`,
`src/modules/bank-imports/service.ts`, `app/imports/bank/actions.ts`,
`app/imports/bank/page.tsx`, `src/db/postgres.ts`, `src/db/memory.ts`,
`src/domain/ports.ts`, `src/modules/parsing/adapters.ts`.
