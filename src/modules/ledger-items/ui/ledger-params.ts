// Pure URL <-> filter translation for the Ledger screen (FR-ITEM-01/02). Kept out
// of the server component so the param parsing, the "load more" href growth, and
// the empty-state decision are unit-testable without rendering. Framework-light:
// only standard URL/Date globals, no Next/DB import.

import type { LedgerFilter } from "@/src/domain/ledger-filter";
import type { LedgerItemStatus } from "@/src/domain/ledger-item";
import type { OperationType } from "@/src/domain/money";

export type RawParams = Record<string, string | string[] | undefined>;

const STATUSES: LedgerItemStatus[] = ["pending", "approved", "deleted"];
const TYPES: OperationType[] = ["expense", "income"];

/** First non-empty value of a query param (Next can hand back string | string[]). */
export function firstParam(value: string | string[] | undefined): string | undefined {
  const v = Array.isArray(value) ? value[0] : value;
  return v && v.trim() !== "" ? v : undefined;
}

/**
 * Parses the Ledger query string into a domain `LedgerFilter` plus the echoed
 * `raw` map used to re-fill the form and rebuild the "load more" href. Invalid
 * status/type/limit/date values are dropped (never thrown), so a hand-edited URL
 * degrades to a wider result rather than an error. Date bounds are inclusive on
 * the effective date, taken as UTC day edges (BC-SCOPE-03 consistency).
 */
export function parseLedgerParams(params: RawParams): {
  filter: LedgerFilter;
  raw: Record<string, string>;
} {
  const status = firstParam(params.status);
  const type = firstParam(params.type);
  const accountId = firstParam(params.account);
  const category = firstParam(params.category);
  const search = firstParam(params.q);
  const fromStr = firstParam(params.from);
  const toStr = firstParam(params.to);
  const limit = Number.parseInt(firstParam(params.limit) ?? "", 10);

  const filter: LedgerFilter = {};
  if (status && STATUSES.includes(status as LedgerItemStatus)) {
    filter.status = status as LedgerItemStatus;
  }
  if (type && TYPES.includes(type as OperationType)) {
    filter.type = type as OperationType;
  }
  if (accountId) filter.accountId = accountId;
  if (category) filter.category = category;
  if (search) filter.search = search;
  if (fromStr) {
    const from = new Date(`${fromStr}T00:00:00.000Z`);
    if (!Number.isNaN(from.getTime())) filter.from = from;
  }
  if (toStr) {
    const to = new Date(`${toStr}T23:59:59.999Z`);
    if (!Number.isNaN(to.getTime())) filter.to = to;
  }
  if (Number.isFinite(limit) && limit > 0) filter.limit = limit;

  const raw: Record<string, string> = {};
  if (status) raw.status = status;
  if (type) raw.type = type;
  if (accountId) raw.account = accountId;
  if (category) raw.category = category;
  if (search) raw.q = search;
  if (fromStr) raw.from = fromStr;
  if (toStr) raw.to = toStr;

  return { filter, raw };
}

/** True when any filter/search is active (used to pick the right empty state). */
export function hasActiveFilters(raw: Record<string, string>): boolean {
  return Object.keys(raw).length > 0;
}

/** Which empty state to show, or null when there are results to render. */
export function emptyStateKind(
  matched: number,
  raw: Record<string, string>,
): "empty" | "filtered" | null {
  if (matched > 0) return null;
  return hasActiveFilters(raw) ? "filtered" : "empty";
}

/** "Load more" href: the same filters with the cumulative limit grown by 10. */
export function loadMoreHref(raw: Record<string, string>, shownCount: number): string {
  const next = new URLSearchParams(raw);
  next.set("limit", String(shownCount + 10));
  return `/ledger?${next.toString()}`;
}
