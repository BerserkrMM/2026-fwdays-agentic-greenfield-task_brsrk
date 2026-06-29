## 1. Read framework docs & set conventions

- [x] 1.1 Re-confirm the Next.js 16 server-component + Server Actions conventions used by the working `app/accounts/page.tsx` + `actions.ts` (async `searchParams: Promise`, `"use server"`, `revalidatePath`/`redirect`, `export const dynamic`) — AGENTS.md: this is not the Next you remember.
- [x] 1.2 Confirm ledger-items conventions: framework-free filter/mutation logic in `src/domain/`, use-cases in `src/modules/ledger-items/`, persistence only behind `src/db` (TC-MOD-01, TC-PURE-01, TC-STACK-04); never recompute balances (FR-LEDGER-05).

## 2. Domain contracts (TC-PURE-01)

- [x] 2.1 `src/domain/ledger-filter.ts`: `LedgerFilter` criteria + `selectLedgerPage(items, criteria)` — combinable filters (status/type/account/category/date-range), case-insensitive description search, newest-first by `occurredAt ?? createdAt` (id tiebreak), cumulative pagination → `{ items, total, matched, hasMore }` (FR-ITEM-01, FR-ITEM-02).
- [x] 2.2 `src/domain/ledger-item-edit.ts`: `LedgerItemError` + codes; `parseAmountToMinor`; `editLedgerItem` (description/amount/date/account/category validation; signed amount from type; approved stays approved; deleted not editable — FR-ITEM-03, FR-CAT-01/03); `approveLedgerItem` (pending→approved only — FR-ITEM-04); `deleteLedgerItem` (→deleted, idempotent — FR-ITEM-05).
- [x] 2.3 Add `listAll()` and `update(item)` to `LedgerItemRepository` in `src/domain/ports.ts`; export the ledger-items surface from `src/modules/ledger-items/ports.ts`.

## 3. Failing tests first (red) — every file carries `@trace FR-ITEM-*`/`FR-CAT-*`

- [x] 3.1 `src/domain/ledger-filter.test.ts`: status/type/account/category/date filters combine; description search is case-insensitive; newest-first by effective date with id tiebreak; cumulative pagination + `hasMore` (FR-ITEM-01, FR-ITEM-02).
- [x] 3.2 `src/domain/ledger-item-edit.test.ts`: valid edit persists + sign matches type; approved stays approved; deleted not editable; empty description / bad amount / missing date rejected; blank category → `Без категорії`; approve only from pending; delete idempotent (FR-ITEM-03/04/05, FR-CAT-01/03).
- [x] 3.3 `src/modules/ledger-items/service.test.ts`: `LedgerItemsService` over the in-memory repo — list a filtered page, edit (incl. account switch validation), approve, delete; rejects unknown id and archived account (FR-ITEM-01/02/03/04/05).
- [x] 3.4 `src/modules/ledger-items/ledger-items.smoke.test.ts`: boundary smoke through `getRepositories()` — create items via the item-creation path, list/filter, edit, approve, delete; assert a deleted item drops from the balance fold but stays in `listAll` as a log (FR-ITEM-05, FR-LEDGER-05).
- [x] 3.5 Run `npm run test:run`; confirm the new specs FAIL for the right reason (behavior asserted, code absent); save `evidence/red-run.json` (command, non-zero exitCode, gitHead, timestamp, failingTests).

## 4. Implement (green)

- [x] 4.1 `src/db/memory.ts`: `MemoryLedgerItemRepository.listAll()` + `update()`.
- [x] 4.2 `src/db/postgres.ts`: `PgLedgerItemRepository.listAll()` (`SELECT * ... ORDER BY occurred_at DESC NULLS LAST, created_at DESC, id DESC`) + `update()` (full-row update).
- [x] 4.3 `src/modules/ledger-items/service.ts`: `LedgerItemsService` (listPage, editItem, approveItem, deleteItem) over the repos + domain functions.
- [x] 4.4 Make the red tests from §3 pass without weakening them.

## 5. `/ledger` review screen (FR-SHELL-03, TC-STACK-02)

- [x] 5.1 `src/modules/ledger-items/ui/ledger-content.ts`: Ukrainian-first screen copy + `LEDGER_ITEM_ERRORS` map + `ledgerErrorMessage(code)`.
- [x] 5.2 `app/ledger/actions.ts`: `editItemAction`, `approveItemAction`, `deleteItemAction` (server-only; inline `?formError=` surface; `revalidatePath`).
- [x] 5.3 `app/ledger/page.tsx`: server component — filter/search GET form, status-tagged rows (amount/category/account/date), inline edit form per item, approve + delete actions, "load more" link, the six shared states. No `"use client"` imports the DB boundary (the structural test guards this).

## 6. Eval (qualitative copy / error surface)

- [~] 6.1 `evals/cases/ledger-items.eval.ts` authored; `produce()` reads the real `ledger-content.ts` copy + `LEDGER_ITEM_ERRORS`; produced output saved under `reviews/eval-produced-output.txt`. GRADING PENDING — the fresh `eval-judge` (maker≠checker) was blocked by the session limit; `evals/results/latest.json` + `quality/eval-baseline.json` intentionally left unchanged (no fabricated score).

## 7. Validation, evidence, review & archive

- [x] 7.1 Battery: `npm run lint`, `npx tsc --noEmit`, `npm run test:run`, `npm run test:coverage`, `node scripts/check-coverage-ratchet.mjs`, `npx openspec validate --all --strict`, `npm run check:trace`, `npm run check:red-green -- --slice add-ledger-items-review --strict`; save `evidence/green-run.json`.
- [ ] 7.2 Maker≠checker review (fresh code + security + spec-compliance reviewers + eval-judge) over the diff; raw outputs under `reviews/`, summary in `review-findings.json` (`clean: true` only after confirmed issues fixed, with `rawEvidence` links). Record the trajectory-eval waiver.
- [x] 7.3 `npm run check:handoff`, `npm run check:claims`, `node scripts/check-trajectory.mjs`.
- [ ] 7.4 Archive: `npx openspec archive add-ledger-items-review --yes`; regenerate trace + trajectory; `npm run slice:report -- --slice add-ledger-items-review --write`; update `docs/current-state.md` last.
- [ ] 7.5 Commit with trailers — `Slice: add-ledger-items-review` + `Refs: FR-ITEM-01, FR-ITEM-02, FR-ITEM-03, FR-ITEM-04, FR-ITEM-05, FR-CAT-01, FR-CAT-03`. Run fallow audit; push; open PR to `dev`.
