# Code reviewer — add-ledger-items-review (fresh, maker≠checker)

Verdict: **APPROVE — no blocking or major issues.** Reviewed the full diff
dev..HEAD (commits 1a0bdc1, 7c789d3): both pure domain modules, the service, both
repo backends, ports, the server component, the server actions, and the Ukrainian
copy. All 30 slice tests pass. Faithfully mirrors the `accounts` capability.

## Verified
- Sort/pagination: selectLedgerPage filters → newest-first by occurredAt??createdAt
  (id tiebreak) → cumulative slice; hasMore = filtered.length > limit; moreHref grows
  limit by items.length+10 → "load more" strictly progresses, cannot loop; limit
  clamped Math.max(1, floor); buildFilter rejects non-positive/NaN limit.
- Amount sign/parse: parseAmountToMinor rejects negative/zero/>2dp/non-numeric/
  unsafe-int; sign always derived from type. No bad value reaches the DB CHECK.
- Status transitions: deleted not editable; approve only pending→approved; delete
  idempotent; edit preserves status. All rejects → LedgerItemError → banner, no 500.
- Malformed ids / archived accounts guarded before the Postgres uuid column. No hard
  deletes, so post-findById update() always matches a row.
- Balances never recomputed here (FR-LEDGER-05); listAll includes deleted as log.
- Deferred scope (batch, retry, FR-CAT-04) correctly absent and not flagged.

## Findings (all minor)
1. **TZ-1 datetime-local round-trip drifts and COMPOUNDS on non-UTC servers.**
   page.tsx:80 toDateTimeLocal emits UTC wall-clock; ledger-item-edit.ts:82
   `new Date(edit.occurredAt)` parses zoneless as server-local. Saving an item
   unchanged shifts occurred_at by the server offset, and the next load re-displays
   the shifted value, so each edit compounds the drift. Cheap fix: parse the field
   as UTC so format and parse share a zone.
2. **Successful mutation redirects to bare /ledger, dropping active filters/pagination.**
   actions.ts:31. Mirrors the accounts convention, but accounts has no filters so the
   impact is new here. Consider preserving the originating query.
3. **Edit form offers an archived account as a plain selectable option that cannot be
   saved.** page.tsx:328-330. Pre-selected for an item on an archived account; saving
   unchanged → account-not-found (intended guard, FR-ITEM-03), but the option has no
   hint it is archived, so the failure looks arbitrary. Label/disable it.

## Non-issues confirmed
- Date-range filter uses explicit UTC bounds and the row display is UTC too → filter
  and display are zone-consistent; the TZ concern is isolated to the edit field.
- editItemAction coerces type defensively; garbage type cannot throw.
- Postgres update() SET list excludes provenance columns (matches the port contract).
