# Current State

Running handoff log. Most recent entry on top. See `AGENTS.md` for the rules on maintaining this file.

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
