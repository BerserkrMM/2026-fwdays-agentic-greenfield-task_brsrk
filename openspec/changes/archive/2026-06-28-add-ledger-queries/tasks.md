## 1. Read framework docs & set conventions

- [x] 1.1 Re-read the Next.js 16 data-fetching guide (`node_modules/next/dist/docs/01-app/01-getting-started/06-fetching-data.md`) — server-component DB reads + `Promise.all` parallelism — before touching the accounts page (AGENTS.md: this is not the Next you remember).
- [x] 1.2 Confirm ledger conventions: framework-free compute in `src/domain/`, query behavior in `src/modules/ledger/`, persistence only behind `src/db` (TC-MOD-01, TC-PURE-01, TC-STACK-04); `ledger_items` is the only balance source (FR-LEDGER-05).

## 2. Ledger query contracts (TC-PURE-01)

- [x] 2.1 Add `src/domain/ledger-query.ts`: `AccountBalance`, `LedgerAggregates`, `CategoryTotal` types and the pure computations `computeOverallBalance`, `computeAccountBalances`, `computeAccountBalance`, `computeAggregates`, `computeCategoryTotals` — inclusion via `affectsBalance` (FR-LEDGER-02), one canonical summation (FR-LEDGER-05).
- [x] 2.2 Add `formatUahMinor` to `src/domain/money.ts` (pure UAH/Ukrainian formatting for balance display).
- [x] 2.3 Add `LedgerQueryPort` to `src/domain/ports.ts` and the `listNonDeleted()` read primitive to `LedgerItemRepository`; export the ledger query surface from `src/modules/ledger/ports.ts`.

## 3. Failing tests first (red) — every file carries `@trace FR-LEDGER-*`

- [x] 3.1 `src/domain/ledger-query.test.ts`: pending + approved count, deleted excluded (FR-LEDGER-02); per-account and overall balance (FR-LEDGER-03); income/expense aggregates by sign (FR-LEDGER-04); category totals by raw text (FR-LEDGER-04); a non-deleted item for any account id is counted regardless of account state.
- [x] 3.2 `src/modules/ledger/service.test.ts`: `LedgerQueryService` over the in-memory repo returns correct overall/per-account/aggregate/category results and excludes deleted (FR-LEDGER-02/03/04/05).
- [x] 3.3 `src/modules/ledger/ledger.smoke.test.ts`: boundary smoke through `getRepositories()` — seed + create accounts, create items via the item-creation path, **archive** an account, assert its items still contribute to per-account and overall balance (FR-ACCT-02, FR-ACCT-05 regression, FR-LEDGER-05).
- [x] 3.4 Run `npm run test:run` and confirm the new specs FAIL for the right reason (behavior asserted, code absent); save `evidence/red-run.json` (command, non-zero exitCode, gitHead, timestamp, failingTests).

## 4. Implement the read side (green)

- [x] 4.1 `src/db/memory.ts`: `MemoryLedgerItemRepository.listNonDeleted()`.
- [x] 4.2 `src/db/postgres.ts`: `PgLedgerItemRepository.listNonDeleted()` (`SELECT * FROM ledger_items WHERE status <> 'deleted'`).
- [x] 4.3 `src/modules/ledger/service.ts`: `LedgerQueryService implements LedgerQueryPort` over the repository + domain computations.
- [x] 4.4 Make the red tests from §3 pass without weakening them.

## 5. Close FR-ACCT-02 in the accounts screen

- [x] 5.1 `app/accounts/page.tsx`: construct `LedgerQueryService`, fetch `getAccountBalances()` in parallel with the account list, show each account's real balance via `formatUahMinor`; replace the "balance appears later" hint.
- [x] 5.2 `src/modules/accounts/ui/accounts-content.ts`: add the balance label copy; keep the eval-read fields unchanged. Ensure no `"use client"` file imports the DB boundary (the structural test guards this).

## 6. Validation, evidence, review & archive

- [x] 6.1 Battery: `npm run lint`, `npx tsc --noEmit`, `npm run test:run`, `npm run test:coverage`, `node scripts/check-coverage-ratchet.mjs`, `npx openspec validate --all --strict`, `npm run check:trace`, `npm run check:red-green -- --slice add-ledger-queries --strict`; save `evidence/green-run.json`.
- [x] 6.2 Maker≠checker review (fresh code + security + spec-compliance reviewers) over the diff; raw outputs under `reviews/`, summary in `review-findings.json` (`clean: true` only after confirmed issues fixed, with `rawEvidence` links). Record the no-eval rationale (`eval-decision.md`) and the trajectory-eval waiver.
- [x] 6.3 `npm run check:handoff`, `npm run check:claims`, `node scripts/check-trajectory.mjs`.
- [x] 6.4 Archive: `npx openspec archive add-ledger-queries --yes`; regenerate trace + trajectory; `npm run slice:report -- --slice add-ledger-queries --write`; update `docs/current-state.md` last.
- [x] 6.5 Commit with trailers — `Slice: add-ledger-queries` + `Refs: FR-LEDGER-02, FR-LEDGER-03, FR-LEDGER-04, FR-LEDGER-05, FR-ACCT-02`. Run fallow audit; push; open PR to `dev`.
