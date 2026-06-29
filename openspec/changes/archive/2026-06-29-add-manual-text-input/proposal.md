## Why

The next approved Project Factory slice is `add-manual-text-input` (phase 4, channels). Parsing (`add-parsing-pipeline`) and the item-creation contract now exist, so the first import channel can ship: a `/imports/text` screen that turns free-form Ukrainian text into pending ledger items for later review. It is the smallest end-to-end channel and proves the channel → input_event → parser → item-creation → ledger flow that the bank and photo channels reuse.

## What Changes

- Replace the `/imports/text` placeholder with a real server-component form that accepts non-empty free-form text (FR-TEXT-01).
- Store every submission as an `input_event` with source `text`, preserving the original text before any normalization or parsing (FR-TEXT-02, FR-IMPORT-02, NFR-PRIV-02).
- Add a framework-free manual-input domain helper for source-specific text normalization/validation, then pass the normalized payload to the existing Parsing capability (FR-TEXT-03, FR-PARSE-01).
- Create one `pending` ledger item per valid parser draft through the existing item-creation contract, using partial-success batch semantics (FR-TEXT-04, FR-PARSE-07, FR-ITEM-04).
- On a parse failure surface an explicit Ukrainian error with a retry action, preserving the original `input_event` and the failed `parser_run` (FR-TEXT-03, FR-PARSE-08, FR-ITEM-07).
- After import, redirect to the Ledger screen with a created/failed summary (FR-TEXT-05); render that summary on `/ledger` via a small coordination addition owned by manual-input.
- Do NOT add bank/photo channels, settings UI, live OpenAI calls, or any new ledger-item write path beyond the existing item-creation contract.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `manual-input`: implement the existing Manual Input capability requirements FR-TEXT-01 through FR-TEXT-05, consuming `parsing` and the item-creation contract; NFR-PRIV-02 and Ukrainian-first UX covered.

## Impact

- New module code under `src/modules/manual-input/**` (service + UI copy + a pure summary helper) and a new framework-free `src/domain/manual-text.ts`.
- New route logic under `app/imports/text/**` (server component form + server action). A minimal, isolated read of `?imported`/`?failed` query params on `app/ledger/page.tsx` to render the post-import summary banner (the helper that parses/renders it is owned by `manual-input`).
- Reuses existing repository ports (`input_events`, `parser_runs`, `ledger_items`), `ParsingService`, `OpenAiParserAdapter`, `ItemCreationService`, and `AccountsService`; no schema change.
- Tests with `@trace FR-TEXT-*` and evidence under `openspec/changes/add-manual-text-input/`.
