# Spec-Compliance Audit — add-settings slice

Fresh spec-compliance auditor (maker≠checker). Scope: OpenSpec change
`openspec/changes/add-settings` (proposal, design, spec delta) vs the uncommitted
worktree implementation and the backfilled baseline `openspec/specs/settings/spec.md`.
Diff base: `origin/dev`.

## Preliminaries

- **Requirement-header match (MODIFIED vs baseline): PASS.** All three delta headers
  under `## MODIFIED Requirements` exactly match the backfilled baseline names
  (`openspec/specs/settings/spec.md:12,29,55`): "Settings screen manages technical
  configuration" (FR-SET-01), "AI provider settings are configurable if needed"
  (FR-SET-02), "Ledger items can be exported to CSV" (FR-SET-03). Correct OpenSpec
  usage (MODIFIED, not ADDED).
- **Requirement-ID cross-check: PASS.** FR-SET-01/02/03 at `docs/requirements.md:184-186`;
  FR-PARSE-06 at `docs/requirements.md:144` is the disclosed parsing-coordination touch.
- New files are untracked (`git status` `??`), so they don't appear in `git diff
  origin/dev`; all were read directly.

## Per-scenario verdicts (delta = 11 scenarios)

### Req 1 — Settings screen manages technical configuration
1. User opens settings — **PASS** (`app/settings/page.tsx:53-152`; not-configured warning `:73-82`; export hint `:151`; force-dynamic).
2. User saves supported config — **PASS** (`actions.ts:34-38` → `service.ts:54-63` → `appConfig.upsert` in pg + memory).
3. Invalid config surfaced clearly (UA-first, no blank/500) — **PASS** (`app-config.ts:47-65` throws coded `SettingsError`; `actions.ts:24-29` → `?formError=`; `page.tsx:25,41-45` + `settings-content.ts:42-57`).

### Req 2 — AI provider settings are configurable if needed
4. Configure provider + parsing consumes via adapter boundary — **PASS** (`page.tsx:84-117`; `configuredOpenAiAdapter` `service.ts:90-99`; used by all three import actions).
5. Stored key not returned to the client — **PASS** (page only consumes `AiProviderStatus {configured,model}`; key input has no defaultValue; only server-only `getOpenAiAdapterConfig` returns the key, used solely by the adapter builder).
6. Blank key preserves stored key — **PASS** (`service.ts:55-58`).
7. User removes the stored key — **PASS** (`actions.ts:40-42` → `service.ts:66-72`; remove button shown only when configured `page.tsx:119-128`).
8. Missing config explicit (no silent invalid AI call) — **PASS** (not-configured StateView; adapter throws `OpenAI API key is missing.` `adapters.ts:219-221`).

### Req 3 — Ledger items can be exported to CSV
9. Export read-only — **PASS** (GET-only `route.ts:12-27`; `toLedgerCsv(listAll())`; no writes in path).
10. Neutralizes formula injection + RFC-4180 quoting — **PASS** (`csv-export.ts:23-35`; CRLF; header-only on empty).
11. No destructive reset offered — **PASS** (grep clean; hint states no destructive clear in v1 `settings-content.ts:37-38`).

## Findings

**[minor] Formula-injection hardening over-applies to the numeric amount column.**
`csv-export.ts:30,46-57` — `csvCell` applied to `amountForCsv(...)`. The scenario scopes
neutralization to "an exported **text** field". `amountForCsv(-6000)` → `"-60.00"` whose
first char `-` is a trigger, so every expense (negative) row exports as apostrophe-prefixed
text and won't sum in a spreadsheet, while positive rows stay numeric — asymmetric, lower
fidelity. Suggestion: exempt the amount column (only ever digits/`.`/leading `-`).

**[minor] UTF-8 BOM prepended to the CSV is undocumented drift.**
`route.ts:18` prepends a BOM; design D5 specifies charset=utf-8 + attachment but not the
BOM (reasonable Excel-compat choice, just unspecified). Suggestion: note it in design.md.

**[minor] tasks.md checkboxes all unchecked** despite 2.x implemented and 1.x test files
existing; gate/archive 4.x/5.x genuinely not done. Suggestion: tick completed tasks; no
completion language until 4.x/5.x done.

## Coverage summary

11 scenarios: 11 implemented, 0 partial, 0 missing, 0 contradicted.

**Overall verdict: PASS (minor)** — spec-compliant on all 11 scenarios; 3 minor findings
(1 export-fidelity, 1 undocumented BOM, 1 tasks-ledger/process). No critical or major.
