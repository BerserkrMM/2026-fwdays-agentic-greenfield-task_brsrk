# Product Brief — Finup (Personal Finance Tracker)

> Companion to `docs/requirements.md`. The requirements document is the numbered,
> traceable source of truth; this brief is the business narrative behind it.
> The product is Ukrainian-first in its user-facing copy, with a calm, minimal,
> finance-oriented tone (BC-BRAND-01). This brief and `docs/requirements.md` are
> the current product source of truth.

## What this is

Finup is a single-user, installable PWA for tracking personal finances. Its
defining idea is that a person should be able to record financial data in
whatever way is convenient — type it, photograph a receipt, or upload a bank
statement — and the system turns every one of those inputs into the same
canonical result: ledger items that the user can later approve, edit, or delete.

The whole pipeline is built around one invariant: **raw input is preserved, while
financial rows stay editable and traceable.** Raw data is stored as-is in an `input_event`, normalized where useful, parsed
with AI into item drafts, and written as `pending` ledger items. Pending items are included in the user's financial picture immediately; if
the user disagrees, they edit, approve, or delete the items. Deleted items no
longer affect totals but remain available as an audit log.

## Who it is for

The single actor is **one owner managing their own money**. Version 1 has no
authentication, no roles, no teams, and no multi-user mode (BC-SCOPE-01). It is
UAH-only and operates in the `Europe/Kyiv` timezone (BC-SCOPE-02, BC-SCOPE-03).
The person arrives with a pile of spending they want to make sense of, records it
through any supported channel, optionally reviews the resulting items, and ends
up with a useful ledger and a dashboard that tells them where the money went.

## The pain it addresses

Personal-finance apps usually force one input method — a form to fill, field by
field — which is enough friction that most operations never get recorded. Bank
exports are messy, receipts pile up, and "I'll add it later" means it never gets
added. The result is a ledger that is always incomplete and therefore never
trusted.

Finup attacks the friction directly. Recording an expense should cost a sentence
of plain text ("40 грн ковбаса, 20 грн хліб") or a photo of the receipt. The
system does the structuring work — description, amount, operation type, currency,
free-text category, and date when available — and immediately adds editable pending ledger items.
Because the dashboard includes pending items by default, the ledger becomes useful
without a mandatory review step; trust is restored through easy edit, approve,
and delete actions.

## The event, item, and ledger model

Every source — text, one receipt photo, a bank-statement file, and in the future
Telegram, Discord, or an integration API — flows through one pipeline and produces
the same shape:

```txt
input_event → source-specific normalization → parser_run → ledger_items
```

Canonical terms for v1:

- **Event / внесення**: an `input_event`, meaning one act of user input: a
  sentence, one receipt photo, or one uploaded bank statement. `raw_input` is not
  a separate domain entity; raw text or file references live on the `input_event`.
- **Item / операція**: a `ledger_item`, meaning the atomic financial row. It has
  `description`, signed `amount_minor`, currency, operation type (`expense` /
  `income`), account, category text, date when known, and status.
- **Ledger / журнал операцій**: the journal/list/query surface of ledger items.
  There is no separate `transaction` domain entity in v1.

Amounts use signed minor units: `amount_minor` is stored in kopiyky, expenses are
negative, income is positive, and future transfers are represented as two ledger
items at the same time when needed. There is no separate transfer operation type
in v1. If the user does not pick an account, the default account is assigned.
Category is always present as text: AI writes the category it chose, and if no
category is recognized the item stores `Без категорії`.

Ledger item status semantics:

| Status | Included in balance/dashboard? | Meaning |
| ------ | ------------------------------ | ------- |
| `pending` | Yes | Created by parsing or manual input; user has not reviewed it yet. |
| `approved` | Yes | User reviewed and agreed with the item. |
| `deleted` | No | User removed it from the financial picture; kept as a log. |

The dashboard and balance read all items except `deleted`; `pending` means the
user has not reviewed the item yet, not that it is excluded from totals.

Worked examples, treated as intent rather than contract:

- `"40 грн ковбаса, 20 грн хліб"` → one text `input_event` with two pending
  ledger items: `ковбаса` 40 UAH and `хліб` 20 UAH.
- The same text when prices are not separable → one pending ledger item for the
  total, with a combined description.
- `"продаж айфона 2000"` → one pending income item for 2000 UAH.
- A **bank-statement** file → one `input_event`, normalized to remove obvious
  non-transaction noise, then parsed into one pending ledger item per statement
  row.

The raw input is always preserved alongside the items it produced, so every
number is traceable back to the text, photo, or statement row it came from.

## End-to-end usage

1. **Record.** The user opens the Imports hub and picks a channel: type free
   text, upload one receipt photo, or upload a Monobank / PrivatBank statement
   after selecting the provider. The original input is stored as an `input_event`
   before anything else happens.
2. **Normalize.** Each source has deterministic preprocessing: text is cleaned,
   photos are validated and stripped of avoidable metadata before AI, and bank
   statements are read with provider-specific rules that remove obvious
   non-transaction rows and other noise. The original photo/file reference remains
   preserved on the `input_event`; AI receives the normalized/preprocessed payload.
   Bank normalization does not categorize, infer final types, create ledger items,
   or write to the ledger; it only prepares clean rows with source row numbers for
   AI parsing. PDF import is deferred from the MVP.
3. **Parse.** The normalized payload is passed to the AI parser. Text uses a text
   parser, receipt photos use an AI vision parser, and bank statements pass clean
   rows to the AI parser. For bank statements, the parser is expected to return at
   most one ledger item per source row. The parser may return category text as it
   sees fit; if it returns no category, the item category is `Без категорії`.
4. **Write items.** Each parse attempt is stored as a `parser_run`. Successful
   runs produce `pending` ledger items. Failed runs keep the original input and
   failed parser run so the user or system can retry later.
5. **Review when needed.** Pending items immediately appear in balances and the
   dashboard. The user can later edit any item, mark it `approved`, or mark it
   `deleted`. Deleted items are excluded from balances but retained as a log.
6. **Understand.** The Dashboard reads all non-deleted ledger items and shows
   balance, income and expense totals, a category breakdown, and trends. Category
   breakdown groups by the raw category text stored on each item, including
   `Без категорії`; no category table join is required in v1. Accounts shows
   per-account balances. Settings manages technical configuration.

## Key workflows in prose

- **Jot and continue.** Type a sentence describing a purchase, let the parser turn
  it into pending ledger items, and keep going. This is the core loop and the
  fastest way money enters the ledger.
- **Snap a receipt.** Photograph a receipt; the system stores the original,
  applies privacy-preserving preprocessing where possible, and uses AI vision to
  extract ledger items.
- **Import a statement.** Upload a bank export after selecting Monobank or
  PrivatBank; deterministic normalization removes obvious noise, then the AI
  parser converts the clean rows into pending ledger items.
- **Review, approve, edit, delete.** Work through pending items when desired,
  correcting categories and amounts, approving trusted rows, and deleting noise.
  Only deleted items are excluded from balances.

## Privacy posture

Confidentiality is a product principle, not an afterthought. Personal data and
obvious non-transaction noise should be reduced using **deterministic, linear
tools — without involving AI** — before any AI call: for example, dropping empty
or clearly irrelevant statement rows and stripping avoidable photo metadata. The
raw input is preserved on the `input_event`, but the normalized/preprocessed form
is what flows onward to AI where applicable.

## MVP vs Future boundary

**In the MVP (v1):** the app shell and navigation; the Ledger / journal of
operations screen with edit/approve/delete lifecycle; deterministic normalization
plus AI parsing into ledger items; manual text input; bank-statement imports
(Monobank / PrivatBank, provider selected by the user); one-photo receipt imports;
accounts with balances; the dashboard that reads all non-deleted items; and
settings management — all single-user, UAH-only, `Europe/Kyiv`.

**Future (deferred, v2+):**

- Multi-user mode, roles, and teams.
- Multi-currency.
- Direct bank-API integration (automatic Monobank / PrivatBank import).
- Telegram bot and Discord bot input sources (the pipeline is designed for them).
- A generic integration API as an input source.
- Budgets and financial goals.
- PDF receipt/statement import.

## Operating principles

- **Delete is the exclusion gate.** `pending` and `approved` items affect the
  balance; only `deleted` items are excluded while remaining in the log.
- **One pipeline, one shape.** Every source — present and future — produces the
  same canonical ledger items.
- **Privacy without AI.** Personal-data and noise reduction is deterministic and
  runs before any AI call where applicable (BC-PRIVACY-01).
- **Traceable by construction.** Every ledger item keeps a link to the raw input
  and parser run it came from, so any number can be explained.
- **Parallel-build discipline.** The codebase is organised into owned epics /
  modules with stable contracts, so multiple agents can build in parallel without
  editing each other's files; shared contracts, schema, and shell change only
  through a Foundation / Coordination change (TC-MOD-01, TC-MOD-02).
- **Calm, Ukrainian-first UI.** User-facing copy is Ukrainian, the tone is
  minimal and practical, and every screen follows the design reference, including
  PWA/mobile states (BC-BRAND-01, BC-BRAND-02).
