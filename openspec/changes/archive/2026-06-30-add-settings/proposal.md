## Why

Settings is the last MVP capability (slice 10). It is the technical-configuration
screen scoped, in v1, to two jobs: editing the **AI provider** configuration the
`parsing` capability consumes (FR-SET-02, FR-PARSE-06) and **exporting** the
ledger to CSV (FR-SET-03). Until now the OpenAI key could only come from the
environment; this slice lets the single user store it in the database and edit it
in the UI, write-only over the wire, and gives them a one-click CSV export of
their data with no destructive reset.

## What Changes

- Add the `add-settings` slice for the `/settings` route, replacing the
  foundation placeholder screen with the real configuration + export surface.
- Persist AI-provider configuration (OpenAI API key + optional model) in a new
  single-row `app_config` table. The key is **write-only over the wire**: the
  Settings screen only ever shows configured/not-configured status and the model,
  never the stored key value (FR-SET-02).
- Wire `parsing` to consume the stored configuration through its existing
  `OpenAiParserAdapter` boundary, falling back to `OPENAI_API_KEY` when nothing is
  stored (FR-PARSE-06 — disclosed coordination touch on the three import actions).
- Add a read-only CSV export of ledger items, with spreadsheet **formula-injection
  hardening** on text fields and RFC-4180 quoting. No destructive data-reset
  action is offered (FR-SET-03).
- Add Ukrainian-first explicit states: a not-configured warning, validation error
  banner, configured badge, and an empty-export note, so nothing renders blank
  (FR-SHELL-03, NFR-I18N-01).

## Capabilities

### New Capabilities

### Modified Capabilities
- `settings`: implement the existing requirements FR-SET-01..03 — the
  technical-configuration screen, write-only AI-provider key persistence + status,
  and read-only CSV export with formula-injection hardening and no destructive
  reset.

## Impact

- New framework-free domain: `src/domain/app-config.ts` (provider config,
  write-only status projection, key/model validation) and
  `src/domain/csv-export.ts` (pure CSV serialization + formula-injection
  neutralization).
- New `settings` module: `src/modules/settings/{ports,service}.ts` and
  `src/modules/settings/ui/settings-content.ts` (Ukrainian copy), plus the real
  `app/settings/page.tsx`, `app/settings/actions.ts`, and the CSV download Route
  Handler `app/settings/export/route.ts` (replaces the placeholder).
- Shared-schema coordination (TC-MOD-02, disclosed): a new singleton `app_config`
  table in `src/db/bootstrap.sql`, an `AppConfigRepository` port in
  `src/domain/ports.ts`, and its postgres + in-memory implementations
  (`src/db/{postgres,memory,mappers,rows}.ts`, added to `Repositories`).
- Parsing coordination (TC-MOD-01, disclosed): `app/imports/{text,files,bank}/
  actions.ts` build the `OpenAiParserAdapter` from the stored config via a small
  settings helper instead of the bare constructor. No change to the adapter
  contract, the parser ports, or any write path.
- Tests for the CSV serializer (incl. injection), the app-config domain, the
  settings service (status never leaks the key; export folds items; configured
  adapter), the page, and the export Route Handler.
- OpenSpec evidence, RED/GREEN artifacts, an eval case, reviews, regenerated
  trace/trajectory reports, and the final slice report.
