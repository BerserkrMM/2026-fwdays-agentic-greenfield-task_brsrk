# Security reviewer — add-ledger-items-review (fresh, maker≠checker)

Verdict: **PASS** with two minor/informational notes. No critical or major findings.
Reviewed the full `git diff dev..HEAD` plus the boundary test and DB client.

## PASS items (verified)
- **SQL injection — clean.** New `postgres.ts` `listAll()` (178–186) takes no user
  input (static tagged template). `update()` (191–199) and `findById()` use only
  `${...}` bound parameters of the `postgres` tagged-template client; no
  `sql.unsafe()` / string-built SQL touches user input. (`ensureSchema` unsafe DDL
  reads a static bootstrap.sql, pre-existing, out of slice.)
- **Unhandled-500 from hand-crafted POST — clean.** Every malformed-input path →
  a `LedgerItemError` mapped to the `?formError=` banner:
  - item id: `service.ts:43-50` UUID-guards before any DB call → unknown → not-found.
  - accountId: `service.ts:53-61` UUID-guards then rejects missing/archived → account-not-found.
  - amount: `ledger-item-edit.ts:48-59` rejects non-numeric/zero/negative/over-precise → amount-invalid (a multipart File coerces to "[object File]" and is rejected too).
  - date: `ledger-item-edit.ts:82-85` → date-required.
  - limit/from/to: `page.tsx:49,57-65` only set when finite/valid; `ledger-filter.ts:85` `Math.max(1, …)`.
- **Open-redirect — clean.** `actions.ts:26` redirects to fixed `/ledger?formError=${encodeURIComponent(error.code)}`; `code` is a closed domain enum, encoded, in query position; cannot rewrite the path. Success → literal `/ledger`.
- **Client/server boundary (TC-STACK-02/04) — clean.** `page.tsx` is a server
  component; DB only via `getRepositories()`; mutations via `"use server"`
  actions; copy module is type-only. Structural test `no-client-db-import.test.ts`
  + `import "server-only"` in `db/client.ts` enforce it.
- **Mass-assignment / provenance — clean.** `editLedgerItem` spreads then
  overwrites only six editable fields; `status` preserved (not settable from the
  edit form); `amountMinor` recomputed server-side from `type`. Pg `update()` sets
  only mutable columns; provenance (input_event_id/parser_run_id/import_row_number/
  currency/created_at) untouched. Status changes only via approve/delete actions.
- **XSS — clean.** Item-derived strings render as escaped JSX children; no
  dangerouslySetInnerHTML; no CSV/file/download handler in this slice.
- **Secrets — clean.** No secrets/NEXT_PUBLIC introduced; non-domain errors
  rethrown to Next's generic handler with no internal detail leaked.

## Minor / informational (accepted)
1. **Unbounded full-table read on every render (v1 scalability).**
   `postgres.ts:178-186` (consumers `page.tsx:103`, `service.ts:34-36`):
   `listAll()` is `SELECT * FROM ledger_items` with no LIMIT/WHERE; in-memory
   filter/paginate; "load more" re-reads the whole table each time. Harmless for
   single-user v1; track for v2 — push LIMIT/WHERE (or keyset) into SQL, or cap
   the row count. (Matches design D1's documented v1 read-all-and-fold risk.)
2. **No auth on mutating server actions (BC-SCOPE-01).**
   `actions.ts:34-56`: edit/approve/delete have no authz — correct for single-user
   no-auth v1. Recorded so it is not silently assumed safe once auth lands (then
   add ownership/session guard + re-verify CSRF/Origin on server-action POSTs).

Scope reviewed: app/ledger/{actions,page}.tsx, src/modules/ledger-items/{service.ts,ui/ledger-content.ts},
src/db/{postgres,memory}.ts, src/domain/{ledger-item-edit,ledger-filter,ports}.ts, src/db/no-client-db-import.test.ts.
