# Design — add-ledger-items-review

## Context

Foundation owns the `ledger_items` schema and the item-creation write contract;
`ledger` owns the balance/aggregate read side (`listNonDeleted` + folds). This
slice adds the **review surface** the `ledger-items` capability owns. It must not
recompute balances (FR-LEDGER-05) and must keep domain logic framework-free
(TC-PURE-01), persistence behind the shared boundary (TC-STACK-04), and only the
owning module + its `/ledger` route changed (TC-MOD-01), with the two new
`LedgerItemRepository` methods as the one Foundation-boundary coordination touch
(TC-MOD-02).

## Decisions

### D1 — Read-all-and-fold for the list (consistent with ledger queries)

The list reads **all** items (`listAll()`) and filters / sorts / paginates in the
framework-free domain, mirroring the `ledger` read side's deliberate
read-all-and-fold (its design D1). v1 is single-user and local
(BC-SCOPE-01), so an unindexed full read is acceptable and keeps the filter/sort
logic pure and unit-testable in `src/domain/ledger-filter.ts`. The
`selectLedgerPage(items, criteria)` shape lets a future slice push filtering into
SQL without changing callers. Unlike `listNonDeleted`, `listAll` returns
**`deleted` items too**, because the journal shows them as a log (FR-ITEM-01/05).

### D2 — Newest-first by effective date (`occurredAt ?? createdAt`)

FR-ITEM-01 sorts newest-first by `occurred_at`, but the Foundation creation
contract may persist a `null` `occurred_at` (it defaults only when a draft date is
absent at the channel layer, which does not exist yet). The sort therefore orders
by the **effective date** `occurredAt ?? createdAt`, with `id` as a deterministic
tiebreak, so ordering is stable even before the channels populate `occurred_at`.
The edit path makes `occurred_at` mandatory (D4), so user-touched items always
carry a real date.

### D3 — Cumulative pagination via a growing `limit` (server-only, no client JS)

"Incremental loading" (FR-ITEM-01) is a server-component GET: the page shows the
first `limit` matched items (default 10) and "Завантажити ще" is a link to the
same URL with `limit + 10`, preserving the active filters. `selectLedgerPage`
returns `hasMore` so the button only renders when more rows match. No client
state, no `"use client"` on the screen — the DB boundary never enters a client
bundle (TC-STACK-02, guarded by the existing structural test).

### D4 — Edit derives the signed amount from an absolute value + type

The edit form takes an **absolute** amount (e.g. `200,50`) plus the operation type
(`expense` / `income`); the domain produces signed `amount_minor` (expense < 0,
income > 0) so the stored sign always matches `type` and the DB sign CHECK holds.
`editLedgerItem` validates: non-empty description, a parseable positive amount,
mandatory `occurred_at` (empty → `date-required`), and category default
(`Без категорії` when blank — FR-CAT-01/03). Editing an `approved` item returns it
still `approved` (FR-ITEM-03); deleted items are not editable. Amount parsing
accepts `.`/`,` decimals and ASCII/space grouping, rejecting non-numeric input
with `amount-invalid` rather than a raw 500.

### D5 — Status transitions are pure and explicit

`approveLedgerItem` only moves `pending` → `approved` (approving a non-pending
item is `invalid-status`); `deleteLedgerItem` sets `deleted` and is idempotent
(deleting a deleted item is a no-op). Both return a new item; the service persists
via `repo.update`. Balances need no change — `listNonDeleted` already excludes
`deleted` (FR-ITEM-05 falls out of the existing fold), and the smoke test pins
that a deleted item drops from the balance but remains in `listAll` as a log.

### D6 — Account switch on edit is validated against active accounts

FR-ITEM-03 allows changing the item's account. The edit form's dropdown offers
only active accounts; the service still validates the chosen id is a real active
account (UUID guard + `findById` + not archived) and otherwise raises
`account-not-found`, so a hand-crafted POST cannot assign a bogus/archived account
or trigger a Postgres uuid 500 — mirroring the accounts service hardening.

## Error surface

Server actions follow the established inline pattern: a rejected mutation
redirects to `/ledger?formError=<code>` and the screen renders the shared
`ErrorState` banner with Ukrainian copy from `ledger-content.ts`; success
`revalidatePath`s and returns to a clean URL. Stable `LedgerItemError` codes:
`not-found`, `invalid-status`, `description-required`, `amount-invalid`,
`date-required`, `account-not-found`.

## Alternatives considered

- **Client-side filter/pagination state** — rejected; it would pull data handling
  into a client component and risks importing the DB boundary. Server GET +
  growing `limit` is simpler and keeps the boundary server-only.
- **Push filter/sort into SQL now** — deferred; read-all-and-fold matches the
  existing ledger design and keeps the logic pure/testable for v1's data sizes.
- **Including FR-ITEM-04 batch creation / FR-ITEM-07 retry here** — deferred; both
  need the not-yet-built `parsing` capability and channels, so building them now
  would be unused code (see proposal Scope).

## Risks

- **`occurred_at` null before channels exist** — mitigated by D2's effective-date
  sort; the edit path enforces a real date afterward.
- **No UI-driven item source yet** — until the channels land, `/ledger` is empty
  in the running app; the empty state (FR-SHELL-03) covers it and the behavior is
  pinned by unit + smoke tests rather than a recording (a later QA phase).
