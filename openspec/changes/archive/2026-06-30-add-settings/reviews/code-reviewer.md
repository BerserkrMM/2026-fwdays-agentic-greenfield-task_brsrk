# Code Review — add-settings slice (slice 10, capability settings, FR-SET-01/02/03)

Fresh code reviewer (maker≠checker). Scope: `git diff origin/dev` + the untracked new
files (`src/domain/{app-config,csv-export}.ts`, `src/modules/settings/*`,
`app/settings/{page,actions,export/route}`, DB boundary additions, imports rewiring).

Overall: clean, convention-aligned. Domain stays framework-free (TC-PURE-01); the module
integrates only through ports; the DB boundary never enters a client bundle (TC-STACK-02);
server actions mirror the accounts inline error-surface pattern; the singleton `app_config`
table is correctly modeled; FR-SET-02 write-only-over-the-wire is genuinely upheld (only
`AiProviderStatus` is projected). `configuredOpenAiAdapter(repos)` rewiring is correct with
`OPENAI_API_KEY` fallback. Findings are quality-level.

### Findings

1. **CSV "Рахунок" column exports the raw account UUID, not the account name — major**
   `src/domain/csv-export.ts:62` (`csvCell(item.accountId)`). Header is «Рахунок» but the
   value is the opaque UUID — unreadable in a user-facing export. `SettingsService` has only
   `ledgerItems`, no name resolution. Fix: inject `repos.accounts`, resolve id→name, emit the
   account name (UUID only as fallback).

2. **CSV `Тип`/`Статус` emit machine enum codes under Ukrainian headers — minor**
   `csv-export.ts:58-60`. `expense`/`deleted` etc. under Ukrainian headers violates the
   I18N-first intent (NFR-I18N-01). Map enums to Ukrainian labels.

3. **`"Дата"` carries a full ISO-8601 timestamp — minor**
   `csv-export.ts:55` (`toISOString()`) → `2026-06-30T12:00:00.000Z`, timezone-naive for a UA
   user under a column labeled «Дата». Format as a local (Europe/Kyiv) date.

4. **`api-key-required` validation path unreachable from the UI — minor**
   `service.ts:55-58` keeps the existing key when blank *before* calling `validateOpenAiApiKey`,
   so the `"api-key-required"` branch can't throw via the action; the banner copy is dead UX.
   Consistent with "blank = keep existing"; drop or comment the unreachable path.

5. **Hardcoded banner title bypasses the single-source copy module — minor**
   `app/settings/page.tsx` `ErrorState title="Не вдалося зберегти"` is inlined though
   `settings-content.ts` is declared the single source of truth. Move into `SETTINGS`.

6. **Double-await reads awkwardly in the rewired imports actions — nit**
   `app/imports/{bank,files,text}/actions.ts` (`await (await service()).importX(...)`).
   Correct; `const svc = await service();` is clearer.

7. **Formula-injection hardening only inspects the first character — nit (low confidence)**
   `csv-export.ts:30`. `" =cmd"` (leading space) isn't neutralized; Excel treats leading space
   as text so risk is negligible. Noted for completeness, not a blocker.

### Notes (not defects)
- GET export route lets a DB failure propagate to 500 — takes no user input, matches
  accounts/dashboard server reads; acceptable for v1.
- `app_config` singleton modeling + `upsert`/`toAppConfig` mapping are sound.
- Server-action redirect/revalidate + `saved=config|removed` ↔ page-notice mapping consistent.

Verdict: **APPROVE_WITH_NITS** (address finding #1 before relying on the CSV export for real
account reconciliation).
