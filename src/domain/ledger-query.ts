// Ledger query computations — the single, canonical place balances and
// aggregates are derived from ledger items (FR-LEDGER-05). Framework-free
// (TC-PURE-01): pure functions over LedgerItem[], with inclusion decided by the
// shared `affectsBalance` predicate so `pending` + `approved` count and `deleted`
// is excluded everywhere (FR-LEDGER-02). The grouping depends only on the item's
// `accountId`/`category` and status — never on account archive state, so an
// archived account's historical items still contribute (FR-ACCT-05).

import { affectsBalance, type LedgerItem } from "./ledger-item";
import type { AmountMinor } from "./money";

/** A single account's derived balance (no stored value — FR-ACCT-06). */
export interface AccountBalance {
  accountId: string;
  balanceMinor: AmountMinor;
}

/**
 * Income/expense split over non-deleted items (FR-LEDGER-04). `expenseMinor` is
 * kept signed (≤ 0) so `incomeMinor + expenseMinor === netMinor`, and `netMinor`
 * equals the overall balance. The UI formats magnitudes for display.
 */
export interface LedgerAggregates {
  incomeMinor: AmountMinor;
  expenseMinor: AmountMinor;
  netMinor: AmountMinor;
}

/** A per-category total over non-deleted items, grouped by raw text (FR-CAT-04). */
export interface CategoryTotal {
  category: string;
  totalMinor: AmountMinor;
}

/**
 * One calendar month's income/expense over non-deleted items, for the Dashboard
 * trend (FR-DASH-04). `month` is a `YYYY-MM` key in `Europe/Kyiv` (BC-SCOPE-03);
 * `expenseMinor` stays signed (≤ 0) so `incomeMinor + expenseMinor === netMinor`.
 */
export interface MonthlyTrendPoint {
  month: string;
  incomeMinor: AmountMinor;
  expenseMinor: AmountMinor;
  netMinor: AmountMinor;
}

/**
 * Every figure the read-only Dashboard needs, derived from a SINGLE snapshot of
 * non-deleted items (FR-DASH-01..04). Computing them all from one `listNonDeleted`
 * read keeps the widgets mutually consistent (no torn reads across separate
 * queries) and avoids repeating the scan — important once reads become
 * per-user/multi-tenant.
 */
export interface DashboardSummary {
  overallBalanceMinor: AmountMinor;
  aggregates: LedgerAggregates;
  categoryTotals: CategoryTotal[];
  trends: MonthlyTrendPoint[];
}

/** Non-deleted items only — the inclusion rule for every balance/aggregate. */
function balanceItems(items: readonly LedgerItem[]): readonly LedgerItem[] {
  return items.filter((item) => affectsBalance(item.status));
}

/** Sum of all non-deleted items across accounts (FR-LEDGER-03). */
export function computeOverallBalance(items: readonly LedgerItem[]): AmountMinor {
  return balanceItems(items).reduce((sum, item) => sum + item.amountMinor, 0);
}

/** Sum of one account's non-deleted items (FR-LEDGER-03, FR-ACCT-02). */
export function computeAccountBalance(
  items: readonly LedgerItem[],
  accountId: string,
): AmountMinor {
  return balanceItems(items).reduce(
    (sum, item) => (item.accountId === accountId ? sum + item.amountMinor : sum),
    0,
  );
}

/**
 * Per-account balances over non-deleted items, grouped by `accountId` in
 * first-seen order (FR-LEDGER-03). Independent of account archive state.
 */
export function computeAccountBalances(
  items: readonly LedgerItem[],
): AccountBalance[] {
  const byAccount = new Map<string, AmountMinor>();
  for (const item of balanceItems(items)) {
    byAccount.set(item.accountId, (byAccount.get(item.accountId) ?? 0) + item.amountMinor);
  }
  return [...byAccount].map(([accountId, balanceMinor]) => ({ accountId, balanceMinor }));
}

/** Income/expense aggregates over non-deleted items, by amount sign (FR-LEDGER-04). */
export function computeAggregates(items: readonly LedgerItem[]): LedgerAggregates {
  let incomeMinor = 0;
  let expenseMinor = 0;
  for (const item of balanceItems(items)) {
    if (item.amountMinor >= 0) incomeMinor += item.amountMinor;
    else expenseMinor += item.amountMinor;
  }
  return { incomeMinor, expenseMinor, netMinor: incomeMinor + expenseMinor };
}

/**
 * Per-category totals over non-deleted items, grouped by raw `category` text in
 * first-seen order (FR-LEDGER-04, FR-CAT-04). No category table join.
 */
export function computeCategoryTotals(
  items: readonly LedgerItem[],
): CategoryTotal[] {
  const byCategory = new Map<string, AmountMinor>();
  for (const item of balanceItems(items)) {
    byCategory.set(item.category, (byCategory.get(item.category) ?? 0) + item.amountMinor);
  }
  return [...byCategory].map(([category, totalMinor]) => ({ category, totalMinor }));
}

// A fixed Europe/Kyiv month formatter (BC-SCOPE-03). `formatToParts` is used so
// the `YYYY-MM` key is deterministic and locale-independent, regardless of the
// host timezone or default locale.
const KYIV_MONTH_PARTS = new Intl.DateTimeFormat("en-CA", {
  timeZone: "Europe/Kyiv",
  year: "numeric",
  month: "2-digit",
});

/** The `YYYY-MM` calendar-month key of an instant, in Europe/Kyiv local time. */
function kyivMonthKey(when: Date): string {
  const parts = KYIV_MONTH_PARTS.formatToParts(when);
  const year = parts.find((p) => p.type === "year")?.value ?? "0000";
  const month = parts.find((p) => p.type === "month")?.value ?? "00";
  return `${year}-${month}`;
}

/**
 * Income/expense grouped by calendar month over non-deleted items, for the
 * Dashboard trend (FR-DASH-04, FR-LEDGER-04). The effective date is
 * `occurredAt ?? createdAt` — the same rule the journal uses for ordering — and
 * the month bucket is computed in `Europe/Kyiv`. Points are returned ascending
 * by month; deleted items are excluded.
 */
export function computeMonthlyTrends(
  items: readonly LedgerItem[],
): MonthlyTrendPoint[] {
  const byMonth = new Map<string, { incomeMinor: AmountMinor; expenseMinor: AmountMinor }>();
  for (const item of balanceItems(items)) {
    const key = kyivMonthKey(item.occurredAt ?? item.createdAt);
    const bucket = byMonth.get(key) ?? { incomeMinor: 0, expenseMinor: 0 };
    if (item.amountMinor >= 0) bucket.incomeMinor += item.amountMinor;
    else bucket.expenseMinor += item.amountMinor;
    byMonth.set(key, bucket);
  }
  return [...byMonth.entries()]
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([month, b]) => ({
      month,
      incomeMinor: b.incomeMinor,
      expenseMinor: b.expenseMinor,
      netMinor: b.incomeMinor + b.expenseMinor,
    }));
}

/**
 * Computes the whole Dashboard read-model from a single item snapshot — balance,
 * income/expense aggregates, category totals, and the monthly trend — so every
 * widget reflects the same consistent set of non-deleted items (FR-DASH-01..04,
 * FR-LEDGER-05).
 */
export function computeDashboardSummary(
  items: readonly LedgerItem[],
): DashboardSummary {
  return {
    overallBalanceMinor: computeOverallBalance(items),
    aggregates: computeAggregates(items),
    categoryTotals: computeCategoryTotals(items),
    trends: computeMonthlyTrends(items),
  };
}
