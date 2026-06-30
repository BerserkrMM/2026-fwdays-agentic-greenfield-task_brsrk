# Design — add-manual-text-input

## Context

`manual-input` owns the `/imports/text` channel. The baseline spec already exists
(backfilled), so this change MODIFIES those requirements to reflect the
implemented behavior. The capability is a thin orchestrator over already-built
pieces: it stores the raw input, normalizes it for its source, delegates parsing
to `parsing`, and writes through the item-creation contract. It owns no schema
and no balance logic.

## Goals

- Smallest end-to-end channel: text → `input_event` → parser → pending items →
  Ledger, with a created/failed summary.
- Keep domain logic framework-free (TC-PURE-01); keep persistence/parsing/
  item-creation injected so the orchestrator is unit-testable on the in-memory
  fallback.
- Ukrainian-first copy; six shared states honored on the screen (FR-SHELL-03).

## Decisions

### D1 — Source normalization vs parsing normalization

Manual-input performs only **source-specific** normalization (trim outer
whitespace, reject empty) in a pure `src/domain/manual-text.ts`. Parsing-level
privacy/noise cleanup (emails/phones, internal whitespace) already runs inside
`ParsingService`/`normalizeParserPayload`, so we do not duplicate it here. The
**original** text is stored on the `input_event` (NFR-PRIV-02); only the
normalized text is sent downstream.

### D2 — Partial-success creation

Parser drafts are canonicalized by `parsing` (an invalid draft fails the whole
parse there). At the channel level, partial-success means each returned draft is
attempted via `ItemCreationService.createPendingItem`; a per-draft failure
(e.g. unexpected creation error) is counted as `failed` and does not roll back
already-created items. The summary reports `created`/`failed`.

### D3 — Failure surface + retry

A parse failure throws `ParsingError`; `ParsingService` has already persisted the
`input_event` and a `failed` `parser_run` before throwing. The server action maps
it to `/imports/text?formError=parse-failed`, which renders an explicit error with
a retry action (re-submitting the form). Deeper "retry from input_event" remains
owned by `ledger-items`/`parsing` (FR-ITEM-07) and is not built here.

### D4 — Summary on the Ledger screen

FR-TEXT-05 requires the summary to appear on `/ledger`. The action redirects to
`/ledger?imported=<n>&failed=<m>`. A pure helper owned by manual-input
(`src/modules/manual-input/ui/import-summary.ts`) parses those params and produces
the Ukrainian banner text; `app/ledger/page.tsx` imports it and renders the banner.
This is a minimal, isolated coordination touch on the ledger route (no change to
ledger-items domain/service), analogous to how `parsing` added `confidence`
plumbing to `ledger_items`.

### D5 — Wiring

The action composes `getRepositories()` → `AccountsService` (also
`ensureSeededDefault()` so FR-ITEM-06 default resolution never fails on a clean
checkout) → `ItemCreationService` → `OpenAiParserAdapter` → `ParsingService` →
`ManualInputService`. Server-only (TC-STACK-02); no DB import reaches a client
bundle.

## Risks / Trade-offs

- Live OpenAI is not exercised in CI; the adapter is injected and unit tests use a
  deterministic fake adapter. Real-key behavior is deferred to settings.
- The summary banner is a query-param render with no persistence; refreshing
  `/ledger` without the params simply hides it. Acceptable for v1.

## Out of scope

Bank/photo channels, settings AI-provider UI/key storage, live provider calls,
and retry-from-input_event UI.
