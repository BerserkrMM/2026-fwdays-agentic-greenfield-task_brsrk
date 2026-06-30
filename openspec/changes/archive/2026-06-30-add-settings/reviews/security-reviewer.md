# Security Review — add-settings slice (Finup, BC-SCOPE-01 single-user no-auth v1)

Fresh security reviewer (maker≠checker). Scope: uncommitted slice vs `origin/dev`.
Files: `app/settings/{actions,page}.tsx`, `app/settings/export/route.ts`,
`src/domain/{app-config,csv-export}.ts`, `src/modules/settings/service.ts`,
`src/db/{postgres,memory,mappers,rows,bootstrap.sql}`, `src/domain/ports.ts`,
`src/modules/parsing/adapters.ts`.

## 1. FR-SET-02 — write-only key over the wire — PASS (clean)
- `toAiProviderStatus` (`app-config.ts:74`) projects only `{ configured: Boolean(key), model }` — key coerced to boolean, never emitted; `AiProviderStatus` (`app-config.ts:18`) has no key field.
- `page.tsx` renders only `status.configured` / `status.model`; the API-key input is `type="password"`, `autoComplete="off"`, **no `defaultValue`** — the stored key is never put in the DOM.
- Server actions (`actions.ts:34-42`) are redirect-only `void`; never return the key.
- Only raw-key path is `getOpenAiAdapterConfig` (`service.ts:37`), consumed solely server-side by `configuredOpenAiAdapter` (`service.ts:90`). No `console.*`/logger in the module (grep clean).

## 2. FR-SET-03 — CSV formula-injection (CWE-1236) — PASS (clean; bypass attempts failed)
`csvCell` (`csv-export.ts:29-35`), triggers `{ = + - @ \t \r }`. Verified: trigger-led free-text → `'`-prefixed + RFC-quoted; quote-led `"=cmd"` → `"""=cmd"""` (unwraps to literal, safe); empty cell safe; leading-space `=` disabled by Excel anyway; LF-led RFC-quoted; full OWASP set covered; **BOM** (`route.ts:18`) precedes only the constant header row, can't re-arm a cell; **raw numeric amount** column (`amountForCsv`, `[-]digits.dd` generated) safe — leading `-` is a number, neutralizing would break SUM (correct trade-off).

## 3. Export Route Handler `route.ts` — PASS (clean)
GET-only, force-dynamic, `cache-control: no-store`, attachment. Read-only — `exportLedgerCsv` → `listAll()` (read-only `ports.ts:68`); no writes. Exporting soft-deleted items is documented intent. No-auth consistent with whole-app BC-SCOPE-01 (not a slice regression).

## 4. SQL — `app_config` upsert — PASS (clean)
`postgres.ts:36-58` uses postgres.js tagged-template parameterization (bound params, not interpolation). Singleton sound: boolean PK `DEFAULT true CHECK (id)`; `WHERE id LIMIT 1`; `ON CONFLICT (id) DO UPDATE … updated_at = now()`. No injection surface.

## 5. Plaintext key at rest — NOTE (documented, accepted)
`bootstrap.sql` stores `openai_api_key text` unencrypted. Explicitly accepted in `design.md` D2 ("accepted for v1 single-user; deferred hardening"); requirement scoped to write-only *over the wire*. Implementation matches the documented decision exactly — nothing worse than documented. Minor/informational for v1; revisit if multi-user/auth is added.

## 6. Secret leakage via errors / Authorization header — PASS (clean)
`OpenAiParserAdapter` (`adapters.ts:245`) sends `Authorization: Bearer ${apiKey}` request-only, never logged. Error messages contain only static text + `response.status`. Settings action errors surface only a stable `SettingsError.code`; non-domain errors rethrow without echoing input. No raw 500 carrying internals.

## Additional checks
- **Mass-assignment**: `saveAiProvider` reads only `apiKey`/`model`; `upsert` takes a fixed patch shape — no `id`/`updated_at` client control. Clean.
- **Blank-key preservation**: re-saving the model can't null the key; only `removeApiKeyAction` clears it. Correct.
- **Input bounds**: key ≤ 512 server-side, whitespace rejected; model ≤ 120. Reasonable.
- **Rate limiting**: none — acceptable for single-user local v1 (awareness only).

## Verdict
**PASS_WITH_NOTES** — write-only key, CSV formula-injection + raw-amount safety, export
route, parameterized `app_config` upsert, and secret-leakage paths all clean; only open
item is the plaintext key at rest, explicitly documented and accepted for v1 (design.md D2).
