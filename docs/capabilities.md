# Capabilities & Implementation Order

Derived from [requirements.md](requirements.md) (the source of truth) and
[product-brief.md](product-brief.md). This document splits the PRD into the
OpenSpec **capabilities** we will implement and defines the **order** in which to
build them, driven by their dependencies.

Each capability below maps to an OpenSpec capability spec under
`openspec/specs/<capability>/` and is delivered through one or more change
proposals under `openspec/changes/`. The FR/NFR/TC IDs are the traceability link
back to the PRD — do not restate requirements here, reference them.

---

## Capability map

| Capability       | PRD epic | Requirements covered                                  | Purpose |
| ---------------- | -------- | ----------------------------------------------------- | ------- |
| `foundation`     | Epic 0   | FR-SHELL-01..04, FR-IMPORT-01..02, TC-MOD-02, TC-STACK-*, TC-PURE-01, TC-DATA-01 | App shell, navigation, PWA, design tokens, DB boundary, domain contracts, **`ledger_items` schema + item-creation contract**, `input_event` storage, imports hub skeleton. Owns all shared/cross-cutting code and schema (TC-MOD-02). |
| `accounts`       | Epic 6   | FR-ACCT-01, FR-ACCT-03, FR-ITEM-06 (default account)  | Account metadata, default account, UAH metadata. Default account must exist before any ledger item is saved. (Balance display, FR-ACCT-02, lands after `ledger` — see note.) |
| `ledger`         | Epic 7   | FR-LEDGER-01..05, FR-ACCT-02 (account balances)       | Read/query domain: balance + income/expense aggregate queries over `ledger_items`, single source of truth for balances. Owns read queries, not the schema. |
| `ledger-items`   | Epic 1   | FR-ITEM-01..07, FR-CAT-01..04                          | Review/write use-cases over the existing schema/contract: list/filter/search, edit, approve, delete, retry; category text on item. |
| `parsing`        | Epic 5   | FR-PARSE-01..08, NFR-PRIV-01..02, NFR-COST-01, TC-STACK-05 | Parser port + result contract, OpenAI adapter, `parser_run` log, **parsing-level** deterministic keyless privacy/noise normalization (FR-PARSE-05); returns drafts only, writes nothing. |
| `manual-input`   | Epic 2   | FR-TEXT-01..05                                         | `/imports/text` free-form text → input_event → parsing → pending items. First end-to-end slice. Owns source-specific text normalization. |
| `bank-imports`   | Epic 3   | FR-BANK-01..06                                         | `/imports/bank` CSV/XLS/XLSX, provider-specific deterministic normalization, row idempotency, **at most one pending item per parsed source row** (FR-BANK-04). |
| `file-imports`   | Epic 4   | FR-FILE-01..05                                         | `/imports/files` single receipt photo, source-specific deterministic image preprocessing, AI vision parse → pending items. |
| `dashboard`      | Epic 8   | FR-DASH-01..05                                         | Read-only balance summary, income/expense totals, category breakdown, trends. |
| `settings`       | Epic 9   | FR-SET-01..02, NFR-COST-01                             | Technical config screen, configurable AI provider settings. |

Notes:
- **Category text** (FR-CAT-*) is not a standalone capability — it is data stored
  on `LedgerItem` and produced by `parsing`, so it ships inside `ledger-items` and
  `parsing`.
- **Schema/contract ownership (TC-MOD-02).** `foundation` owns the `ledger_items`
  schema, the `LedgerItem` domain type, mappers, and the **item-creation
  contract**. `ledger` owns the read/balance/aggregate **queries** over that
  schema. `ledger-items` owns the **review/write use-cases** through the existing
  contract. This prevents `ledger` and `ledger-items` from both claiming the
  schema. Any later schema change goes through a Foundation/Coordination change.
- **`parser_run` schema ownership.** `foundation` creates the `parser_runs` table
  + types alongside the other shared schema (TC-MOD-02); `parsing` owns the
  *behavior* — writing/retrying runs, status, normalized payload, result/error
  JSON (FR-PARSE-08). Confirm this split in the `add-foundation-shell` proposal so
  `parsing` does not silently introduce a feature-owned table.
- **Normalization ownership.** Two distinct layers, do not conflate:
  - *Source-specific deterministic normalization* is owned by each import channel
    — text cleanup (`manual-input`), provider row/column cleanup (`bank-imports`,
    FR-BANK-03), image preprocessing (`file-imports`, FR-FILE-03).
  - *Parsing-level keyless privacy/noise normalization* (FR-PARSE-05, NFR-PRIV-01)
    is owned by `parsing` and runs immediately before the AI call.
  `parsing` only requires that the payload it consumes is already
  source-normalized; it does not own channel-specific steps.

---

## Dependency graph

```
foundation  (owns ledger_items schema + item-creation contract)
   ├── accounts (metadata, default account)
   │      └── ledger (balance/aggregate queries) ──┬── ledger-items (review/write)
   │                                               ├── accounts balance display (FR-ACCT-02)
   │                                               └── dashboard (read-only)
   parsing (depends on foundation) ────────────────┐
                                                    ├── manual-input
                                                    ├── bank-imports
                                                    └── file-imports
   foundation ── settings   (config UI; soft link to parsing — see below)
```

Key constraints from the PRD that drive the order:
- Everything depends on `foundation` (shared shell, DB boundary, domain
  contracts, `ledger_items` schema, `input_event` storage) — TC-MOD-02,
  TC-STACK-04, TC-PURE-01.
- Ledger items require a **default account** before saving (FR-ITEM-06,
  FR-ACCT-01) → `accounts` (metadata + default) precedes `ledger-items`.
- Account/overall **balances read from non-deleted `ledger_items`** and ledger
  items are the single source of truth (FR-ACCT-02, FR-LEDGER-05) → balance
  display (in `accounts` and `dashboard`) depends on `ledger` queries. So
  `accounts` metadata ships early, but its balance view lands with/after `ledger`.
- The parser **never writes items** (FR-PARSE-07); import channels create items
  via the item-creation contract → `parsing` + `ledger-items` precede the three
  import channels.
- `dashboard` is **read-only** over balances/aggregates (FR-DASH-05) → depends on
  `ledger`.
- `settings` → `parsing` is a **soft** link: `parsing` ships with a working
  default AI config (TC-STACK-05 names OpenAI as the v1 adapter), and the
  `settings` UI (FR-SET-02) only edits that config later. It is not a hard
  blocker — the minimal config contract lives with `parsing`/`foundation`.

---

## Implementation order (phased)

### Phase 1 — Foundation
1. **`foundation`** — app shell, navigation, responsive/PWA layout, shared states
   (empty/loading/partial/offline/error), `fin-*` design tokens, DB client
   boundary, `src/domain` contracts, imports-hub skeleton, and the shared schema
   it owns (TC-MOD-02): **`ledger_items`, `input_events`, and `parser_runs`
   tables + types, plus the item-creation contract**. `parsing` later owns
   `parser_run` *behavior*; `foundation` only creates its table/types.

> Rationale: nothing renders or persists without the shell, DB boundary, and
> shared contracts. This is the only capability allowed to touch cross-cutting
> files and shared schema (TC-MOD-02).

### Phase 2 — Core domain
2. **`accounts` (metadata)** — list, default account, UAH metadata. Balance
   display is deferred (it needs `ledger` queries).
3. **`ledger`** — balance + income/expense aggregate queries over the
   `foundation`-owned `ledger_items` schema (single source of truth). Unblocks
   the `accounts` balance view (FR-ACCT-02) and the dashboard.
4. **`ledger-items`** — list/filter/search, edit, approve, delete, retry through
   the existing item-creation contract; category text.

> Rationale: `foundation` already owns the `ledger_items` schema + item-creation
> contract, so `ledger` (queries) and `ledger-items` (review/write) build on it
> without contending for the schema. `accounts` metadata ships first (default
> account is a precondition for saving items), but account balances depend on
> `ledger` queries, so that slice lands with/after step 3.

### Phase 3 — Parsing pipeline
5. **`parsing`** — parser port + OpenAI adapter, `parser_run` log, deterministic
   keyless pre-normalization, drafts-only contract, retry support.

> Rationale: shared by all three import channels; build once before any channel.

### Phase 4 — Input channels (vertical slices)
6. **`manual-input`** — simplest channel; proves the full input_event → parsing →
   pending item loop end-to-end.
7. **`bank-imports`** — CSV/XLS normalization, provider selection, row-level
   idempotency `(input_event_id, import_row_number)`.
8. **`file-imports`** — single receipt photo, deterministic preprocessing, AI
   vision parse.

> Rationale: each channel is a thin slice over the same pipeline. Start with text
> (least preprocessing), then bank statements (deterministic row normalization),
> then receipt photos (vision + image preprocessing).

### Phase 5 — Read & configure
9. **`dashboard`** — read-only summary, totals, category breakdown, trends.
10. **`settings`** — technical config + AI provider settings.

> Rationale: `dashboard` needs real data from the ledger/import phases to be
> meaningful. `settings` is low-coupling and can land last (or earlier if AI
> provider config is needed during `parsing`).

---

## Suggested OpenSpec change sequence

Propose one change per capability (split large ones if a single change exceeds a
reasonable review size):

1. `add-foundation-shell` — includes the `ledger_items` + `input_event` schema and
   the item-creation contract (TC-MOD-02 owner).
2. `add-accounts` — metadata + default account (no balance display yet).
3. `add-ledger-queries` — balance/aggregate queries; also delivers the
   `accounts` balance view (FR-ACCT-02).
4. `add-ledger-items-review`
5. `add-parsing-pipeline` — ships with the default OpenAI config.
6. `add-manual-text-input`
7. `add-bank-statement-imports`
8. `add-receipt-photo-imports`
9. `add-dashboard`
10. `add-settings` — config UI over the existing parsing config.

Each change references its FR/NFR/TC IDs so the PRD traceability stays intact.
