# Tasks — add-settings

## 1. Tests-first (RED)

- [x] 1.1 `src/domain/csv-export.test.ts`: `toLedgerCsv` — header row, signed
  hryvnia amount, RFC-4180 quoting (comma/quote/newline), formula-injection
  neutralization (`= + - @`, tab, CR prefixed), empty items → header only.
  (FR-SET-03)
- [x] 1.2 `src/domain/app-config.test.ts`: `validateOpenAiApiKey` (trim, empty +
  too-long + whitespace → `SettingsError`), `normalizeOpenAiModel`,
  `toAiProviderStatus` never exposes the key. (FR-SET-02)
- [x] 1.3 `src/modules/settings/service.test.ts`: status is not-configured
  initially and never returns the key; save persists; blank key preserves the
  stored key; remove clears it; `exportLedgerCsv` folds `listAll()`;
  `getOpenAiAdapterConfig` returns the stored key for parsing. (FR-SET-01/02/03)
- [x] 1.4 `src/app-settings-page.smoke.test.ts`: page renders the provider form +
  export link, shows the not-configured state and (after save) the configured
  badge, and never renders the stored key value. (FR-SET-01/02, FR-SHELL-03)
- [x] 1.5 `src/app-settings-export-route.test.ts`: the export Route Handler GET
  returns `text/csv` with an attachment disposition and a CSV body, and mutates
  nothing. (FR-SET-03)
- [x] 1.6 Capture `evidence/red-run.json` (command, non-zero exitCode, gitHead,
  timestamp, failingTests).

## 2. Implementation (GREEN)

- [x] 2.1 `src/db/bootstrap.sql`: add the singleton `app_config` table (disclosed
  TC-MOD-02 coordination). (FR-SET-02)
- [x] 2.2 `src/domain/ports.ts` + `src/db/{rows,mappers,postgres,memory}.ts`: add
  `AppConfigRepository` (get/upsert) and wire it into `Repositories`. (FR-SET-02)
- [x] 2.3 `src/domain/app-config.ts`: `AppConfig`, `AiProviderStatus`,
  `toAiProviderStatus`, `validateOpenAiApiKey`, `normalizeOpenAiModel`,
  `SettingsError`. (FR-SET-02)
- [x] 2.4 `src/domain/csv-export.ts`: pure `toLedgerCsv` + `csvCell` hardening.
  (FR-SET-03)
- [x] 2.5 `src/modules/settings/{ports,service}.ts`: `SettingsService`
  (status, save/remove key + model, `getOpenAiAdapterConfig`, `exportLedgerCsv`)
  and a `configuredOpenAiAdapter(repos)` helper. (FR-SET-01/02/03)
- [x] 2.6 `src/modules/settings/ui/settings-content.ts`: Ukrainian-first copy +
  error map. (NFR-I18N-01)
- [x] 2.7 `app/settings/page.tsx` (real screen, replaces placeholder),
  `app/settings/actions.ts` (save/remove), `app/settings/export/route.ts` (CSV
  GET). (FR-SET-01/02/03, FR-SHELL-03)
- [x] 2.8 `app/imports/{text,files,bank}/actions.ts`: build the adapter via
  `configuredOpenAiAdapter(repos)` (disclosed coordination). (FR-PARSE-06)
- [x] 2.9 Capture `evidence/green-run.json`.

## 3. Eval

- [x] 3.1 `evals/cases/settings.eval.ts`: dimension `ua-error-clarity` over the
  not-configured / validation-error / write-only / export copy; graded by a fresh
  judge; recorded in `evals/results/latest.json` (ratchet ≥ 92).

## 4. Gates & review

- [x] 4.1 lint, `tsc --noEmit`, `test:run`, `test:coverage`, coverage ratchet,
  `next build`, `openspec validate --all --strict`, `check:trace`,
  `check:trajectory`, `check:red-green --slice add-settings --strict`,
  `check:handoff`, `check:claims`.
- [x] 4.2 maker≠checker review (code, security, spec-compliance, eval-judge); raw
  outputs under `reviews/`; `review-findings.json` `clean:true` after fixes.

## 5. Archive & handoff

- [x] 5.1 Archive the change; regenerate trace/trajectory; `slice:report --write`.
- [x] 5.2 fallow audit; update `docs/current-state.md` last; commit with
  `Slice: add-settings` / `Refs: FR-SET-01..03`; push; PR to `dev`.
