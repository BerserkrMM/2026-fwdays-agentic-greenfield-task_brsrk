# Code reviewer — add-dashboard (fresh, maker≠checker)

## Verdict: APPROVE_WITH_NITS (no blockers/majors)

Verified: Kyiv month bucketing is DST-safe and host-tz independent (`Intl.DateTimeFormat` + `en-CA` `formatToParts`, effective date `occurredAt ?? createdAt`, deleted excluded); page is genuinely read-only (`force-dynamic`, only `next/link` navigations); error/partial/empty branching is logically consistent; the `getMonthlyTrends` port addition is additive-only and disclosed (design D1). Tests cover domain, view-model, and all four page data-states.

### Findings (all MINOR)

1. **A failed section read renders as "empty"/"insufficient", indistinguishable from genuinely-empty data** — `app/dashboard/page.tsx:71-72,97-98`. When `categoryTotals`/`trends` throws, code falls back to `[]`, so the breakdown shows `breakdownEmpty` and the trend shows `trendInsufficientTitle` — telling a user whose trend read *errored* that there's "not enough data". Only the global `PartialState` banner signals the failure. Suggestion: when a specific read fails, render an unavailable/retry message for that section (pass an `ok` flag) so "no data" is distinguishable from "couldn't load".

2. **Four serialized full-table reads per render** — `app/dashboard/page.tsx:41-44`. The four reads are awaited sequentially, each calling `listNonDeleted()` independently. Correct but redundant latency. Suggestion: run the four `read(...)` wrappers via `Promise.all` (each already catches its own error, so isolation holds).

3. **Aggregate-read failures swallowed with no server-side observability** (confidence: low) — `app/dashboard/page.tsx:25-31`. `read` does `catch { return { ok:false } }` with no logging; an operator gets no signal a query is consistently throwing. Suggestion: log server-side before returning, if a shared logging convention exists.

### Disposition (maker)
- Finding 1: FOLD — add a per-section "unavailable" state so failed reads don't masquerade as empty/insufficient.
- Finding 2: FOLD — `Promise.all` the four reads.
- Finding 3: ACCEPT with rationale — no shared logger exists and NFR-OBS-01 wants a silent console on healthy sessions; the per-section unavailable state (finding 1 fix) already surfaces the failure to the user. Tracked as future observability work.
