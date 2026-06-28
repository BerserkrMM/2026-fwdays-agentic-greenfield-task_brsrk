# Current State

Running handoff log. Most recent entry on top. See `AGENTS.md` for the rules on maintaining this file.

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
