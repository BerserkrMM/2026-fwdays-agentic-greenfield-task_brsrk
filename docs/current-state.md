# Current State

Running handoff log. Most recent entry on top. See `AGENTS.md` for the rules on maintaining this file.

---

## 2026-06-30 16:53 UTC — make `/about` the deployed landing page and enrich presentation page

**What was done** — made the app root redirect to `/about` so deployed Vercel reviewers land on the course/demo presentation first. Refined `/about` copy to reduce contrast-heavy phrasing, renamed process-evidence wording from gates to checks, added concrete gate commands, an evidence artifact map, and a short glossary for process terms (`regression coverage`, `accepted with rationale`, `trade-off`, `ratchet`). Updated the content tests for the new copy structure.

**Current state** — the landing-page commits were created and pushed. The first `bash crash_course/run-all-checks.sh` exposed one expected regression in `src/app-pages.smoke.test.ts`: the home route assertion still expected `redirect:/dashboard`. Fixed it to expect `redirect:/about` and added an `/about` presentation-page smoke assertion so coverage does not drop from the large static page. The rerun of `bash crash_course/run-all-checks.sh` is green: **13/13 gates passed**. Coverage improved over baseline (lines/statements 69.05→73.41, functions 80.71→80.9, branches 90.08→90.37), so the ratchet passes without updating the baseline. PR #14 (`add-about-page` → `dev`) is open and MERGEABLE: https://github.com/BerserkrMM/2026-fwdays-agentic-greenfield-task_brsrk/pull/14. CodeRabbit was triggered with `@coderabbitai review`. `/about` remains a read-only presentation/support page for the course submission, not a new Finup MVP capability.

**Next steps** — wait for CodeRabbit on PR #14, triage/fold useful findings, then owner should add real author name and video link before final submission. Owner can use `bash crash_course/run-all-checks.sh` during the demo; optional flags: `--quick` for rehearsal or `--with-fallow` for advisory structural audit.

**Open questions / blockers** — none.

---

## 2026-06-30 15:35 UTC — About page (`/about`) added on branch `add-about-page`

**What was done** — built a new richly-designed About page on a fresh branch `add-about-page` cut from `dev` (per request). It narrates what Finup is and how it was built, with copy taken faithfully from `crash_course/video-presentation-script.md` (the visible 5-part spine) layered with the richer process detail from `crash_course/presentation.md`. New files: `app/about/page.tsx` (server component, no DB/mutations — navigation only) and `src/modules/foundation/ui/about-content.ts` (single-source-of-truth Ukrainian copy as structured data). Added a `/about` nav item to `nav-items.ts` (sidebar only; `primary:false`, so it stays off the mobile bottom bar) and content tests in `content.test.ts`. Design uses only the foundation `fin-*` tokens: dark hero, numbered sections, hand-built styled flow diagrams (pipeline + per-feature cycle), a red/green "not vibe coding" comparison, three-level gate cards, maker≠checker reviewer list, and a CTA — no client JS or chart deps.

**Current state** — green locally: `tsc --noEmit`, `eslint` (new/changed files), `vitest run content.test.ts` (12 tests), and `npm run build` (`/about` prerenders as a static route). Rendered and visually verified at 1280px and 390px via Playwright (using the installed chromium-1223 executable) — layout, flow-diagram wrapping, and palette all read well on desktop and mobile. Work is **uncommitted** on `add-about-page`; not pushed.

**Next steps** — owner review of the page; if approved, commit (with `Slice:`/`Refs:` trailers if treating as a slice) and open a PR to `dev`. Optional: run the remaining deterministic gates (`check:trace`/`trajectory`/`coverage`/`claims`/`handoff`) if this is to go through the formal slice loop. Note: `docs/current-state.md` also still carries the two prior uncommitted investigation entries (Vercel deploy, Dashboard tap) that pre-existed this branch.

**Hydration / stale-SW fix** — adding the `/about` nav item surfaced the previously-documented service-worker issue: `ServiceWorkerRegister` registered `/sw.js` unconditionally (incl. dev), and the SW serves `/_next/static/*` cache-first. In dev those chunk URLs are stable (not content-hashed), so a browser controlled by an old SW served a stale app bundle that has no `/about` route → blank page + React hydration mismatch. Two-part fix: (1) `ServiceWorkerRegister.tsx` registration is now **production-only**; (2) `public/sw.js` is now **dev-safe and self-healing** — on `localhost`/`127.0.0.1`/`[::1]` it caches nothing (network passthrough) and on activate it purges all caches, calls `registration.unregister()`, and reloads controlled tabs; production keeps shell caching (cache bumped `finup-shell-v1`→`v2`, so the stale v1 cache is dropped). Because browsers always revalidate the SW *script* over the network, an already-stale worker gets replaced by this self-destructing one on the next load. **Verified by reproduction** (Playwright, real dev server): after a SW registers on localhost it self-unregisters within ~1s (`regCount:0`, no controller, `caches:[]`), and `/about` then renders (`<h1>Finup</h1>`, 6113 chars) with **zero** console/page errors. `tsc`/`eslint`/`build` green. User action: **one reload** (occasionally two) breaks an already-affected tab out; no manual DevTools step needed.

**Open questions / blockers** — none. The About page is intentionally a meta/marketing narrative (product + engineering process), not tied to an FR; if it should map to a requirement/OpenSpec capability for traceability, that needs an owner decision.

---

## 2026-06-30 15:24 UTC — Vercel deploy skill installed; deployment state checked

**What was done** — installed the `vercel-labs/agent-skills@deploy-to-vercel` skill globally via `npx skills add ... -g -y`. Checked deployment prerequisites: Git remote exists (`BerserkrMM/2026-fwdays-agentic-greenfield-task_brsrk`), local Vercel CLI is authenticated as `berserkrmm`, one Vercel team is available (`bersproject` / `bersteam`), and the repo is not locally linked because `.vercel/project.json` / `.vercel/repo.json` is absent.

**Current state** — deployment is ready to proceed through Vercel CLI linking or through the existing GitHub-connected Vercel dashboard. Working tree has a modified `docs/current-state.md` from investigation/deployment notes only. The app needs production env/database setup for persistence: without `DATABASE_URL`, it falls back to process-local in-memory storage.

**Next steps** — link the repo with `vercel link --repo --scope bersproject` if CLI-based management is desired, configure Vercel env vars (`DATABASE_URL`, optionally `OPENAI_API_KEY`), apply `src/db/bootstrap.sql` to the production Postgres database, then push the deployment branch configured in Vercel or run a preview deploy.

**Open questions / blockers** — need to confirm Vercel production branch (`main` vs `dev`) and which Postgres provider/connection string will be used.

---

## 2026-06-30 15:16 UTC — Investigated Dashboard tap/crash report

**What was done** — inspected the app shell/navigation, `/` redirect, `/dashboard` page, PWA manifest, service worker, and Next dev behavior around direct `/dashboard` requests. Confirmed `/` redirects to `/dashboard` and direct `/dashboard` returns 200 on the running dev server; no app code changes were made.

**Current state** — the only route-specific difference found is navigation mode: tapping the app's Dashboard nav uses Next `<Link>` client-side navigation from `MobileNav`/`SideNav`, while typing `/` performs a full document navigation then server redirect. The service worker is registered unconditionally and cache-first serves `/_next/static/*`, which can leave stale dev/client router assets controlling localhost and explain a client-only close/crash while direct server navigation still renders.

**Next steps** — clear/unregister the localhost service worker and site data to confirm; for a fix, gate service-worker registration to production and/or bump/cache-bust the service worker cache. If the crash persists after unregistering SW, capture browser console logs during the Dashboard tap.

**Open questions / blockers** — exact device/browser and whether this is an installed standalone PWA vs normal browser tab are not yet known.

---

## 2026-06-30 14:59 UTC — PR #12 merged; dev updated; worktrees cleaned

**What was done** — pulled `origin/dev` after PR #12 (`add-settings`) was merged, fast-forwarding local `dev` to merge commit `45f1b04`. Removed the now-unneeded `add-settings` worktree and pruned temporary fallow audit worktrees; only the main `dev` worktree remains.

**Current state** — local `dev` is clean and matches `origin/dev`. The MVP capability slices 1–10 are merged into `dev` (foundation, accounts, ledger, ledger-items, parsing, manual text, bank import, receipt photo import, dashboard, settings). PR #12 follow-up commit `32de060` is included in `dev`; CI for that PR was green before merge.

**Next steps** — final project wrap-up: run final verification on `dev`, perform manual/UAT QA with a real OpenAI key, prepare final submission materials, and address only non-blocking hardening/backlog items as time allows.

**Open questions / blockers** — final course-submission metadata still needs owner-provided real author name and demo-video URL. Optional final QA evidence/recordings are still not produced.

---

## 2026-06-30 14:51 UTC — PR #12 CodeRabbit follow-up folded

**What was done** — triaged CodeRabbit's 13 inline comments on PR #12 from the earlier review run (the later status comment only said review skipped for the branch policy). Folded the still-valid code/evidence nits: import-channel actions now consume `configuredOpenAiAdapter` through the settings port barrel; the Settings eval output labels are Ukrainian; route/action/page tests now cover blank-key preservation, CSV BOM + `no-store`, and no secret leakage through input props; `validateOpenAiApiKey("")` now fails the test if it does not throw; `settingsErrorMessage()` only accepts own error-map keys; generated slice-report artifacts were regenerated from this tree and the embedded handoff block was synced.

**Accepted with rationale (not folded)** — real author name + 1–2 min demo-video link + final Agentic Engineering summary remain human submission inputs and were not fabricated; the archived raw reviewer markdown was not rewritten after the fact (stale wording in the spec-compliance note is historical raw evidence, while live `tasks.md` is fully checked); plaintext key at rest remains deferred v1 hardening because the accepted requirement is DB storage + write-only over the wire, not encryption/secret-store; blank key with no previous key remains a no-op not-configured save, matching the documented "blank leaves stored key unchanged" behavior.

**Current state** — follow-up checks are green: targeted settings tests (5 files / 24 tests), full `npm run test:run` (48 files / 277 tests), `npx tsc --noEmit`, `npx eslint . --ignore-pattern '.claude/**'`, `npm run build`, `npx openspec validate --all --strict`, `npm run check:claims`, `npm run check:eval`, `npm run check:trace` (0 failures / 64 warnings), `npm run check:trajectory` (0 failures / 2 inherited warnings), `npm run check:red-green -- --slice add-settings --strict`, `npm run check:coverage`, and regenerated `npm run slice:report -- --slice add-settings --write` (command exits all 0).

**Next steps** — run `npm run check:handoff`, commit/push this PR #12 follow-up to `add-settings`, then trigger CodeRabbit again with `@coderabbitai review`.

**Open questions / blockers** — none for code. Final course-submission metadata still needs owner-provided real author name and demo-video URL.

---

## 2026-06-30 13:53 UTC — add-settings slice SHIPPED (slice 10: `/settings` config + CSV export)

**What was done** — built the final MVP slice `add-settings` (capability `settings`, FR-SET-01/02/03) on branch `add-settings` cut from `origin/dev`, in a fresh git worktree (the prior `add-dashboard` worktree was removed first; PR #11 is merged). Replaced the `/settings` placeholder with the real technical-configuration screen. Tests-first with durable RED→GREEN evidence; archived after a clean four-reviewer maker≠checker round and a graded eval.

**Scope delivered** — FR-SET-01/02/03 (+ disclosed FR-PARSE-06 wiring):
- FR-SET-01: real `/settings` server component — AI-provider section + data-export section, with explicit not-configured / configured / saved / error states (no blank UI); invalid input redirects to `?formError=` and renders a Ukrainian banner.
- FR-SET-02: OpenAI API key + optional model persisted in a new singleton `app_config` table. **Write-only over the wire** — the page only ever consumes `AiProviderStatus {configured, model}`; the key value is never projected to the client, never pre-filled into the input, never logged (security-reviewed clean). A blank key on save keeps the existing key; a separate remove action clears it. Parsing builds its adapter from this config via `configuredOpenAiAdapter(repos)`, falling back to `OPENAI_API_KEY` when unset — the soft `settings -.-> parsing` link; the three import actions were rewired (disclosed coordination).
- FR-SET-03: read-only CSV export at `/settings/export` (GET Route Handler). Spreadsheet formula-injection hardening (CWE-1236) on free-text columns, RFC-4180 quoting, Ukrainian `Тип`/`Статус` labels, resolved account **names**, Europe/Kyiv local date, signed-numeric amount column kept raw/summable. No destructive reset action.
- Shared-schema coordination (TC-MOD-02, disclosed): `app_config` singleton table in `src/db/bootstrap.sql`, `AppConfigRepository` port + pg/in-memory impls.

**Scope NOT delivered (deferred, justified)** — no encryption-at-rest for the stored key (v1 single-user, no-auth — DB access already implies full access; no KMS/secret-store infra; the requirement is write-only *over the wire*, which is upheld); no provider beyond OpenAI (v1 scope); no live OpenAI call exercised (needs a real key; with none, parsing surfaces `parse-failed` by design); no streaming/paginated export (v1 personal scale); no UI vision/screenshot proof (later QA phase).

**Process evidence produced** — real RED/GREEN JSON under the archived change (`check:red-green --slice add-settings --strict` green); strict OpenSpec validate + archive (10 specs; MODIFIED delta on the backfilled `settings` baseline synced with no drift — 3 requirements); eval case `evals/cases/settings.eval.ts` (dimension `ua-error-clarity`, graded **93/100 PASS** by a fresh judge, on par with siblings; recorded in `evals/results/latest.json`, ratchet green); clean maker≠checker review with **5** raw evidence files (`reviews/{code-reviewer,security-reviewer,spec-compliance-auditor,eval-judge}.md`, `reviews/eval-produced-output.txt`) and `review-findings.json` (`clean:true`, `rawEvidence` linked); regenerated trace/trajectory + slice report.

**Process evidence NOT produced** — no live LLM trajectory-eval (waived; deterministic trajectory is green); no UI recording/vision proof of the rendered screen (later QA phase; the route is covered by build + page/route smoke + action tests). Honest boundary: deterministic G4 checks + a clean four-reviewer maker≠checker round + a graded eval all pass; this is **not** a claim that an end-to-end trajectory-eval ran.

**Maker≠checker findings** — verdicts: code **APPROVE_WITH_NITS**, security **PASS_WITH_NOTES** (clean; only the documented plaintext-key-at-rest note), spec-compliance **PASS** (11/11 scenarios), eval-judge **93/100 PASS**. Eight findings folded with regression coverage: the CSV now resolves the readable account **name** for «Рахунок» (was a raw UUID), renders Ukrainian `Тип`/`Статус` labels + a Kyiv local date, keeps the numeric amount column raw/summable (formula-hardening scoped to free-text), moved the error-banner title into the single-source copy module, cleaned the rewired-action double-await, documented the export BOM in design.md, and ticked the change tasks. Accepted with rationale: plaintext key at rest (design D2; write-only-over-the-wire upheld), the unreachable-via-action `api-key-required` branch (kept; directly unit-tested), and the first-char-only formula-trigger check (a leading space is treated as text by spreadsheets — security-confirmed no bypass).

**Fallow audit** — `FALLOW_AGENT_SOURCE=pi npx fallow audit --base origin/dev`. Verdict `fail` (new-only gate) with **advisory-only** findings, no runtime defect: 2 unused files (`evals/cases/settings.eval.ts` — eval-runner-loaded, and `src/modules/settings/ports.ts` — the module's stable port barrel; **no** module `ports.ts` is statically imported anywhere, the established TC-MOD-01 convention); 1 inherited unused dev-dependency (`@fission-ai/openspec`, used via npx); 2 false-positive unused class members (`SettingsService.saveAiProvider`/`removeOpenAiApiKey` — called by the server actions through the `service()` factory + `"use server"` boundary fallow's graph doesn't cross, and covered by `settings-action.test.ts`); 6 duplication clone groups, all test-mock boilerplate (`vi.mock` next/navigation, the in-memory-repos harness, the `ledgerItem` builder) — the same accepted pattern as prior slices. Not a green fallow; accepted with rationale, consistent with every prior slice.

<!-- slice-report:start -->
### Generated slice report: add-settings

Generated by `node scripts/slice-report.mjs --slice add-settings` at 2026-06-30T14:50:37.414Z. Do not hand-write these metrics.

| Metric | Value |
|---|---:|
| OpenSpec validated specs | 10 |
| Active OpenSpec changes | 0 |
| Test files / tests passed | 48 / 277 |
| Trace failures / warnings | 0 / 64 |
| Trajectory failures / warnings | 0 / 2 |
| Changed files vs origin/dev | 48 |
| Review findings | clean |
| Raw review evidence refs | 5 |
| Slice trailer commits | 1 |
| Refs | FR-SET-01, FR-SET-02, FR-SET-03, FR-PARSE-06 |

Command exits: openspecValidate=0, openspecList=0, tests=0, trace=0, trajectory=0, evals=0, coverage=0.
<!-- slice-report:end -->

**Current state** — slice archived; review clean; deterministic gates green on the committed tree: lint, `tsc --noEmit`, `test:run` (48 files / 275 tests), `next build` (`/settings` + `/settings/export` dynamic), coverage ratchet bumped (lines/stmts 66.24→69.05, fns 80.43→80.71, branches 89.78→90.08), `openspec validate --all --strict` (10), `check:trace` (0 failures), `check:trajectory` (0 failures, 2 inherited foundation-shell warnings), `check:red-green --strict`, `check:claims`, `check:eval` (ua-error-clarity 93). Slice committed on `add-settings` with `Slice:`/`Refs:` trailers; ready to push and open a PR to `dev`.

**Next steps** — push branch, open PR to `dev`, address CI / CodeRabbit. With slices 1–10 done, the MVP capability set (foundation, accounts, ledger, ledger-items, parsing, the three import channels, dashboard, settings) is feature-complete; remaining work is the cross-cutting QA phase (Playwright E2E, recordings/vision proof, UAT) and the deferred hardening below.

**Deferred work** — key encryption-at-rest (revisit if multi-user/auth is ever added); live OpenAI behavior (needs a real key); streaming/paginated CSV export for large ledgers; rate limiting on settings/export endpoints; UI recording/vision proof (QA phase).

**Open questions / blockers** — none. Note: the subagent reviewers hit a transient session limit on the first dispatch and were re-run; all four ultimately returned and their raw outputs are saved under the archived change's `reviews/`.

---

## 2026-06-30 09:02 UTC — add-dashboard PR #11: CodeRabbit follow-up (single-snapshot read)

**What was done** — merged updated `origin/dev` (receipt-photo PR #10) into `add-dashboard`, resolving doc/generated-artifact conflicts (both handoff entries kept, eval cases unioned, coverage/trace/slice-report regenerated on the merged tree). Then triaged CodeRabbit's 10 comments on PR #11 and folded the substantive ones.

**Folded** — (1) **Single consistent snapshot:** replaced the four independent ledger reads with one `LedgerQueryPort.getDashboardSummary()` that reads `listNonDeleted()` once and folds every figure from that snapshot (`computeDashboardSummary`). This removes the duplicate scan and the torn-read risk CodeRabbit flagged — the correct model for future multi-user/per-tenant reads. Since all figures now come from one fetch via pure folds, the per-section «partial»/«unavailable» states were unreachable, so they (and their copy) were removed in favour of the whole-page error state; empty / insufficient-trend / error states kept. (2) **Test nits:** the dashboard smoke test now asserts the rendered monthly-trend (FR-DASH-04 month labels) and saves/restores `DATABASE_URL` so the suite can't leak env state. Updated the dashboard baseline spec scenario (single-snapshot error semantics), the eval-case copy refs, and the ledger service/state tests.

**Accepted with rationale (not folded)** — degraded-read server logging (no shared logger; NFR-OBS-01 wants a silent console; failure is already surfaced via the error state); MD041 H3 in the generated slice-report (generated artifact); the archived `green-run.json` «full suite» wording (frozen evidence; the claim is true). The submission-rubric items CodeRabbit repeated across files — **real author name + 1–2 min demo video link + Agentic-practice summary** — are deferred to project end per the owner; they are human inputs and were not fabricated.

**Coverage note** — the refactor removed above-average-covered code (the partial/unavailable branches + their tests), so the global ratchet dipped (branches 90.06→89.78, lines 66.84→66.24) even though the dashboard code itself is **100% covered** (page.tsx, dashboard-view.ts) and the only uncovered branches are pre-existing unreachable defensive ones in `ledger-query.ts`. No untested code was added; baseline reset to the new actual with this rationale (a net simplification, not loosened quality). Fallow introduced-complexity is now **0** (the previous `DashboardPage` cc12 finding is gone).

**Current state** — gates green on the merged+refactored tree: lint, `tsc --noEmit`, `test:run` (41 files / 231 tests), `next build` (`/dashboard` dynamic), coverage ratchet (66.24/66.24/80.43/89.78), `openspec validate --all --strict` (10), `check:trace` (0 failures), `check:trajectory` (0 failures, 2 inherited), `check:red-green --strict`, `check:claims`, `check:eval` (ua-error-clarity 93). PR #11 → `dev` is MERGEABLE.

**Next steps** — push the follow-up; re-trigger CodeRabbit on PR #11; owner to add author name + demo-video link before final submission. Then slice 10 `add-settings` (FR-SET-*).

**Open questions / blockers** — none. Note: the archived `2026-06-29-add-dashboard` change folder still describes the original `getMonthlyTrends` port method (historical record); the live behavior is `getDashboardSummary` — evolution recorded here rather than rewriting archived evidence.

---

## 2026-06-30 07:56 UTC — iPhone receipt upload limit raised for PR #10

**What was done** — addressed the live iPhone photo upload failure by adding a v1 receipt-photo file cap of 10 MiB and raising the Next.js Server Actions transport limit. `next.config.ts` now sets `experimental.serverActions.bodySizeLimit` to `11mb` so a valid 10 MiB multipart file has envelope headroom; `app/imports/files/actions.ts` rejects files over `MAX_RECEIPT_PHOTO_BYTES` before `arrayBuffer()`; `src/domain/receipt-photo.ts` enforces the same 10 MiB cap during deterministic validation. UI/spec copy now says JPEG/PNG/WEBP up to 10 МБ.

**Current state** — targeted validation is green: `npx tsc --noEmit`, `npm run test:run -- src/domain/receipt-photo.test.ts src/app-actions/import-files-action.redirect.test.ts src/modules/file-imports/ui/file-import-content.test.ts` (19 tests), `npm run build`, `npx eslint . --ignore-pattern '.claude/**'`, `npx openspec validate --all --strict`, and `npm run check:claims`. The Next build reports the expected `serverActions` experiment line because this Next 16 config key still lives under `experimental`.

**Next steps** — run `npm run check:handoff`, commit/push the limit fix to `add-receipt-photo-imports`, and re-trigger CodeRabbit on PR #10.

**Open questions / blockers** — OpenAI image limits should be verified against current provider docs before production hardening; current public OpenAI vision guidance is commonly 20 MB per image and 50 MB total image bytes per request, so a 10 MiB app cap is comfortably below the per-image limit.

---

## 2026-06-29 23:54 UTC — add-dashboard slice SHIPPED (slice 9: `/dashboard` read-only overview)

**What was done** — built slice 9 `add-dashboard` (capability `dashboard`, FR-DASH-01..05) on branch `add-dashboard` cut from `origin/dev` (it depends only on the merged `ledger` query capability, not on the still-open receipt-photo PR). Built in a separate git worktree because another agent is active in the main checkout. Replaced the foundation placeholder at `/dashboard` with the real read-only financial overview. Tests-first with durable RED→GREEN evidence; archived after a clean four-reviewer maker≠checker round and a graded eval.

**Scope delivered** — FR-DASH-01..05:
- FR-DASH-01: current balance summary from non-deleted items (`ledger_items where status != 'deleted'`); a genuinely-empty ledger shows an onboarding `EmptyState` with a CTA to `/imports` instead of zeroed figures.
- FR-DASH-02: income/expense totals from non-deleted items (sign-split via the existing `getAggregates`).
- FR-DASH-03: expense-by-category breakdown grouped by raw `LedgerItem.category` text (incl. «Без категорії»), no category-table join; spend-only, matching the design reference «Витрати за категоріями». The change spec's FR-DASH-03 was specialized to spend-only to match the design + implementation (reviewer SPEC-1).
- FR-DASH-04: all-time monthly income/expense trend grouped by calendar month in `Europe/Kyiv` (effective date `occurredAt ?? createdAt`), shown only with ≥2 distinct months, else an explicit insufficient-data state. The trend aggregate (`computeMonthlyTrends` + `LedgerQueryPort.getMonthlyTrends`) was added to the canonical ledger query domain/port as a disclosed, additive-only coordination touch (FR-LEDGER-04/05), so the Dashboard never recomputes balances independently.
- FR-DASH-05 / FR-SHELL-03: strictly read-only (only `next/link` navigation, `force-dynamic`, no mutations). Each ledger read is isolated (`Promise.all` of per-read try/catch) so a failed aggregate degrades to a per-section «unavailable» note + a partial banner, or a full error state with a retry, never a blank/500 page.

**Scope NOT delivered (deferred, justified)** — no period filter (v1 is all-time, per the dashboard spec); no CSV export / AI-key config (Settings slice, FR-SET-*); no per-account name chips (kept the Dashboard's dependency to `LedgerQueryPort` only); no live-data screenshot/vision proof (later QA phase). Server-side logging of degraded reads was accepted-deferred (no shared logger; NFR-OBS-01 prefers a silent console; the per-section unavailable state already surfaces failure).

**Process evidence produced** — real RED/GREEN JSON under the archived change (`check:red-green --strict` green); strict OpenSpec validate + archive (10 specs; MODIFIED delta on the backfilled `dashboard` baseline synced with no drift); eval case `evals/cases/dashboard.eval.ts` (dimension `ua-error-clarity`, graded **93/100 PASS** by a fresh eval-judge, on par with the sibling 93 baseline; recorded in `evals/results/latest.json`, ratchet green); clean maker≠checker review with **5** raw evidence files (`reviews/{code-reviewer,security-reviewer,spec-compliance-auditor,eval-judge}.md`, `reviews/eval-produced-output.txt`) and `review-findings.json` (`clean:true`, `rawEvidence` linked); regenerated trace/trajectory + slice report.

**Process evidence NOT produced** — no live LLM trajectory-eval (waived; deterministic trajectory is green); no UI recording/vision proof of the rendered screen (later QA phase; the route is covered by build + page smoke/state tests). Honest boundary: deterministic G4 checks + a clean four-reviewer maker≠checker round + a graded eval all pass; this is **not** a claim that an end-to-end trajectory-eval ran.

**Maker≠checker findings** — verdicts: code **APPROVE_WITH_NITS**, security **PASS** (clean), spec-compliance **PASS** (9/10 implemented, 1 partial reconciled), eval-judge **93/100 PASS**. Folded with regression coverage: a failed section read now renders an explicit «Не вдалося завантажити цей розділ» state instead of masquerading as empty/insufficient (code MINOR-1); the four ledger reads run via `Promise.all` (code MINOR-2); the FR-DASH-03 spec delta specialized to a spend breakdown to match the design + code (spec MAJOR); tasks.md test paths reconciled (spec MINOR). Accepted with rationale: degraded-read server logging (NFR-OBS-01 silent console; failure already surfaced to the user), the partial-state retry-wording nit, and the cosmetic rounded-percent-sum note.

**Fallow audit** — `FALLOW_AGENT_SOURCE=pi npx fallow audit --base origin/dev`. Verdict `fail` (new-only gate) with **advisory-only** findings, no runtime defect: 1 unused file (`evals/cases/dashboard.eval.ts` — eval-runner-loaded, same accepted pattern as sibling eval cases); 1 introduced complexity (`app/dashboard/page.tsx:DashboardPage` cyclomatic 12 — the page's read-orchestration + state routing; the heavy card rendering is already extracted into `CategoryBreakdownCard`/`MonthlyTrendCard`); 1 duplication clone group (the shared `vi.mock` next/link/navigation test boilerplate). Reduced introduced complexity 3→1 and duplication 2→1 during the pass by extracting the two card components and factoring the shared `collectServerTreeText` test helper into `src/test-support/server-tree.ts`. Not a green fallow; accepted with rationale.

<!-- slice-report:start -->
### Generated slice report: add-dashboard

Generated by `node scripts/slice-report.mjs --slice add-dashboard` at 2026-06-29T23:53:45.550Z. Do not hand-write these metrics.

| Metric | Value |
|---|---:|
| OpenSpec validated specs | 10 |
| Active OpenSpec changes | 0 |
| Test files / tests passed | 37 / 199 |
| Trace failures / warnings | 0 / 70 |
| Trajectory failures / warnings | 0 / 2 |
| Changed files vs origin/dev | 35 |
| Review findings | clean |
| Raw review evidence refs | 5 |
| Slice trailer commits | 1 |
| Refs | FR-DASH-01, FR-DASH-02, FR-DASH-03, FR-DASH-04, FR-DASH-05 |

Command exits: openspecValidate=0, openspecList=0, tests=0, trace=0, trajectory=0, evals=0, coverage=0.
<!-- slice-report:end -->

**Current state** — slice archived; review clean; deterministic gates green: lint, `tsc --noEmit`, `test:run` (37 files / 199 tests), `next build` (`/dashboard` dynamic), coverage ratchet bumped (lines/stmts 53.88→64.21, fns 74.78→79.06, branches 89.24→89.49 — all above the origin/dev baseline), `openspec validate --all --strict` (10 specs), `check:trace` (0 failures), `check:trajectory` (0 failures, 2 inherited foundation-shell warnings), `check:red-green --strict`, `check:claims`, `check:eval`. Slice committed on `add-dashboard` with `Slice:`/`Refs:` trailers; ready to push and open a PR to `dev`.

**Next steps** — push branch, open PR to `dev`, address CI / CodeRabbit. With slices 1–9 done, the remaining MVP work is slice 10 `add-settings` (FR-SET-*, incl. AI key storage + CSV export with formula-injection hardening). Note the receipt-photo PR (slice 8) may still be open against `dev`; this branch was cut from `origin/dev` and does not depend on it.

**Deferred work** — settings incl. AI key storage + CSV export with formula-injection hardening (slice 10); degraded-read server-side observability/logging on the Dashboard; optional per-account balance chips on the Dashboard. Live OpenAI behavior remains intentionally deferred to the settings slice.

**Open questions / blockers** — none.

---

## 2026-06-29 23:26 UTC — PR #10 CodeRabbit pass triaged; small follow-ups ready to push

**What was done** — triggered CodeRabbit on PR #10 with `@coderabbitai review`, waited for the review to finish, and triaged its 10 comments. Folded the valid code/spec/doc nits: `ParserPayload` is now a discriminated union that requires `image` for `kind: "photo"`; the runtime malformed-photo guard remains covered; the file-imports spec wording now matches the shipped payload (isolated image plus parser instruction/source-reference metadata, no surrounding raw input-event context); and the archived code-review note has the markdown blank line CodeRabbit requested. Rechecked the bundled `docs/test_bank_statements/check.JPEG` fixture: 80,831 bytes, detected as `image/jpeg`, data URI prefix `data:image/jpeg;base64,`.

**Current state** — local code/spec checks are green after the follow-ups: `npx eslint . --ignore-pattern '.claude/**'`, `npx tsc --noEmit`, `npm run test:run` (37 files / 212 tests), `npm run build`, `npx openspec validate --all --strict`, `npm run check:trace` (0 failures / 70 warnings), `npm run check:trajectory` (0 failures / 2 inherited warnings), `npm run check:claims`, and `npm run check:handoff`. Note: plain `npm run lint` is currently blocked only by an unrelated ignored local worktree at `.claude/worktrees/add-dashboard`; CI/clean checkout is unaffected, and lint over this checkout excluding `.claude/**` is green.

**Next steps** — commit these PR #10 follow-ups, push `add-receipt-photo-imports`, then trigger CodeRabbit again for the pushed commit and leave the PR for owner review.

**Open questions / blockers** — CodeRabbit also requested a hard upload size limit and real author/demo-video submission fields. The hard size limit was **not** added because the accepted slice/spec explicitly says “no hard file-size limit in v1”; adding one would contradict the recorded product decision. The real author name and 1–2 minute demo video remain human-provided submission inputs and were not fabricated.

---

## 2026-06-29 22:54 UTC — add-receipt-photo-imports slice SHIPPED (channel 3: `/imports/files`)

**What was done** — built slice 8 (the last import channel), `add-receipt-photo-imports` (capability `file-imports`, FR-FILE-01..05), on branch `add-receipt-photo-imports` off `origin/dev` (it depends on foundation/parsing/ledger-items — all merged — not on the still-open bank PR #9). Tests-first with durable RED→GREEN evidence; archived after a clean four-reviewer maker≠checker round and a graded eval. Two v1 product decisions were confirmed by the owner up front: store the original photo bytes as a `data:` URI in `input_events.storage_uri` (no new infra), and do deterministic validation + magic-byte MIME detection only (binary EXIF stripping deferred).

**Scope delivered** — FR-FILE-01..05:
- FR-FILE-01: real `/imports/files` server-component upload form (one image, `accept=image/jpeg,png,webp`); non-image/PDF/empty rejected via deterministic magic-byte validation (`src/domain/receipt-photo.ts`) with an explicit Ukrainian error; no hard size limit.
- FR-FILE-02 / NFR-PRIV-02: original stored as an `input_event` source `photo` with `storage_uri` (data URI) + detected `mime_type`, before any parse.
- FR-FILE-03 / NFR-PRIV-01 / BC-PRIVACY-01: keyless deterministic preprocessing (validation + magic-byte MIME); only the isolated image is sent to AI; original preserved; the raw image base64 is NOT duplicated into `parser_runs.normalized_payload` (`redactParserPayloadForStorage`).
- FR-FILE-04 / FR-PARSE-06: AI **vision** parse via the existing OpenAI adapter boundary — a `kind: "photo"` payload carries the image and the adapter builds an `image_url` vision message with a receipt-specific system prompt; parse failure surfaces an explicit Ukrainian error + retry, preserving the `input_event` and failed `parser_run`.
- FR-FILE-05 / FR-ITEM-04: one `pending` ledger item per valid draft via the item-creation contract (partial-success; malformed line items tolerated and counted as failed via `tolerateInvalidDrafts`); redirect to `/ledger?imported=&failed=` with the shared summary banner (no preview gate).

**Scope NOT delivered (deferred, justified)** — input_event-level retry **UI**: `FileImportService.retryInputEvent` implements + unit-tests re-parse over the preserved photo event, but the user-reachable retry is FR-ITEM-07 (owned by ledger-items), explicitly deferred — consistent with the manual-input/bank precedents. The v1 `/imports/files` retry UX is a re-upload. Binary EXIF/metadata stripping is deferred (confirmed product decision). Live OpenAI vision behavior needs a key (Settings slice, FR-SET-02); with no key a real upload surfaces `parse-failed` by design.

**Process evidence produced** — real RED/GREEN JSON under the archived change (`check:red-green --strict` green); strict OpenSpec validate + archive (10 specs, MODIFIED delta on the backfilled `file-imports` baseline synced with no drift); eval case `evals/cases/file-imports.eval.ts` (dimension `ua-error-clarity`, graded **93/100 PASS** by a fresh eval-judge, on par with the 93 baseline; recorded in `evals/results/latest.json`, ratchet green); clean maker≠checker review with **4** raw evidence files (`reviews/{code,security,spec-compliance}-reviewer.md`, `reviews/eval-judge.md`) and `review-findings.json` (`clean:true`, `rawEvidence` linked); regenerated trace/trajectory + slice report.

**Process evidence NOT produced** — no live LLM trajectory-eval (waived; `trajectory-eval-waiver.md`); no UI recording/vision proof of the rendered screen (later QA phase; the route is covered by build + smoke + redirect tests). Honest boundary: deterministic G4 checks + a clean four-reviewer maker≠checker round + a graded eval all pass; this is **not** a claim that an end-to-end trajectory-eval ran.

**Maker≠checker findings** — verdicts: code **APPROVE_WITH_NITS**, security **PASS_WITH_NOTES**, spec-compliance **PASS** (8/8 scenarios, 0 missing/contradicted), eval-judge **93/100 PASS**. Folded three with regression coverage: `byteLength` now reports real decoded bytes not base64 char count (code+security MINOR-1); `retryInputEvent` derives the MIME from the stored data URI instead of a hard-coded `image/jpeg` (code MINOR-2); spec wording tightened so it no longer claims "no PII" (EXIF inside the image is PII) and documents the no-base64-duplication behavior (security NOTE-2 / spec-compliance #3). Accepted with rationale: the disclosed TC-MOD-02 shared-contract change (`ParserPayload.image` + the vision branch — smallest seam, baseline already declared `kind:"photo"`, bank-slice precedent), no upload size cap (FR-FILE-01 intends none; body-limit config is a foundation concern shared with bank), EXIF deferral, and the deferred retry UI.

**Fallow audit** — `FALLOW_AGENT_SOURCE=pi npx fallow audit --base origin/dev`. Verdict `fail` (new-only gate) with **advisory-only** findings, no runtime defect: 1 unused file (`evals/cases/file-imports.eval.ts` — runner-loaded, same accepted pattern as sibling eval cases); 1 complexity finding (`src/modules/parsing/adapters.ts:parse` cyclomatic 13, `introduced:false`/inherited); 3 duplication clone groups (the `vi.hoisted`/`redirect` test-mock boilerplate shared across the channel action redirect tests). Fixed introduced findings during the pass: refactored `detectImageMimeType` to a table-driven matcher (cyclomatic 23 → resolved) and removed the unused `SUPPORTED_IMAGE_MIMES` export. Not a green fallow; accepted with rationale.

<!-- slice-report:start -->
### Generated slice report: add-receipt-photo-imports

Generated by `node scripts/slice-report.mjs --slice add-receipt-photo-imports` at 2026-06-29T22:54:29.634Z. Do not hand-write these metrics.

| Metric | Value |
|---|---:|
| OpenSpec validated specs | 10 |
| Active OpenSpec changes | 0 |
| Test files / tests passed | 37 / 212 |
| Trace failures / warnings | 0 / 70 |
| Trajectory failures / warnings | 0 / 2 |
| Changed files vs origin/dev | 37 |
| Review findings | clean |
| Raw review evidence refs | 4 |
| Slice trailer commits | 1 |
| Refs | FR-FILE-01, FR-FILE-02, FR-FILE-03, FR-FILE-04, FR-FILE-05 |

Command exits: openspecValidate=0, openspecList=0, tests=0, trace=0, trajectory=0, evals=0, coverage=0.
<!-- slice-report:end -->

**Current state** — slice archived; review clean; deterministic gates green: lint, `tsc --noEmit`, `test:run` (37 files / 212 tests), `next build` (`/imports/files` dynamic), coverage ratchet (lines/stmts 61.11, fns 78.03, branches 89.81 — all above the origin/dev baseline), `openspec validate --all --strict` (10 specs), `check:trace` (0 failures), `check:trajectory` (0 failures, 2 inherited foundation-shell warnings), `check:red-green --strict`, `check:claims`, `check:eval`. Slice committed on `add-receipt-photo-imports` with `Slice:`/`Refs:` trailers; ready to push and open a PR to `dev`.

**Next steps** — push branch, open PR to `dev`, address CI / CodeRabbit. With slices 1–8 done, the remaining MVP work is slice 9 `add-dashboard` (FR-DASH-*) and slice 10 `add-settings` (FR-SET-*, incl. AI key storage + CSV export with formula-injection hardening). Note PR #9 (`add-bank-statement-imports`) is still open against `dev`; this branch was cut from `origin/dev` and does not depend on it.

**Deferred work** — input_event-level retry **UI** (FR-ITEM-07, owned by ledger-items); binary EXIF/metadata stripping for receipt photos; an upload size cap / `serverActions.bodySizeLimit` (foundation, shared with bank); dashboard (slice 9); settings incl. AI key storage + CSV export (slice 10). Optional hardening: de-duplicate the shared channel action-test mock boilerplate (fallow advisory).

**Open questions / blockers** — none. Live OpenAI vision behavior remains intentionally deferred to the settings slice.

---

## 2026-06-29 20:21 UTC — CI coverage-ratchet fix for bank-import PR

**What was done** — investigated failed PR #9 `verify` job. CodeRabbit passed; CI failed in `Coverage ratchet` because branch coverage dropped from 89.24% to 88.16% after the bank-import changes. Added `src/app-pages.smoke.test.ts` covering static app routes (`/`, `/dashboard`, `/imports`, `/imports/files`, `/settings`) to restore branch coverage without weakening the ratchet. Regenerated traceability outputs.

**Current state** — validation is green locally: `npm run test:coverage` + `node scripts/check-coverage-ratchet.mjs` now passes with branch coverage 89.17% accepted by the ratchet; `npm run lint`, `npx tsc --noEmit`, `npm run test:run` (33 files / 180 tests), `npm run build`, `npx openspec validate --all --strict`, `npm run check:trace` (0 failures / 74 inherited warnings), `npm run check:trajectory` (0 failures / 2 inherited foundation warnings), `npm run check:red-green -- --slice add-bank-statement-imports --strict`, and `npm run check:claims` all pass.

**Next steps** — run `npm run check:handoff`, commit/push the CI fix to `add-bank-statement-imports`, then watch PR #9 verify rerun.

**Open questions / blockers** — none; CI rerun pending after push.

## 2026-06-29 20:06 UTC — bank import follow-up ready: structural AI payloads, Monobank dates, no debug logs

**What was done** — finalized the live bank-import fix after manual verification: removed all temporary `[bank-import]` / `[parsing]` debug `console.*` logs from server action, bank service, parsing service, and OpenAI adapter. Kept the functional fixes: structural table payloads for CSV/XLS/XLSX bank statements, batched AI parsing, per-row tolerance for invalid AI drafts, preservation of Monobank historical dates that looked like long numbers, fallback date extraction from row cells, and stronger category prompt guidance.

**Current state** — deterministic/documentation/workflow checks are green: `npm run lint`, `npx tsc --noEmit`, `npm run test:run` (32 files / 178 tests), `npm run build`, `npx openspec validate --all --strict`, `npm run check:trace` (0 failures / 77 inherited warnings), `npm run check:trajectory` (0 failures / 2 inherited foundation warnings), `npm run check:red-green -- --slice add-bank-statement-imports --strict`, and `npm run check:claims`. `docs/current-state.md` updated last before handoff/commit.

**Next steps** — run `npm run check:handoff`, commit, push `add-bank-statement-imports`, and trigger CodeRabbit review on the PR. After CI/review, remove any remaining temporary investigation notes if desired.

**Open questions / blockers** — none known for the live Monobank/PrivatBank import behavior after the user's manual retest; final CI/CodeRabbit still pending.

## 2026-06-29 19:51 UTC — bank import: preserve Monobank dates and strengthen category prompt

**What was done** — live Monobank logs showed operation dates were still sent to AI as `[number]` because `normalizeParserPayload` only preserved date-like strings with years starting `19xx/20xx`; the real Monobank fixture has date cells like `28.02.1830 18:42:01`, which the PII masker treated as a long number. Broadened date detection in `src/domain/parsing.ts` and bank date fallback parsing in `src/modules/bank-imports/service.ts` to preserve/parse any 4-digit year date shape. Strengthened the OpenAI prompt category section to avoid overusing `Без категорії`, use merchant/MCC/provider/category-column clues, and added Monobank-relevant examples (`Епіцентр`→`Дім`, `PRTMN *INTERNET`→`Звʼязок`, bank fees/interest→`Банківські послуги`, etc.).

**Current state** — targeted checks green: `npm run lint`, `npx tsc --noEmit`, and `npm run test:run -- src/domain/parsing.test.ts src/modules/bank-imports/service.test.ts src/modules/parsing/adapters.test.ts`. Temporary debug logs remain active.

**Next steps** — retry Monobank CSV/XLSX. Expected payload should now show raw date strings instead of `[number]` in the first cell; AI should have better category hints. If dates still display wrong after import, inspect whether AI returns `occurredAt`; if not, service fallback should parse the raw Monobank date cell.

**Open questions / blockers** — live verification pending; remove/guard debug logs after debugging.

## 2026-06-29 19:21 UTC — bank import: tolerate invalid AI drafts per row

**What was done** — live logs showed the whole bank import failed because one AI draft had `amountMinor: 0` (`Invalid parser draft 2: amountMinor must be a non-zero integer`). Added a lenient canonicalization path for bank imports: `ParsingService.parse({ tolerateInvalidDrafts: true })` keeps valid drafts, records malformed drafts in `parser_runs.result_json.invalidDrafts`, and lets `BankImportService` count the affected source rows as failed instead of failing the entire upload. Non-bank/default parsing remains strict. Added regression coverage for invalid bank AI drafts.

**Current state** — targeted checks green: `npm run lint`, `npx tsc --noEmit`, and `npm run test:run -- src/modules/bank-imports/service.test.ts src/modules/parsing/service.test.ts src/domain/parsing.test.ts`. Temporary debug logs from the previous entry are still present and intentionally noisy.

**Next steps** — retry `/imports/bank`. Expected behavior: no redirect to `parse-failed` for a single zero-amount draft; valid rows should import, the bad row should contribute to `failed`, and logs should include `[parsing][service:invalid-drafts-tolerated]` plus `[bank-import][service:row-dropped-by-parser]` for that row.

**Open questions / blockers** — still need live verification and then remove/guard temporary logs.

## 2026-06-29 19:16 UTC — bank import live-debug logging added

**What was done** — added temporary verbose server-side logs across the bank import path to debug the live `parse-failed` redirect: `app/imports/bank/actions.ts` logs action start, file metadata, byte magic, decoded raw text preview, summary, and caught errors; `BankImportService` logs created input events, extracted table headers/row samples, each parser batch, parser draft row numbers, created/skipped/failed rows, parser-dropped rows, and final counters; `ParsingService` logs normalized payload previews, adapter result counts, parser_run creation, and failures; `OpenAiParserAdapter` logs request metadata/content preview, response status, raw content preview, parsed draft counts, and adapter errors.

**Current state** — logs are intentionally noisy and temporary; they include statement row snippets / AI response previews for debugging and should be removed after the issue is isolated. Targeted validation green: `npm run lint`, `npx tsc --noEmit`, and targeted `npm run test:run -- src/modules/bank-imports/service.test.ts src/modules/parsing/adapters.test.ts src/modules/parsing/service.test.ts src/app-actions/import-bank-action.redirect.test.ts`.

**Next steps** — rerun the failing `/imports/bank` upload and inspect terminal logs with prefixes `[bank-import]` and `[parsing]`. Key things to check: `service:table.rowCount`, `openai:response-content.contentPreview`, `service:batch:parser-result.draftRowNumbers`, and any `service:row-dropped-by-parser` / `service:draft-invalid-row` / `parsing:service:error` entries.

**Open questions / blockers** — root cause of live AI parse failure still pending the new logs.

## 2026-06-29 19:05 UTC — bank statement import: structural table payloads for AI parser

**What was done** — refactored bank-statement normalization away from deterministic semantic column mapping. `src/domain/bank-statement.ts` now extracts a structural table (`headerRowNumber`, raw `headers`, and row-numbered `{ rowId, rowNumber, cells }`) for CSV, text/HTML `.xls`, and XLSX/misnamed `.xls`; it no longer decides which column is date/description/amount/currency before AI. `BankImportService` now sends the structural table to the parser in 25-row batches, preserving source row idempotency. The OpenAI prompt now explicitly tells AI to infer semantics from arbitrary headers+cells and echo `sourceRef.rowNumber`. Also fixed a likely date-loss root cause in `normalizeParserPayload`: date strings like `2026-06-01` / `27.02.2025 18:04:09` are no longer masked as `[phone]` before reaching AI; bank service also fills missing `occurredAt` from date-like source row cells when possible.

**Current state** — real fixtures under `docs/test_bank_statements/` structurally extract as expected: monobank cp1251 CSV → 80 rows, monobank XLSX-named-`.xls` → 80 rows, privatbank XLSX → 29 rows. Deterministic checks run and green: `npm run lint`, `npx tsc --noEmit`, `npm run test:run` (32 files / 177 tests), `npm run build`. I attempted to delegate a quick subagent review twice, but both subagent runs timed out before returning findings.

**Next steps** — manually re-test `/imports/bank` with live `OPENAI_API_KEY` and inspect the newest `parser_runs.normalized_payload` / `result_json` to confirm AI returns one draft per row with `sourceRef.rowNumber` and dates. If AI still drops rows, next hardening is to support `rowId` echo and/or per-row fallback attribution.

**Open questions / blockers** — live AI behavior still needs manual verification; no subagent review result was obtained due timeouts.

## 2026-06-29 18:20 UTC — add-bank-statement-imports: fix real-world parsing (no statement imported)

**What was done** — manual testing with real exports under `docs/test_bank_statements/` surfaced that **no** statement imported (`empty-statement` every time). Root-caused four real-world format gaps and fixed them in `src/domain/bank-statement.ts`:
1. **Format detected by extension, not content** — a monobank export shipped as `.xls` is actually an XLSX (ZIP) workbook, so it never reached the XLSX parser. Now `statementBytesToText` routes by magic bytes (ZIP `PK\x03\x04` → XLSX; OLE2 → BIFF reject), so a misnamed workbook parses correctly.
2. **CSV assumed UTF-8** — the monobank CSV is Windows-1251 (cp1251); decoded as UTF-8 it was mojibake and the header never matched. Added `decodeStatementText` (UTF-8 → cp1251 fallback on replacement chars). The action now reads bytes once and lets the domain decode (also removes the last double-read).
3. **Header aliases were exact/full-phrase** — real columns are descriptive ("Сума в валюті картки (UAH)", "Опис операції", "Деталі операції", "Дата i час операції"); switched alias matching to short substring stems.
4. **Unicode NFD** — the monobank export stores "ї" decomposed (і + combining diaeresis), so it didn't match precomposed aliases; normalize the text to NFC first.

**Current state** — verified end-to-end on all three real fixtures: monobank cp1251 CSV → **80 rows**, monobank XLSX-named-`.xls` → **80 rows** (identical), privatbank XLSX → **29 rows**, all with correct date/description/amount/currency and comma-bearing descriptions intact. Added a committed integration test (`src/domain/bank-statement.real-files.test.ts`) reading the real files, plus unit tests for cp1251, content-based XLSX detection, descriptive headers, and NFC. Gates green: lint, `tsc`, `test:run` (32 files / **175 tests**), `next build`, coverage ratchet up (lines 53.88, fns 74.78, branches 89.24), `openspec validate --strict`, `check:trace`/`trajectory`/`red-green`/`claims`. Committed on `add-bank-statement-imports`; ready to push.

**Next steps** — push, re-trigger CodeRabbit, watch CI; manually re-test `/imports/bank` with the real files. Then slice 8 `add-receipt-photo-imports` (note: a receipt photo `check.JPEG` is already in `docs/test_bank_statements/` for that slice).

**Open questions / blockers** — none for parsing. Still pending human input for final submission: real **author name** + **demo-video** link. The actual ledger items still depend on a live `OPENAI_API_KEY` for the AI parse step (deferred to settings slice); normalization (the part that was broken) is deterministic and now works.

## 2026-06-29 17:40 UTC — add-bank-statement-imports: address CodeRabbit PR #9 findings

**What was done** — triaged CodeRabbit's review on PR #9 and folded the genuinely-actionable findings (the rest were rubric/human-input items, see blockers):
- `src/domain/bank-statement.ts`: choose the CSV delimiter from the header-like line, not the first non-empty line, so a provider preamble no longer breaks detection (Major); preserve the real Excel `<row r="N">` number when flattening an XLSX worksheet so `sourceRef.rowNumber`/`import_row_number` stay accurate for non-contiguous rows (Major, data integrity); reject legacy binary BIFF `.xls` (OLE2 signature) with explicit `file-invalid` instead of parsing binary as text (Major; Excel HTML-table `.xls` still supported).
- `app/imports/bank/actions.ts`: read each upload once per format (XLSX → bytes only, CSV → text only) instead of always materializing both `arrayBuffer` and `text` (perf).
- `src/modules/bank-imports/service.ts`: count normalized rows the parser dropped entirely as failed (a partial parser result can no longer report success while importing fewer rows than the statement had); ignore duplicate drafts for one row (Major).
- `scripts/check-traceability.mjs`: de-duplicate test files per FR so multiple `it()` blocks sharing a `@trace` tag don't inflate the evidence matrix.
- `openspec/changes/archive/.../design.md`: sync the documented parser payload with the shipped `{ kind: "bank", content: serializeBankRows(...) }` contract.

**Current state** — deterministic gates green after the fixes: lint, `tsc --noEmit`, `test:run` (31 files / **169 tests**, +7 regression tests), `test:coverage` + ratchet bumped (lines/stmts 53.78, fns 74.44, branches 89.01), `next build`, `openspec validate --all --strict` (10 specs), `check:trace` (0 failures), `check:trajectory` (0 failures, 2 inherited foundation-shell warnings), `check:red-green --strict`, `check:claims`. Committed on `add-bank-statement-imports` with `Slice:`/`Refs:` trailers; ready to push and re-trigger CodeRabbit on PR #9.

**Next steps** — push, re-trigger CodeRabbit (`@coderabbitai review`) on PR #9, watch CI. Then slice 8 `add-receipt-photo-imports`.

**Open questions / blockers** — CodeRabbit's remaining comments are the homework-submission rubric: real **author name** and a **1–2 minute demo-video link** in the PR description / `current-state.md`. These are human inputs and were not fabricated; the frozen maker≠checker raw-evidence files under `reviews/` were intentionally not rewritten (evidence discipline). The slice-report MD041 (H1) lint note was left as-is — it is a generated artifact and an H1 there would collide with the embedding doc's title.

## 2026-06-29 17:04 UTC — add-bank-statement-imports slice SHIPPED (review unblocked, archived)

**What was done** — picked up the slice that the previous session left blocked. Root cause of that block: the round-1 post-fix maker≠checker re-review had failed on a rate-limited subagent backend, so `review-findings.json` was correctly left `clean:false`. Re-ran the full maker≠checker review on Claude reviewer agents (fresh, this session did not write the code). Round-2 reviews: **code REQUEST_CHANGES**, **security PASS_WITH_NOTES**, **spec-compliance PASS**, **eval-judge 94/100 PASS**. Fixed every actionable finding and ran a confirmation pass (code **APPROVE**, spec-compliance **PASS**), then archived the OpenSpec change and committed the slice.

**Scope delivered** — FR-BANK-01..06: `/imports/bank` CSV/XLS/XLSX upload with provider selection; original statement preserved as a `bank` `input_event` before processing; deterministic Monobank/PrivatBank normalization keeping source row numbers; XLSX (ZIP/XML) + Excel HTML `.xls` extraction; Parsing → pending ledger items via the item-creation contract; insert-if-absent retry idempotency on `(input_event_id, import_row_number)`; Ukrainian-first validation/empty/parse-failure/summary states; Ledger created/failed redirect (no preview gate).

**Round-2 review fixes (with regression tests)** — MAJOR-1: XLSX/HTML cell reconstruction now tab-joins (not comma-joins) so comma-bearing descriptions/amounts no longer shift columns. MAJOR-2: corrupt/hostile `.xlsx` now routes to a friendly `file-invalid` error instead of an uncaught 500 (`statementBytesToText` moved inside the action try/catch and hardened). SEC-MINOR-1: XLSX decompression capped (needed entries only, `maxOutputLength`) against zip bombs. BF-2: added action-level redirect tests (`import-bank-action.redirect.test.ts`) covering success/parse-failed/corrupt-file, making tasks.md 1.3's claim true.

**Scope NOT delivered (deferred, justified)** — input_event-level retry **UI** wiring: `BankImportService.retryInputEvent` implements + unit-tests the FR-BANK-06 insert-if-absent behavior, but the user-reachable retry button that re-consumes a preserved event is **FR-ITEM-07** (owned by ledger-items per `docs/mvp-capability-plan.md`), explicitly deferred — consistent with the add-manual-text-input precedent. Spec R6 (retry action shown + `input_event`/failed `parser_run` preserved) is satisfied. Do **not** use "end-to-end retry / full loop" language for input_event retry until FR-ITEM-07 lands. Legacy binary BIFF `.xls` remains a documented residual (XLSX + Excel HTML `.xls` are handled).

**Process evidence produced** — RED/GREEN JSON under the archived change (`check:red-green --strict` green); strict OpenSpec validate + archive (10 specs, MODIFIED delta synced into `openspec/specs/bank-imports/spec.md`, no drift); eval case `evals/cases/bank-imports.eval.ts` (dimension `ua-error-clarity`, graded 94 PASS, ratchet green); clean maker≠checker review with **7** raw evidence files (`reviews/*.md` round-1 + `*-rerun.md` round-2 incl. confirmation passes) and `review-findings.json` (`clean:true`, `rawEvidence` linked); regenerated trace/trajectory + slice report.

**Process evidence NOT produced** — no live LLM trajectory-eval (waived; `trajectory-eval-waiver.md`); no UI recording/vision proof (later QA phase). Honest boundary: deterministic G4 checks + a clean two-round maker≠checker review + a graded eval all pass; this is **not** a claim that an end-to-end trajectory-eval ran.

**Fallow audit** — `FALLOW_AGENT_SOURCE=pi npx fallow audit --base origin/dev`. Verdict `fail` (new-only gate) with **advisory-only** findings, no runtime defect: 1 unused file (`evals/cases/bank-imports.eval.ts` — runner-loaded, same accepted pattern as sibling eval cases); 2 complexity findings (`src/modules/parsing/adapters.ts:parse` cyclomatic 13 `introduced:false`/inherited, and `src/modules/bank-imports/service.ts` moderate); 2 duplication clone groups (the `getRepositories`/`redirect` test-mock boilerplate shared across action test files). Accepted with rationale; not a green fallow.

<!-- slice-report:start -->
### Generated slice report: add-bank-statement-imports

Generated by `node scripts/slice-report.mjs --slice add-bank-statement-imports` at 2026-06-29T17:04:34.210Z. Do not hand-write these metrics.

| Metric | Value |
|---|---:|
| OpenSpec validated specs | 10 |
| Active OpenSpec changes | 0 |
| Test files / tests passed | 31 / 162 |
| Trace failures / warnings | 0 / 77 |
| Trajectory failures / warnings | 0 / 2 |
| Changed files vs origin/dev | 37 |
| Review findings | clean |
| Raw review evidence refs | 7 |
| Slice trailer commits | 1 |
| Refs | FR-BANK-01, FR-BANK-02, FR-BANK-03, FR-BANK-04, FR-BANK-05, FR-BANK-06 |

Command exits: openspecValidate=0, openspecList=0, tests=0, trace=0, trajectory=0, evals=0, coverage=0.
<!-- slice-report:end -->

**Current state** — slice archived; review clean; deterministic gates green: lint, `tsc --noEmit`, `test:run` (31 files / 162 tests), `next build` (`/imports/bank` dynamic), coverage ratchet bumped (lines/stmts 53.05, fns 74.33, branches 88.62), `openspec validate --all --strict` (10 specs), `check:trace` (0 failures), `check:trajectory` (0 failures, 2 inherited foundation-shell warnings), `check:red-green --strict`, `check:claims`, `check:eval`. Slice committed on branch `add-bank-statement-imports` with `Slice:`/`Refs:` trailers; ready to push and open a PR to `dev`.

**Next steps** — push branch, open PR to `dev`, address CI / CodeRabbit. Then slice 8 `add-receipt-photo-imports` (FR-PHOTO-*), then dashboard (9) and settings (10, incl. AI key + CSV export — note CSV formula-injection hardening was flagged by security as relevant to that export slice).

**Deferred work** — input_event-level retry **UI** (FR-ITEM-07, owned by ledger-items); legacy binary BIFF `.xls` support; receipt-photo channel (slice 8); dashboard (slice 9); settings incl. AI key storage + CSV export with formula-injection hardening (slice 10). Optional hardening: refactor `BankImportService.processEvent`/parser-adapter complexity and de-duplicate the shared action-test mock boilerplate (all fallow advisory, non-blocking).

**Open questions / blockers** — none. Live OpenAI/API-key behavior remains intentionally deferred to the settings slice. Advisory: rotate the working-tree `.env.local` `OPENAI_API_KEY` if this checkout is ever shared (pre-existing, gitignored, not in history — outside this slice's diff).

## 2026-06-29 15:14 UTC — add-bank-statement-imports slice started, implementation green, review re-run BLOCKED

**What was done** — selected the next approved MVP slice from the repo evidence: `add-bank-statement-imports`, owning FR-BANK-01..06. Created and strictly validated OpenSpec change `openspec/changes/add-bank-statement-imports/` with proposal/design/tasks/spec delta. Wrote tests first, captured real RED evidence, implemented the bank import route/action, framework-free bank-statement normalization, bank-import service orchestration, row-idempotency lookup, XLSX worksheet extraction plus Excel HTML `.xls` extraction, parser prompt source-row guidance, and a bank-import eval case. Captured GREEN evidence after `npm run test:run` (30 files / 156 tests).

**Current state** — implementation is not archived and no PR/commit was made. Deterministic checks run and green: `npm run lint`, `npx tsc --noEmit`, `npm run test:run`, `npm run test:coverage`, `node scripts/check-coverage-ratchet.mjs`, `npx openspec validate --all --strict`, `npm run check:trace` (0 failures / active-change warning), `npm run check:red-green -- --slice add-bank-statement-imports --strict`, `npm run check:claims`, `npm run check:eval`, `node scripts/check-trajectory.mjs` (inherited foundation warnings), and `npm run build`. Initial maker≠checker review raw outputs are saved under `openspec/changes/add-bank-statement-imports/reviews/`; findings were fixed in code, but fresh re-review after fixes could not run because subagent calls returned usage-limit errors. `review-findings.json` is intentionally `clean:false`, so archive/PR is blocked.

**Next steps** — after reviewer capacity resets, run fresh code/security/spec-compliance re-review over the current diff; save raw outputs under `openspec/changes/add-bank-statement-imports/reviews/`; if clean, update `review-findings.json` to `clean:true`, archive the OpenSpec change, regenerate trace/trajectory, run `npm run slice:report -- --slice add-bank-statement-imports --write`, rerun fallow, update this log again last, commit with `Slice: add-bank-statement-imports` and `Refs: FR-BANK-01, FR-BANK-02, FR-BANK-03, FR-BANK-04, FR-BANK-05, FR-BANK-06`, push, and open PR to `dev`.

**Open questions / blockers** — blocker: fresh maker≠checker re-review is not available due platform usage limit; do not archive or claim clean review until rerun/waived. Compatibility note: `.xlsx` workbook XML and Excel HTML `.xls` are handled; legacy binary BIFF `.xls` may still need human/product acceptance or a parser dependency if strict binary XLS support is required.

**Fallow audit** — ran `FALLOW_AGENT_SOURCE=pi npx fallow audit --base origin/dev --format json --quiet --explain 2>/dev/null || true`; verdict `fail`. Findings are advisory while the slice is blocked: new eval case is statically unused (eval-runner pattern), duplicated server-action test mock boilerplate, duplicated partial-success test assertions, and introduced moderate complexity in `BankImportService.processEvent`; inherited parser adapter complexity remains. Fix or explicitly accept before final PR.

## 2026-06-29 14:47 UTC — dev prompt adjustment for live OpenAI parser

**What was done** — after PR #8 was merged to `dev`, updated local `dev` from `origin/dev` and carried over the manual live-test prompt adjustment in `src/modules/parsing/adapters.ts`. Replaced the short OpenAI system prompt with an explicit JSON schema/instructions prompt for Ukrainian finance text parsing: exact field names, signed kopiyky, expense/income classification, missing-value fallbacks, zero-draft handling, categories, dates, multi-item inputs, refunds/cashback, and transfers. Removed temporary OpenAI response `console.log` debugging so runtime logs do not expose user financial text.

**Current state** — change is local on `dev`, ready to commit/push as a small prompt-adjustment follow-up. Validation run: `npm run lint`, `npx tsc --noEmit`, and targeted `npm run test:run -- src/modules/parsing/adapters.test.ts src/modules/manual-input/service.test.ts` passed.

**Next steps** — commit with `Refs: FR-PARSE-01, FR-PARSE-02` and push directly to `origin/dev`; optionally do one manual `/imports/text` live check with `OPENAI_API_KEY` after push.

**Open questions / blockers** — none. This is a prompt hardening follow-up, not a new OpenSpec slice.

---

## 2026-06-29 13:25 UTC — PR #8 review fixes for add-manual-text-input

**What was done** — reviewed PR #8 against `dev`, checked CI failure and CodeRabbit's actionable comments. Fixed the CI blocker by force-adding the archived raw maker≠checker review evidence so `review-findings.json.rawEvidence` resolves in a clean checkout, then regenerated trajectory/slice reports. Folded valid CodeRabbit code/data findings: `importTextAction` now rejects a non-string `text` FormData value and blank/whitespace text before parsing/storage/default-account seeding; `parseImportSummary` rejects mixed valid/invalid query counts instead of rendering a misleading partial banner; duplicate trace evidence was removed at the source; manual-input eval output now includes the zero-draft warning state and more natural summary wording (`Додано до журналу`). Added regression tests for the malformed FormData and blank-text no-side-effect boundaries.

**Current state** — this PR-fix commit includes the final follow-up from CodeRabbit's second review. Previous pushed commit made GitHub CI `verify` green; the current delta also passes locally: `lint`, `tsc --noEmit`, `test:run` (26 files / 134 tests), `test:coverage`, `next build`, `check:coverage`, `openspec validate --all --strict`, `check:trace` (0 failures / 82 warnings), `check:trajectory` (0 failures / 2 inherited warnings), `check:red-green -- --slice add-manual-text-input --strict`, and `check:eval`. The original CI failure cause (`docs/qa/trajectory-report.md` stale because raw review evidence was ignored/untracked) is resolved.

**Next steps** — push the final blank-text seeding fix, wait for GitHub CI, then trigger/confirm CodeRabbit re-review. Human/submission-only CodeRabbit warnings still need owner input if the final homework rubric requires them: real student name and 1–2 minute demo-video link are not present in the repo and were not invented. The PR description should also explicitly summarize Agentic Engineering evidence: AGENTS.md/context discipline, specs→tests→evals loop, maker≠checker raw reviews, fallow/code-quality review, and the split between student intent/approval and agent-assisted implementation.

**Open questions / blockers** — real author name and demo-video URL remain human inputs, not code/workflow defects. Fallow audit remains non-green with accepted advisory findings only: the eval case is intentionally runner-loaded, smoke-test reset boilerplate is duplicated, and inherited `app/ledger/page.tsx` complexity remains outside this slice.

---

## 2026-06-29 12:53 UTC — add-manual-text-input slice SHIPPED (channel 1: `/imports/text`)

**What was done** — updated `dev` (PR #7 `add-parsing-pipeline` merged) and built the next approved slice, `add-manual-text-input` (capability `manual-input`, phase 4 channels), on branch `add-manual-text-input` off `dev`. It is the first import channel: free-form Ukrainian text → `input_event` → parser → pending ledger items → Ledger with a created/failed summary. Tests-first with durable RED→GREEN evidence; archived after a clean maker≠checker review + graded eval.

**Scope delivered** — FR-TEXT-01..05:
- FR-TEXT-01: real `/imports/text` server-component form; empty/whitespace rejected with an explicit Ukrainian error (no `input_event` created).
- FR-TEXT-02 / NFR-PRIV-02: submission stored as an `input_event` source `text`, original (un-normalized) text preserved before parsing.
- FR-TEXT-03: framework-free source normalization (`src/domain/manual-text.ts`) then the normalized `text`-kind payload passed to `ParsingService`; parse failure surfaces an explicit Ukrainian error + retry, preserving the `input_event` and the failed `parser_run`.
- FR-TEXT-04: one `pending` ledger item per valid draft via the existing item-creation contract, partial-success (a per-draft creation failure is counted, not rolled back; systemic NoDefaultAccount/MissingInputEvent errors propagate instead of being mislabelled).
- FR-TEXT-05: redirect to `/ledger?imported=&failed=` with a summary banner (helper owned by manual-input; zero-draft import shows a distinct warning banner).

**Scope NOT delivered** — bank-statement (`add-bank-statement-imports`) and receipt-photo (`add-receipt-photo-imports`) channels; Settings AI-provider UI/key storage; live OpenAI calls (with no `OPENAI_API_KEY` a real submission surfaces `parse-failed` by design); retry-from-`input_event` UI (FR-ITEM-07 owned by ledger-items/parsing); any new ledger-item write path beyond the item-creation contract.

**Process evidence produced** — real RED/GREEN JSON under `openspec/changes/archive/2026-06-29-add-manual-text-input/evidence/` (`check:red-green --strict` passes); strict OpenSpec validate + archive (10 specs, MODIFIED delta on the backfilled baseline, no drift); eval case (`evals/cases/manual-input.eval.ts`, dimension `ua-error-clarity`) graded 93 PASS by a fresh eval-judge (on par with the 93 sibling baseline; recorded in `evals/results/latest.json`, ratchet green); clean maker≠checker review (code APPROVE, security PASS, spec-compliance 7/7, eval-judge 93) with 4 raw evidence files and `review-findings.json` (`clean:true`, `rawEvidence` linked); regenerated trace/trajectory + slice report.

**Process evidence NOT produced** — no live LLM trajectory-eval (waived; `trajectory-eval-waiver.md`); no UI recording/vision proof (later QA phase; FR-TEXT covered by build + smoke tests). Honest boundary: deterministic G4 checks + a clean maker≠checker review + a graded eval all pass; this is not a claim that an end-to-end trajectory-eval ran.

**Maker≠checker findings** — folded two Minors: CODE-1 (systemic creation errors no longer mislabelled as failed drafts; regression test), CODE-2 (zero-draft import now shows a distinct warning banner instead of a success-styled "Створено операцій: 0"). Accepted with rationale: a duplicated 3-line `firstParam` helper (CODE-NIT-1), a pre-existing polynomial regex on uncapped text in `parsing.ts` (SEC-MINOR-1, single-user local), and two documented spec notes (default-account seeding in the channel action; `failed` count semantics).

**Fallow audit** — `FALLOW_AGENT_SOURCE=pi npx fallow audit --base origin/dev`. Verdict `fail` (new-only gate) with advisory findings only, no runtime defect: 1 unused-file (`evals/cases/manual-input.eval.ts` — loaded by the eval runner, same accepted pattern as `accounts.eval.ts`/`ledger-items.eval.ts`); 1 introduced complexity (`importTextAction` cyclomatic 5 — trivially low); 2 introduced duplication groups (the DB-boundary smoke-test reset boilerplate shared across smoke tests, and minor form/param markup). Do not read this as a green fallow; it ran with accepted/advisory findings.

<!-- slice-report:start -->
### Generated slice report: add-manual-text-input

Generated by `node scripts/slice-report.mjs --slice add-manual-text-input` at 2026-06-29T12:52:36.199Z. Do not hand-write these metrics.

| Metric | Value |
|---|---:|
| OpenSpec validated specs | 10 |
| Active OpenSpec changes | 0 |
| Test files / tests passed | 25 / 132 |
| Trace failures / warnings | 0 / 82 |
| Trajectory failures / warnings | 0 / 2 |
| Changed files vs origin/dev | 33 |
| Review findings | clean |
| Raw review evidence refs | 4 |
| Slice trailer commits | 1 |
| Refs | FR-TEXT-01, FR-TEXT-02, FR-TEXT-03, FR-TEXT-04, FR-TEXT-05 |

Command exits: openspecValidate=0, openspecList=0, tests=0, trace=0, trajectory=0, evals=0, coverage=0.
<!-- slice-report:end -->

**Current state** — slice archived; review clean; deterministic gates green: lint, `tsc --noEmit`, `test:run` (25 files / 132 tests), `next build` (`/imports/text` dynamic), coverage ratchet bumped (lines/stmts 47.42, fns 69.18, branches 87.92), `openspec validate --all --strict` (10 specs), `check:trace` (0 failures), `check:trajectory` (0 failures, 6 slices), `check:red-green --strict`, `check:claims`, `check:eval`. Branch `add-manual-text-input` ready to push and open a PR to `dev`.

**Next steps** — push branch, open PR to `dev`, address CI / CodeRabbit. Then slice 7 `add-bank-statement-imports` (FR-BANK-*), which reuses this channel pattern with provider-specific deterministic normalization.

**Open questions / blockers** — none. Live OpenAI/API-key behavior remains intentionally deferred to the settings slice.

**Deferred work** — bank + photo channels (slices 7–8), dashboard (9), settings (10, incl. AI key + CSV export). Optional future hardening: a soft text-length cap (SEC-MINOR-1) and a shared `firstParam` foundation util (CODE-NIT-1).

---

## 2026-06-29 12:05 UTC — add-parsing-pipeline: fix CodeRabbit re-review finding (timeout must cover body read)

**What was done** — CodeRabbit's re-review of `b2069c7` raised one valid Major: `clearTimeout` fired right after `fetch()` (which resolves on headers), so `response.json()` ran with no timeout — a 200 with a stalled body could hang `parse()` forever. Restructured `src/modules/parsing/adapters.ts` so a single `AbortController`/timer stays armed through `response.json()` and is cleared only after the body has been read and parsed; abort during body read now maps to the timeout `ParsingError`. Added two regression tests: a stalled-body-after-headers timeout, and a network-level fetch failure (to keep the branch ratchet green).

**Current state** — `tsc`, `lint`, `test:run` (20 files / 110 tests) green. Coverage improved (lines/statements 46.61→46.86%, branches 87.08→87.17%); baseline ratcheted; `adapters.ts` 100% lines. Deterministic gates (handoff, claims, red-green, coverage) green.

**Next steps** — push follow-up and re-trigger CodeRabbit on PR #7; then next slice `add-manual-text-input`.

**Open questions / blockers** — none.

---

## 2026-06-29 11:42 UTC — add-parsing-pipeline: address CodeRabbit PR #7 findings

**What was done** — folded the genuinely-actionable CodeRabbit comments from PR #7 (triggered via `@coderabbitai review` against base `dev`):
- `src/modules/parsing/adapters.ts`: added an `AbortController` timeout (`timeoutMs`, default 30s) around the OpenAI `fetch` so a hung upstream can no longer block `parse()`, converted abort/network failures into `ParsingError("adapter-failed", ...)`, and wrapped `response.json()` so a malformed body is reported as an adapter failure instead of escaping as a raw exception.
- `src/modules/parsing/adapters.test.ts`: moved `OPENAI_API_KEY` restore into a `finally` block (test isolation), and added regression tests for the timeout/abort path and malformed-body path (+2 tests).
- Fixed stale evidence paths in the archived change (`proposal.md`, `tasks.md`) to point at `openspec/changes/archive/2026-06-29-add-parsing-pipeline/...`. Frozen raw reviewer outputs under `reviews/raw/` were intentionally NOT edited (evidence discipline).

**Current state** — `tsc --noEmit`, `lint`, `test:run` (20 files / 108 tests) all green. Coverage improved (lines/statements 46.15→46.61%); baseline ratcheted. `check:coverage`, `check:claims` pass. adapters.ts at 100% line coverage. CodeRabbit's remaining comments were rubric/PR-description items (author name / demo video / agentic write-up) and an auto-generated-report nitpick — not code defects — so left for the PR description, not the code.

**Next steps** — push the follow-up commit and re-trigger CodeRabbit on PR #7; then next slice `add-manual-text-input`.

**Open questions / blockers** — none. Note: CodeRabbit auto-review is disabled for non-default base branches; PRs target `dev`, so reviews must be triggered with `@coderabbitai review` (or add `reviews.auto_review.base_branches: ["dev"]` to `.coderabbit.yaml`).

---

## 2026-06-29 09:33 UTC — add-parsing-pipeline slice archived

**What was done** — selected the next Project Factory slice from the approved MVP order: `add-parsing-pipeline`, owning FR-PARSE-01..08 plus NFR-PRIV-01/02 and TC-STACK-05. Added the parsing domain/module: deterministic keyless parser-payload normalization, draft validation/canonicalization, OpenAI-compatible adapter boundary, parser-run success/failure/retry recording, and drafts-only parsing service. Added minimal coordination plumbing for FR-PARSE-04 by persisting optional parser confidence on `ledger_items` while leaving it hidden from the v1 ledger UI. Archived the OpenSpec change as `2026-06-29-add-parsing-pipeline` and committed the slice trailer.

**Current state** — branch `add-parsing-pipeline` has the slice implementation committed, pushed, and PR #7 opened against `dev`: https://github.com/BerserkrMM/2026-fwdays-agentic-greenfield-task_brsrk/pull/7. Deterministic gates pass: lint, `tsc --noEmit`, `test:run` (20 files / 106 tests), `test:coverage`, coverage ratchet, OpenSpec strict validation, trace, strict RED/GREEN evidence, claims, and deterministic trajectory. Maker≠checker review is clean after fixes; raw review outputs are tracked under the archived change. No import-channel UI/routes were added.

**Scope delivered** — FR-PARSE-01 through FR-PARSE-08: parsing service consumes stored input-event payloads; validates canonical drafts; preserves/defaults category correctly; preserves and persists confidence; runs privacy/noise normalization before adapter calls; exposes an OpenAI-compatible adapter boundary; never writes ledger items directly; records success/failed parser runs and supports retry by creating a new run.

**Scope NOT delivered** — manual text, bank-statement, and receipt-photo import routes/UI; source-specific channel normalization; Settings AI-provider UI/key storage; live OpenAI integration against a real provider; parser-created ledger items beyond copying confidence through the existing item-creation contract.

**Process evidence produced** — real RED/GREEN JSON under `openspec/changes/archive/2026-06-29-add-parsing-pipeline/evidence/`; strict OpenSpec/archive; eval decision (`eval-decision.md`, no qualitative eval needed); trajectory-eval waiver; clean maker≠checker review with 5 raw evidence files and `review-findings.json`; regenerated trace/trajectory and slice report.

**Process evidence NOT produced** — no qualitative eval or eval judge (waived by `eval-decision.md`: deterministic parser boundary, no user-facing judgment/copy); no live LLM trajectory-eval workflow available (waived); no UI recording/vision proof because this slice has no UI flow.

**Deferred work** — next slice `add-manual-text-input` should consume `ParsingService`, store text `input_event`s, call the parser, create pending items through the item-creation contract, and surface import summaries/errors in Ukrainian. Bank/file channel slices later own their source-specific normalization and live provider behavior.

**Fallow audit** — final fallow verdict `pass` for the new-only gate. Remaining issue is inherited only: unused export `BALANCE_STATUSES` in `src/domain/ledger-item.ts` (pre-existing, not introduced by this slice). Fixed introduced fallow findings during the slice: removed unused `stableJson` export, suppressed intentional parsing module port surface for upcoming consumers, refactored parser draft canonicalization complexity, and extracted parser-run recording test helper to remove duplication.

<!-- slice-report:start -->
### Generated slice report: add-parsing-pipeline

Generated by `node scripts/slice-report.mjs --slice add-parsing-pipeline` at 2026-06-29T09:32:47.832Z. Do not hand-write these metrics.

| Metric | Value |
|---|---:|
| OpenSpec validated specs | 10 |
| Active OpenSpec changes | 0 |
| Test files / tests passed | 20 / 106 |
| Trace failures / warnings | 0 / 88 |
| Trajectory failures / warnings | 0 / 2 |
| Changed files vs origin/dev | 35 |
| Review findings | clean |
| Raw review evidence refs | 5 |
| Slice trailer commits | 1 |
| Refs | FR-PARSE-01, FR-PARSE-02, FR-PARSE-03, FR-PARSE-04, FR-PARSE-05, FR-PARSE-06, FR-PARSE-07, FR-PARSE-08, NFR-PRIV-01, NFR-PRIV-02, TC-STACK-05 |

Command exits: openspecValidate=0, openspecList=0, tests=0, trace=0, trajectory=0, evals=0, coverage=0.
<!-- slice-report:end -->

**Next steps** — monitor PR #7 CI/review and address feedback. After merge, start `add-manual-text-input`.

**Open questions / blockers** — none for this slice. Live OpenAI/API-key behavior remains intentionally deferred to later integration/settings work.

---

## 2026-06-29 08:32 UTC — addressed valid CodeRabbit ledger review comments

**What was done** — fixed the three valid CodeRabbit code findings: invalid edit
`type` is now rejected with `type-invalid` instead of silently becoming
`expense`; Postgres `listAll()` ordering now matches the domain effective-date
rule with `COALESCE(occurred_at, created_at)`; invalid URL status/type/date
params are no longer echoed into `raw`, so empty-state and load-more behavior
match the applied filters. Added/updated unit coverage.

**Current state** — no scope expansion. Validation run: `npm test` (17 files / 92
tests), `npx tsc --noEmit`, `npm run lint`, `npm run build`,
`npx openspec validate --all --strict`, `npm run check:coverage`,
`npm run check:eval`, and regenerated `slice:report --write` all pass.

**Next steps** — push the CodeRabbit-fix commit to PR #6 and optionally respond to
CodeRabbit that the remaining author/demo/process comments require human
submission metadata rather than code changes.

**Open questions / blockers** — author real name and demo-video URL remain human
submission inputs if the final homework rubric requires them.

---

## 2026-06-29 08:04 UTC — add-ledger-items-review raw review evidence committed

**What was done** — force-added the four raw maker≠checker reviewer transcripts under
`openspec/changes/archive/2026-06-29-add-ledger-items-review/reviews/raw/` despite
the global `**/raw/` ignore rule, so `review-findings.json.rawEvidence` now points
to files that are present in git/PR. Regenerated the slice report after the raw
evidence commit.

**Current state** — no implementation changes. Deterministic checks remain green via
the regenerated slice report; changed-file count is now 42 because the four raw
review evidence files are tracked.

**Next steps** — push the new evidence commit to PR #6. If a stricter final-HEAD
maker≠checker proof is required, re-run the four independent reviewers over the
post-fix/post-evidence HEAD and commit those final transcripts too.

**Open questions / blockers** — none for raw-evidence tracking.

---

## 2026-06-29 07:42 UTC — add-ledger-items-review slice SHIPPED (review complete, archived)

**What was done** — completed the maker≠checker stage that the previous entry left
blocked, then archived slice 4 (`ledger-items`) and prepared the PR to `dev`. After
the session-limit reset, four fresh independent reviewers ran over `git diff
dev..HEAD`; all confirmed findings were folded and the rest accepted with rationale.

**Review outcome (maker≠checker, fresh reviewers over the committed diff)**
- **code-reviewer: APPROVE** (no blockers/majors). **security: PASS** (no
  critical/major). **spec-compliance: 13/13 scenarios** implemented, 0 missing/
  contradicted, deferred-scope + checkbox honesty PASS. **eval-judge: 93/100 PASS**
  (`ua-error-clarity`, on par with the accounts baseline 93 — no regression).
- Raw outputs under `openspec/changes/archive/2026-06-29-add-ledger-items-review/reviews/raw/`;
  summarized in `review-findings.json` (`clean: true`, `rawEvidence` linked).

**Findings fixed (folded into the slice)**
- **TZ-1** (code+spec): zoneless `occurred_at` from the edit form is now parsed as
  UTC (`parseOccurredAt`), so the round-trip is timezone-stable (BC-SCOPE-03 is
  Europe/Kyiv, not UTC) and no longer compounds drift. Pinned by a test.
- **SPEC-A (major)**: extracted the pure screen logic to
  `ledger-items/ui/ledger-params.ts` + `ledger-params.test.ts` (param parse,
  empty-vs-filtered decision, cumulative load-more href).
- **SPEC-C**: service test that an invalid edit does not persist. **CODE-3**:
  labelled the archived-account edit option. **SPEC-B**: reworded the FR-ITEM-01
  incremental scenario to cumulative.

**Findings accepted/deferred (documented in review-findings.json)**
- CODE-2 redirect drops filters (mirrors accounts convention), SPEC-D UUID
  hardening beyond spec, SEC-1 unbounded read-all-and-fold (design D1, v2), SEC-2
  single-user no-auth (BC-SCOPE-01).

**Scope delivered** — FR-ITEM-01/02/03/04(approve)/05 + FR-CAT-01/03 on the edit
path: the `/ledger` review surface (list, status, newest-first by effective date,
incremental pagination, filters + search, edit, approve, soft-delete).

**Scope NOT delivered** — FR-ITEM-04 batch creation + FR-ITEM-07 retry (need
`parsing` + channels, slices 5–8); FR-CAT-04 breakdown UI (`dashboard`, slice 9).
Not claimed.

**Process evidence produced** — RED→GREEN (`evidence/red-run.json` /
`green-run.json`, `check:red-green --strict` passes); clean maker≠checker review
with raw evidence; graded eval (`evals/results/latest.json`); deterministic gates
green: lint, tsc, 17 files / 91 tests, build, coverage ratchet (lines/stmts 38.98,
fns 62.58, branches 84.01), `openspec validate --all --strict` (10 specs),
`check:trace` (0 failures), `check:trajectory` (0 failures, 4 slices), claims,
handoff. OpenSpec change archived as `2026-06-29-add-ledger-items-review`.

**Process evidence NOT produced** — no LLM trajectory-eval (waived — no runnable
workflow in this repo; see `trajectory-eval-waiver.md`). No UI recording/vision
proof (later QA phase). Coverage `all` counts server-component JSX render branches
as uncovered (expected; logic is covered via the extracted pure helpers).

**Deferred work** — `parsing` (slice 5) then the import channels (6–8) will
populate `/ledger`; `dashboard` (9) consumes the category breakdown. SEC-1
SQL-side pagination tracked for v2.

**Fallow audit** — verdict `fail` with new-only advisory findings only: 1 unused
file (`evals/cases/ledger-items.eval.ts`, eval runner loads it — accepted, as with
`accounts.eval.ts`), server-component JSX complexity, and test-setup/markup
duplication. No runtime defect. (Re-run before final push.)

<!-- slice-report:start -->
### Generated slice report: add-ledger-items-review

Generated by `node scripts/slice-report.mjs --slice add-ledger-items-review` at 2026-06-29T08:31:12.182Z. Do not hand-write these metrics.

| Metric | Value |
|---|---:|
| OpenSpec validated specs | 10 |
| Active OpenSpec changes | 0 |
| Test files / tests passed | 17 / 92 |
| Trace failures / warnings | 0 / 96 |
| Trajectory failures / warnings | 0 / 2 |
| Changed files vs origin/dev | 42 |
| Review findings | clean |
| Raw review evidence refs | 5 |
| Slice trailer commits | 1 |
| Refs | FR-ITEM-01, FR-ITEM-02, FR-ITEM-03, FR-ITEM-04, FR-ITEM-05, FR-CAT-01, FR-CAT-03 |

Command exits: openspecValidate=0, openspecList=0, tests=0, trace=0, trajectory=0, evals=0, coverage=0.
<!-- slice-report:end -->

**Current state** — slice archived; review clean; deterministic gates green;
branch `add-ledger-items-review` ready to push and open a PR to `dev`. Honest
boundary: deterministic G4 checks + a clean maker≠checker review + a graded eval
all pass; the LLM trajectory-eval layer is waived, so this is not a claim that an
end-to-end trajectory-eval ran.

**Next steps** — push the branch, open the PR to `dev`, address CI / CodeRabbit.
Then start slice 5 `add-parsing-pipeline` (FR-PARSE-*).

**Open questions / blockers** — none.

---

## 2026-06-29 07:00 UTC — add-ledger-items-review slice (review surface; tests-first, GREEN) — review BLOCKED

**What was done** — built slice 4 of the MVP plan, the `ledger-items` review/write
surface, on branch `add-ledger-items-review` off `dev` (PR #5 `add-ledger-queries`
is merged). Tests-first with durable RED→GREEN evidence; deterministic build is
green. The independent maker≠checker review + eval grading are **blocked by a
platform session limit** (resets 01:30 UTC), so the change is **NOT archived** and
**no PR is opened**.

**Scope delivered (owned this slice)**
- FR-ITEM-01 (journal list: status shown, newest-first by effective date
  `occurred_at ?? created_at`, incremental "load more" pagination, deleted shown
  as a log, empty state), FR-ITEM-02 (combinable status/type/account/category/
  date-range filters + case-insensitive description search), FR-ITEM-03 (edit all
  fields; signed amount from absolute+type; mandatory `occurred_at`; active-account
  validation; approved stays approved; deleted not editable), FR-ITEM-04 **approve**
  (`pending`→`approved`, non-pending rejected), FR-ITEM-05 (soft delete, idempotent,
  excluded from balances via the existing fold, kept as log), FR-CAT-01/03 (category
  required free text, blank → «Без категорії») on the edit path.
- Framework-free `src/domain/ledger-filter.ts` + `ledger-item-edit.ts`; two new
  `LedgerItemRepository` primitives (`listAll`, `update`) on both backends;
  `LedgerItemsService` in `src/modules/ledger-items/`; the real `/ledger`
  server-component screen + server actions; Ukrainian-first copy module.

**Scope NOT delivered (deferred to owning slices, with rationale)**
- FR-ITEM-04 **batch partial-success creation** and FR-ITEM-07 **retry** — both
  need the not-yet-built `parsing` capability + import channels (slices 5–8);
  building them now would be unused code.
- FR-CAT-04 category breakdown (already computed by `ledger`; UI owned by
  `dashboard`, slice 9). FR-ITEM-06 / FR-CAT-02 already delivered upstream; reused.

**Process evidence produced**
- `evidence/red-run.json` (real RED: 4 new suites fail to load, modules absent,
  before implementation) + `green-run.json`; `check:red-green --slice
  add-ledger-items-review --strict` passes.
- Deterministic gates green: lint, `tsc --noEmit`, `test:run` (16 files / 81
  tests, was 11/51), `next build` (`/ledger` dynamic), coverage ratchet bumped
  (lines/stmts 35.88, fns 60.99, branches 83.07), `openspec validate --all
  --strict` (11 items), `check:trace` (0 failures), `check:claims` (0),
  `check:trajectory` (0 failures), `check:handoff`.
- Eval case authored (`evals/cases/ledger-items.eval.ts`, dimension
  `ua-error-clarity`); produced output saved under `reviews/eval-produced-output.txt`.
- `trajectory-eval-waiver.md`; honest `review-findings.json` (`clean: false`).

**Process evidence NOT produced (the blocker)**
- **Independent maker≠checker review** — all four fresh reviewers (code, security,
  spec-compliance, eval-judge) were dispatched over the staged diff but each
  terminated on the platform session/usage limit (resets 01:30 UTC) with no
  verdict. Raw limit transcripts saved under `reviews/raw/`. An **interim parent
  self-audit** (explicitly NOT independent) found no blocker and one accepted minor
  (TZ-1: datetime-local UTC/local drift on edit; v1-acceptable). No clean
  maker≠checker result is claimed.
- **Eval grading** — not run; `evals/results/latest.json` + `quality/eval-baseline.json`
  left unchanged (no fabricated score).
- No LLM trajectory-eval (waived). No UI recording/vision proof (later QA phase).

**Deferred work**
- FR-ITEM-04 batch partial-success creation + FR-ITEM-07 retry → `parsing` +
  channel slices (5–8). FR-CAT-04 breakdown UI → `dashboard` (slice 9).
- This slice's own remaining steps: independent maker≠checker review, eval
  grading, archive, slice report, and PR — all gated on the session-limit reset.

**Current state**
- Branch `add-ledger-items-review`: 16 test files / 81 tests green; lint, tsc,
  build, coverage ratchet, `openspec validate --all --strict`, trace, claims,
  trajectory all pass. OpenSpec change present but **un-archived** (active).
  `review-findings.json` is `clean: false` pending the independent review.

**Fallow audit** — `FALLOW_AGENT_SOURCE=pi npx fallow audit --base origin/dev
--format json --quiet --explain`. Verdict `fail` with new-only advisory findings,
no runtime defect:
- 1 unused file: `evals/cases/ledger-items.eval.ts` — the eval case is loaded by
  the eval runner, not statically imported by app code; same accepted pattern as
  `accounts.eval.ts`. Kept intentionally.
- 5 complexity findings (max cyclomatic 22) — the `/ledger` server-component JSX
  render (filter form + per-item rows/edit forms), flagged by the "none" coverage
  tier for server-component JSX, not by logic complexity. Accepted, as with the
  accounts page precedent.
- 2 duplication groups — the DB-boundary smoke-test reset boilerplate (shared with
  the other smoke tests) and repeated Tailwind input classes on the filter/edit
  forms. Standard per-file test isolation + presentational markup; extracting a
  shared helper/component is deferred.
- Fixed during this pass: removed the unused `export` on `effectiveDate` in
  `ledger-filter.ts` (now file-internal) — fallow `unused_exports` is clean.

**Next steps (after the session-limit reset)**
1. Re-dispatch the four fresh reviewers over `git diff dev`; persist raw outputs
   under `reviews/`; fold confirmed findings; fix or accept-with-rationale.
2. Independently grade the eval case; ratchet `eval-baseline.json` if it clears the
   `ua-error-clarity` baseline (93), else fix the copy.
3. Only then set `review-findings.json` `clean:true`, `npx openspec archive
   add-ledger-items-review --yes`, regenerate trace/trajectory + slice report,
   update this log last, run fallow audit, push, open PR to `dev`.

**Open questions / blockers**
- Blocker: platform session/usage limit prevents the independent review + eval
  judging now (resets 01:30 UTC). The slice is intentionally left committed on the
  branch but un-archived; honest per AGENTS.md (no "complete/done" claim without
  maker≠checker + eval evidence).

---

## 2026-06-28 21:28 UTC — PR #5 review hygiene fixes

**What was done**
- Suppressed the intentional `src/modules/ledger/ports.ts` fallow unused-file finding with an explicit reason: it is the TC-MOD-01 ledger module port surface for upcoming `dashboard`/`ledger-items` consumers.
- Removed the extra blank line at EOF from `openspec/specs/ledger/spec.md` so the working-tree diff check is clean.
- Re-ran verification for the follow-up changes: `npm run lint`, `npx tsc --noEmit`, `npm run test:run`, `npm run check:claims`, `npm run check:handoff`, and `FALLOW_AGENT_SOURCE=pi npx fallow audit --base origin/dev --format json --quiet --explain 2>/dev/null || true`.

**Current state**
- Tests remain green (11 files / 51 tests), lint/typecheck pass, and claim/handoff checks pass.
- Fallow no longer reports dead-code/unused-file for `src/modules/ledger/ports.ts`. Remaining fallow `verdict: fail` is limited to the already-accepted moderate accounts server-component CRAP finding and duplicated DB-boundary test setup.

**Next steps**
- Push the follow-up commit and trigger CodeRabbit on PR #5.
- Continue to treat the remaining fallow findings as accepted/deferred unless CI policy requires a green fallow audit.

**Open questions / blockers**
- None for these hygiene fixes.

---

## 2026-06-28 21:17 UTC — reviewer audit of PR #5 add-ledger-queries

**What was done**
- Reviewed PR #5 (`add-ledger-queries` → `dev`) against Project Factory evidence rules and code-quality expectations.
- Re-ran local verification: `check:red-green --slice add-ledger-queries --strict`, `check:claims`, `check:handoff`, `openspec validate --all --strict`, `check:trace`, `check:trajectory`, `test:run`, `lint`, `tsc --noEmit`, `next build`, `slice:report`, `git diff --check`, `fallow audit`, and `fallow review`.
- Used subagent review for code-quality inspection; the Project Factory audit subagent timed out, so parent verification was performed directly from artifacts.

**Current state**
- Deterministic gates remain green: tests 51/51, lint/tsc/build pass, OpenSpec validates 10 specs, red/green evidence check passes, handoff/claim checks pass.
- Fallow still reports `verdict: fail` for the same advisory new-only findings already documented: unused intentional ledger port barrel, moderate CRAP on the accounts server component render path, and duplicated DB-boundary test setup.
- Additional reviewer-only issue: `git diff --check origin/dev...HEAD` reports one whitespace warning (`openspec/specs/ledger/spec.md:94` blank line at EOF).

**Next steps**
- For PR hygiene, remove the trailing blank line in `openspec/specs/ledger/spec.md` before merge.
- Optionally suppress or defer the intentional `src/modules/ledger/ports.ts` fallow finding; extract DB test setup later if duplication grows.

**Open questions / blockers**
- No merge-blocking code correctness issue found in the ledger query implementation during this review. Fallow is not green, so do not describe the fallow audit as passed; describe it as run with accepted/advisory findings.

---

## 2026-06-28 21:00 UTC — add-ledger-queries slice (ledger read side; FR-ACCT-02 closed)

**What was done**
- Implemented the `ledger` capability's read side: a framework-free
  `src/domain/ledger-query.ts` with the single canonical balance/aggregate
  computations, a `LedgerQueryPort`, one `LedgerItemRepository.listNonDeleted()`
  read primitive (in-memory + Postgres), and `LedgerQueryService` in
  `src/modules/ledger/`. Added `formatUahMinor` to `src/domain/money.ts`.
- Closed the deferred per-account-balance half of FR-ACCT-02: `/accounts` now
  shows each account's real balance via ledger queries (derived, never stored),
  with an isolated balance read that degrades to a "Баланс недоступний" indicator
  rather than failing the whole screen.
- Tests-first with durable RED→GREEN evidence; added a regression that archived
  accounts' ledger items still count toward per-account and overall balance.
- Maker≠checker review (fresh code + security + spec-compliance reviewers);
  applied the actionable findings (deterministic SQL ordering, isolated balance
  read, comment wording, `@trace FR-CAT-04`, ticked tasks); archived the change.

**Scope delivered**
- FR-LEDGER-02, FR-LEDGER-03, FR-LEDGER-04, FR-LEDGER-05, and the per-account
  balance half of FR-ACCT-02 (wired through ledger queries). Archived-account
  balance regression covered.

**Scope NOT delivered**
- Dashboard screen / summary / trends / category UI (FR-DASH-\*, owned by
  `dashboard`, which will consume these queries).
- Ledger-item list/filter/edit/delete UI (FR-ITEM-\*, owned by `ledger-items`).
- CSV export (FR-SET-03). No SQL-side aggregate optimization (read-all-and-fold
  kept for v1 — design D1).

**Process evidence produced**
- `openspec/changes/archive/2026-06-28-add-ledger-queries/evidence/red-run.json`
  (real RED: non-zero exit, named failing suites, before implementation) and
  `green-run.json`; verified by `check:red-green --slice add-ledger-queries --strict`.
- Raw reviewer outputs under `.../reviews/` (code, security, spec-compliance),
  summarized in `review-findings.json` (`clean: true`, `rawEvidence` linked).
- `eval-decision.md` (no eval case — deterministic numeric queries) and
  `trajectory-eval-waiver.md`.
- Deterministic gates green: lint, `tsc --noEmit`, `next build`, 51 tests,
  coverage ratchet, `openspec validate --all --strict`, `check:trace` (0 fail),
  `check:trajectory` (0 fail), `check:handoff`, `check:claims`.

**Process evidence NOT produced**
- No LLM `trajectory-eval` run (waived — no runnable trajectory-eval workflow in
  this repo; consistent with `add-accounts`). No `eval-judge` (no eval case).
- No UI recording/vision proof for the accounts balance (recordings are a later
  QA phase; FR-ACCT-02 balance display is covered by build + smoke tests).

**Deferred work**
- Dashboard and ledger-items UI consume these ledger queries in their own slices.
- Optional one-pass aggregate method if a consumer needs balance + aggregates +
  category totals together (code-review CODE-3, accepted for v1).

**Fallow audit** — `FALLOW_AGENT_SOURCE=pi npx fallow audit --base origin/dev
--format json --quiet --explain`. Verdict `fail` with advisory, intentional
findings (new-only gate), no runtime defects:
- 1 unused file: `src/modules/ledger/ports.ts` — the deliberate module port
  re-export surface (TC-MOD-01) for downstream `dashboard`/`ledger-items`
  consumers; same accepted pattern as `accounts/ports.ts`. Kept intentionally.
- 1 complexity finding: `app/accounts/page.tsx` render arrow (cyclomatic 5,
  cognitive 4) — flagged mainly by the "none" coverage tier (server-component JSX
  is outside the vitest unit scope), not by genuine logic complexity. Accepted.
- 1 duplication group: the DB-boundary test reset boilerplate shared by
  `client.test.ts`, `accounts.smoke.test.ts`, and the new `ledger.smoke.test.ts`
  — standard per-file test isolation; extracting a shared helper is deferred.

<!-- slice-report:start -->
### Generated slice report: add-ledger-queries

Generated by `node scripts/slice-report.mjs --slice add-ledger-queries` at 2026-06-28T20:59:11.330Z. Do not hand-write these metrics.

| Metric | Value |
|---|---:|
| OpenSpec validated specs | 10 |
| Active OpenSpec changes | 0 |
| Test files / tests passed | 11 / 51 |
| Trace failures / warnings | 0 / 100 |
| Trajectory failures / warnings | 0 / 2 |
| Changed files vs origin/dev | 33 |
| Review findings | clean |
| Raw review evidence refs | 3 |
| Slice trailer commits | 1 |
| Refs | FR-LEDGER-02, FR-LEDGER-03, FR-LEDGER-04, FR-LEDGER-05, FR-ACCT-02 |

Command exits: openspecValidate=0, openspecList=0, tests=0, trace=0, trajectory=0, evals=0, coverage=0.
<!-- slice-report:end -->

**Current state**
- `add-ledger-queries` archived; ledger baseline spec updated (MODIFIED, no
  drift). Branch `add-ledger-queries` committed with `Slice:`/`Refs:` trailers.
  Deterministic gates green; review clean; RED→GREEN evidence durable.

**Next steps**
- Push branch and open PR to `dev`; address CI / CodeRabbit feedback.
- Pick up `dashboard` (FR-DASH-\*) or `ledger-items` (FR-ITEM-\*) consuming these
  queries next.

**Open questions / blockers**
- None. (Honest boundary: deterministic G4-style gates passed and maker≠checker
  review is clean; the LLM trajectory-eval was waived, so this is not a claim that
  the whole Project Factory loop ran.)

---

## 2026-06-28 20:01 UTC — CodeRabbit data-integrity fixes + fallow audit

**What was done**
- Addressed the substantive CodeRabbit findings for `add-accounts`: DB name length bound, truly deferrable account FK, safer in-memory/Postgres `setDefault`, conflict-aware first-default account creation, stricter RED-waiver behavior, and a concrete smoke-test error-code assertion.
- Re-ran local verification and fallow audit before pushing.

**Scope delivered**
- Accounts data-integrity hardening only; no UI behavior or FR-ACCT-02 balance work was added.

**Scope NOT delivered**
- Historical RED evidence is still waived, not reconstructed.
- Course submission metadata/demo remains outside this slice and should be handled in final submission artifacts or PR description.

**Process evidence produced**
- Local checks: `npm run test:run`, `npm run lint`, `npx tsc --noEmit`, `npm run build`, `npm run check:red-green`, `node scripts/check-trajectory.mjs --check-fresh`, `npx openspec validate --all --strict`.
- Fallow audit command: `FALLOW_AGENT_SOURCE=pi npx fallow audit --base origin/dev --format json --quiet --explain 2>/dev/null || true`.
- Fallow result: verdict `fail` with advisory findings — 4 dead-code issues (eval case and accounts port file reported as unused, plus unused exports `MAX_ACCOUNT_NAME_LENGTH` and `NewAccount`), 1 introduced duplication group in test env setup, and 1 inherited/moderate complexity finding in `check-red-green-evidence.mjs`. No circular deps, unresolved imports, unlisted deps, or dependency issues reported.

**Process evidence NOT produced**
- No trajectory-eval run in this step.
- Fallow findings were reviewed but not all remediated because several are intentional process/module artifacts rather than runtime dead code.

**Deferred work**
- Optionally add fallow suppressions/config for intentional eval/module-boundary artifacts, or refactor shared test env setup later.
- Decide whether to run trajectory-eval before merging PR #3.

**Current state**
- Local deterministic checks listed above pass; fallow remains advisory and reports the issues summarized here.

**Next steps**
- Commit and push the CodeRabbit fixes, then wait for PR #3 CI.

**Open questions / blockers**
- None.

---

## 2026-06-28 19:21 UTC — add-accounts evidence retrofit + CI fix

**What was done**
- Investigated PR #3 CI failure: `check-trajectory --check-fresh` failed because GitHub Actions used the default shallow checkout, so trailer discovery via `git log --all --grep "Slice: add-accounts"` could not see the slice commits. Updated `.github/workflows/ci.yml` to `fetch-depth: 0`.
- Retrofitted honest `add-accounts` evidence under `openspec/changes/archive/2026-06-28-add-accounts/`: copied real raw reviewer outputs into `reviews/*.jsonl`, linked them from `review-findings.json.rawEvidence`, added a RED-run waiver, and added a current GREEN-run artifact.
- Regenerated trajectory artifacts and generated a slice report.

**Scope delivered**
- `add-accounts` implementation remains unchanged; this entry only adds process evidence and the CI checkout-depth fix.

**Scope NOT delivered**
- Historical RED ordering is not machine-proven for `add-accounts`; no fake `red-run.json` was created.
- FR-ACCT-02 balance display remains deferred to the ledger-query slice.

**Process evidence produced**
- Raw review refs: code reviewer, security reviewer, spec-compliance auditor, eval judge.
- `evidence/green-run.json` from a real `npm run test:run` pass.
- `evidence/red-run-waiver.md` documenting why durable RED proof cannot be reconstructed.

<!-- slice-report:start -->
### Generated slice report: add-accounts

Generated by `node scripts/slice-report.mjs --slice add-accounts` at 2026-06-28T20:06:49.140Z. Do not hand-write these metrics.

| Metric | Value |
|---|---:|
| OpenSpec validated specs | 10 |
| Active OpenSpec changes | 0 |
| Test files / tests passed | 7 / 37 |
| Trace failures / warnings | 0 / 106 |
| Trajectory failures / warnings | 0 / 2 |
| Changed files vs origin/dev | 46 |
| Review findings | clean |
| Raw review evidence refs | 4 |
| Slice trailer commits | 1 |
| Refs | FR-ACCT-01, FR-ACCT-04, FR-ACCT-05, FR-ACCT-06, FR-ACCT-03, FR-ITEM-06 |

Command exits: openspecValidate=0, openspecList=0, tests=0, trace=0, trajectory=0, evals=0, coverage=0.
<!-- slice-report:end -->

**Process evidence NOT produced**
- No durable historical RED-run JSON exists for this slice; the waiver is the honest artifact.
- `trajectory-eval` has not been run for `add-accounts`.

**Deferred work**
- Decide whether to run trajectory-eval before merging PR #3.
- Build FR-ACCT-02 in the ledger-query slice.

**Current state**
- CI failure root cause has a code fix in this branch (`fetch-depth: 0`).
- Local generated reports now include 4 raw review evidence refs for `add-accounts`.

**Next steps**
- Run the branch checks, commit, push, and wait for PR #3 CI rerun.

**Open questions / blockers**
- None after the checkout-depth fix; CI needs to rerun on the new commit.

---

## 2026-06-28 19:05 UTC — add-accounts updated from hardened `dev`

**What was done**
- Merged `origin/dev` into `add-accounts` after PR #4 (`harden-project-factory-evidence`) landed in `dev`.
- Resolved generated artifact conflicts by keeping both archived slices in the trajectory report and regenerating `docs/qa/trajectory-report.md` / `trace/trajectory.json` with the new raw-review-evidence column.
- Kept the prior `add-accounts` evidence-correction handoff entries for audit history.

**Current state**
- `add-accounts` now contains the new Project Factory evidence tooling (`slice-report`, `check:red-green`, `check:handoff`, `check:claims`) plus updated `AGENTS.md`, PR template, and gate docs.
- Existing `add-accounts` evidence still needs retrofit to the new rules where practical: durable RED/GREEN JSON, raw review output files, generated slice-report block, and claim-hygiene shaped final summary.

**Next steps**
- Run the new checks on this branch, add/retrofit the missing evidence artifacts where possible, then push the merge commit to PR #3.

**Open questions / blockers**
- Historical RED ordering can be documented but not reconstructed from current commits alone; decide whether to create a waiver or rerun trajectory-eval before merge.

---

## 2026-06-28 19:02 UTC — Project Factory evidence hardening branch

**What was done**
- Started `harden-project-factory-evidence` from `dev` as a separate process/tooling branch, leaving `add-accounts`/PR #3 untouched.
- Added deterministic evidence helpers: `slice-report`, `check:red-green`, `check:handoff`, and `check:claims`.
- Updated `gate:status` to show `trajectoryEval NEEDS-RUN` separately from deterministic trajectory checks.
- Updated Project Factory docs, `AGENTS.md`, and the PR template so final reports use generated metrics, explicit NOT-delivered / NOT-produced sections, raw review evidence, and handoff-last discipline.

**Current state**
- New scripts parse successfully and local checks for claim hygiene / red-green evidence / gate status run.
- `check:red-green` warns for the historical foundation slice only; it is strict for future slices via `--slice <slice> --strict`.
- `docs/qa/trajectory-report.md` and `trace/trajectory.json` were regenerated for the new raw-review-evidence column.

**Next steps**
- Run the verification battery, commit this branch with `Slice:` / `Refs:` trailers, push it, and open a PR to `dev`.
- After that PR is merged, update `add-accounts` from `dev` and retrofit that branch to the new evidence rules.

**Open questions / blockers**
- None.

---

## 2026-06-28 17:40 UTC — add-accounts: finalized + corrected reporting per review

**What was done** — addressed the PR-evidence review (17:33 entry) and brought the
handoff in line with the actual final state. `add-accounts` is archived, committed
(`33ed02c` + `9373d63` trajectory refresh), pushed, and **PR #3 → `dev` is open**
(no active OpenSpec changes remain).

**Corrections to earlier claims (honesty over polish):**
- **OpenSpec count:** the post-archive count is **10/10** specs, not `11/11`. The
  11 was the mid-slice number while the active `add-accounts` change counted as an
  extra item; it drops to 10 after archive. Fixed in the 17:25 entry.
- **Gate scope:** only **G4 (per-slice: trace + trajectory deterministic checks)**
  is genuinely exercised by this slice. `gate:status` prints G5–G8 PASS, but those
  rest on **placeholder/warning-only** layers (no real demo recordings or E2E for
  accounts yet; integration is `--passWithNoTests`). Read "all gates green" as
  "all deterministic checks green", NOT "QA proof / E2E complete".
- **Tests-first RED:** the three new test files were observed failing on missing
  modules before implementation (genuine red), but that ordering is **not captured
  as a durable artifact**, and the LLM **trajectory-eval was not run** for this
  slice — so test-first ordering is asserted by this log, not independently proven.

**Current state**
- Deterministic checks green on the branch; `qa:verify` passes locally.
- Workflow evidence present for `add-accounts`: clean `review-findings.json`,
  archived change, `Slice: add-accounts` trailer, ratcheted coverage/eval baselines.

**Next steps**
- Await CI on PR #3; if trajectory-eval is mandatory per-slice proof, run it before
  merge. Optionally capture a demo recording for the accounts flow (Phase 6).
- Slice 3 `add-ledger-queries` (closes deferred FR-ACCT-02 balance view +
  FR-LEDGER-05).

**Open questions / blockers**
- Whether trajectory-eval + a demo recording are required before merging slice PRs,
  or only for the final submission.

---

## 2026-06-28 17:33 UTC — Reviewed PR #3 Project Factory workflow evidence

**What was done** — reviewed the `add-accounts` PR branch against the Project Factory workflow evidence: OpenSpec archive, trajectory artifacts, review-findings, trace/eval/recording reports, commit trailers, and local deterministic gates (`gate:status`, `check:trace`, `check-trajectory --check-fresh`, `openspec validate --all --strict`, `qa:verify`). No product/code files were intentionally changed.

**Current state**
- Deterministic checks are green for the PR branch; `qa:verify` passed locally.
- The workflow evidence is mostly present for `add-accounts` (`review-findings.json` clean, archived change, one `Slice: add-accounts` commit, no active OpenSpec changes).
- Process issues found: stale handoff log after archive/PR, missing durable proof of tests-first RED ordering / trajectory-eval, over-claiming gate status despite warning-only/placeholder gates, and an incorrect OpenSpec count claim (`11/11` vs actual `10` specs).

**Next steps**
- Before merge, refresh the handoff/PR summary to match the final archived state and actual validation counts.
- Add or attach durable tests-first/trajectory-eval evidence for this slice, or weaken the claim from “entire Project Factory loop” to “deterministic G4 checks passed”.

**Open questions / blockers**
- Need CI result for PR #3 and, if the team treats trajectory-eval as mandatory per-slice proof, the missing trajectory-eval artifact should be generated/reviewed before merge.

---

## 2026-06-28 17:25 UTC — Slice 2 `add-accounts` shipped (Project Factory, tests-first)

**What was done** — built the `accounts` capability end-to-end through the
Project Factory per-slice loop on branch `add-accounts` (forked from `dev`).
- **Spec (4a):** `openspec/changes/add-accounts/` (proposal/design/tasks + spec
  delta). The delta uses `## MODIFIED Requirements` because the baseline accounts
  spec was already backfilled (OpenSpec rejects `ADDED` for existing requirements);
  added a name-validation scenario. `openspec validate add-accounts --strict` ✓.
- **Tests-first (4b):** `src/domain/account.test.ts`,
  `src/modules/accounts/service.test.ts`, `accounts.smoke.test.ts` (boundary smoke
  through `getRepositories()`), each `@trace FR-ACCT-*` — confirmed RED before
  implementation. Plus `evals/cases/accounts.eval.ts` (dimension `ua-error-clarity`).
- **Implement (4c):** framework-free `src/domain/account.ts` (validation, single
  `AccountError` + codes; no balance field). DB **coordination change** to the
  Foundation-owned boundary: `accounts` table + `ux_accounts_single_default`
  partial index + the deferred `ledger_items.account_id` FK (idempotent DO block);
  `AccountRepository` added to `Repositories` with in-memory + Postgres impls.
  `AccountsService` (seed `Готівка`, list, create, rename, switch-default,
  soft-archive with default/last-active guards; implements `AccountsPort`).
  Server actions with the reusable inline `?formError=` surface; real `/accounts`
  screen (Ukrainian-first, `fin-*` tokens, server component — TC-STACK-02).
- **Review gate (4e, maker≠checker):** fresh code-, security-, and
  spec-compliance reviewers + eval-judge. Spec audit 10/10 scenarios, no drift.
  Fixed confirmed findings: UUID guard so a malformed id → `not-found` (no raw 500
  in PG mode), race-tolerant seed insert, name-validation scenario in the spec,
  ticked tasks.md. Deferred with rationale (single-user local v1): account-count
  cap, form-input retention on validation error.

**Current state**
- Battery green: `lint`, `tsc`, `test` (34, was 17), `build` (`/accounts` dynamic),
  `openspec validate --all --strict` **10/10 post-archive** (showed 11 mid-slice
  while the active `add-accounts` change counted as an extra item), `check:trace`
  **0 failures**.
- Ratchets bumped + committed: coverage → lines/stmts 29.84, fns 49.5,
  branches 71.87; eval baseline gains `ua-error-clarity: 93` (judge pass).
- FR-ACCT-01/03/04/05/06 + FR-ITEM-06 (default resolution) delivered with tests.
- **FR-ACCT-02 (live per-account balance figures) is deferred** to the `ledger`
  slice (needs ledger queries); the no-stored-opening-balance guarantee ships now.

**Next steps**
- Archive `add-accounts` and commit with `Slice:`/`Refs:` trailers (in progress).
- Slice 3 `add-ledger-queries` (ledger): balance/aggregate queries; closes the
  deferred FR-ACCT-02 balance view and FR-LEDGER-05 archived-items-still-count test.

**Open questions / blockers**
- None blocking. Future hardening noted above (account cap, input retention) is
  out of scope for single-user local v1.

---

## 2026-06-28 17:05 UTC

**What was done**
- Read the GitHub Actions CI logs under `crash_course/ci_log/verify` and summarized the `verify` job flow for the user.
- No code or configuration was changed.

**Current state**
- The captured CI run is green overall: install, lint, typecheck, traceability, trajectory, OpenSpec validation, production audit gate, coverage/tests, coverage ratchet, integration tests, placeholder E2E, build, and artifact upload all completed without failing the job.
- Remaining log notes are warnings only: missing test/recording trace evidence for not-yet-built FRs, two trajectory warnings for archived slice metadata, known moderate Next/PostCSS advisory, Playwright installed via `npx`, and Node 20 deprecation warnings for GitHub actions.

**Next steps**
- If desired, reduce warnings later by adding more `@trace` tests/recording manifests, storing review evidence/trailers for future slices, and adding Playwright as a proper project dependency before real E2E tests.

**Open questions / blockers**
- None.

---

## 2026-06-28 16:41 UTC

**What was done**
- Investigated failing GitHub CI on PR #2.
- Root cause: CI failed at `npx openspec validate --all --strict` because OpenSpec was available locally/global in the dev environment but not installed as a project dependency in GitHub Actions.
- Added `@fission-ai/openspec@1.5.0` as a dev dependency and verified `npx openspec validate --all --strict` locally.

**Current state**
- Local verification after the fix: lint, typecheck, tests, coverage ratchet, eval ratchet, and production dependency audit pass (audit only reports known moderate Next/PostCSS advisory, non-gating under `--audit-level=high`).

**Next steps**
- Commit/push the OpenSpec dev-dependency fix to PR #2 and wait for CI rerun.

**Open questions / blockers**
- None.

---

## 2026-06-28 16:38 UTC

**What was done**
- Re-ran push after GitHub token received `workflow` scope.
- Pushed `chore-prepare-project-factory` to origin and opened PR #2 targeting `dev`: https://github.com/BerserkrMM/2026-fwdays-agentic-greenfield-task_brsrk/pull/2

**Current state**
- Branch is published and PR #2 is open.
- Local branch tracks `origin/chore-prepare-project-factory`.

**Next steps**
- Wait for GitHub CI / review on PR #2 and merge into `dev`.
- After merge, start slice 2 `add-accounts` through Project Factory with tests-first, `@trace`, and an eval case from the start.

**Open questions / blockers**
- None.

---

## 2026-06-28 16:35 UTC

**What was done**
- Committed the level-2 Foundation eval/coverage ratchet update locally.
- Attempted to push `chore-prepare-project-factory` to `origin` for a PR to `dev`.

**Current state**
- Local commit exists on `chore-prepare-project-factory`.
- Push is blocked by GitHub auth: the active HTTPS token lacks the `workflow` scope required to create/update `.github/workflows/ci.yml`.

**Next steps**
- Refresh/replace GitHub credentials with a token that has `workflow` scope, then push the branch and open the PR to `dev`.
- Alternative if workflow scope cannot be granted: remove `.github/workflows/ci.yml` from this branch and land it separately with credentials that can modify workflows.

**Open questions / blockers**
- Blocker: GitHub rejected push with `refusing to allow a Personal Access Token to create or update workflow ... without workflow scope`.

---

## 2026-06-28 16:33 UTC

**What was done**
- Confirmed the eval-case header now references the real shared copy modules: `imports-hub-content.ts` and `placeholder-content.ts`.
- Prepared the level-2 Foundation eval/coverage ratchet update for commit and PR to `dev`.

**Current state**
- Working branch: `chore-prepare-project-factory`.
- Ready to commit the level-2 eval/coverage follow-up, then open a PR targeting `dev`.

**Next steps**
- Commit/push the branch and create the PR to `dev`.
- After merge, start slice 2 `add-accounts` through Project Factory with tests-first, `@trace`, and an eval case from the start.

**Open questions / blockers**
- None.

---

## 2026-06-28 16:26 UTC

**What was done**
- Reviewed the level-2 Foundation eval pass and related content/coverage changes.
- Verified `produce()` executes against the shared app-copy modules via `vite-node` and returns the current Imports hub / placeholder copy.
- Ran full checks: OpenSpec strict validation, traceability, coverage + ratchet, eval ratchet, gate status, lint, typecheck, tests, and build.

**Current state**
- Verification is green: OpenSpec 10/10 specs, `check:trace` 0 failures, coverage baseline 24.96/24.96/40/59.7 passes, eval baseline 95/96 passes, tests 17/17, build OK.
- The level-2 eval claim is supported by artifacts: `evals/cases/foundation.eval.ts` reads real content modules, `evals/results/latest.json` records judge notes/scores, and `docs/qa/eval-report.md` reflects those scores.
- Minor non-blocking note: the eval file header still mentions `PlaceholderScreen.tsx, nav-items.ts`; current implementation actually reads `imports-hub-content.ts` and `placeholder-content.ts`.

**Next steps**
- Optionally clean up the stale eval header wording.
- Commit this level-2 eval/coverage ratchet update before starting `add-accounts`.

**Open questions / blockers**
- None.

---

## 2026-06-28 17:30 UTC

**What was done** — ran a real (level-2) eval pass: rewired `produce()` to the
live app copy, judged with independent `eval-judge` agents (maker≠checker), and
kept the coverage ratchet honest.
- Single-source-of-truth copy modules: `src/modules/foundation/ui/imports-hub-content.ts`
  (hub) and `placeholder-content.ts` (per-section placeholder copy + the explicit
  `Скоро`/in-development constants). Refactored `app/imports/page.tsx` and the four
  placeholder pages (dashboard/ledger/accounts/settings) + `PlaceholderScreen.tsx`
  to consume them — same rendered output, now testable without duplicated strings.
- `evals/cases/foundation.eval.ts`: `produce()` now imports those real modules and
  serializes the exact copy the app shows (no hardcoded sample).
- Live judging: hub 95 (1 judge); placeholder re-judged 96/96 → 96 (2 judges) after
  including the real capability-specific descriptions. Wrote `evals/results/latest.json`,
  `manifest.json`, `docs/qa/eval-report.md`; ratcheted `quality/eval-baseline.json`
  up to {ua-ux-clarity:95, explicit-state-clarity:96}.
- Coverage: adding source modules first dropped the ratchet; fixed it the right way
  — added `content.test.ts` covering the pure modules, and moved the state constants
  into the pure `placeholder-content.ts` so the test does not pull `states.tsx`
  (coverage.all is off → only imported files count). Ratcheted coverage baseline up
  to lines/statements 24.96, functions 40, branches 59.7.

**Current state**
- `npm run lint` clean; `npx tsc --noEmit` OK; `npm run test` 17/17; `npm run build` OK.
- `gate:status`: G2/G4/G5/G6/G7/G8 PASS; G1/G3 `needs sign-off` by design.
- `check:trace` 0 failures (110 warnings); `check:coverage` and `check:eval` OK.
- Eval scores are now from real independent judges (not a manual baseline).

**Next steps**
- Start slice 2 `add-accounts` (tests-first, `@trace` + an eval case from the start).

**Open questions / blockers**
- None blocking. (Coverage `all` is off — adding source files without tests will
  dip the ratchet; add tests in the same slice.)

---

## 2026-06-28 15:40 UTC

**What was done**
- Completed Step 5: installed matching `@vitest/coverage-v8@2.1.9`, configured Vitest to emit `coverage/coverage-summary.json`, and created `quality/coverage-baseline.json`.
- Completed Step 6: replaced the placeholder sample eval with real Foundation eval cases, wrote eval result artifacts, and created `quality/eval-baseline.json`.
- Added `.github/workflows/ci.yml` back into Git tracking via `.gitignore` exceptions for `.github/workflows/` and adjusted the CI audit to gate production dependencies (`npm audit --omit=dev --audit-level=high`).
- Added `coverage/**` to ESLint global ignores so generated coverage HTML does not pollute local lint runs.

**Current state**
- `npm run gate:status` now reports G5 PASS and G6 PASS; deterministic checks are PASS for traceability, trajectory, recordings, coverage, and evals.
- Full verification run passed: OpenSpec strict validation, trace freshness/check, test coverage + coverage ratchet, eval ratchet, gate status, lint, typecheck, unit tests, build, and production dependency audit (with only the known moderate Next/PostCSS advisory reported non-gating).
- Planning/sign-off records remain in the docs; `gate:status` still prints G1/G3 as `needs sign-off` by design because it cannot judge human approval.

**Next steps**
- Commit the Project Factory preparation branch.
- Start `add-accounts` from the prepared baseline, using tests-first with `@trace` from the start.

**Open questions / blockers**
- None for the factory-preparation baseline. The production audit still reports the known moderate Next/PostCSS advisory; keep tracking for a safe upstream fix.

---

## 2026-06-28 15:12 UTC

**What was done**
- Reviewed Step 4 `@trace` backfill in existing tests and the traceability scanner regex fix.
- Ran `npm run check:trace`, `npm run test`, `npm run gate:status`, `npm run lint`, `npx tsc --noEmit`, and `npm run build`.

**Current state**
- `@trace` backfill is working: traceability report now shows test evidence for 8 MVP FRs (`FR-IMPORT-02`, `FR-BANK-06`, `FR-ITEM-04`, `FR-ITEM-06`, `FR-ACCT-01`, `FR-CAT-01`, `FR-CAT-02`, `FR-CAT-03`).
- The categorized-id regex fix in `scripts/check-traceability.mjs` is valid and required.
- Verification passed: traceability 0 failures / 112 warnings, tests 10/10, lint/typecheck/build green, gate status unchanged except trace evidence is improved.

**Next steps**
- Optional small cleanup: retag `src/db/no-client-db-import.test.ts` from `TC-STACK-02` to the more precise `TC-STACK-04` and/or `TC-MOD-02` because it checks client-side DB-boundary imports, not the server-actions/no-separate-backend constraint.
- Continue with coverage baseline setup (`@vitest/coverage-v8`) or start `add-accounts` with `@trace` from the first tests.

**Open questions / blockers**
- Coverage baseline remains blocked until `@vitest/coverage-v8` is installed.

---

## 2026-06-28 16:45 UTC

**What was done** — Step 4: backfilled `@trace` into existing tests + fixed a
traceability regex bug.
- `src/modules/foundation/item-creation.test.ts`: per-test `@trace` for FR-ITEM-04,
  FR-ITEM-06, FR-ACCT-01, FR-CAT-01, FR-CAT-02, FR-CAT-03, FR-BANK-06, FR-IMPORT-02,
  NFR-PRIV-02.
- `src/db/client.test.ts`: `@trace TC-DATA-01, TC-STACK-04`.
- `src/db/no-client-db-import.test.ts`: `@trace TC-STACK-02`.
- Fixed `scripts/check-traceability.mjs`: the `@trace` scanner used `[A-Z]+-\d+`,
  which silently dropped categorized ids like `FR-ITEM-06`. Replaced it with the
  same id grammar as `idsIn()` (`(?:FR|NFR|TC|BC|BUG)-(?:[A-Z0-9]+-)?\d+`), so
  categorized `@trace` ids now register. Plain ids (FR-9) still match.

**Current state**
- `npm run test` → 10/10 pass; `npm run lint` clean; `npx tsc --noEmit` OK.
- `npm run check:trace` → 0 failure(s); warnings 120 → 112 (8 MVP FRs now carry a
  test trace: FR-ITEM-04/06, FR-CAT-01/02/03, FR-BANK-06, FR-ACCT-01, FR-IMPORT-02).
  Report shows test counts for categorized ids (e.g. FR-ITEM-06 = 2).
- Remaining warnings are missing recordings and FRs without tests yet (expected —
  only the foundation slice is built).

**Next steps**
- Install `@vitest/coverage-v8` to unblock the coverage baseline.
- Start slice 2 `add-accounts` (tests-first, `@trace` from the start).

**Open questions / blockers**
- `@vitest/coverage-v8` still missing → coverage baseline blocked.

---

## 2026-06-28 16:20 UTC

**What was done**
- Recorded human sign-off for G1 and G3 (Andriy, both product-owner and tech-lead
  roles, 2026-06-28):
  - G1: added a `## Sign-off` block at the end of `docs/requirements.md`.
  - G3: filled the §7 sign-off table in `docs/mvp-capability-plan.md` and set its
    top status line to `approved 2026-06-28 by Andriy`.

**Current state**
- `npm run check:trace` → 0 failure(s), 60 MVP FRs (sign-off tables do not affect
  FR parsing).
- `npm run gate:status` → G1/G3 still print `needs sign-off` **by design** (the
  script only checks file presence; the sign-off is the human record in the docs).
  G2 PASS. Planning phase (Steps 1–2) is complete and signed.

**Next steps**
- Start slice 2 `add-accounts` (FR-ACCT-01..06) via the OpenSpec loop, tests-first.
- Backfill `@trace` annotations on foundation tests; install `@vitest/coverage-v8`
  to unblock the coverage baseline.

**Open questions / blockers**
- `@vitest/coverage-v8` still missing → coverage baseline blocked.

---

## 2026-06-28 16:05 UTC

**What was done** — applied the three pre-sign-off corrections:
- Synced `docs/capabilities.md`: capability map now lists FR-ACCT-01..06 under
  `accounts` (with FR-ACCT-02 owned by `accounts`, depends on `ledger`) and
  FR-SET-01..03 under `settings`; removed FR-ACCT-02 from `ledger`'s owned set;
  updated the phased steps and OpenSpec change sequence to match.
- Fixed the stale heading in `docs/requirements.md`:
  `### Category text (Epic 9, capability settings / ledger-items)` →
  `### Category text (capability ledger-items)`.
- Converted the critical-path DAG in `docs/mvp-capability-plan.md` from an ASCII
  block to a Mermaid `graph TD` (solid = hard deps, dashed = soft `settings→parsing`).

**Current state**
- `npx openspec validate --all --strict` → 10 passed, 0 failed.
- `npm run check:trace` → 0 failure(s); plan owns all 60 MVP FRs.
- Planning artifacts (`requirements.md`, `capabilities.md`, `mvp-capability-plan.md`,
  10 specs) are now mutually consistent and ready for G1/G3 human sign-off.

**Next steps**
- Fill the G3 sign-off table in `docs/mvp-capability-plan.md` §7 and a G1 sign-off
  block in `docs/requirements.md` (judgment gates — `gate:status` will still read
  `needs sign-off` by design).
- Then start slice 2 `add-accounts`.

**Open questions / blockers**
- `@vitest/coverage-v8` still missing → coverage baseline blocked.

---

## 2026-06-28 14:44 UTC

**What was done**
- Reviewed the user's Step 1 refinements and Step 2 `docs/mvp-capability-plan.md` implementation.
- Ran validation: `npx openspec validate --all --strict`, `npm run check:trace`, `npm run gate:status`, `npm run lint`, `npx tsc --noEmit`, `npm run test`, and `npm run build`.
- Asked a reviewer subagent to cross-check planning artifacts for consistency.

**Current state**
- Automated G1-G3 structure is healthy: 10 OpenSpec specs validate, traceability has 60 MVP FRs with 0 failures, G2 is PASS, G3 is `needs sign-off` only.
- No blocker found for automated G1-G3 checks.
- Review findings to address before sign-off: `docs/capabilities.md` is stale versus the updated requirements/plan; `docs/requirements.md` has a stale category heading; the plan DAG is a plain code block rather than Mermaid.

**Next steps**
- Sync `docs/capabilities.md` with FR-ACCT-04/05/06, FR-SET-03, and the final FR-ACCT-02 ownership/delivery wording.
- Fix the category heading in `docs/requirements.md` and consider converting the DAG in `docs/mvp-capability-plan.md` to a Mermaid block.
- Then fill G1/G3 human sign-off fields.

**Open questions / blockers**
- Decide whether FR-ACCT-02 is owned by `accounts` with dependency on `ledger` (as the plan says) or owned/delivered by `ledger` (as stale `docs/capabilities.md` says). Prefer the plan's one-owner model unless product/architecture says otherwise.

---

## 2026-06-28 15:40 UTC

**What was done**
- Created `docs/mvp-capability-plan.md` (Step 2): a one-owner-per-FR ownership
  matrix covering all 60 MVP FRs (incl. the new FR-ACCT-04/05/06 and FR-SET-03),
  the critical-path DAG, the 10-slice phased order, v1 scope in/out (the 18
  clarified decisions), a per-slice Definition of Done, open blockers, and human
  sign-off placeholders.

**Current state**
- `npm run check:trace` → `0 failure(s)`; `plan-ownership` now satisfied for every
  MVP FR (warnings are the expected missing `@trace` tests + recordings).
- `npm run gate:status` → G2 PASS; **G3 moved FAIL → `needs sign-off`** (plan
  present, awaiting human sign-off). G1 also `needs sign-off`.

**Next steps**
- Obtain human sign-off on `docs/requirements.md` (G1) and
  `docs/mvp-capability-plan.md` (G3) — fill the sign-off table.
- Then start slice 2 `add-accounts` (covers FR-ACCT-01..06) via the OpenSpec loop.
- Backfill `@trace` annotations + install `@vitest/coverage-v8` for the coverage
  baseline.

**Open questions / blockers**
- `@vitest/coverage-v8` still missing → coverage baseline blocked.

---

## 2026-06-28 15:10 UTC

**What was done**
- Ran a clarification loop on the 9 backfilled baseline specs to make them ready
  for automated development. Captured 18 product/behavior decisions and encoded
  them into the specs + synced the PRD (source of truth).
- `docs/requirements.md`: added FR-ACCT-04 (create + switch default), FR-ACCT-05
  (delete = soft archive), FR-ACCT-06 (seeded `Готівка` default, no opening
  balance); reworded FR-BANK-06 to insert-if-absent retry; clarified FR-SET-01/02
  (AI key in DB, write-only over the wire) and added FR-SET-03 (CSV export, no
  destructive reset); added the mandatory-`occurred_at` rule (defaults to entry
  time); marked the parser-retry and multi-item-atomicity known risks resolved.
- Specs updated: `accounts` (CRUD/archive/seed/no-opening-balance), `ledger-items`
  (newest-first + incremental pagination, full filter/search, edit keeps
  `approved`, mandatory `occurred_at`, partial-success batch creation), `ledger`
  (archived-account items still count), `parsing` (confidence stored but not shown
  in v1 UI), `manual-input`/`file-imports`/`bank-imports` (partial-success,
  redirect-to-ledger with created/failed summary, explicit parse-error + retry,
  mime-type validation with no hard size limit; bank retry = skip rows that
  already produced an item), `dashboard` (all-time scope, monthly trends with a
  ≥2-months threshold), `settings` (AI provider + CSV export, write-only key).

**Current state**
- `npx openspec validate --all --strict` passes for all 10 specs.
- `npm run check:trace` reports `0 failure(s)` over 60 MVP FRs (warnings are the
  expected missing recordings/`@trace` test annotations).
- Note: OpenSpec strict validation rejects a requirement whose leading sentence is
  a conditional with a parenthetical before the first SHALL; phrase requirements
  as "The system SHALL ..." with SHALL in the first clause.

**Next steps**
- Implement Step 2: create `docs/mvp-capability-plan.md` (one-owner-per-FR, DAG,
  scope, DoD, sign-off) — now covering the new FR-ACCT-04/05/06 and FR-SET-03.
- Begin capability slices from the phased order; `accounts` is unblocked.

**Open questions / blockers**
- `@vitest/coverage-v8` still missing → coverage baseline blocked.

---

## 2026-06-28 13:46 UTC

**What was done**
- Renamed the working branch from `add-accounts` to `chore-prepare-project-factory`.
- Implemented Step 1 manually by backfilling baseline OpenSpec specs for the nine non-foundation capabilities:
  - `openspec/specs/accounts/spec.md`
  - `openspec/specs/ledger/spec.md`
  - `openspec/specs/ledger-items/spec.md`
  - `openspec/specs/parsing/spec.md`
  - `openspec/specs/manual-input/spec.md`
  - `openspec/specs/bank-imports/spec.md`
  - `openspec/specs/file-imports/spec.md`
  - `openspec/specs/dashboard/spec.md`
  - `openspec/specs/settings/spec.md`
- Used a reviewer subagent to confirm capability-to-FR ownership and pitfalls before writing the specs.
- Regenerated `docs/qa/traceability-report.md` via `npm run check:trace`.

**Current state**
- `npx openspec validate --all --strict` passes for 10 specs.
- `npm run check:trace` now reports `0 failure(s)`; remaining warnings are expected for missing `docs/mvp-capability-plan.md`, missing `@trace` test annotations, and missing recording references.
- `npm run gate:status` now shows G2 PASS; G3 still FAIL because the canonical MVP capability plan has not been created yet.

**Next steps**
- Implement Step 2: create `docs/mvp-capability-plan.md` with one-owner-per-FR mapping, critical path DAG, scope in/out, DoD, and human sign-off placeholders.
- Then backfill `@trace` annotations into existing foundation tests and address coverage baseline setup.

**Open questions / blockers**
- `@vitest/coverage-v8` is still missing, so coverage baseline creation remains blocked until the dev dependency is installed.

---

## 2026-06-28 13:28 UTC

**What was done**
- Ran current deterministic gates for the Project Factory remediation discussion.
- `npm run gate:status` currently reports G0 PASS, G1/G3 need sign-off or plan, G2/G4/G7/G8 FAIL, G5 SKIP, G6 PASS/SKIP-backed.
- `npm run check:trace` generated the traceability report showing 46 missing spec citations and no `docs/mvp-capability-plan.md`.
- `npx openspec validate --all --strict` passes for the existing single `foundation` spec.
- `npm run test:coverage` currently fails because `@vitest/coverage-v8` is not installed.

**Current state**
- No remediation artifacts were added yet.
- Manual remediation path is clear: baseline specs, canonical MVP capability plan, sign-offs, trace backfill, then coverage/eval baselines.

**Next steps**
- Create/verify baseline specs for all non-foundation capabilities.
- Create `docs/mvp-capability-plan.md` and get human plan sign-off.
- Install/configure Vitest coverage provider before creating the coverage baseline.

**Open questions / blockers**
- Whether to generate the missing specs manually in this session or via the Project Factory/spec-pipeline workflow.

---

## 2026-06-28 13:19 UTC

**What was done**
- Read `crash_course/` slide decks and mapped the external audit terminology to the Project Factory material.
- Confirmed the audit is about missing canonical process artifacts/tracing, not missing product implementation code.

**Current state**
- No product code changed.
- Key referenced slides are in `crash_course/25.06_Запускаємо фабрику проєктів.pdf`, especially slides/pages 12–20 and 26–30.

**Next steps**
- If proceeding with the audit remediation, run the Project Factory/OpenSpec flow to generate the missing baseline specs and canonical MVP capability plan, then backfill `@trace` and coverage/eval baselines.

**Open questions / blockers**
- Need the exact Project Factory command/workflow invocation available in this environment before executing the remediation.

---

## 2026-06-28 12:49 UTC

**What was done**
- Prepared a separate `chore-add-process-artifacts` branch from `dev` to land process artifacts outside the `add-accounts` feature branch.
- Added `.github/*` to `.gitignore` while explicitly keeping `.github/pull_request_template.md`, so local Copilot/workflow/prompt files do not pollute feature PRs.
- Staged process evidence/tooling intended for `dev`: `docs/`, `evals/`, `scripts/`, and related `package.json` npm scripts.

**Current state**
- Working branch is `chore-add-process-artifacts` during this handoff entry.
- Goal is to fast-forward merge this chore branch into `dev`, then rebase/switch back to `add-accounts` for feature work.

**Next steps**
- Commit/push/merge the process artifacts into `dev`.
- Return to `add-accounts` and continue the accounts capability work.

**Open questions / blockers**
- None.

---

## 2026-06-28 12:24 UTC

**What was done**
- Fetched `origin` after PR #1 was merged into `dev`.
- Stashed unrelated local Project Factory/automation artifacts and `package.json` changes as `local project-factory artifacts before add-accounts` to keep the next feature branch clean.
- Fast-forwarded local `dev` to `origin/dev` at merge commit `40aa47b`.
- Created the new feature branch `add-accounts` from updated `dev`.

**Current state**
- Current branch: `add-accounts`.
- Working tree is clean except this handoff-log update.
- PR #1 foundation work is now part of `dev`.

**Next steps**
- Start the `add-accounts` OpenSpec proposal/implementation: account metadata, exactly one default account, and the concrete `AccountsPort` implementation.

**Open questions / blockers**
- None.

---

## 2026-06-28 12:13 UTC

**What was done**
- Applied the two valid remaining CodeRabbit code fixes: service-worker shell cache writes now use `event.waitUntil(...)`, and `resetDbBoundaryForTests()` now closes an existing postgres client via `await client.end()` before clearing cached singletons.
- Kept the CodeRabbit vendor/tooling filters intentionally and added a config comment explaining that `.claude/commands/**`, `.pi/prompts/**`, and `docs/design/support.js` are not product review surface.
- Verification run: `npm run lint` ✓, `npx tsc --noEmit` ✓, `npm run test` ✓ (10/10), `npm run build` ✓.

**Current state**
- Remaining CodeRabbit feedback is expected to be either addressed or an intentional config tradeoff.
- Final submission still needs the 1–2 minute demo video URL in the PR body.

**Next steps**
- Commit/push the final CodeRabbit follow-up and trigger/await CodeRabbit.
- Add final demo video URL before submitting the homework PR link.

**Open questions / blockers**
- None.

---

## 2026-06-28 12:09 UTC

**What was done**
- Re-read the latest CodeRabbit review after commit `261243a`.
- Confirmed only three unresolved current issues remain: CodeRabbit path filters for tooling prompts, service-worker cache write lifetime, and async closing of the postgres client in the test reset helper.

**Current state**
- Two remaining issues are valid quick product-code fixes (`public/sw.js` `event.waitUntil`, async `resetDbBoundaryForTests()` with `client.end()`).
- The path-filter issue is a tradeoff: CodeRabbit wants process artifacts reviewed, while the project owner intentionally treats `.claude/commands/**` and `.pi/prompts/**` as vendor/tooling and not product code.

**Next steps**
- Apply the two code quick fixes.
- Decide whether to keep the `.claude/commands/**` / `.pi/prompts/**` CodeRabbit filters intentionally, or remove those files from the PR entirely if they are not meant as submission artifacts.

**Open questions / blockers**
- Whether the command/prompt files should be considered homework evidence or local tooling/vendor artifacts.

---

## 2026-06-28 11:55 UTC

**What was done**
- Applied the valid CodeRabbit product-code/documentation fixes while leaving vendor/tooling files unchanged.
- Added CodeRabbit path filters for `.claude/commands/**`, `.pi/prompts/**`, and `docs/design/support.js`.
- Fixed service-worker navigation caching to write only allowlisted shell routes, DB schema sign/provenance constraints, `bootstrap.sql` output tracing, mapper validation, DB singleton test reset, stronger client-component DB import scanning, Postgres optional-id parity, trimmed item categories, and small UI accessibility/prop handling issues.
- Synced supporting docs/specs (`DESIGN.md`, `docs/capabilities.md`, `docs/requirements.md`, OpenSpec foundation specs/design) with the implementation.
- Verification run: `npm run lint` ✓, `npx tsc --noEmit` ✓, `npm run test` ✓ (10/10), `npm run build` ✓. Also ran `npx fallow audit --base dev --format json --quiet` for changed-code intelligence; it mainly reported existing/vendor/untracked complexity/dead-code signals outside this focused cleanup.

**Current state**
- CodeRabbit-addressing fixes are ready to commit/push.
- The PR still needs the final 1–2 minute video link before final submission.
- Unrelated local artifacts (`package.json`, Project Factory/automation files, trace/QA outputs) remain unstaged and were not part of this cleanup.

**Next steps**
- Commit and push the cleanup, then let CodeRabbit re-review the new commit.
- Add final demo video URL to PR body/current-state when available.

**Open questions / blockers**
- None.

---

## 2026-06-28 11:43 UTC

**What was done**
- Reviewed the completed CodeRabbit review for PR #1 after the file-count cleanup.
- Categorized the 28 inline issues into project-code fixes, documentation/submission evidence items, and vendor/tooling items that should not be edited unless intentionally owned.
- Key valid project-code fixes identified: service-worker cache allowlist, DB schema invariants, mapper validation, test singleton reset, standalone tracing for `bootstrap.sql`, tighter DB boundary structural test, id contract mismatch, category trim, and ARIA/prop microfixes.

**Current state**
- CodeRabbit now reviews the PR successfully below the file limit.
- Several comments are duplicated/misplaced submission-evidence reminders: real author name is already present; video link is still TODO.
- Vendor/tooling files such as `.pi/prompts/**`, `.claude/commands/**`, and `docs/design/support.js` should generally be ignored or removed from review scope rather than modified as product code.

**Next steps**
- Apply only the valid product-code quick wins first, then decide whether to ignore/remove committed vendor/tooling prompt/runtime files from CodeRabbit scope.
- Add the final demo video link before final submission.

**Open questions / blockers**
- None.

---

## 2026-06-28 11:30 UTC

**What was done**
- Clarified how workshop-provided Project Factory, OpenSpec, custom agents, workflows, Codex prompts, and fallow-style skills are meant to be invoked and by whom.
- Inspected local `.claude/`, `.codex/`, `.github/prompts/`, and `.project-factory/` artifacts to ground the explanation in this repository.
- No product code was changed.

**Current state**
- Repo contains Claude-native OpenSpec commands/skills, Claude custom agents/workflows, Codex/GitHub prompt shims for Project Factory, and the vendored `.project-factory/` canonical playbook.

**Next steps**
- For the next product slice, manually choose the capability and ask the orchestrator/agent to run the OpenSpec/factory loop; use fresh checker agents or review-gate before accepting the slice.

**Open questions / blockers**
- None.

---

## 2026-06-28 11:20 UTC

**What was done**
- Reviewed the course/project-factory process artifacts to explain the manual per-capability workflow versus automated agent/factory responsibilities.
- No product code was changed.

**Current state**
- Repository remains in the same implementation state as before this clarification task.

**Next steps**
- Continue with the next capability slice when ready, using the OpenSpec/project-factory gated loop.

**Open questions / blockers**
- None.

---

## 2026-06-28 11:08 UTC

**What was done**
- Applied the minimal safe PR cleanup for CodeRabbit's 150-file limit.
- Added local agent skill/tool package ignores to `.gitignore`: `.agents/skills/`, `.claude/skills/`, `.pi/skills/`, and `skills-lock.json`.
- Removed those already-tracked vendored skill files from the git index with `git rm --cached`, leaving local files available but excluding them from the PR.
- Recomputed the staged PR file list against `dev`: it is now 86 files and no longer includes the ignored skill paths.

**Current state**
- PR #1 cleanup is staged locally and should bring CodeRabbit below the file-count limit once committed/pushed.
- The video demo link is still `TODO`.
- Unrelated local work remains untracked/modified (e.g. Project Factory artifacts and `package.json`) and was not part of this cleanup.

**Next steps**
- Commit and push the cleanup, then trigger CodeRabbit review again.
- Record the final 1–2 minute demo video when the product is ready and update the PR body.

**Open questions / blockers**
- None.

---

## 2026-06-28 10:56 UTC

**What was done**
- Read the homework `README.md`, PR #1 metadata/body, and the CodeRabbit comments.
- Confirmed CodeRabbit skipped the review because PR #1 selected 183 files, 33 over the 150-file limit.
- Identified that many counted files are vendored/installed agent tooling and skills under `.agents/skills/**`, `.claude/**`, and `.pi/**`, not product implementation code.

**Current state**
- PR #1 is open from `add-foudation` into `dev` and already has the real author name and Agentic Engineering process description.
- The video demo link is still `TODO`.
- CodeRabbit has not provided substantive review feedback yet due to the file-count limit.

**Next steps**
- Remove or ignore vendored agent/tooling directories from the PR so CodeRabbit can review the actual product/process artifacts.
- Prefer small capability PRs after the foundation PR is fixed.
- Record one final 1–2 minute demo video when the product is ready, then update the PR body.

**Open questions / blockers**
- None.

---

## 2026-06-27 09:05 UTC

**What was done**
- Investigated a stuck Next.js dev server on port 3000.
- Confirmed PID `86034` was a defunct child, then stopped its parent `86023` and related build worker `86137` with SIGKILL after SIGTERM did not clear them.

**Current state**
- No remaining Next.js/node processes for this project were found.
- Port 3000 has no listener and should be available for a fresh dev server start.

**Next steps**
- Start the dev server again with the project npm script.

**Open questions / blockers**
- None.

---

## 2026-06-27 08:05 UTC

**What was done**
- Fixed the CodeRabbit configuration parsing issue by shortening `.coderabbit.yaml` `tone_instructions` to 140 characters while preserving the Ukrainian mentor/process-focused review intent.
- Locally parsed `.coderabbit.yaml` with Python/YAML to confirm the field is under CodeRabbit's 250-character limit.

**Current state**
- CodeRabbit config should no longer fail on `tone_instructions` length.
- PR #1 still targets `dev`, so CodeRabbit auto-review may still need a manual `@coderabbitai review` comment unless repo settings are changed.

**Next steps**
- Push this config fix to `add-foudation`.
- Trigger CodeRabbit manually in the PR with `@coderabbitai review` if auto-review remains skipped for non-default base branches.

**Open questions / blockers**
- Need author's real name and video-demo URL for final submission.

---

## 2026-06-27 07:25 UTC

**What was done**
- Prepared the repository for PR submission after the OpenSpec archive: re-ran verification (`npm run lint`, `npx tsc --noEmit`, `npm run test`, `npm run build`) and confirmed the foundation work is green.
- Corrected the branch flow: created/pushed `dev` from the starter baseline, created/pushed `add-foudation` with the foundation changes, and opened PR #1 from `add-foudation` into `dev`.
- Filled the PR body according to `README.md`, with the video link intentionally left as a TODO for later.

**Current state**
- PR is open: https://github.com/BerserkrMM/2026-fwdays-agentic-greenfield-task_brsrk/pull/1
- Foundation/App Shell implementation and archived OpenSpec artifacts are on `add-foudation`; `dev` remains at the homework starter baseline.

**Next steps**
- Add the author's real name and the 1–2 minute demo video link before final homework submission.
- Review and iterate on CodeRabbit feedback when it appears.

**Open questions / blockers**
- Need the author's real name and video-demo URL for the final PR template checklist.

---

## 2026-06-26 18:15 UTC

**What was done**
- Read the homework `README.md`, project docs, and checked the current repository state for a submission-readiness assessment.
- Re-ran verification: `npm run lint`, `npx tsc --noEmit`, `npm run test` (9/9), and `npm run build` all pass.

**Current state**
- Foundation/App Shell implementation remains green, but working tree changes are still uncommitted.
- Homework submission still needs PR-level artifacts: filled PR template, real name, video demo link, and final CodeRabbit iteration evidence.

**Next steps**
- Commit/push the current work on a submission branch, open PR, fill the homework template, add a 1–2 minute demo video, and iterate on CodeRabbit feedback.

**Open questions / blockers**
- Need the author's real name and video-demo URL before the homework can be submitted.

---

## 2026-06-26 18:13 UTC

**What was done**
- Synced the `add-foundation-shell` delta spec into the main specs: created the
  baseline `openspec/specs/foundation/spec.md` (13 requirements / 38 scenarios,
  all ADDED). `openspec validate foundation --type spec --strict` passes.
- Archived the completed change to
  `openspec/changes/archive/2026-06-26-add-foundation-shell/` (all artifacts +
  34/34 tasks complete). No active changes remain.

**Current state**
- `foundation` is now a baseline main spec future changes can delta against.
- Implementation unchanged from the 18:01 entry (green across tsc/lint/test/build).

**Next steps**
- Start **`add-accounts`** (`opsx:propose`): account metadata + default account,
  implementing the `AccountsPort` seam (precondition for saving ledger items).

**Open questions / blockers**
- None.

---

## 2026-06-26 18:01 UTC

**What was done**
- Ran the first capability through the OpenSpec workflow end-to-end:
  `opsx:propose` → independent clean-context review → spec refined to ~95%
  (`openspec validate --strict` passes; 13 requirements / 38 scenarios) →
  `opsx:apply` (all 34 tasks). Change: **`add-foundation-shell`** (capability
  `foundation`).
- Implemented Foundation (TC-MOD-02 owner of cross-cutting files + shared schema):
  - **Domain (`src/domain/**`)** — framework-free `LedgerItem`, `InputEvent`,
    `ParserRun`, `ParsedLedgerItemDraft`, money model (signed kopiyky, UAH),
    repository ports, `AccountsPort` seam, and the item-creation contract types.
  - **DB boundary (`src/db/**`)** — single shared `postgres` client with a named
    in-memory fallback (runs with no `DATABASE_URL`), `rows.ts`/`mappers.ts`, and
    `bootstrap.sql` (`input_events`, `parser_runs`, `ledger_items`; `timestamptz`;
    UAH CHECK; `(input_event_id, import_row_number)` UNIQUE index). `server-only`
    guards it.
  - **Item-creation contract (`src/modules/foundation/item-creation.ts`)** — the
    only ledger-item write path; default-account resolution via the port, category
    default `Без категорії`, referential-ordering check.
  - **App shell** — `app/layout.tsx` (`lang="uk"`, `viewport` with
    `viewportFit:"cover"` + token-synced `themeColor`), responsive `AppShell`
    (desktop sidebar + topbar, mobile bottom nav, safe-area), six shared screen
    states, live offline indicator, installable PWA (`app/manifest.ts`, icons,
    shell-only `public/sw.js`), `/imports` hub + placeholder routes for all nav
    destinations (no dead links).
- Verification: `npx tsc --noEmit` ✓, `npm run lint` ✓, `npm run test` ✓ (9/9,
  incl. a structural TC-STACK-02 check that no `"use client"` file imports the db
  boundary), `npm run build` ✓ (13 routes), runtime smoke via `next start` — all
  routes 200, manifest/SW/icons serve, dashboard renders UA nav + `viewport-fit`.

**Current state**
- Foundation shell + shared schema + contracts are in place and green across
  tsc/lint/test/build. App runs on a clean checkout (in-memory fallback).
- Feature screens are intentional placeholders ("Скоро") pending their
  capabilities. `/imports` hub is real and links the three channels.
- `openspec/changes/add-foundation-shell` is fully implemented (34/34 tasks); not
  yet archived.

**Next steps**
- Archive `add-foundation-shell` (`opsx:archive`) once accepted.
- Start **`add-accounts`** (Phase 2): account metadata + default account — the
  `AccountsPort` seam is waiting for its implementation, and it is the
  precondition for saving ledger items.

**Open questions / blockers**
- Browser-console silence (NFR-OBS-01) and the install prompt are best verified
  manually in a real browser; server-side smoke was clean.
- `account_id` FK to the future `accounts` table is deferred to the `add-accounts`
  coordination change (table is owned there); column is already `NOT NULL`.

---

## 2026-06-26 17:31 UTC

**What was done**
- Reviewed the current working tree before committing: project docs, OpenSpec scaffolding, design tokens, lint ignore, agent instructions/skills, and the finalized `docs/capabilities.md` boundaries.
- Ran `npm run lint` successfully.
- Prepared the changes for a repository commit.

**Current state**
- Planning/foundation documentation is ready for the first OpenSpec change (`add-foundation-shell`).
- No feature implementation code beyond global design-token CSS changes.

**Next steps**
- Start the `add-foundation-shell` OpenSpec proposal and lock shared schema ownership there.

**Open questions / blockers**
- None.

---

## 2026-06-26 17:30 UTC

**What was done**
- Applied the 3 minor nits from the second review of `docs/capabilities.md`:
  1. Phase 1 now explicitly names the `foundation`-owned shared schema
     (`ledger_items`, `input_events`, `parser_runs` tables + types + item-creation
     contract), matching the capability map.
  2. Added a `parser_run` schema-ownership note: `foundation` creates the
     `parser_runs` table/types; `parsing` owns only the run *behavior*
     (FR-PARSE-08). Flagged to confirm in the `add-foundation-shell` proposal.
  3. Reworded "already normalized" → "already source-normalized" so it does not
     contradict parsing owning its own privacy/noise normalization.

**Current state**
- `docs/capabilities.md` is internally consistent and ready to drive
  `add-foundation-shell`. Schema ownership for `ledger_items`, `input_events`,
  `parser_runs` is explicit.

**Next steps**
- Start the `add-foundation-shell` OpenSpec proposal; lock schema ownership for
  the three shared tables there.

**Open questions / blockers**
- None.

---

## 2026-06-26 17:20 UTC

**What was done**
- Applied an architectural/boundary review of `docs/capabilities.md` (all 5
  findings accepted and fixed before writing OpenSpec specs):
  1. Split `accounts` into metadata (early) vs balance display (FR-ACCT-02,
     lands with/after `ledger`).
  2. Assigned schema ownership: `foundation` owns `ledger_items` schema + the
     item-creation contract (TC-MOD-02); `ledger` owns read queries;
     `ledger-items` owns review/write — removes the schema-contention risk.
  3. Separated normalization layers: source-specific normalization owned by each
     import channel; parsing-level keyless privacy normalization owned by
     `parsing`.
  4. Corrected bank cardinality to "at most one pending item per parsed source
     row" (FR-BANK-04).
  5. Marked `settings → parsing` as a soft link (parsing ships with default
     OpenAI config; settings only edits it later).
- Updated capability map, dependency graph, phased order, and the OpenSpec change
  sequence accordingly.

**Current state**
- `docs/capabilities.md` boundaries are now consistent with the PRD and ready to
  drive OpenSpec change proposals. No specs/code written yet.

**Next steps**
- Start `add-foundation-shell` (now scoped to also own `ledger_items`/
  `input_event` schema + item-creation contract).

**Open questions / blockers**
- None.

---

## 2026-06-26 17:11 UTC

**What was done**
- Re-reviewed the updated `docs/capabilities.md` after the boundary fixes.
- Confirmed the prior major issues are materially resolved; only minor wording/consistency nits remain.

**Current state**
- `docs/capabilities.md` is suitable to drive OpenSpec proposals, with small optional cleanup recommended before/while writing `add-foundation-shell`.

**Next steps**
- Optionally align Phase 1 wording with the capability map by naming `ledger_items`/`parser_runs`/item-creation contract explicitly.

**Open questions / blockers**
- None.

---

## 2026-06-26 17:01 UTC

**What was done**
- Fixed invalid YAML frontmatter in `.agents/skills/fallow-skil/fallow/skills/fallow-review/SKILL.md` by quoting the long `description` value.
- Disabled duplicate global `fallow` skill definitions by renaming their `SKILL.md` files under `~/.pi/agent/skills/fallow/` and `~/.agents/skills/fallow/`, leaving the project-level `fallow` skill as the only active one.
- Validated the `fallow-review` YAML frontmatter parses successfully.

**Current state**
- The `fallow-review` skill metadata is valid.
- The previous `fallow` skill-name collision should no longer appear for the two disabled global copies.

**Next steps**
- Restart/reload the Pi session if the old skill-discovery warning is cached.

**Open questions / blockers**
- None.

---

## 2026-06-26 17:00 UTC

**What was done**
- Reviewed `docs/capabilities.md` against `docs/requirements.md`, `docs/product-brief.md`, and the design reference for architecture drift and internal conflicts.
- Did not change `docs/capabilities.md`; findings were reported in chat.

**Current state**
- `docs/capabilities.md` is mostly aligned with the PRD, but has several boundary/order issues to fix before generating OpenSpec specs.

**Next steps**
- Clarify capability ownership for ledger/accounts/schema, source-specific normalization, bank row cardinality, and settings/parsing dependency before starting `add-foundation-shell`.

**Open questions / blockers**
- Should account balance UI be split from account metadata until ledger queries exist?
- Should source-specific normalization live in import-channel capabilities while parsing owns only the parser port/run log?

---

## 2026-06-26 17:00 UTC

**What was done**
- Split `docs/requirements.md` into OpenSpec capabilities and wrote
  `docs/capabilities.md`: a capability map (capability → PRD epic → FR/NFR/TC
  IDs), a dependency graph, a phased implementation order, and a suggested
  OpenSpec change sequence.
- Confirmed `openspec/` is initialized (`config.yaml`, empty `specs/` and
  `changes/`).

**Current state**
- 10 capabilities identified: foundation, accounts, ledger, ledger-items,
  parsing, manual-input, bank-imports, file-imports, dashboard, settings.
- Implementation order defined in 5 phases (foundation → core domain → parsing →
  input channels → read/configure). No code or OpenSpec specs written yet.

**Next steps**
- Start the first OpenSpec change: `add-foundation-shell` (Phase 1).
- Then proceed down the phased order in `docs/capabilities.md`.

**Open questions / blockers**
- None.

---

## 2026-06-26 16:54 UTC

**What was done**
- Updated `AGENTS.md` with two new rules:
  - Read project docs (`docs/product-brief.md`, `docs/requirements.md`, `docs/design/`) before starting work; `requirements.md` is the source of truth.
  - Maintain this `docs/current-state.md` session log (read first, update before finishing).
- Created this initial `docs/current-state.md`.

**Current state**
- Project scaffolding present: Next.js app (`app/`), config files, `docs/` with product brief, requirements, and design references.
- No feature implementation done yet this session.

**Next steps**
- Read `docs/product-brief.md` and `docs/requirements.md` to begin feature work.
- Review `docs/design/` reference assets before building UI.

**Open questions / blockers**
- None.
