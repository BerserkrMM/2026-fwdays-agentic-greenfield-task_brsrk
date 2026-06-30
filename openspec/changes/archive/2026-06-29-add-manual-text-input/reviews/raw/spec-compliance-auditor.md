# Spec-compliance audit — add-manual-text-input

`openspec validate add-manual-text-input --strict` passes. All six MODIFIED
requirements map to FR-TEXT-01..05 owned by `manual-input`. Spec delta correctly
uses `## MODIFIED Requirements` and headers match the backfilled baseline exactly.

## Scenario-by-scenario: 7 implemented, 0 partial, 0 missing, 0 contradicted

1. Form accepts user text — implemented (`page.tsx:54-80` form+textarea; UA copy).
2. Empty/whitespace rejected, no input_event — implemented (`manual-text.ts:30-36` throws before `inputEvents.create`; `actions.ts:41-43` → `?formError=empty-text`).
3. Stored source `text`, original preserved before normalization (NFR-PRIV-02) — implemented (`service.ts:41-47` rawText=original; `service.test.ts:40-46`).
4. Source-normalized, passed to parser kind `text` — implemented (`service.ts:49-52`; `service.test.ts:56-69`).
5. Drafts → pending items via item-creation contract; partial-success, no rollback — implemented (`service.ts:54-67`; `item-creation.ts` status pending + parserRunId; `service.test.ts:87-103`).
6. Parse failure → UA error + retry; input_event & failed parser_run preserved — implemented (`parsing/service.ts:45-56` records failed run before re-throw; `actions.ts:44-47`; `page.tsx:37-52` retry link; `service.test.ts:108-144`).
7. Redirect to Ledger with created/failed summary, items visible — implemented (`actions.ts:51-52`; `ledger/page.tsx` parseImportSummary + StateView banner).

## Findings (all minor, no fix required)
1. Default-account seeding in the text action (FR-ACCT-06/FR-ITEM-06 territory) is **documented** drift (proposal.md:29), idempotent — not silent. Accepted.
2. The ledger banner `failed` count reflects per-draft *creation* failures only; a *parse* failure redirects back to `/imports/text`, not `/ledger`. Consistent with the delta wording and FR-TEXT-05 — not a contradiction. Informational.
3. tasks.md honesty: accurate; all referenced artifacts exist. `ui/manual-input-content.test.ts` is extra coverage beyond what task 2.3 lists (not a gap).
