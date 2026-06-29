## Why

`ledger_items` is the atomic financial row and the write path
(`ItemCreationService`) and read/balance side (`LedgerQueryService`) both exist —
but **there is no review surface**. `/ledger` is still the Foundation placeholder
screen, and `LedgerItemRepository` can only `insert`, `findById`, and
`listNonDeleted` (the balance fold). The user cannot see the journal, filter it,
or act on an item: there is no way to **list**, **filter/search**, **edit**,
**approve**, or **delete** a ledger item. Those are the review/write use-cases the
`ledger-items` capability owns, and every input channel (manual / bank / file,
slices 6–8) needs this screen as the place items land for review.

This slice delivers the `ledger-items` review surface: a real `/ledger` screen
that lists items newest-first with incremental pagination, a full filter + search
set, and per-item edit / approve / delete — all over a framework-free domain and
the shared DB boundary.

## What Changes

- **Ledger query domain (TC-PURE-01).** A framework-free `src/domain/ledger-filter.ts`
  with the filter criteria type and the **single** pure selection of a page —
  filter (status, type, account, category, `occurred_at` range), description
  search, newest-first sort by effective date (`occurredAt ?? createdAt`, id
  tiebreak), and cumulative pagination — returning `{ items, total, matched,
  hasMore }`.
- **Ledger item mutation domain (TC-PURE-01).** `src/domain/ledger-item-edit.ts`:
  `LedgerItemError` (+ stable codes), `editLedgerItem` (validates description,
  signed-amount-from-type, category default, mandatory `occurred_at`; editing an
  `approved` item keeps it `approved` — FR-ITEM-03), `approveLedgerItem`
  (`pending` → `approved` only — FR-ITEM-04), and `deleteLedgerItem`
  (→ `deleted`, idempotent — FR-ITEM-05). Only pending/approved items are
  editable; deleted items cannot be edited or approved.
- **Read/write repository primitives (coordination — TC-MOD-02).** Two methods on
  the Foundation-owned `LedgerItemRepository`: `listAll()` (every item, all
  statuses, for the journal/log view) and `update(item)`. Implemented on both
  backends behind the single DB boundary (in-memory + Postgres). No new table, no
  schema change beyond these reads/writes.
- **Ledger items service (TC-MOD-01).** `src/modules/ledger-items/` —
  `LedgerItemsService` (list a filtered page, edit, approve, delete) over the
  ledger-item + account repositories and the domain functions. Account switching
  on edit is validated against active accounts.
- **`/ledger` screen (TC-STACK-02, FR-SHELL-03).** A server-component journal:
  filter/search form (GET, preserves filters), status-tagged rows with amount /
  category / account / date, an inline edit form per item, approve and delete
  actions, incremental "load more", and the six shared screen states
  (Ukrainian-first copy in `src/modules/ledger-items/ui/ledger-content.ts`).
- **Tests-first.** Pure-domain unit tests (filter/sort/paginate; edit/approve/
  delete transitions + validation), a service test over the in-memory repo, and a
  boundary smoke flow through `getRepositories()` (create items, filter, edit,
  approve, delete; assert deleted items leave the balance and stay in the log).
  Plus an eval case grading the Ukrainian error-surface / empty-state copy.

## Scope

**In (owned, delivered this slice):** FR-ITEM-01 (list + status + newest-first +
incremental pagination), FR-ITEM-02 (filter + search), FR-ITEM-03 (edit fields;
approved stays approved; mandatory `occurred_at`), FR-ITEM-04 **approve**
(`pending` → `approved`), FR-ITEM-05 (soft delete; excluded from balances; kept as
log), and the category-on-write guarantees FR-CAT-01/02/03 (required free text,
stored as-is, defaults to `Без категорії`) enforced on the edit path.

**Out (this slice), deferred to their owning slices:**

- **FR-ITEM-04 batch partial-success creation** — exercised by the import
  channels consuming parser output; the single-item creation contract already
  exists. There is no parser or channel consumer yet (slices 5–8), so a batch
  wrapper now would be unused code. Deferred to `parsing` + the channel slices.
- **FR-ITEM-07 retry a failed parse from the `input_event`** — requires the
  `parsing` capability's `parser_run` write path (slice 5). No parser exists yet.
- **FR-CAT-04 category breakdown** — the enabling computation
  (`computeCategoryTotals`) already shipped in `add-ledger-queries`; its UI is
  owned by `dashboard` (slice 9). Not re-delivered here.
- **FR-ITEM-06 default-account resolution** — already delivered by the Foundation
  item-creation contract + `accounts`. Re-used, not re-built.

No multi-currency, no schema/contract change beyond the two repository methods, no
new dependency (BC-SCOPE-02, TC-MOD-02).
