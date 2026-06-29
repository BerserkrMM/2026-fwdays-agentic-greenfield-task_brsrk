# Security review — add-manual-text-input

## Verdict: PASS (no Critical/Major)

Fresh independent security reviewer over `git diff dev..HEAD` plus the dependencies the new code calls into.

- **Injection (SQL/template) — CLEAN.** All DB writes/reads go through parameterized tagged templates in `src/db/postgres.ts` (`PgInputEventRepository.create` binds `event.rawText`; `PgLedgerItemRepository.insert` binds description/category). Only `sql.unsafe()` is `ensureSchema` reading a static `bootstrap.sql` (no user input).
- **Server-only boundary (TC-STACK-02) — CLEAN.** `src/db/client.ts` imports `server-only`; page is a server component; `actions.ts` is `"use server"`. Client components do not import the DB client; `no-client-db-import.test.ts` enforces it.
- **Secrets hygiene (OPENAI_API_KEY) — CLEAN.** Read only server-side in `adapters.ts`, sent as `Authorization: Bearer`, never logged/echoed into error messages, no `NEXT_PUBLIC_`. `.env*` gitignored; no tracked env files.
- **Redirect / query-param handling — CLEAN.** Error code wrapped in `encodeURIComponent`; success redirect interpolates server-side integer counters only. Read side validates with `/^\d+$/` and maps codes to a fixed Ukrainian set; values rendered via React-escaped JSX. No open-redirect / reflected XSS.
- **Error-message leakage — CLEAN.** `ParsingError` redirects with the static `parse-failed` code; the adapter/parser internal message is persisted only server-side on `parser_run.error`, never surfaced. No raw 500 for validation/parse cases.
- **Mass-assignment — CLEAN.** `createPendingItem` maps each field explicitly; `status` hardcoded `pending`; account resolved server-side; form carries only `text`. Drafts validated by `canonicalizeDraft` first.
- **DoS / unbounded input — ACCEPTABLE.** No input size cap by product decision (single-user local, BC-SCOPE-01). Adapter has a 30s AbortController timeout armed through `response.json()`.

### Minor (informational only)
- **Polynomial regex on uncapped input** — `src/domain/parsing.ts:64` phone-redaction pattern `/\+?\d[\d\s().-]{8,}\d/g` has worst-case quadratic backtracking; a multi-MB digit paste would spend noticeable CPU in `normalizeParserPayload`. Negligible for single-user local (no other tenant to starve); pre-existing parsing code, not introduced by this slice. Optional future guard: a soft length cap in `assertManualText`. Not required for current scope.
