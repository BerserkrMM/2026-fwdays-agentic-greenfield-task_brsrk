// Ledger list selection — framework-free (TC-PURE-01). The single place that
// filters, searches, sorts, and paginates the journal so the read logic stays
// pure and unit-testable, mirroring the ledger read side's read-all-and-fold
// design (design D1). It never recomputes balances (FR-LEDGER-05); it only
// selects which items the Ledger screen shows (FR-ITEM-01, FR-ITEM-02).

import type { LedgerItem, LedgerItemStatus } from "./ledger-item";
import type { OperationType } from "./money";

/** Default ledger page size; "load more" grows the cumulative limit (FR-ITEM-01). */
export const DEFAULT_PAGE_SIZE = 10;

/** Combinable ledger filters; all are optional and AND together (FR-ITEM-02). */
export interface LedgerFilter {
  status?: LedgerItemStatus;
  type?: OperationType;
  accountId?: string;
  /** Case-insensitive substring match on raw category text. */
  category?: string;
  /** Inclusive lower bound on the effective date. */
  from?: Date;
  /** Inclusive upper bound on the effective date. */
  to?: Date;
  /** Case-insensitive substring search on the description. */
  search?: string;
  /** Cumulative page size (show the first `limit` matched). Defaults to 10. */
  limit?: number;
}

export interface LedgerPage {
  /** The page slice (first `limit` matched, newest-first). */
  items: LedgerItem[];
  /** Total items before filtering. */
  total: number;
  /** Items remaining after filtering (across all pages). */
  matched: number;
  /** Whether more matched items exist beyond this page. */
  hasMore: boolean;
}

/**
 * The date the item is ordered/displayed by: its `occurred_at` when set, else the
 * creation time. Foundation's creation contract may leave `occurred_at` null
 * before the import channels populate it, so the list orders by this effective
 * date to stay stable (design D2).
 */
function effectiveDate(item: LedgerItem): Date {
  return item.occurredAt ?? item.createdAt;
}

function matches(item: LedgerItem, f: LedgerFilter): boolean {
  if (f.status && item.status !== f.status) return false;
  if (f.type && item.type !== f.type) return false;
  if (f.accountId && item.accountId !== f.accountId) return false;

  const category = f.category?.trim().toLowerCase();
  if (category && !item.category.toLowerCase().includes(category)) return false;

  const search = f.search?.trim().toLowerCase();
  if (search && !item.description.toLowerCase().includes(search)) return false;

  const when = effectiveDate(item).getTime();
  if (f.from && when < f.from.getTime()) return false;
  if (f.to && when > f.to.getTime()) return false;

  return true;
}

/** Newest-first by effective date; `id` descending breaks ties deterministically. */
function newestFirst(a: LedgerItem, b: LedgerItem): number {
  const diff = effectiveDate(b).getTime() - effectiveDate(a).getTime();
  if (diff !== 0) return diff;
  return a.id < b.id ? 1 : a.id > b.id ? -1 : 0;
}

/**
 * Filters, searches, sorts newest-first, and cumulatively paginates the journal
 * (FR-ITEM-01, FR-ITEM-02). Deleted items are not special-cased here — the
 * journal shows them as a log; callers filter by `status: "deleted"` when wanted.
 */
export function selectLedgerPage(
  items: LedgerItem[],
  criteria: LedgerFilter,
): LedgerPage {
  const limit = Math.max(1, Math.floor(criteria.limit ?? DEFAULT_PAGE_SIZE));
  const filtered = items.filter((item) => matches(item, criteria));
  filtered.sort(newestFirst);
  return {
    items: filtered.slice(0, limit),
    total: items.length,
    matched: filtered.length,
    hasMore: filtered.length > limit,
  };
}
