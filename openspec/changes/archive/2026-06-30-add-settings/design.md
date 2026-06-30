# Design — add-settings

## Context

Slice 10, capability `settings`, owns FR-SET-01..03 (capability plan). It depends
on `parsing` (the OpenAI adapter boundary it configures, FR-PARSE-06) and `ledger`
(the items it exports, FR-SET-03). Both are merged. The screen is single-user, no
auth (BC-SCOPE-01).

## Decisions

### D1 — Single-row `app_config` table (shared-schema coordination)

AI-provider config is process-global, not per-entity, so it lives in a singleton
table guarded by a boolean primary key:

```sql
CREATE TABLE IF NOT EXISTS app_config (
  id             boolean PRIMARY KEY DEFAULT true CHECK (id),
  openai_api_key text,
  openai_model   text,
  updated_at     timestamptz NOT NULL DEFAULT now()
);
```

`id boolean PRIMARY KEY CHECK (id)` allows at most one row. Writes upsert with
`ON CONFLICT (id) DO UPDATE`. This is a disclosed TC-MOD-02 coordination touch to
`src/db/bootstrap.sql` (same pattern the `accounts` slice used to add its table),
plus an `AppConfigRepository` port and its postgres/in-memory implementations.

### D2 — Write-only key over the wire (FR-SET-02)

The domain separates the full `AppConfig` (server-only, includes the key) from the
client-safe `AiProviderStatus = { configured: boolean; model: string | null }`.
The page and actions only ever pass `AiProviderStatus` toward the client; the raw
key never appears in any rendered output or server-action return. The key is
read back only by the server-side parsing wiring (D4). Blank key on save = "leave
unchanged" (so re-saving the model never wipes the key); a separate remove action
clears it. Encryption-at-rest is out of scope for v1 (single-user, no auth: DB
access already implies full access; no KMS/secret-store infra exists) — the spec
requirement is write-only *over the wire*, which this satisfies. Recorded as
deferred hardening.

### D3 — CSV export: read-only + formula-injection hardening (FR-SET-03)

`toLedgerCsv(items)` is a pure function returning an RFC-4180 CSV string: a header
row plus one row per item (date, description, signed amount in hryvnias, currency,
type, category, status, account id). Every text cell is run through
`csvCell()` which (1) prefixes a leading formula trigger (`= + - @`, tab, CR) with
an apostrophe so spreadsheets treat it as text (CWE-1236), then (2) quotes and
doubles embedded quotes when the value contains `,`, `"`, `\n`, or `\r`, or starts
with the neutralizing apostrophe. The export reads through the existing
`LedgerItemRepository.listAll()` (a full, honest export including `deleted` rows,
which carry a status column) and writes nothing — it is served from a GET Route
Handler so it is structurally incapable of mutation.

### D4 — Parsing consumes stored config (FR-PARSE-06, disclosed coordination)

`SettingsService.getOpenAiAdapterConfig()` returns `{ apiKey, model }` from
`app_config` (server-only). A small server helper
`configuredOpenAiAdapter(repos)` builds `new OpenAiParserAdapter({ apiKey, model })`
from it; when nothing is stored the adapter falls back to `OPENAI_API_KEY` (its
existing behavior), so the soft `settings -.-> parsing` link in the plan holds:
parsing ships a working default, settings only overrides it. The three import
actions (`/imports/text|files|bank`) swap their bare `new OpenAiParserAdapter()`
for `await configuredOpenAiAdapter(repos)`. No adapter-contract or write-path
change.

### D5 — Route Handler for the download

The CSV is delivered by `app/settings/export/route.ts` `GET` returning a `Response`
with `text/csv; charset=utf-8` and `Content-Disposition: attachment`. The page
links to it with a normal anchor. A GET handler (not a server action) is the
idiomatic App-Router way to stream a file download and keeps the page read-only.
The body is prefixed with a UTF-8 BOM so Excel opens the Ukrainian text in UTF-8
rather than a legacy code page; the numeric amount column is emitted raw (not
formula-neutralized) so spreadsheets still treat amounts as summable numbers
(only the free-text columns are hardened — see D3).

## Risks / tradeoffs

- Plaintext key at rest (D2) — accepted for v1 single-user; deferred hardening.
- `listAll()` export can be large for big ledgers — acceptable for v1 personal
  scale; streaming/pagination deferred.
