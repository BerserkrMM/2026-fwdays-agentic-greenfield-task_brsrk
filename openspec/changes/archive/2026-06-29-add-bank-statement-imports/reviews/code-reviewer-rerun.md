# Code review (re-run) — add-bank-statement-imports

Reviewer: code-reviewer (maker≠checker re-review after fixes)
Date: 2026-06-29
Scope: working-tree diff (uncommitted) for the bank-imports slice.
Method: read full diff + new files, traced rowNumber/import_row_number pipeline,
verified the three claimed fixes against the code, ran `npx tsc --noEmit` (clean)
and the targeted vitest suites (20/20 pass).

## Verdict: REQUEST_CHANGES

The three previously-reported findings are genuinely addressed (not superficial):
the parser `rowNumber` membership check is real and tested, the parse-failure
test now asserts input_event + failed parser_run preservation, and XLSX/HTML-xls
extraction exists with dedicated tests. However, the new extraction path
introduces a data-corruption bug, and the server action has an uncaught-throw
path that yields a 500 on a class of bad uploads. Both are below in detail.

---

## Verification of claimed fixes

### FIX 1 — XLSX/XLS extraction (claimed: blocker/high resolved) — PARTIAL
`statementBytesToText` (src/domain/bank-statement.ts:131) genuinely unzips the
XLSX container by walking the central directory and `inflateRawSync`-ing entries
(unzipFiles:241), reads sharedStrings, and converts the first worksheet to
delimited text; the `.xls` Excel-HTML path converts `<table>` rows. Tests at
bank-statement.test.ts:75 and :87 exercise both. This is real, not a stub.
BUT see MAJOR-1 (comma-join corruption) — the reconstruction is lossy. Legacy
binary BIFF `.xls` remaining unsupported is acceptable for v1 (the friendly
"empty-statement" path would handle it IF error handling were correct — see
MAJOR-2).

### FIX 2 — parser rowNumber validated against normalized rows (claimed major) — CORRECT
service.ts:84 builds `validRowNumbers = new Set(rows.map(r => r.rowNumber))` and
service.ts:92 counts any draft whose `rowNumber` is undefined or not in the set
as `failed` before any lookup/insert. service.test.ts:97 covers a hallucinated
row 999 and an undefined sourceRef. Genuine and correctly tested.

### FIX 3 — parse-failure test asserts input_event/parser_run preservation (claimed minor) — CORRECT
service.test.ts:112 spies on `inputEvents.create` and `parserRuns.create`,
asserts exactly one event id, `runStatuses === ["failed"]`, and zero items.
Genuine.

---

## Findings

### MAJOR-1 — XLSX/HTML reconstruction joins cells with "," and never quotes, corrupting cells that contain commas
File: src/domain/bank-statement.ts:287 (worksheet) and :235 (html)
Evidence: `worksheetXmlToDelimited` emits each row as
`cells.map((value) => value ?? "").join(",")` and `htmlTableToDelimited` does
`...map(cell => xmlText(cell[1]).trim()).join(",")`. The reconstructed text is
then re-parsed by `parseDelimitedLine` with a delimiter chosen by frequency,
which will be `","`. Any cell value containing a comma — extremely common in
Ukrainian payment descriptions/merchants (their own CSV test uses the quoted
value `"АТБ, маркет"`), and in comma-decimal amount strings like `2000,00`
(used in the privatbank test) — injects an extra delimiter. That shifts every
subsequent column right, so `valueAt` reads the wrong cell: the amount/currency
get misread or `looksLikeAmount` fails and the row is silently dropped
(data loss) or saved with a wrong amount/description. Note the CSV path is safe
because real bank CSVs quote such fields and `parseDelimitedLine` honors quotes —
but the new XLSX/HTML path strips that protection.
Suggestion: join reconstructed rows with a tab (`"\t"`) instead of `","`
(tabs effectively never appear in these cells, and `chooseDelimiter` will then
select tab), or quote/escape each cell on the comma path.

### MAJOR-2 — `statementBytesToText` runs outside the action's try/catch, so a malformed XLSX upload throws an uncaught BankStatementError → 500
File: app/imports/bank/actions.ts:57-61
Evidence: `const rawText = statementBytesToText({...})` is called between
`readFile` (line 50) and the `try {` at line 65. `statementBytesToText` can throw
`BankStatementError` ("Invalid XLSX workbook." at bank-statement.ts:244,
"Workbook has no worksheet." at :144). A user uploading a truncated/corrupt
.xlsx, or any non-zip file renamed to `.xlsx` (passes the extension/mime gate in
`assertSupportedBankFile`), reaches `unzipFiles`, finds no EOCD signature, and
throws. Because this is outside the `catch` (which only wraps `importStatement`),
the error is never converted to `redirect(.../?formError=...)` and surfaces as a
Next.js 500 — directly contradicting the eval rubric "not a generic 500"
(evals/cases/bank-imports.eval.ts:54).
Suggestion: move the `statementBytesToText(...)` call inside the try/catch (or
add its own try) so `BankStatementError` redirects to the friendly
`file-invalid`/`empty-statement` message.

### MINOR-1 — `skipped` count is computed but dropped from the user-facing summary
File: app/imports/bank/actions.ts:83
Evidence: the redirect is `/ledger?imported=${summary.created}&failed=${summary.failed}`;
`summary.skipped` is never surfaced. Harmless for first imports (skipped is
always 0 there) but means a retry — if it were ever wired to UI — would silently
hide that rows were already present. Confidence: low.
Suggestion: include `skipped` in the summary handoff if/when retry is exposed.

### MINOR-2 — retry path implemented but unreachable; `file.text()` always computed even for XLSX
File: src/modules/bank-imports/service.ts:61 / app/imports/bank/actions.ts:57-61
Evidence: `retryInputEvent` exists and is unit-tested but is not wired to any
route/action, so FR-PARSE-08/FR-ITEM-07 retry is not user-reachable in this
slice (acceptable if explicitly deferred). Separately, the action always awaits
`file.text()` for the `textFallback`, decoding XLSX binary as UTF-8 needlessly;
minor waste, not a defect. Confidence: low.

---

## Checks run
- `npx tsc --noEmit`: clean.
- `vitest run` on bank-statement.test.ts, service.test.ts, import-bank-action.test.ts:
  20 passed. Note: the suites do not cover a cell-with-comma XLSX/HTML row
  (MAJOR-1) nor a malformed-XLSX upload through the action (MAJOR-2).

---

## Confirmation pass

Reviewer: code-reviewer (maker≠checker confirmation after fixes)
Date: 2026-06-29
Method: re-read `git diff HEAD`/`git status`, traced both fixed paths in
`src/domain/bank-statement.ts` and `app/imports/bank/actions.ts`, inspected the
new/expanded tests, ran `npx tsc --noEmit` (clean) and the targeted vitest
suites (28/28 pass across bank-statement, both action suites, and bank-imports).

### Verdict: APPROVE

Both previously-blocking majors are genuinely resolved, not papered over.

- MAJOR-1 (RESOLVED): `worksheetXmlToDelimited` (bank-statement.ts:312) and
  `htmlTableToDelimited` (:244) now join cells with `"\t"` and strip stray tabs
  from cell text (`.replace(/\t/g, " ")`). Because `chooseDelimiter` keys off the
  reconstructed header line (tabs > commas), tab is selected and comma-bearing
  cells survive re-parsing. Two new regression tests assert `"АТБ, маркет"`
  stays intact through both the HTML `.xls` path (test:100) and the XLSX
  worksheet path (test:113), each verifying the amount column did not shift.

- MAJOR-2 (RESOLVED): `statementBytesToText` is now invoked inside the action's
  try/catch (actions.ts:61), and the function itself wraps the xlsx branch in
  try/catch, re-throwing `BankStatementError` and mapping any other throw to
  `BankStatementError("file-invalid")` (bank-statement.ts:147-152). The EOCD-miss
  (:262) and no-worksheet (:145) throws are now `file-invalid`. New action test
  (import-bank-action.redirect.test.ts:75) asserts a corrupt `.xlsx` redirects to
  `?formError=file-invalid` and the parser is never invoked; the domain test
  (bank-statement.test.ts:128) asserts the function throws `BankStatementError`
  rather than a raw error. No uncaught-throw path remains for a bad upload that
  clears `assertSupportedBankFile`.

- Zip-bomb cap (PRESENT): `unzipFiles` (bank-statement.ts:259) skips every entry
  not matching `NEEDED_XLSX_ENTRY` (`xl/sharedStrings.xml`, `xl/worksheets/sheetN.xml`)
  via `continue` at :275, and bounds each inflate with
  `inflateRawSync(compressed, { maxOutputLength: MAX_XLSX_ENTRY_BYTES })` (:282),
  also clamping the stored (method 0) path. A crafted workbook cannot force
  inflation of unrelated or oversized payloads.

No new blocking issue was introduced by the fixes. Sparse-cell handling in
`worksheetXmlToDelimited` preserves column position correctly (array holes join
as empty fields). The previously-noted minors (skipped count not surfaced;
`retryInputEvent` not route-wired; redundant `file.text()` for XLSX) remain and
are explicitly deferred per the confirmation request — not re-raised as blockers.

Checks run this pass:
- `npx tsc --noEmit`: clean (exit 0).
- `vitest run` (bank-statement, import-bank-action, import-bank-action.redirect,
  bank-imports): 28 passed across 5 files.
