## 1. Read framework docs & set conventions

- [x] 1.1 Re-read the Next.js 16 forms/server-actions guide (`node_modules/next/dist/docs/01-app/02-guides/forms.md`) and `revalidatePath`/`redirect` API refs before writing the UI (AGENTS.md: this is not the Next you remember).
- [x] 1.2 Confirm the accounts module conventions: framework-free domain in `src/domain/`, behavior in `src/modules/accounts/`, persistence only behind `src/db` (TC-MOD-01, TC-PURE-01, TC-STACK-04).

## 2. Accounts domain contracts (TC-PURE-01)

- [x] 2.1 Add `src/domain/account.ts`: framework-free `Account` (`id`, `name`, `currency: "UAH"`, `isDefault`, `archivedAt: Date | null`, `createdAt`) and `NewAccount`; the seed name constant `Готівка`; **no balance field** (FR-ACCT-06, FR-LEDGER-05).
- [x] 2.2 Add pure validation + invariants: `validateAccountName` (trim, non-empty, max length), `isArchived`, archive-guard predicates (`isDefault`, last-active) and the typed errors (`AccountValidationError`, `AccountNotFoundError`, `CannotArchiveDefaultAccountError`, `CannotArchiveLastActiveAccountError`).
- [x] 2.3 Add the `AccountRepository` port to `src/domain/ports.ts` and to the shared `Repositories` interface; re-export the accounts port surface from `src/modules/accounts/ports.ts`.

## 3. Failing tests first (red) — every file carries `@trace FR-ACCT-*`

- [x] 3.1 `src/domain/account.test.ts`: pure validation + archive-guard invariants (empty/whitespace name rejected, default/last-active cannot archive, UAH only).
- [x] 3.2 `src/modules/accounts/service.test.ts`: seed default exists & resolves (FR-ACCT-06, FR-ITEM-06); list shows exactly one default (FR-ACCT-01); create + switch default keeps the single-default invariant (FR-ACCT-04); rename persists, currency stays UAH (FR-ACCT-03); archive hides from active list but keeps items, and rejects default/last-active (FR-ACCT-05).
- [x] 3.3 `src/modules/accounts/accounts.smoke.test.ts`: boundary smoke through `getRepositories()` (in-memory fallback) — seed → create → switch default → archive guard end-to-end.
- [x] 3.4 Author `evals/cases/accounts.eval.ts` (1 case): grades the Ukrainian-first clarity of the archive-rejection messages + default-account labelling, reading the real copy module.
- [x] 3.5 Run `npm run test` and confirm the new specs FAIL for the right reason (behavior asserted, code absent).

## 4. DB boundary — coordination change (TC-MOD-02)

- [x] 4.1 `src/db/bootstrap.sql`: add the `accounts` table (UAH CHECK, non-empty name CHECK, `is_default boolean`, `archived_at timestamptz`), the `ux_accounts_single_default` partial-unique index, and the deferred `ledger_items.account_id` FK via an idempotent `DO` block.
- [x] 4.2 `src/db/rows.ts` + `src/db/mappers.ts`: `AccountRow`, `toAccount`, `fromAccount`.
- [x] 4.3 `src/db/memory.ts`: `MemoryAccountRepository` (single-default maintained on write) added to `createInMemoryRepositories()`.
- [x] 4.4 `src/db/postgres.ts`: `PgAccountRepository` (atomic `setDefault` in a transaction) added to `createPostgresRepositories()`.

## 5. Accounts service + actions (green)

- [x] 5.1 `src/modules/accounts/service.ts`: `AccountsService` implementing `AccountsPort` (`getDefaultAccountId`) + use-cases (list, create, rename, setDefault, archive, `ensureSeededDefault`) enforcing the invariants from §2.
- [x] 5.2 `src/modules/accounts/ui/accounts-content.ts`: single source of truth for Ukrainian-first copy + the error-surface messages (shared by the page, tests, and the eval case).
- [x] 5.3 `app/accounts/actions.ts` (`"use server"`): create / set-default / rename / archive server actions — validate, mutate via the service, `revalidatePath('/accounts')` on success, `redirect('/accounts?formError=<code>')` on rejection (no raw 500).
- [x] 5.4 Make the red tests from §3 pass without weakening them.

## 6. Accounts screen (FR-ACCT-01/03/04/05/06, NFR-I18N-01, NFR-A11Y-01)

- [x] 6.1 Replace the `/accounts` placeholder with a server-component screen: list of active accounts with the default clearly marked, create form, per-account set-default + rename + archive controls, calm `fin-*` styling, accessible labels.
- [x] 6.2 Wire the reusable inline error-surface banner reading `searchParams.formError`; reuse the shared state primitives (empty/error) — never a blank or 500 page.
- [x] 6.3 Ensure no `"use client"` file imports the DB boundary (TC-STACK-02) — the structural test already guards this repo-wide.

## 7. Validation, evidence & archive

- [x] 7.1 Battery: `npm run lint`, `npx tsc --noEmit`, `npm run test`, `npm run build`, `npx openspec validate add-accounts --strict`, `npm run check:trace` (0 failures).
- [x] 7.2 Boundary smoke (§3.3) green; review-gate (code + security + spec-compliance) over the diff, fix confirmed findings, re-run the battery.
- [x] 7.3 Grade the eval case with a fresh `eval-judge`; record the result and ratchet `quality/eval-baseline.json`.
- [x] 7.4 Update `docs/current-state.md`; archive: `npx openspec archive add-accounts --yes`, then `npx openspec validate --all --strict`, `node scripts/check-traceability.mjs`, `node scripts/check-trajectory.mjs`.
- [x] 7.5 Commit with trailers — `Slice: add-accounts` + `Refs: FR-ACCT-01, FR-ACCT-03, FR-ACCT-04, FR-ACCT-05, FR-ACCT-06, FR-ITEM-06`.
